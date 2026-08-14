package com.example.literature.document;

import java.util.List;

public record ParsedDocument(List<PageText> pages, String title, String authors, Integer publicationYear) {
    public ParsedDocument(List<PageText> pages) {
        this(pages, null, null, null);
    }

    public ParsedDocument(List<PageText> pages, String title, String authors, Integer publicationYear) {
        this.pages = List.copyOf(pages);
        this.title = title;
        this.authors = authors;
        this.publicationYear = publicationYear;
    }

    public int pageCount() {
        return pages.size();
    }
}
