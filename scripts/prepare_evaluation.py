#!/usr/bin/env python3
"""Download/verify papers, index them, and materialize stable evidence labels."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import time
import urllib.error
import urllib.request
import uuid


def http_json(base_url, method, path, token=None, payload=None, content_type="application/json", timeout=120):
    data = None
    headers = {}
    if payload is not None:
        data = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = content_type
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}", data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed with HTTP {error.code}: {detail}") from error


def authenticate(base_url, username, password):
    credentials = {"username": username, "password": password}
    try:
        return http_json(base_url, "POST", "/api/v1/auth/login", payload=credentials)
    except RuntimeError:
        registration = {
            **credentials,
            "displayName": "Offline Evaluation Runner",
        }
        return http_json(base_url, "POST", "/api/v1/auth/register", payload=registration)


def verify_or_download(root, paper, download):
    path = root / paper["local_file"]
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        if not download:
            raise RuntimeError(f"Missing {path}; rerun with --download")
        with urllib.request.urlopen(paper["download_url"], timeout=120) as response:
            path.write_bytes(response.read())
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != paper["sha256"]:
        raise RuntimeError(
            f"SHA-256 mismatch for {path}: expected {paper['sha256']}, got {digest}"
        )
    return path


def multipart_pdf(path):
    boundary = "----literature-eval-" + uuid.uuid4().hex
    prefix = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        "Content-Type: application/pdf\r\n\r\n"
    ).encode("utf-8")
    suffix = f"\r\n--{boundary}--\r\n".encode("ascii")
    return prefix + path.read_bytes() + suffix, f"multipart/form-data; boundary={boundary}"


def wait_for_task(base_url, task_id, token, timeout_seconds):
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        task = http_json(base_url, "GET", f"/api/v1/indexing-tasks/{task_id}", token=token)
        if task["status"] == "COMPLETED":
            return task
        if task["status"] == "FAILED":
            raise RuntimeError(f"Indexing task {task_id} failed: {task.get('failureReason')}")
        time.sleep(1)
    raise TimeoutError(f"Indexing task {task_id} did not complete within {timeout_seconds}s")


def normalize(value):
    return " ".join(re.findall(r"[a-z0-9]+", value.lower().replace("’", "'")))


def select_passage(item, passages):
    page = item["expected_page"]
    candidates = [
        passage for passage in passages
        if passage["pageStart"] <= page <= passage["pageEnd"]
    ]
    anchor = normalize(item["evidence_anchor"])
    exact = [passage for passage in candidates if anchor in normalize(passage["text"])]
    if exact:
        return exact[0]

    anchor_tokens = set(anchor.split())
    scored = []
    for passage in candidates:
        passage_tokens = set(normalize(passage["text"]).split())
        overlap = len(anchor_tokens & passage_tokens) / max(1, len(anchor_tokens))
        scored.append((overlap, passage))
    if scored:
        score, passage = max(scored, key=lambda pair: pair[0])
        if score >= 0.75:
            return passage
    raise RuntimeError(
        f"No passage matched {item['id']} on page {page}; anchor={item['evidence_anchor']!r}"
    )


def materialize(source_path, output_path, papers, documents):
    source = [json.loads(line) for line in source_path.read_text(encoding="utf-8").splitlines() if line]
    rows = []
    for item in source:
        row = {key: value for key, value in item.items() if key not in {"evidence_anchor", "expected_page"}}
        if item["should_refuse"]:
            row["gold_passage_ids"] = []
        else:
            paper = papers[item["paper_id"]]
            document = documents[item["paper_id"]]
            passage = select_passage(item, document["passages"])
            row.update({
                "document_id": document["documentId"],
                "document_sha256": paper["sha256"],
                "document_title": paper["title"],
                "page_start": passage["pageStart"],
                "page_end": passage["pageEnd"],
                "evidence_excerpt": passage["text"],
                "gold_passage_ids": [passage["id"]],
            })
        rows.append(row)
    if len(rows) < 50 or sum(row["should_refuse"] for row in rows) != 10:
        raise RuntimeError("Evaluation corpus must contain at least 50 rows and exactly 10 refusal rows")
    output_path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )
    return rows


def prepare(args):
    root = Path(args.root).resolve()
    manifest = json.loads((root / args.manifest).read_text(encoding="utf-8"))
    papers = {paper["id"]: paper for paper in manifest["papers"]}
    files = {paper_id: verify_or_download(root, paper, args.download) for paper_id, paper in papers.items()}

    username = args.username or f"benchmark-{uuid.uuid4()}"
    password = os.getenv(args.password_env) or secrets.token_urlsafe(24)
    auth = authenticate(args.base_url, username, password)
    token = auth["accessToken"]
    token_path = root / args.token_file
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(token, encoding="utf-8")

    space = http_json(
        args.base_url,
        "POST",
        "/api/v1/spaces",
        token=token,
        payload={"name": args.space_name},
    )
    documents = {}
    for paper_id, paper in papers.items():
        body, content_type = multipart_pdf(files[paper_id])
        upload = http_json(
            args.base_url,
            "POST",
            f"/api/v1/spaces/{space['id']}/documents",
            token=token,
            payload=body,
            content_type=content_type,
            timeout=args.task_timeout,
        )
        task = wait_for_task(args.base_url, upload["taskId"], token, args.task_timeout)
        http_json(
            args.base_url,
            "PATCH",
            f"/api/v1/spaces/{space['id']}/documents/{upload['documentId']}/metadata",
            token=token,
            payload={
                "title": paper["title"],
                "authors": ", ".join(paper["authors"]),
                "publicationYear": paper["year"],
            },
        )
        passages = http_json(
            args.base_url,
            "GET",
            f"/api/v1/spaces/{space['id']}/documents/{upload['documentId']}/passages",
            token=token,
        )
        documents[paper_id] = {
            "documentId": upload["documentId"],
            "taskId": upload["taskId"],
            "task": task,
            "passages": passages,
        }
        print(f"indexed {paper_id}: {len(passages)} passages")

    rows = materialize(
        root / args.questions,
        root / args.output,
        papers,
        documents,
    )
    run_manifest = {
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_url": args.base_url,
        "space_id": space["id"],
        "username": username,
        "papers": {
            paper_id: {
                "document_id": value["documentId"],
                "task_id": value["taskId"],
                "passage_count": len(value["passages"]),
                "indexing_metrics": value["task"],
            }
            for paper_id, value in documents.items()
        },
        "questions": len(rows),
        "refusal_questions": sum(row["should_refuse"] for row in rows),
    }
    (root / args.run_manifest).write_text(
        json.dumps(run_manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"space_id={space['id']}")
    print(f"dataset={args.output}")
    print(f"token_file={args.token_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--base-url", default=os.getenv("APP_BASE_URL", "http://localhost:8080"))
    parser.add_argument("--manifest", default="evaluation/manifest.json")
    parser.add_argument("--questions", default="evaluation/questions.source.jsonl")
    parser.add_argument("--output", default="evaluation/dataset.jsonl")
    parser.add_argument("--run-manifest", default="evaluation/run-manifest.json")
    parser.add_argument("--token-file", default="tmp/evaluation-token")
    parser.add_argument("--username")
    parser.add_argument("--password-env", default="EVAL_PASSWORD")
    parser.add_argument("--space-name", default="AI, LLM and RAG Evaluation Corpus")
    parser.add_argument("--task-timeout", type=int, default=900)
    parser.add_argument("--download", action="store_true")
    prepare(parser.parse_args())
