package com.example.literature.api;

import com.example.literature.retrieval.RetrievalService;
import com.example.literature.retrieval.RetrievedEvidence;
import com.example.literature.retrieval.RetrievalStrategy;
import com.example.literature.metrics.RequestTraceService;
import com.example.literature.auth.CurrentUser;
import com.example.literature.auth.SpaceAuthorizationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/v1/spaces/{spaceId}/retrieval")
public class RetrievalController {

    private final RetrievalService retrieval;
    private final SpaceAuthorizationService authorization;
    private final RequestTraceService traces;

    public RetrievalController(RetrievalService retrieval, SpaceAuthorizationService authorization,
            RequestTraceService traces) {
        this.retrieval = retrieval;
        this.authorization = authorization;
        this.traces = traces;
    }

    @PostMapping
    public RetrievalResponse retrieve(@PathVariable String spaceId, @Valid @RequestBody RetrievalRequest request,
            Authentication authentication) {
        authorization.requireView(spaceId, CurrentUser.id(authentication));
        RequestTraceService.Context trace = traces.start(CurrentUser.id(authentication), spaceId,
                request.strategy().name());
        try {
            var execution = retrieval.execute(spaceId, request.query(), request.limit(), request.strategy());
            List<RetrievedEvidence> citations = execution.results();
            trace.trace().retrievalDuration(execution.retrievalDurationMs());
            trace.trace().fusionDuration(execution.fusionDurationMs());
            trace.trace().rerankDuration(execution.rerankDurationMs());
            trace.trace().counts(execution.candidateCount(), citations.size());
            traces.finish(trace, citations.isEmpty() ? "REFUSED" : "RETRIEVED");
            return new RetrievalResponse(citations);
        } catch (RuntimeException exception) {
            traces.finish(trace, "FAILED");
            throw exception;
        }
    }

    public record RetrievalRequest(@NotBlank String query, @Min(1) @Max(50) int limit,
            RetrievalStrategy strategy) {
        public RetrievalRequest {
            if (limit == 0) {
                limit = 10;
            }
            if (strategy == null) {
                strategy = RetrievalStrategy.HYBRID_RRF;
            }
        }
    }

    public record RetrievalResponse(List<RetrievedEvidence> citations) {
    }
}
