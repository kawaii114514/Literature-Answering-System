package com.example.literature.api;

import com.example.literature.document.DocumentQueryService;
import com.example.literature.document.DocumentLifecycleService;
import com.example.literature.document.DocumentUploadResult;
import com.example.literature.document.DocumentUploadService;
import com.example.literature.document.DocumentView;
import com.example.literature.document.UpdateDocumentMetadata;
import com.example.literature.auth.CurrentUser;
import com.example.literature.auth.SpaceAuthorizationService;
import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/v1/spaces/{spaceId}/documents")
public class DocumentController {

    private final DocumentUploadService uploads;
    private final DocumentQueryService queries;
    private final DocumentLifecycleService lifecycle;
    private final SpaceAuthorizationService authorization;

    public DocumentController(
            DocumentUploadService uploads,
            DocumentQueryService queries,
            DocumentLifecycleService lifecycle,
            SpaceAuthorizationService authorization) {
        this.uploads = uploads;
        this.queries = queries;
        this.lifecycle = lifecycle;
        this.authorization = authorization;
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public DocumentUploadResult upload(
            @PathVariable String spaceId,
            @RequestPart("file") MultipartFile file,
            Authentication authentication) throws IOException {
        authorization.requireEdit(spaceId, CurrentUser.id(authentication));
        return uploads.upload(spaceId, file);
    }

    @GetMapping("/{documentId}")
    public DocumentView find(@PathVariable String spaceId, @PathVariable String documentId,
            Authentication authentication) {
        authorization.requireView(spaceId, CurrentUser.id(authentication));
        return queries.find(spaceId, documentId);
    }

    @PatchMapping("/{documentId}/metadata")
    public DocumentView updateMetadata(
            @PathVariable String spaceId,
            @PathVariable String documentId,
            @Valid @RequestBody UpdateDocumentMetadata command,
            Authentication authentication) {
        authorization.requireEdit(spaceId, CurrentUser.id(authentication));
        return queries.updateMetadata(spaceId, documentId, command);
    }

    @DeleteMapping("/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String spaceId, @PathVariable String documentId,
            Authentication authentication) throws IOException {
        authorization.requireEdit(spaceId, CurrentUser.id(authentication));
        lifecycle.delete(spaceId, documentId);
    }
}
