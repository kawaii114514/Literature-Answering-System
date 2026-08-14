package com.example.literature.answer;

import com.example.literature.retrieval.RetrievalUnavailableException;
import com.example.literature.retrieval.RetrievedEvidence;
import java.util.List;
import reactor.core.publisher.Flux;
import java.util.function.Consumer;

public final class DisabledAnswerGenerator implements AnswerGenerator {

    @Override
    public Flux<String> stream(String question, List<RetrievedEvidence> evidence, Consumer<TokenUsage> usageConsumer) {
        return Flux.error(new RetrievalUnavailableException(
                "Chat provider is not configured. Activate the 'openai' profile and set OPENAI_API_KEY."));
    }
}
