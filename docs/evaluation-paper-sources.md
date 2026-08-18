# AI / 大模型 / RAG 离线评测论文来源核验

核验日期：2026-08-18

## 核验口径

- 只使用作者提交的 arXiv 页面、ACL Anthology 正式出版页等一手来源核对标题、作者、摘要、PDF 和许可。
- URL 固定到具体论文版本，避免后续修订改变 PDF 页码。正式构建 manifest 时仍须对实际下载文件计算 SHA-256。
- “公开可读”不等于“允许在 GitHub 再分发”。arXiv 官方说明指出，`arXiv.org perpetual, non-exclusive license 1.0` 只授予 arXiv 有限分发权，并限制其他主体再利用；CC BY 4.0 则允许在署名条件下复制、分发和改编。[arXiv 许可说明](https://info.arxiv.org/help/license/index.html)
- ACL Anthology 说明 2016 年及以后发表的 ACL 材料采用 CC BY 4.0。因此 DPR 应使用其 ACL 正式版本，而不是根据 arXiv 的分发许可判断可再利用性。[ACL Anthology Copyright](https://aclanthology.org/faq/copyright/)
- 本文不是法律意见。公开仓库应优先收录明确为 Creative Commons 的版本，并保留作者、论文名、正式页面和许可链接。

## 候选论文（15 篇）

### 1. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

- 作者：Patrick Lewis、Ethan Perez、Aleksandra Piktus、Fabio Petroni、Vladimir Karpukhin、Naman Goyal、Heinrich Küttler、Mike Lewis、Wen-tau Yih、Tim Rocktäschel、Sebastian Riedel、Douwe Kiela。
- 固定来源：[arXiv 2005.11401v4](https://arxiv.org/abs/2005.11401v4)；[PDF](https://arxiv.org/pdf/2005.11401v4)。
- 评测价值：定义结合参数化 seq2seq 模型、Wikipedia 稠密向量索引和神经检索器的经典 RAG，并比较 RAG-Sequence 与 RAG-Token；适合作为概念来源和人工问题设计参考。标题、作者和上述内容均可由[作者提交的摘要页](https://arxiv.org/abs/2005.11401v4)核验。
- 许可：摘要页明确链接到 [arXiv non-exclusive distribution license 1.0](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)。公开可下载，但该许可不支持本项目再分发，因此不建议进入需要随仓库发布 PDF 的最终语料。

### 2. Dense Passage Retrieval for Open-Domain Question Answering

- 作者：Vladimir Karpukhin、Barlas Oğuz、Sewon Min、Patrick Lewis、Ledell Wu、Sergey Edunov、Danqi Chen、Wen-tau Yih。
- 正式来源：[ACL Anthology 2020.emnlp-main.550](https://aclanthology.org/2020.emnlp-main.550/)；[PDF](https://aclanthology.org/2020.emnlp-main.550.pdf)。固定预印本：[arXiv 2004.04906v3](https://arxiv.org/abs/2004.04906v3)。
- 评测价值：以双编码器稠密表示替代传统 TF-IDF/BM25，并直接报告与 Lucene-BM25 的对比；与项目的 VECTOR、BM25 和混合检索三方案高度对应。[ACL 正式页](https://aclanthology.org/2020.emnlp-main.550/)
- 许可：应使用 ACL 正式 PDF。该论文发表于 2020 年，ACL Anthology 对 2016 年以后材料明确采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 3. BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of Information Retrieval Models

- 作者：Nandan Thakur、Nils Reimers、Andreas Rücklé、Abhishek Srivastava、Iryna Gurevych。
- 固定来源：[arXiv 2104.08663v4](https://arxiv.org/abs/2104.08663v4)；[PDF](https://arxiv.org/pdf/2104.08663v4)。
- 评测价值：提供跨任务、跨领域的异构零样本信息检索基准，并比较词法、稀疏、稠密和重排序方法；适合设计检索指标、负例和方法对比问题。[作者提交的摘要页](https://arxiv.org/abs/2104.08663v4)
- 许可：摘要页明确链接到 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)；可署名再利用，但改编材料须采用相同许可。

### 4. M3-Embedding: Multi-Linguality, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation

- 作者：Jianlv Chen、Shitao Xiao、Peitian Zhang、Kun Luo、Defu Lian、Zheng Liu。
- 固定来源：[arXiv 2402.03216v5](https://arxiv.org/abs/2402.03216v5)；[PDF](https://arxiv.org/pdf/2402.03216v5)。官方实现：[FlagOpen/FlagEmbedding](https://github.com/FlagOpen/FlagEmbedding)。
- 评测价值：论文对应 BGE-M3，统一支持 dense、sparse 和 multi-vector retrieval，并覆盖多语言与长文档；与项目既定 Embedding 模型和混合检索实现直接对应。[作者提交的摘要页](https://arxiv.org/abs/2402.03216v5)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。代码许可应另以官方仓库为准。

### 5. Text Embeddings by Weakly-Supervised Contrastive Pre-training

- 作者：Liang Wang、Nan Yang、Xiaolong Huang、Binxing Jiao、Linjun Yang、Daxin Jiang、Rangan Majumder、Furu Wei。
- 固定来源：[arXiv 2212.03533v2](https://arxiv.org/abs/2212.03533v2)；[PDF](https://arxiv.org/pdf/2212.03533v2)。
- 评测价值：介绍 E5 文本向量通过弱监督对比学习进行大规模预训练，并考察多类文本向量和检索任务；可作为 BGE-M3 之外的 Embedding 训练路线对照。[作者提交的摘要页](https://arxiv.org/abs/2212.03533v2)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 6. ColBERTv2: Effective and Efficient Retrieval via Lightweight Late Interaction

- 作者：Keshav Santhanam、Omar Khattab、Jon Saad-Falcon、Christopher Potts、Matei Zaharia。
- 固定来源：[arXiv 2112.01488v3](https://arxiv.org/abs/2112.01488v3)；[PDF](https://arxiv.org/pdf/2112.01488v3)。
- 评测价值：在 late interaction 检索基础上引入残差压缩和去噪监督，兼顾检索质量与空间效率；适合区分单向量检索、多向量检索和交叉编码重排。[作者提交的摘要页](https://arxiv.org/abs/2112.01488v3)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 7. Unsupervised Dense Information Retrieval with Contrastive Learning

- 作者：Gautier Izacard、Mathilde Caron、Lucas Hosseini、Sebastian Riedel、Piotr Bojanowski、Armand Joulin、Edouard Grave。
- 固定来源：[arXiv 2112.09118v4](https://arxiv.org/abs/2112.09118v4)；[PDF](https://arxiv.org/pdf/2112.09118v4)。
- 评测价值：提出 Contriever，以无监督对比学习训练通用稠密检索器并考察零样本迁移；适合作为无标注稠密检索和监督式方案的概念对照。[作者提交的摘要页](https://arxiv.org/abs/2112.09118v4)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 8. REPLUG: Retrieval-Augmented Black-Box Language Models

- 作者：Weijia Shi、Sewon Min、Michihiro Yasunaga、Minjoon Seo、Rich James、Mike Lewis、Luke Zettlemoyer、Wen-tau Yih。
- 固定来源：[arXiv 2301.12652v4](https://arxiv.org/abs/2301.12652v4)；[PDF](https://arxiv.org/pdf/2301.12652v4)。
- 评测价值：研究不修改黑盒语言模型、仅通过检索和输入接口增强模型的方案，并利用语言模型信号训练检索器；与外部模型 API 驱动的 RAG 应用结构接近。[作者提交的摘要页](https://arxiv.org/abs/2301.12652v4)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 9. Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection

- 作者：Akari Asai、Zeqiu Wu、Yizhong Wang、Avirup Sil、Hannaneh Hajishirzi。
- 固定来源：[arXiv 2310.11511v1](https://arxiv.org/abs/2310.11511v1)；[PDF](https://arxiv.org/pdf/2310.11511v1)。
- 评测价值：通过 reflection tokens 让模型按需检索、生成并批判检索片段和自身输出，并报告事实性与引用准确率；与项目的证据约束回答、引用和拒答直接相关。[作者提交的摘要页](https://arxiv.org/abs/2310.11511v1)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 10. Ragas: Automated Evaluation of Retrieval Augmented Generation

- 作者：Shahul Es、Jithin James、Luis Espinosa-Anke、Steven Schockaert。
- 正式来源：[ACL Anthology 2024.eacl-demo.16](https://aclanthology.org/2024.eacl-demo.16/)；[PDF](https://aclanthology.org/2024.eacl-demo.16.pdf)。固定预印本：[arXiv 2309.15217v2](https://arxiv.org/abs/2309.15217v2)。
- 评测价值：将 RAG 评测拆分为检索上下文、回答忠实性和生成质量等维度；适合为 Recall@5、引用正确率和拒答准确率设计判断标准。[ACL 正式页](https://aclanthology.org/2024.eacl-demo.16/)
- 许可：ACL 正式版本和 arXiv 版本都明确为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 11. RAFT: Adapting Language Model to Domain Specific RAG

- 作者：Tianjun Zhang、Shishir G. Patil、Naman Jain、Sheng Shen、Matei Zaharia、Ion Stoica、Joseph E. Gonzalez。
- 固定来源：[arXiv 2403.10131v2](https://arxiv.org/abs/2403.10131v2)；[PDF](https://arxiv.org/pdf/2403.10131v2)。
- 评测价值：研究面向特定领域 RAG 的模型适配、干扰文档以及基于文档生成带引用回答；适合构造“相关证据与干扰证据共存”的检索和拒答问题。[作者提交的摘要页](https://arxiv.org/abs/2403.10131v2)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 12. RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval

- 作者：Parth Sarthi、Salman Abdullah、Aditi Tuli、Shubh Khanna、Anna Goldie、Christopher D. Manning。
- 固定来源：[arXiv 2401.18059v1](https://arxiv.org/abs/2401.18059v1)；[PDF](https://arxiv.org/pdf/2401.18059v1)。
- 评测价值：递归地嵌入、聚类并摘要文本块，形成可在不同抽象层次检索的树；适合比较扁平分段检索与长文档层次检索。[作者提交的摘要页](https://arxiv.org/abs/2401.18059v1)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 13. RankRAG: Unifying Context Ranking with Retrieval-Augmented Generation in LLMs

- 作者：Yue Yu、Wei Ping、Zihan Liu、Boxin Wang、Jiaxuan You、Chao Zhang、Mohammad Shoeybi、Bryan Catanzaro。
- 固定来源：[arXiv 2407.02485v1](https://arxiv.org/abs/2407.02485v1)；[PDF](https://arxiv.org/pdf/2407.02485v1)。
- 评测价值：把上下文排序与 RAG 回答生成统一到语言模型中，直接对应本项目“混合检索加重排序”方案；适合提取候选排序、训练任务和端到端结果证据。[作者提交的摘要页](https://arxiv.org/abs/2407.02485v1)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 14. From Local to Global: A Graph RAG Approach to Query-Focused Summarization

- 作者：Darren Edge、Ha Trinh、Newman Cheng、Joshua Bradley、Alex Chao、Apurva Mody、Steven Truitt、Dasha Metropolitansky、Robert Osazuwa Ness、Jonathan Larson。
- 固定来源：[arXiv 2404.16130v2](https://arxiv.org/abs/2404.16130v2)；[PDF](https://arxiv.org/pdf/2404.16130v2)。
- 评测价值：使用实体知识图谱与社区摘要回答面向整个语料库的全局问题，补充普通 chunk 级 RAG 不擅长的 query-focused summarization 场景。[作者提交的摘要页](https://arxiv.org/abs/2404.16130v2)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

### 15. Mistral 7B

- 作者：Albert Q. Jiang、Alexandre Sablayrolles、Arthur Mensch、Chris Bamford、Devendra Singh Chaplot、Diego de las Casas、Florian Bressand、Gianna Lengyel、Guillaume Lample、Lucile Saulnier、Lélio Renard Lavaud、Marie-Anne Lachaux、Pierre Stock、Teven Le Scao、Thibaut Lavril、Thomas Wang、Timothée Lacroix、William El Sayed。
- 固定来源：[arXiv 2310.06825v1](https://arxiv.org/abs/2310.06825v1)；[PDF](https://arxiv.org/pdf/2310.06825v1)。
- 评测价值：补充通用大模型主题，涵盖 grouped-query attention、sliding-window attention、模型效率和基准结果，可避免 50 条问题全部集中在检索算法。[作者提交的摘要页](https://arxiv.org/abs/2310.06825v1)
- 许可：摘要页明确链接到 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。模型权重和代码的许可必须另行核验，不能从论文许可推导。

## 推荐的 12 篇最终语料

建议使用下列 12 篇。它们的论文 PDF 均具有明确 Creative Commons 许可，同时覆盖通用大模型、稀疏/稠密/多向量检索、Embedding、RAG、重排序、层次检索、GraphRAG 和评测。40 条可回答问题加 10 条语料中无答案的拒答问题，正好形成 50 条、20% 拒答比例。

| 论文 | 覆盖主题 | 建议可回答问题数 |
| --- | --- | ---: |
| BEIR | 检索基准、稀疏/稠密/重排序对比 | 3 |
| M3-Embedding | BGE-M3、多语言、dense/sparse/multi-vector | 4 |
| ColBERTv2 | Late interaction、压缩、多向量检索 | 3 |
| Unsupervised Dense Information Retrieval with Contrastive Learning | Contriever、对比学习、零样本检索 | 3 |
| REPLUG | 黑盒 LLM、可替换检索器 | 3 |
| Self-RAG | 按需检索、自反思、引用事实性 | 4 |
| Ragas | RAG 评测维度 | 3 |
| RAFT | 领域 RAG、干扰文档、引用式回答 | 3 |
| RAPTOR | 层次聚类、递归摘要、长文档检索 | 3 |
| RankRAG | 上下文重排序与生成 | 4 |
| From Local to Global | GraphRAG、局部/全局问题 | 3 |
| Mistral 7B | 通用大模型、GQA、滑动窗口注意力 | 4 |
| **合计** |  | **40** |

经典 RAG 原始论文保留为概念参考，但因其 arXiv 版本只有 non-exclusive distribution license，不进入公开 PDF 语料。DPR 和 E5 均为许可明确的备选：若想增加项目自身“向量与 BM25”对照，可用 DPR 替换 GraphRAG；若想强化文本向量训练主题，可用 E5 替换 Mistral 7B。

## 落地建议

1. manifest 记录论文 ID、固定版本 landing URL、固定版本 PDF URL、SHA-256、许可名称和许可 URL；不要只保存会指向最新版的无版本 PDF URL。
2. BEIR 为 CC BY-SA 4.0，若发布其改编材料须遵守相同许可；其他推荐论文为 CC BY 4.0。每份 PDF 和评测条目都应保留归属信息。
3. 页码、证据片段和 passage ID 必须基于最终入库的同一个 PDF 人工核验；更换 arXiv 版本或正式出版版本后必须重新核对。
4. 每个可回答问题只指定能够直接支持答案的片段；跨页证据需记录全部 gold passage ID。10 条拒答题不得在 12 篇语料中存在直接支持证据。
5. 运行三种检索策略前固定文档 SHA-256、分段参数、Embedding 模型、Top-K、阈值和运行环境，否则 Top-5 对比不公平。
