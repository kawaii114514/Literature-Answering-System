# Offline evaluation data

`dataset.schema.json` defines the JSONL contract and `dataset.fixture.jsonl` is a three-row smoke fixture for the runner. The production dataset must contain at least 50 manually verified questions over 10–20 openly licensed papers, including 20% refusal questions. Keep PDFs or download manifests outside the application database, record each source URL and SHA-256 in `manifest.json`, and fill page numbers, excerpts, and passage IDs only after indexing the exact same files used by the evaluation.
