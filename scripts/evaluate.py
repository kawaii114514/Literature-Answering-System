#!/usr/bin/env python3
"""Run a fixed evidence corpus through all retrieval strategies."""

import argparse
import json
import math
import os
from pathlib import Path
import re
import statistics
import time
import urllib.error
import urllib.request


STRATEGIES = ("VECTOR", "HYBRID_RRF", "HYBRID_RERANK")


def percentile95(values):
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * 0.95) - 1)]


def parse_sse(body):
    events = []
    current_event = "message"
    data_lines = []
    for line in body.replace("\r\n", "\n").split("\n"):
        if not line:
            if data_lines:
                events.append((current_event, "\n".join(data_lines)))
            current_event = "message"
            data_lines = []
        elif line.startswith("event:"):
            current_event = line[6:].strip()
        elif line.startswith("data:"):
            data_lines.append(line[5:].lstrip())
    if data_lines:
        events.append((current_event, "\n".join(data_lines)))
    return events


def request(base_url, space_id, item, strategy, token, mode):
    if mode == "answer":
        path = f"/api/v1/spaces/{space_id}/answers/stream"
        payload = {"question": item["question"], "limit": 5, "strategy": strategy}
        accept = "text/event-stream"
    else:
        path = f"/api/v1/spaces/{space_id}/retrieval"
        payload = {"query": item["question"], "limit": 5, "strategy": strategy}
        accept = "application/json"
    headers = {"Content-Type": "application/json", "Accept": accept}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
        network_latency = (time.perf_counter() - started) * 1000
        if mode == "retrieval":
            return {
                "citations": json.loads(body).get("citations", []),
                "refused": False,
                "answer": None,
                "metrics": {"retrievalDurationMs": network_latency},
                "network_latency_ms": network_latency,
                "http_error": None,
            }
        events = parse_sse(body)
        citations = []
        answer_tokens = []
        metrics = {}
        refused = False
        for event, data in events:
            if event == "citations":
                citations = json.loads(data)
            elif event == "token":
                answer_tokens.append(json.loads(data)["text"])
            elif event == "refusal":
                refused = True
            elif event == "metrics":
                metrics = json.loads(data)
        return {
            "citations": citations,
            "refused": refused,
            "answer": "".join(answer_tokens),
            "metrics": metrics,
            "network_latency_ms": network_latency,
            "http_error": None,
        }
    except urllib.error.HTTPError as error:
        return {
            "citations": [],
            "refused": False,
            "answer": None,
            "metrics": {},
            "network_latency_ms": (time.perf_counter() - started) * 1000,
            "http_error": error.code,
        }


def evaluate(args):
    with open(args.dataset, encoding="utf-8") as handle:
        questions = [json.loads(line) for line in handle if line.strip()]
    token = args.token
    if args.token_file:
        token = Path(args.token_file).read_text(encoding="utf-8").strip()
    rows = []
    for strategy in STRATEGIES:
        for index, item in enumerate(questions, start=1):
            response = request(args.base_url, args.space_id, item, strategy, token, args.mode)
            citations = response["citations"]
            found = {citation.get("passageId") for citation in citations}
            gold = set(item.get("gold_passage_ids", []))
            overlap = found & gold
            cited_numbers = {
                int(value) for value in re.findall(r"\[(\d+)]", response["answer"] or "")
            }
            citations_by_number = {
                citation.get("citationNumber"): citation.get("passageId") for citation in citations
            }
            cited_passages = {
                citations_by_number[number]
                for number in cited_numbers
                if number in citations_by_number
            }
            citation_correct = None
            if args.mode == "answer" and not item.get("should_refuse", False):
                citation_correct = (
                    bool(cited_numbers)
                    and cited_numbers <= set(citations_by_number)
                    and bool(cited_passages & gold)
                )
            metrics = response["metrics"]
            rows.append({
                "id": item["id"],
                "strategy": strategy,
                "top5_hit": bool(overlap),
                "recall_at_5": len(overlap) / len(gold) if gold else None,
                "returned_citations": len(citations),
                "cited_numbers": sorted(cited_numbers),
                "citation_correct": citation_correct,
                "refused": response["refused"] if args.mode == "answer" else not citations,
                "expected_refusal": item.get("should_refuse", False),
                "retrieval_latency_ms": metrics.get("retrievalDurationMs"),
                "fusion_latency_ms": metrics.get("fusionDurationMs"),
                "rerank_latency_ms": metrics.get("rerankDurationMs"),
                "model_latency_ms": metrics.get("modelDurationMs"),
                "prompt_tokens": metrics.get("promptTokens"),
                "completion_tokens": metrics.get("completionTokens"),
                "total_tokens": metrics.get("totalTokens"),
                "network_latency_ms": response["network_latency_ms"],
                "http_error": response["http_error"],
            })
            if index % 10 == 0:
                print(f"{strategy}: {index}/{len(questions)}")
    summary = {}
    for strategy in STRATEGIES:
        subset = [row for row in rows if row["strategy"] == strategy]
        answerable = [row for row in subset if not row["expected_refusal"]]
        refusal = [row for row in subset if row["expected_refusal"]]
        retrieval_latencies = [
            row["retrieval_latency_ms"] for row in subset
            if row["retrieval_latency_ms"] is not None
        ]
        model_latencies = [
            row["model_latency_ms"] for row in subset
            if row["model_latency_ms"] is not None
        ]
        token_values = [
            row["total_tokens"] for row in subset if row["total_tokens"] is not None
        ]
        citation_values = [
            row["citation_correct"] for row in answerable
            if row["citation_correct"] is not None
        ]
        summary[strategy] = {
            "questions": len(subset),
            "answerable_questions": len(answerable),
            "refusal_questions": len(refusal),
            "top5_evidence_hit_rate": sum(row["top5_hit"] for row in answerable) / len(answerable),
            "recall_at_5": statistics.mean(row["recall_at_5"] for row in answerable),
            "answerable_acceptance_rate": sum(not row["refused"] for row in answerable) / len(answerable),
            "refusal_accuracy": sum(row["refused"] for row in refusal) / len(refusal),
            "citation_correctness": statistics.mean(citation_values) if citation_values else None,
            "average_retrieval_latency_ms": statistics.mean(retrieval_latencies) if retrieval_latencies else None,
            "p95_retrieval_latency_ms": percentile95(retrieval_latencies),
            "average_model_latency_ms": statistics.mean(model_latencies) if model_latencies else None,
            "p95_model_latency_ms": percentile95(model_latencies),
            "average_total_tokens": statistics.mean(token_values) if token_values else None,
            "total_tokens": sum(token_values) if token_values else None,
            "http_errors": sum(row["http_error"] is not None for row in subset),
        }
    output = {
        "environment": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "base_url": args.base_url,
            "space_id": args.space_id,
            "mode": args.mode,
            "top_k": 5,
            "embedding_model": args.embedding_model,
            "rerank_model": args.rerank_model,
            "chat_model": args.chat_model,
        },
        "summary": summary,
        "rows": rows,
    }
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-url", default=os.getenv("APP_BASE_URL", "http://localhost:8080"))
    parser.add_argument("--space-id", required=True)
    parser.add_argument("--token", default=os.getenv("APP_TOKEN", ""))
    parser.add_argument("--token-file")
    parser.add_argument("--mode", choices=("retrieval", "answer"), default="retrieval")
    parser.add_argument("--embedding-model", default="BAAI/bge-m3")
    parser.add_argument("--rerank-model", default="BAAI/bge-reranker-v2-m3")
    parser.add_argument("--chat-model", default="deepseek-v4-flash")
    evaluate(parser.parse_args())
