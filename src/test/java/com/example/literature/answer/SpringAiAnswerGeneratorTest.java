package com.example.literature.answer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import reactor.core.publisher.Flux;

class SpringAiAnswerGeneratorTest {

    @Test
    void skipsMetadataOnlyChunksWithNullText() {
        ChatResponse metadataOnly = response(null);
        ChatResponse content = response("grounded answer [1]");

        List<String> chunks = SpringAiAnswerGenerator.textChunks(Flux.just(metadataOnly, content))
                .collectList()
                .block();

        assertThat(chunks).containsExactly("grounded answer [1]");
    }

    private static ChatResponse response(String text) {
        return new ChatResponse(List.of(new Generation(new AssistantMessage(text))));
    }
}
