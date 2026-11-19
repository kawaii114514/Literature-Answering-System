package com.example.literature.demo;

import com.example.literature.config.ApplicationProperties;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DemoController {
    private final DemoProperties demo;
    private final ApplicationProperties app;

    public DemoController(DemoProperties demo, ApplicationProperties app) {
        this.demo = demo;
        this.app = app;
    }

    @GetMapping("/api/v1/demo")
    public Map<String, Object> describe() {
        return Map.of("enabled", demo.enabled(), "queriesPerDay", demo.queriesPerUserDay(),
                "uploadsPerDay", demo.uploadsPerUserDay(), "maxFileSizeBytes", app.documents().maxFileSizeBytes(),
                "maxPages", app.documents().maxPages());
    }
}
