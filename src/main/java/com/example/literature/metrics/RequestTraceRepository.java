package com.example.literature.metrics;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RequestTraceRepository extends JpaRepository<RequestTrace, String> {
}
