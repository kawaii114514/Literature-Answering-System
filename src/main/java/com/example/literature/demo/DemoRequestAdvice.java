package com.example.literature.demo;

import com.example.literature.api.AnswerController.AnswerRequest;
import com.example.literature.api.RetrievalController.RetrievalRequest;
import java.lang.reflect.Type;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

@ControllerAdvice
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true")
public class DemoRequestAdvice extends RequestBodyAdviceAdapter {
    @Override
    public boolean supports(MethodParameter parameter, Type type, Class<? extends HttpMessageConverter<?>> converter) {
        return type == AnswerRequest.class || type == RetrievalRequest.class;
    }

    @Override
    public Object afterBodyRead(Object body, HttpInputMessage input, MethodParameter parameter, Type type,
            Class<? extends HttpMessageConverter<?>> converter) {
        String question;
        int limit;
        if (body instanceof AnswerRequest request) { question = request.question(); limit = request.limit(); }
        else { RetrievalRequest request = (RetrievalRequest) body; question = request.query(); limit = request.limit(); }
        if (question != null && question.length() > 2000 || limit > 5) {
            throw new IllegalArgumentException("演示站每个问题最多 2000 字符，每次最多检索 5 个片段。");
        }
        return body;
    }
}
