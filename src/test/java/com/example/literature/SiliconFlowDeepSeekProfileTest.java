package com.example.literature;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {
        "app.ai.enabled=false",
        "spring.ai.vectorstore.type=none",
        "spring.ai.model.chat=deepseek",
        "spring.ai.model.embedding=openai",
        "spring.ai.deepseek.api-key=test-deepseek-key",
        "spring.ai.openai.api-key=test-siliconflow-key",
        "spring.ai.openai.embedding.api-key=test-siliconflow-key",
        "spring.ai.openai.embedding.base-url=http://localhost:1",
        "spring.ai.deepseek.base-url=http://localhost:1"
})
@ActiveProfiles({"test", "siliconflow-deepseek"})
class SiliconFlowDeepSeekProfileTest {

    @Autowired
    private Environment environment;

    @Autowired
    private ChatModel chatModel;

    @Autowired
    private EmbeddingModel embeddingModel;

    @Test
    void loadsIndependentDeepSeekChatAndSiliconFlowEmbeddingProviders() {
        assertThat(environment.getProperty("spring.ai.model.chat")).isEqualTo("deepseek");
        assertThat(environment.getProperty("spring.ai.model.embedding")).isEqualTo("openai");
        assertThat(environment.getProperty("spring.ai.deepseek.chat.options.model"))
                .isEqualTo("deepseek-v4-flash");
        assertThat(chatModel).isNotNull();
        assertThat(embeddingModel).isNotNull();
    }
}
