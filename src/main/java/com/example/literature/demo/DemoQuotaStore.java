package com.example.literature.demo;

import java.util.List;

/** Checks and consumes all budgets atomically. Rejected requests consume none. */
public interface DemoQuotaStore {
    long consume(List<Budget> budgets);

    record Budget(String key, int limit, long expiresAtSeconds) {
    }
}
