# 离线评测数据

本目录提供 AI / 大模型 / RAG 主题的固定离线评测集：12 篇 Creative Commons 论文、40 条证据问题和 10 条拒答问题。

## 文件说明

- `manifest.json`：论文题名、作者、许可、固定下载地址、页数和 SHA-256。
- `questions.source.jsonl`：人工编写的问题、判断标准、预期答案、页码和证据锚点。
- `dataset.jsonl`：索引后物化的文档元数据、原文片段和稳定 passage ID。
- `dataset.schema.json`：物化数据的 JSON Schema。
- `run-manifest.json`：本次建库的文档、任务、passage 数量和各阶段索引耗时。
- `results.json`：三种策略的汇总指标与 150 条逐题运行记录。
- `papers/`：本地 PDF 目录；除 `.gitkeep` 外均被 Git 忽略。

## 准备语料

先启动 Docker 基础设施以及配置了 SiliconFlow、DeepSeek 的应用，然后运行：

```bash
python scripts/prepare_evaluation.py --download
```

脚本逐一下载并校验 SHA-256，注册隔离的评测用户和空间，异步上传 12 篇论文，等待 Qdrant 与 Lucene 索引完成，并生成 `dataset.jsonl`。JWT 写入已忽略的 `tmp/evaluation-token`；不要提交或打印该文件。

如果 PDF 已在 `evaluation/papers/`，可省略 `--download`，脚本仍会校验哈希。每次准备都会创建新的评测用户和空间；passage ID 由空间、文档 SHA-256、分段序号、页码和文本确定，在同一空间的失败重试或重建索引中保持稳定，并避免不同用户空间之间的主键与向量 point 冲突。

## 运行三方案评测

使用准备脚本输出的 `space_id`：

```bash
python scripts/evaluate.py --dataset evaluation/dataset.jsonl \
  --space-id <space_id> \
  --token-file tmp/evaluation-token \
  --mode answer \
  --output evaluation/results.json
```

运行器固定依次执行 `VECTOR`、`HYBRID_RRF`、`HYBRID_RERANK`，Top-K 为 5。`answer` 模式同时计算引用正确率、拒答准确率、模型耗时和 Provider 返回的真实 Token usage；只验证检索链路时可改用 `--mode retrieval`。

正式结果与指标定义见 [`../docs/benchmark.md`](../docs/benchmark.md)。
