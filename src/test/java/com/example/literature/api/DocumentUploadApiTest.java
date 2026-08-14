package com.example.literature.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.task.execution.pool.core-size=1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentUploadApiTest {

    private static final String DEFAULT_SPACE = "00000000-0000-0000-0000-000000000001";

    @Autowired
    MockMvc mvc;

    @Test
    void acceptsPdfAndReturnsDurableDocumentAndTaskIdentifiers() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "paper.pdf", "application/pdf", onePagePdf());

        mvc.perform(multipart("/api/v1/spaces/{spaceId}/documents", DEFAULT_SPACE).file(file))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.documentId").isNotEmpty())
                .andExpect(jsonPath("$.taskId").isNotEmpty())
                .andExpect(jsonPath("$.documentStatus").value("PENDING"))
                .andExpect(jsonPath("$.taskStatus").value("PENDING"));
    }

    @Test
    void rejectsContentThatOnlyClaimsToBePdf() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "paper.pdf", "application/pdf", "not a pdf".getBytes());

        mvc.perform(multipart("/api/v1/spaces/{spaceId}/documents", DEFAULT_SPACE).file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    private static byte[] onePagePdf() throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            return output.toByteArray();
        }
    }
}
