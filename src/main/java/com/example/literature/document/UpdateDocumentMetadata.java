package com.example.literature.document;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateDocumentMetadata(
        @Size(max = 500) String title,
        @Size(max = 1000) String authors,
        @Min(1000) @Max(2100) Integer publicationYear) {
}
