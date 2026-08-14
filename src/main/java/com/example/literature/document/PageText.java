package com.example.literature.document;

public record PageText(int pageNumber, String text) {

    public PageText {
        if (pageNumber < 1) {
            throw new IllegalArgumentException("Page numbers are one-based");
        }
        text = text == null ? "" : text.strip();
    }
}

