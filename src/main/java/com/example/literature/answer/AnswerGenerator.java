package com.example.literature.answer;

import com.example.literature.retrieval.RetrievedEvidence;
import java.util.List;
import reactor.core.publisher.Flux;
import java.util.function.Consumer;

public interface AnswerGenerator {

    Flux<String> stream(String question, List<RetrievedEvidence> evidence, Consumer<TokenUsage> usageConsumer);

    default Flux<String> stream(String question, List<RetrievedEvidence> evidence) {
        return stream(question, evidence, ignored -> { });
    }
}
