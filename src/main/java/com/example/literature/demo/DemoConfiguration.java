package com.example.literature.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(DemoProperties.class)
public class DemoConfiguration {
    @Bean
    DemoQuotaStore demoQuotaStore(StringRedisTemplate redis) {
        return new RedisDemoQuotaStore(redis);
    }

    @Bean
    WebMvcConfigurer demoWebConfiguration(DemoProperties properties, DemoQuotaStore store, ObjectMapper json) {
        DemoInterceptor limiter = new DemoInterceptor(properties, store, Clock.systemUTC(), json);
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(InterceptorRegistry registry) {
                registry.addInterceptor(limiter).addPathPatterns("/api/v1/**");
            }
        };
    }
}
