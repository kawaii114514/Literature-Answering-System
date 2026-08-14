package com.example.literature.answer;

import com.example.literature.retrieval.RetrievedEvidence;
import java.util.List;
import java.util.stream.IntStream;
import org.springframework.ai.chat.client.ChatClient;
import reactor.core.publisher.Flux;
import java.util.function.Consumer;

public final class SpringAiAnswerGenerator implements AnswerGenerator {

    private static final String SYSTEM_PROMPT = """
            You answer research questions only from the supplied evidence passages.
            Match the language of the question. Cite every material claim using [1], [2], etc.
            Never use outside knowledge and never invent citations. If evidence conflicts, state the conflict.
            """;

    private final ChatClient chatClient;

    public SpringAiAnswerGenerator(ChatClient.Builder builder) {
        this.chatClient = builder.defaultSystem(SYSTEM_PROMPT).build();
    }

    @Override
    public Flux<String> stream(String question, List<RetrievedEvidence> evidence, Consumer<TokenUsage> usageConsumer) {
        String context = IntStream.range(0, evidence.size())
                .mapToObj(index -> {
                    RetrievedEvidence item = evidence.get(index);
                    return "[%d] %s, pages %d-%d\n%s".formatted(
                            index + 1, item.documentTitle(), item.pageStart(), item.pageEnd(), item.excerpt());
                })
                .collect(java.util.stream.Collectors.joining("\n\n"));
        return chatClient.prompt()
                .user("Question:\n" + question + "\n\nEvidence:\n" + context)
                .stream()
                .chatResponse()
                .doOnNext(response -> {
                    var usage = response.getMetadata() == null ? null : response.getMetadata().getUsage();
                    if (usage != null) {
                        usageConsumer.accept(new TokenUsage(
                                toLong(usage.getPromptTokens()), toLong(usage.getCompletionTokens()),
                                toLong(usage.getTotalTokens())));
                    }
                })
                .map(response -> response.getResult() == null || response.getResult().getOutput() == null
                        ? "" : response.getResult().getOutput().getText())
                .filter(text -> text != null && !text.isEmpty());
    }

    private static Long toLong(Integer value) { return value == null ? null : value.longValue(); }
}
