package com.example.literature.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.AsyncEvent;
import jakarta.servlet.AsyncListener;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.AsyncHandlerInterceptor;

public final class DemoInterceptor implements AsyncHandlerInterceptor {
    private static final String LEASE = DemoInterceptor.class.getName() + ".lease";
    private final DemoProperties properties;
    private final DemoQuotaStore store;
    private final Clock clock;
    private final ObjectMapper json;
    private final Semaphore querySlots;

    public DemoInterceptor(DemoProperties properties, DemoQuotaStore store, Clock clock, ObjectMapper json) {
        this.properties = properties;
        this.store = store;
        this.clock = clock;
        this.json = json;
        this.querySlots = new Semaphore(properties.concurrentQueries());
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (!properties.enabled() || request.getDispatcherType() != DispatcherType.REQUEST
                || request.getMethod().equals("GET") || request.getMethod().equals("HEAD")) return true;
        String path = request.getRequestURI();
        boolean query = path.matches("/api/v1/spaces/[^/]+/(answers/stream|retrieval)");
        boolean upload = path.matches("/api/v1/spaces/[^/]+/documents") && request.getMethod().equals("POST")
                || path.matches("/api/v1/indexing-tasks/[^/]+/retry");
        String ip = hash(request.getRemoteAddr()); // Only the trusted reverse proxy may supply forwarded addresses.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = auth == null ? "anonymous" : hash(auth.getName());
        long now = clock.instant().getEpochSecond();
        List<DemoQuotaStore.Budget> budgets = new ArrayList<>();
        budgets.add(budget("write-ip:" + ip, 30, 60, now));
        if (path.equals("/api/v1/auth/register")) {
            budgets.add(budget("register-ip:" + ip, 3, 86400, now));
            budgets.add(budget("register-global", 20, 86400, now));
        } else if (path.equals("/api/v1/auth/login")) {
            budgets.add(budget("login-ip:" + ip, 10, 60, now));
        } else {
            budgets.add(budget("write-user:" + user, 60, 86400, now));
            budgets.add(budget("write-global", 1000, 86400, now));
        }
        if (query) {
            budgets.add(budget("query-user:" + user, properties.queriesPerUserDay(), 86400, now));
            budgets.add(budget("query-ip:" + ip, properties.queriesPerUserDay() * 2, 86400, now));
            budgets.add(budget("query-global", properties.queriesPerDay(), 86400, now));
            if (!querySlots.tryAcquire()) return reject(response, 429, "DEMO_BUSY", "当前正在处理其他问题，请稍后重试。", 10);
            request.setAttribute(LEASE, new Lease(querySlots));
        }
        if (upload) {
            budgets.add(budget("upload-user:" + user, properties.uploadsPerUserDay(), 86400, now));
            budgets.add(budget("upload-ip:" + ip, properties.uploadsPerUserDay() * 2, 86400, now));
            budgets.add(budget("upload-global", properties.uploadsPerDay(), 86400, now));
        }
        try {
            long retryAt = store.consume(budgets);
            if (retryAt > 0) {
                release(request);
                return reject(response, 429, "DEMO_LIMIT_REACHED", "已达到演示站的操作额度，请稍后再试。每日额度在北京时间 08:00 重置。", Math.max(1, retryAt - now));
            }
            return true;
        } catch (RuntimeException unavailable) {
            release(request);
            return reject(response, 503, "DEMO_QUOTA_UNAVAILABLE", "演示额度服务暂不可用，请稍后再试。", 30);
        }
    }

    private static DemoQuotaStore.Budget budget(String scope, int limit, long window, long now) {
        long bucket = now / window;
        return new DemoQuotaStore.Budget("demo:v1:" + scope + ":" + bucket, limit, (bucket + 1) * window);
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private boolean reject(HttpServletResponse response, int status, String code, String message, long retry) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", Long.toString(retry));
        response.setHeader("Cache-Control", "no-store");
        json.writeValue(response.getWriter(), Map.of("code", code, "message", message));
        return false;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        release(request);
    }

    @Override
    public void afterConcurrentHandlingStarted(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (request.getAttribute(LEASE) == null) return;
        try {
            request.getAsyncContext().addListener(new AsyncListener() {
                public void onComplete(AsyncEvent event) { release(request); }
                public void onTimeout(AsyncEvent event) { release(request); }
                public void onError(AsyncEvent event) { release(request); }
                public void onStartAsync(AsyncEvent event) { event.getAsyncContext().addListener(this); }
            });
        } catch (IllegalStateException alreadyCompleted) {
            release(request);
        }
    }

    private static void release(HttpServletRequest request) {
        if (request.getAttribute(LEASE) instanceof Lease lease) lease.release();
    }

    private record Lease(Semaphore slots, AtomicBoolean released) {
        Lease(Semaphore slots) { this(slots, new AtomicBoolean()); }
        void release() { if (released.compareAndSet(false, true)) slots.release(); }
    }
}
