package com.example.literature.api;

import com.example.literature.conversation.ConversationNotFoundException;
import com.example.literature.document.DocumentLimitExceededException;
import com.example.literature.document.DocumentNotFoundException;
import com.example.literature.document.DuplicateDocumentException;
import com.example.literature.document.IndexingTaskNotFoundException;
import com.example.literature.document.InvalidPdfException;
import com.example.literature.document.KnowledgeSpaceNotFoundException;
import com.example.literature.retrieval.RetrievalUnavailableException;
import com.example.literature.retrieval.RerankingUnavailableException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.security.access.AccessDeniedException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({
            DocumentNotFoundException.class,
            IndexingTaskNotFoundException.class,
            KnowledgeSpaceNotFoundException.class,
            ConversationNotFoundException.class
    })
    ResponseEntity<ApiError> notFound(RuntimeException exception) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(DuplicateDocumentException.class)
    ResponseEntity<ApiError> duplicate(DuplicateDocumentException exception) {
        ApiError error = new ApiError(
                java.time.Instant.now(), HttpStatus.CONFLICT.value(), "DUPLICATE_DOCUMENT",
                exception.getMessage(), Map.of("existingDocumentId", exception.existingDocumentId()));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler({InvalidPdfException.class, DocumentLimitExceededException.class, IllegalArgumentException.class})
    ResponseEntity<ApiError> badRequest(RuntimeException exception) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", exception.getMessage());
    }

    @ExceptionHandler(RetrievalUnavailableException.class)
    ResponseEntity<ApiError> retrievalUnavailable(RetrievalUnavailableException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "RETRIEVAL_UNAVAILABLE", exception.getMessage());
    }

    @ExceptionHandler(RerankingUnavailableException.class)
    ResponseEntity<ApiError> rerankingUnavailable(RerankingUnavailableException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "RERANKER_UNAVAILABLE", exception.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> accessDenied(AccessDeniedException exception) {
        return response(HttpStatus.FORBIDDEN, "ACCESS_DENIED", exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception) {
        Map<String, String> details = exception.getBindingResult().getFieldErrors().stream()
                .collect(java.util.stream.Collectors.toMap(
                        error -> error.getField(),
                        error -> error.getDefaultMessage() == null ? "invalid" : error.getDefaultMessage(),
                        (first, ignored) -> first));
        ApiError error = new ApiError(
                java.time.Instant.now(), HttpStatus.BAD_REQUEST.value(), "VALIDATION_FAILED",
                "Request validation failed", details);
        return ResponseEntity.badRequest().body(error);
    }

    private static ResponseEntity<ApiError> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(ApiError.of(status.value(), code, message));
    }
}
