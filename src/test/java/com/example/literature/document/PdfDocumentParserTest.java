package com.example.literature.document;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PdfDocumentParserTest {

    @TempDir
    Path tempDir;

    @Test
    void preservesOneBasedPageNumbersAndPageText() throws Exception {
        Path pdf = tempDir.resolve("two-pages.pdf");
        try (PDDocument document = new PDDocument()) {
            addPage(document, "Evidence on the first page.");
            addPage(document, "Evidence on the second page.");
            document.save(pdf.toFile());
        }

        ParsedDocument parsed = new PdfBoxDocumentParser(500).parse(pdf);

        assertThat(parsed.pageCount()).isEqualTo(2);
        assertThat(parsed.pages())
                .extracting(PageText::pageNumber, PageText::text)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1, "Evidence on the first page."),
                        org.assertj.core.groups.Tuple.tuple(2, "Evidence on the second page."));
    }

    private static void addPage(PDDocument document, String text) throws Exception {
        PDPage page = new PDPage();
        document.addPage(page);
        try (PDPageContentStream content = new PDPageContentStream(document, page)) {
            content.beginText();
            content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
            content.newLineAtOffset(72, 720);
            content.showText(text);
            content.endText();
        }
    }
}

