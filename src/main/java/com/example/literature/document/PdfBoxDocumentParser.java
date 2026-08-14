package com.example.literature.document;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

public final class PdfBoxDocumentParser implements DocumentParser {

    private final int maxPages;

    public PdfBoxDocumentParser(int maxPages) {
        if (maxPages < 1) {
            throw new IllegalArgumentException("maxPages must be positive");
        }
        this.maxPages = maxPages;
    }

    @Override
    public ParsedDocument parse(Path path) throws IOException {
        try (PDDocument document = Loader.loadPDF(path.toFile())) {
            if (document.getNumberOfPages() > maxPages) {
                throw new DocumentLimitExceededException(
                        "PDF contains %d pages; maximum is %d".formatted(document.getNumberOfPages(), maxPages));
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            List<PageText> pages = new ArrayList<>(document.getNumberOfPages());
            for (int page = 1; page <= document.getNumberOfPages(); page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                pages.add(new PageText(page, normalize(stripper.getText(document))));
            }
            var info = document.getDocumentInformation();
            Integer year = info.getCreationDate() == null ? null : info.getCreationDate().get(java.util.Calendar.YEAR);
            return new ParsedDocument(pages, blankToNull(info.getTitle()), blankToNull(info.getAuthor()), year);
        }
    }

    private static String normalize(String text) {
        return text.replace('\u00a0', ' ')
                .replaceAll("[\\t\\x0B\\f\\r]+", " ")
                .replaceAll(" *\\n *", " ")
                .replaceAll(" {2,}", " ")
                .strip();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
