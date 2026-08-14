package com.example.literature.config;

import com.example.literature.answer.AnswerGenerator;
import com.example.literature.answer.DisabledAnswerGenerator;
import com.example.literature.answer.GroundedAnswerService;
import com.example.literature.answer.SpringAiAnswerGenerator;
import com.example.literature.document.DocumentParser;
import com.example.literature.document.DocumentStorage;
import com.example.literature.document.LocalDocumentStorage;
import com.example.literature.document.PageAwareTextChunker;
import com.example.literature.document.PdfBoxDocumentParser;
import com.example.literature.document.LiteratureDocumentRepositoryAccess;
import com.example.literature.retrieval.DisabledEvidenceAdapter;
import com.example.literature.retrieval.DisabledVectorStore;
import com.example.literature.retrieval.EvidenceRetriever;
import com.example.literature.retrieval.QdrantEvidenceAdapter;
import com.example.literature.retrieval.RetrievalService;
import com.example.literature.retrieval.HybridEvidenceRetriever;
import com.example.literature.retrieval.KeywordEvidenceRetriever;
import com.example.literature.retrieval.Reranker;
import com.example.literature.metrics.RequestTraceService;
import java.util.concurrent.Executor;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class ModuleConfiguration {

    @Bean
    DocumentStorage documentStorage(ApplicationProperties properties) {
        return new LocalDocumentStorage(properties.storage().localRoot());
    }

    @Bean
    DocumentParser documentParser(ApplicationProperties properties) {
        return new PdfBoxDocumentParser(properties.documents().maxPages());
    }

    @Bean
    PageAwareTextChunker pageAwareTextChunker(ApplicationProperties properties) {
        return new PageAwareTextChunker(
                properties.documents().chunkSize(), properties.documents().chunkOverlap());
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.enabled", havingValue = "false", matchIfMissing = true)
    DisabledEvidenceAdapter disabledEvidenceAdapter() {
        return new DisabledEvidenceAdapter();
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.enabled", havingValue = "false", matchIfMissing = true)
    VectorStore disabledVectorStore() {
        return new DisabledVectorStore();
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true")
    QdrantEvidenceAdapter qdrantEvidenceAdapter(VectorStore vectorStore) {
        return new QdrantEvidenceAdapter(vectorStore);
    }

    @Bean
    RetrievalService retrievalService(
            EvidenceRetriever retriever,
            LiteratureDocumentRepositoryAccess documents,
            ApplicationProperties properties,
            HybridEvidenceRetriever hybrid) {
        return new RetrievalService(retriever, documents, properties.retrieval().minScore(), hybrid);
    }

    @Bean
    HybridEvidenceRetriever hybridEvidenceRetriever(
            EvidenceRetriever vector,
            KeywordEvidenceRetriever keyword,
            Reranker reranker,
            ApplicationProperties properties) {
        return new HybridEvidenceRetriever(vector, keyword, reranker, properties);
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.enabled", havingValue = "false", matchIfMissing = true)
    AnswerGenerator disabledAnswerGenerator() {
        return new DisabledAnswerGenerator();
    }

    @Bean
    @ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true")
    AnswerGenerator springAiAnswerGenerator(ChatClient.Builder builder) {
        return new SpringAiAnswerGenerator(builder);
    }

    @Bean
    GroundedAnswerService groundedAnswerService(
            RetrievalService retrieval, AnswerGenerator generator, RequestTraceService traces) {
        return new GroundedAnswerService(retrieval, generator, traces);
    }

    @Bean(name = "indexingExecutor")
    Executor indexingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("indexing-");
        executor.initialize();
        return executor;
    }
}
