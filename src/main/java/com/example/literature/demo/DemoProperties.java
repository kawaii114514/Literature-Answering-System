package com.example.literature.demo;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("app.demo")
public record DemoProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue("10") @Min(1) int queriesPerUserDay,
        @DefaultValue("100") @Min(1) int queriesPerDay,
        @DefaultValue("3") @Min(1) int uploadsPerUserDay,
        @DefaultValue("20") @Min(1) int uploadsPerDay,
        @DefaultValue("2") @Min(1) int concurrentQueries) {
}
