# 检索评测

本文件只记录真实运行结果。机器可读逐题明细位于 [`evaluation/results.json`](../evaluation/results.json)，论文来源、许可、下载地址和 SHA-256 位于 [`evaluation/manifest.json`](../evaluation/manifest.json)。

## 结论

在相同的 12 篇论文、50 条问题、模型、分段参数、阈值和 Top-K 下，Top-5 证据命中率由纯向量检索的 **42.5%** 提升至混合检索加重排序的 **87.5%**，提升 **45.0 个百分点**。因此项目说明中的实测值为 `A = 42.5%`、`B = 87.5%`。

## 评测集与口径

- 语料：BEIR、BGE-M3、ColBERTv2、Contriever、REPLUG、Self-RAG、RAGAS、RAFT、RAPTOR、RankRAG、GraphRAG、Mistral 7B，共 12 篇明确采用 Creative Commons 许可的公开论文。
- 数据：50 条人工核验问题，其中 40 条可回答问题包含正确论文、页码、原文片段和稳定 passage ID；10 条（20%）为知识库外拒答问题。
- Top-5 证据命中率：40 条可回答问题中，前 5 条结果至少包含一个 gold passage ID 的比例；拒答问题不进入分母。
- Recall@5：每题 Top-5 命中的 gold passage 比例，再对 40 条可回答问题取平均。本数据集每题标注一个 gold passage，因此数值与 Top-5 命中率相同。
- 引用正确率：回答包含合法 citation 编号，且至少一个实际引用指向 gold passage 的可回答问题比例。
- 拒答准确率：10 条应拒答问题中实际返回拒答、且未调用回答模型的比例。
- 模型耗时与平均 Token：只统计实际调用回答模型的请求；Token 只采用 DeepSeek 响应中的真实 usage，拒答或 Provider 未返回 usage 时不估算。

## 固定配置

| 项目 | 配置 |
|---|---|
| 运行时间 | 2026-08-18 |
| CPU / 内存 | AMD Ryzen 7 5800H（8 核 16 线程）/ 15.9 GB |
| 操作系统 | Windows 10 19045 |
| Java / Docker | Java 17.0.11 / Docker 29.4.3 |
| MySQL / Redis / Qdrant | 8.4 / 7.4 / 1.14.1 |
| Embedding | SiliconFlow `BAAI/bge-m3`，1024 维，Cosine |
| Reranker | SiliconFlow `BAAI/bge-reranker-v2-m3` |
| Chat | DeepSeek 官方 `deepseek-v4-flash`，temperature 0 |
| 分段 | 1200 字符，重叠 200 字符 |
| 候选 / RRF | candidate multiplier 4 / `rrfK=60` |
| Top-K / 最低分数 | 5 / 0.65 |
| 运行模式 | SSE 回答模式，三种策略顺序执行 |

12 篇论文共生成 910 个 passage。每篇论文的解析、分段、向量索引、关键词索引和总耗时保存在 [`evaluation/run-manifest.json`](../evaluation/run-manifest.json)。

## 实测结果

| 策略 | Top-5 命中率 / Recall@5 | 可回答题接受率 | 引用正确率 | 拒答准确率 | 检索平均 / P95 | 模型平均 / P95 | 平均 Token |
|---|---:|---:|---:|---:|---:|---:|---:|
| `VECTOR` | 42.5% | 80.0% | 40.0% | 100% | 255.90 / 242 ms | 2662.81 / 4334 ms | 1400.75 |
| `HYBRID_RRF` | 70.0% | 95.0% | 67.5% | 100% | 160.64 / 233 ms | 2675.11 / 6822 ms | 1903.55 |
| `HYBRID_RERANK` | **87.5%** | 90.0% | **85.0%** | 100% | 512.96 / 829 ms | 2138.03 / 3939 ms | 1701.56 |

三种策略均无 HTTP 错误。重排序取得最高证据命中率与引用正确率，但平均检索耗时相对 `HYBRID_RRF` 增加约 352 ms，体现了外部重排调用的质量—延迟权衡。`VECTOR` 的两次冷启动/长尾耗时为 1657 ms 和 4158 ms，因此 50 个样本的平均值高于 nearest-rank P95；原始逐题值已完整保留。本次结果只代表上述固定语料与运行环境，不外推为通用模型排名。

## 复现

启动基础设施与 `siliconflow-deepseek` Profile 后运行：

```bash
python scripts/prepare_evaluation.py --download
python scripts/evaluate.py --dataset evaluation/dataset.jsonl \
  --space-id <prepare 脚本输出的 space_id> \
  --token-file tmp/evaluation-token \
  --mode answer \
  --output evaluation/results.json
```

准备脚本会校验每篇 PDF 的 SHA-256、异步上传并等待双索引完成，再根据页码和证据锚点生成 `dataset.jsonl`。PDF 与临时 Token 均被 Git 忽略。
