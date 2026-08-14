package com.example.literature.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RequestTraceService {

    private final RequestTraceRepository traces;
    private final MeterRegistry meters;

    public RequestTraceService(RequestTraceRepository traces, MeterRegistry meters) {
        this.traces = traces;
        this.meters = meters;
    }

    public Context start(String userId, String spaceId, String strategy) {
        return new Context(new RequestTrace(userId, spaceId, strategy), System.nanoTime());
    }

    @Transactional
    public void finish(Context context, String outcome) {
        context.trace.complete(outcome);
        traces.save(context.trace);
        long elapsed = System.nanoTime() - context.startedAt;
        meters.timer("literature.request.duration", "strategy", context.trace.strategy())
                .record(elapsed, TimeUnit.NANOSECONDS);
    }

    public static final class Context {
        private final RequestTrace trace;
        private final long startedAt;

        private Context(RequestTrace trace, long startedAt) {
            this.trace = trace;
            this.startedAt = startedAt;
        }

        public RequestTrace trace() { return trace; }
        public long elapsedMillis() { return Duration.ofNanos(System.nanoTime() - startedAt).toMillis(); }
    }
}
