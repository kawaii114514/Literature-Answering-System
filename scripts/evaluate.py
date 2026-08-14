#!/usr/bin/env python3
"""Run the same offline evidence questions through all retrieval strategies."""
import argparse
import json
import os
import statistics
import time
import urllib.error
import urllib.request


STRATEGIES = ("VECTOR", "HYBRID_RRF", "HYBRID_RERANK")


def request(base_url, space_id, item, strategy, token):
    payload = json.dumps({"query": item["question"], "limit": 5, "strategy": strategy}).encode()
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/v1/spaces/{space_id}/retrieval",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = json.loads(response.read())
            return body.get("citations", []), (time.perf_counter() - started) * 1000, None
    except urllib.error.HTTPError as error:
        return [], (time.perf_counter() - started) * 1000, error.code


def evaluate(args):
    with open(args.dataset, encoding="utf-8") as handle:
        questions = [json.loads(line) for line in handle if line.strip()]
    rows = []
    for strategy in STRATEGIES:
        for item in questions:
            citations, latency, error = request(args.base_url, args.space_id, item, strategy, args.token)
            found = {citation.get("passageId") for citation in citations}
            gold = set(item.get("gold_passage_ids", []))
            hit = bool(found & gold)
            refused = not citations
            rows.append({"id": item["id"], "strategy": strategy, "top5_hit": hit,
                         "refused": refused, "expected_refusal": item.get("should_refuse", False),
                         "latency_ms": latency, "http_error": error})
    summary = {}
    for strategy in STRATEGIES:
        subset = [row for row in rows if row["strategy"] == strategy]
        latencies = [row["latency_ms"] for row in subset]
        summary[strategy] = {
            "questions": len(subset),
            "top5_evidence_hit_rate": sum(row["top5_hit"] for row in subset) / len(subset) if subset else 0,
            "refusal_accuracy": sum(row["refused"] == row["expected_refusal"] for row in subset) / len(subset) if subset else 0,
            "average_latency_ms": statistics.mean(latencies) if latencies else 0,
            "p95_latency_ms": sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)] if latencies else 0,
        }
    output = {"environment": {"base_url": args.base_url, "space_id": args.space_id},
              "summary": summary, "rows": rows}
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-url", default=os.getenv("APP_BASE_URL", "http://localhost:8080"))
    parser.add_argument("--space-id", required=True)
    parser.add_argument("--token", default=os.getenv("APP_TOKEN", ""))
    evaluate(parser.parse_args())
