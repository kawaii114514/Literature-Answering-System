package com.example.literature.demo;

import java.util.ArrayList;
import java.util.List;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

public final class RedisDemoQuotaStore implements DemoQuotaStore {
    private static final DefaultRedisScript<Long> CONSUME = new DefaultRedisScript<>("""
            for i, key in ipairs(KEYS) do
              if tonumber(redis.call('GET', key) or '0') >= tonumber(ARGV[(i-1)*2+1]) then
                return tonumber(ARGV[(i-1)*2+2])
              end
            end
            for i, key in ipairs(KEYS) do
              redis.call('INCR', key)
              redis.call('EXPIREAT', key, ARGV[(i-1)*2+2])
            end
            return 0
            """, Long.class);
    private final StringRedisTemplate redis;

    public RedisDemoQuotaStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public long consume(List<Budget> budgets) {
        List<String> args = new ArrayList<>();
        for (Budget budget : budgets) {
            args.add(Integer.toString(budget.limit()));
            args.add(Long.toString(budget.expiresAtSeconds()));
        }
        Long result = redis.execute(CONSUME, budgets.stream().map(Budget::key).toList(), args.toArray());
        if (result == null) throw new IllegalStateException("Quota store returned no result");
        return result;
    }
}
