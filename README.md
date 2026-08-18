# 科研文献证据检索与问答系统

面向科研论文的 Java RAG 后端。系统支持 JWT 与个人/课题组权限隔离、文本型 PDF 异步解析、页码感知分段、Lucene BM25 + Qdrant 向量混合检索、外部重排序、证据引用、严格拒答、SSE 流式回答，以及请求与 Token 指标持久化。

## 技术栈

- Java 17、Spring Boot 3.5.9、Spring AI 1.1.8
- Spring Security + JWT：用户认证与个人/课题组空间授权
- MySQL 8.4：文献、证据、任务和会话的持久真相
- Redis 7.4：会话快照缓存；不可用时自动回退 MySQL
- Qdrant 1.14.1：可重建的向量检索索引
- Apache Lucene 9.12.1：BM25 关键词检索索引
- Apache PDFBox 3.0.7：逐页解析文本型 PDF
- Flyway、Micrometer、Springdoc OpenAPI、JUnit 5、Docker Compose

领域词汇见 [CONTEXT.md](CONTEXT.md)，架构取舍见 [docs/adr](docs/adr)。

## 本地启动

### 1. 启动基础设施

```bash
docker compose up -d
```

### 2. 无模型凭据启动

```bash
mvn spring-boot:run
```

应用可以在没有模型密钥时启动，Swagger UI 位于 <http://localhost:8080/swagger-ui.html>。此模式可使用文献和会话接口；索引或检索会返回明确的 Provider 未配置错误，并在异步任务中记录失败原因。

### 3. 启用 OpenAI-compatible Provider

复制 `.env.example` 中的配置到本机环境变量，至少设置 `OPENAI_API_KEY`，然后运行：

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=openai
```

可通过 `OPENAI_BASE_URL`、`OPENAI_CHAT_MODEL` 和 `OPENAI_EMBEDDING_MODEL` 切换兼容服务。不要提交真实密钥。

### 4. 使用 SiliconFlow BGE + 官方 DeepSeek

项目推荐使用硅基流动的 `BAAI/bge-m3` 做向量化、`BAAI/bge-reranker-v2-m3` 做重排序，使用 DeepSeek 官方模型生成最终回答。两个 Provider 使用独立 API Key。先复制示例文件并只在本地 `.env` 中填写真实 Key：

```powershell
Copy-Item .env.example .env
# 编辑 .env，填写 SILICONFLOW_API_KEY 和 DEEPSEEK_API_KEY
mvn spring-boot:run -Dspring-boot.run.profiles=siliconflow-deepseek
```

Spring Boot 会把项目根目录的 `.env` 作为可选配置读取；操作系统环境变量和 IDE 运行配置仍可覆盖其中的值。该 Profile 使用 SiliconFlow OpenAI-compatible `/v1/embeddings` 和 Cohere-compatible `/v1/rerank`，以及 DeepSeek 官方 Chat Provider。不要提交真实密钥。

默认开发用户与知识空间 ID 均为：

```text
00000000-0000-0000-0000-000000000001
```

## 核心流程

### 登录与权限

生产模式要求 JWT。先注册或登录获得 Bearer Token：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"researcher","displayName":"Researcher","password":"change-me-now"}' \
  http://localhost:8080/api/v1/auth/register
```

文献、检索、回答和任务接口均按个人空间或课题组成员角色授权。`OWNER`、`EDITOR` 可以修改文档，`VIEWER` 只能查看和检索。

注册后先创建个人知识空间，并把返回的 ID 保存为 `SPACE_ID`：

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"My Literature Space"}' http://localhost:8080/api/v1/spaces
```

### 上传 PDF

```bash
curl -F "file=@paper.pdf" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/spaces/$SPACE_ID/documents
```

接口返回 `202 Accepted`、`documentId` 和 `taskId`。单文件限制为 50 MB、500 页；系统校验扩展名、PDF 文件头，并按同一知识空间内的 SHA-256 去重。

### 查询异步任务

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/indexing-tasks/{taskId}
```

任务保留 `status`、`attemptCount`、`failureReason` 和各阶段时间。失败任务可重新排队：

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/indexing-tasks/{taskId}/retry
```

### 检索证据

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What evidence supports hybrid retrieval?","limit":10}' \
  http://localhost:8080/api/v1/spaces/$SPACE_ID/retrieval
```

每条结果包含稳定的 `citationNumber`、文献 ID/标题、页码范围、原文片段和分数。默认最低证据分数为 `0.65`，可通过 `APP_RETRIEVAL_MIN_SCORE` 调整。

请求可通过 `strategy` 选择 `VECTOR`、`HYBRID_RRF` 或 `HYBRID_RERANK`；默认使用 `HYBRID_RRF`。重排策略需要配置 Cohere-compatible `RERANK_BASE_URL`、`RERANK_API_KEY` 和 `RERANK_MODEL`。

已授权用户也可以查询某篇文献的分段及稳定 passage ID，用于核验引用或构建评测集：

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/spaces/$SPACE_ID/documents/$DOCUMENT_ID/passages
```

### SSE 流式回答

```bash
curl -N -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Compare the reported retrieval methods.","limit":5,"strategy":"HYBRID_RERANK"}' \
  http://localhost:8080/api/v1/spaces/$SPACE_ID/answers/stream
```

事件顺序为 `citations` → 多个 `token` → `metrics` → `done`。没有支持证据时返回 `refusal` → `metrics` → `done`，不会调用模型补全答案。`metrics` 只转发 Provider 实际返回的 Token usage；Provider 未返回时保留为空，不进行估算。

单次请求明细保存在 MySQL `request_trace`；Micrometer 同时记录解析、分段、双索引、检索、融合、重排、模型和总请求 Timer，并发布 P95。开发环境可通过 `GET /actuator/metrics` 查看 meter 列表。

### 会话保存与恢复

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hybrid retrieval notes"}' \
  http://localhost:8080/api/v1/spaces/$SPACE_ID/conversations
```

追加消息使用 `/conversations/{conversationId}/messages`，恢复使用 `GET /conversations/{conversationId}`。会话先写 MySQL，再缓存到 Redis 30 分钟；缓存未命中或 Redis 故障时从 MySQL 恢复并重新加热缓存。

## 验证

```bash
mvn test
docker compose config --quiet
```

## 项目地址

- GitHub：[kawaii114514/Literature-Answering-System](https://github.com/kawaii114514/Literature-Answering-System)
- 在线演示：TODO（待提供真实部署地址）

测试不需要 API Key、MySQL、Redis 或 Qdrant。H2 负责校验 Flyway schema/JPA 映射；外部模型与向量检索通过禁用适配器验证清晰失败行为。

## 当前边界

- 仅保证含文本层的 PDF；扫描件 OCR、复杂表格和公式解析尚未实现。
- 默认数据库只预置本地开发用户和知识空间；生产环境应通过注册/登录及成员接口创建并授权用户。
- 已实现 Lucene BM25、Qdrant 向量检索和 RRF 融合；`HYBRID_RERANK` 依赖显式配置且可用的外部重排服务，失败时返回明确错误，不静默降级。
- 会话已持久化并可快速恢复；多轮问题改写与引用继承尚未实现。
- 当前评测集为 12 篇公开许可论文、40 条证据问题和 10 条拒答问题；PDF 通过 manifest 下载并校验 SHA-256，不随仓库再分发。

## 离线评测

固定语料来源、许可和 SHA-256 见 `evaluation/manifest.json`，50 条人工核验标签见 `evaluation/questions.source.jsonl`。启动带模型配置的应用后，下载论文、建库并生成稳定 passage 标签：

```bash
python scripts/prepare_evaluation.py --download
```

脚本打印评测空间 ID，并把 Token 写入已忽略的 `tmp/evaluation-token`。随后在回答模式下对同一语料依次运行 `VECTOR`、`HYBRID_RRF` 和 `HYBRID_RERANK`：

```bash
python scripts/evaluate.py --dataset evaluation/dataset.jsonl \
  --space-id <prepare 脚本输出的 space_id> \
  --token-file tmp/evaluation-token \
  --mode answer \
  --output evaluation/results.json
```

2026-08-18 的固定配置实测中，Top-5 证据命中率由向量基线的 **42.5%** 提升至混合检索加重排序的 **87.5%**（+45.0 个百分点）。完整环境、口径和三方案结果见 [docs/benchmark.md](docs/benchmark.md)，机器可读明细见 [evaluation/results.json](evaluation/results.json)。
