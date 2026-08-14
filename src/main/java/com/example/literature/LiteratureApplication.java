package com.example.literature;

import com.example.literature.config.ApplicationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
@EnableConfigurationProperties(ApplicationProperties.class)
public class LiteratureApplication {

    public static void main(String[] args) {
        SpringApplication.run(LiteratureApplication.class, args);
    }
}

