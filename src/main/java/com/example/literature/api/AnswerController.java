package com.example.literature.api;

import com.example.literature.answer.GroundedAnswerService;
import com.example.literature.answer.GroundedAnswerService.GroundedAnswer;
import com.example.literature.auth.CurrentUser;
import com.example.literature.auth.SpaceAuthorizationService;
import com.example.literature.retrieval.RetrievalStrategy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/v1/spaces/{spaceId}/answers")
public class AnswerController {

    private final GroundedAnswerService answers;
    private final SpaceAuthorizationService authorization;

    public AnswerController(GroundedAnswerService answers, SpaceAuthorizationService authorization) {
        this.answers = answers;
        this.authorization = authorization;
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable String spaceId, @Valid @RequestBody AnswerRequest request,
            Authentication authentication) {
        authorization.requireView(spaceId, CurrentUser.id(authentication));
        SseEmitter emitter = new SseEmitter(60_000L);
        try {
            GroundedAnswer answer = answers.answer(spaceId, request.question(), request.limit(), request.strategy(),
                    CurrentUser.id(authentication));
            if (answer.refused()) {
                emitter.send(SseEmitter.event().name("refusal").data(new Refusal(
                        "无法根据当前知识空间中的文献确认。", answer.refusalReason())));
                emitter.send(SseEmitter.event().name("done").data("complete"));
                emitter.complete();
            } else {
                emitter.send(SseEmitter.event().name("citations").data(answer.citations()));
                answer.tokens().subscribe(
                        token -> send(emitter, "token", token),
                        emitter::completeWithError,
                        () -> {
                            send(emitter, "done", "complete");
                            emitter.complete();
                        });
            }
        } catch (Exception exception) {
            emitter.completeWithError(exception);
        }
        return emitter;
    }

    private static void send(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (IOException exception) {
            emitter.completeWithError(exception);
        }
    }

    public record Refusal(String message, String reason) {
    }

    public record AnswerRequest(@NotBlank String question, @Min(1) @Max(50) int limit,
            RetrievalStrategy strategy) {
        public AnswerRequest {
            if (limit == 0) {
                limit = 10;
            }
            if (strategy == null) {
                strategy = RetrievalStrategy.HYBRID_RRF;
            }
        }
    }
}
