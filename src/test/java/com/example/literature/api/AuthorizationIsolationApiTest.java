package com.example.literature.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "app.auth.required=true",
        "spring.task.execution.pool.core-size=1"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthorizationIsolationApiTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private JwtEncoder jwtEncoder;

    @Test
    void rejectsMissingInvalidAndExpiredBearerTokens() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());

        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(UUID.randomUUID().toString())
                .issuedAt(now.minus(2, ChronoUnit.HOURS))
                .expiresAt(now.minus(1, ChronoUnit.HOURS))
                .build();
        String expired = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(expired)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void isolatesPersonalSpacesAndAuthorizesTasksThroughTheirDocuments() throws Exception {
        User owner = register("personal-owner");
        User outsider = register("personal-outsider");
        String spaceId = createSpace(owner, "Private papers", null);
        Upload upload = upload(owner, spaceId, "private-paper.pdf");

        assertThat(findById(list(owner, "/api/v1/spaces"), spaceId).get("role").asText())
                .isEqualTo("OWNER");
        assertThat(findById(list(outsider, "/api/v1/spaces"), spaceId)).isNull();

        mvc.perform(get("/api/v1/spaces/{spaceId}/documents/{documentId}", spaceId, upload.documentId())
                        .header("Authorization", bearer(owner.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spaceId").value(spaceId));

        mvc.perform(get("/api/v1/spaces/{spaceId}/documents/{documentId}", spaceId, upload.documentId())
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));

        mvc.perform(get("/api/v1/indexing-tasks/{taskId}", upload.taskId())
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void enforcesOwnerEditorViewerRolesForGroupSpaces() throws Exception {
        User owner = register("group-owner");
        User editor = register("group-editor");
        User viewer = register("group-viewer");
        User outsider = register("group-outsider");

        String groupId = createGroup(owner, "RAG lab");
        addGroupMember(owner, groupId, editor, "EDITOR");
        addGroupMember(owner, groupId, viewer, "VIEWER");
        String spaceId = createSpace(owner, "Lab papers", groupId);

        assertThat(findById(list(owner, "/api/v1/groups"), groupId)).isNotNull();
        assertThat(findById(list(editor, "/api/v1/groups"), groupId)).isNotNull();
        assertThat(findById(list(viewer, "/api/v1/groups"), groupId)).isNotNull();
        assertThat(findById(list(outsider, "/api/v1/groups"), groupId)).isNull();
        assertThat(findById(list(editor, "/api/v1/spaces"), spaceId).get("role").asText())
                .isEqualTo("EDITOR");
        assertThat(findById(list(viewer, "/api/v1/spaces"), spaceId).get("role").asText())
                .isEqualTo("VIEWER");

        mvc.perform(post("/api/v1/spaces")
                        .header("Authorization", bearer(editor.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Forbidden space\",\"groupId\":\"" + groupId + "\"}"))
                .andExpect(status().isForbidden());

        Upload upload = upload(editor, spaceId, "group-paper.pdf");
        waitForTerminalTask(editor, upload.taskId());

        assertThat(findById(
                list(viewer, "/api/v1/spaces/" + spaceId + "/documents"), upload.documentId()))
                .isNotNull();

        mvc.perform(patch("/api/v1/spaces/{spaceId}/documents/{documentId}/metadata",
                        spaceId, upload.documentId())
                        .header("Authorization", bearer(editor.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Edited by group editor\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Edited by group editor"));

        mvc.perform(get("/api/v1/spaces/{spaceId}/documents/{documentId}", spaceId, upload.documentId())
                        .header("Authorization", bearer(viewer.token())))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/spaces/{spaceId}/documents/{documentId}/passages",
                        spaceId, upload.documentId())
                        .header("Authorization", bearer(viewer.token())))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/v1/spaces/{spaceId}/documents/{documentId}/metadata",
                        spaceId, upload.documentId())
                        .header("Authorization", bearer(viewer.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Viewer must not edit\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/indexing-tasks/{taskId}", upload.taskId())
                        .header("Authorization", bearer(viewer.token())))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/indexing-tasks/{taskId}/retry", upload.taskId())
                        .header("Authorization", bearer(viewer.token())))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/spaces/{spaceId}/documents/{documentId}", spaceId, upload.documentId())
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/indexing-tasks/{taskId}", upload.taskId())
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());
    }

    private User register(String prefix) throws Exception {
        String username = prefix + "-" + UUID.randomUUID();
        MvcResult result = mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username
                                + "\",\"displayName\":\"Test User\",\"password\":\"password-123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = json.readTree(result.getResponse().getContentAsByteArray());
        return new User(body.at("/user/id").asText(), body.get("accessToken").asText());
    }

    private String createGroup(User owner, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/groups")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray()).get("id").asText();
    }

    private void addGroupMember(User owner, String groupId, User member, String role) throws Exception {
        mvc.perform(post("/api/v1/groups/{groupId}/members", groupId)
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + member.id() + "\",\"role\":\"" + role + "\"}"))
                .andExpect(status().isNoContent());
    }

    private String createSpace(User owner, String name, String groupId) throws Exception {
        String group = groupId == null ? "null" : "\"" + groupId + "\"";
        MvcResult result = mvc.perform(post("/api/v1/spaces")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"groupId\":" + group + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray()).get("id").asText();
    }

    private Upload upload(User user, String spaceId, String filename) throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", filename, "application/pdf", onePagePdf());
        MvcResult result = mvc.perform(multipart("/api/v1/spaces/{spaceId}/documents", spaceId)
                        .file(file)
                        .header("Authorization", bearer(user.token())))
                .andExpect(status().isAccepted())
                .andReturn();
        JsonNode body = json.readTree(result.getResponse().getContentAsByteArray());
        return new Upload(body.get("documentId").asText(), body.get("taskId").asText());
    }

    private void waitForTerminalTask(User user, String taskId) throws Exception {
        for (int attempt = 0; attempt < 100; attempt++) {
            MvcResult result = mvc.perform(get("/api/v1/indexing-tasks/{taskId}", taskId)
                            .header("Authorization", bearer(user.token())))
                    .andExpect(status().isOk())
                    .andReturn();
            String taskStatus = json.readTree(result.getResponse().getContentAsByteArray())
                    .get("status").asText();
            if ("COMPLETED".equals(taskStatus) || "FAILED".equals(taskStatus)) {
                return;
            }
            Thread.sleep(25);
        }
        throw new AssertionError("Indexing task did not reach a terminal state");
    }

    private JsonNode list(User user, String path) throws Exception {
        MvcResult result = mvc.perform(get(path).header("Authorization", bearer(user.token())))
                .andExpect(status().isOk())
                .andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray());
    }

    private static JsonNode findById(JsonNode items, String id) {
        for (JsonNode item : items) {
            if (id.equals(item.path("id").asText())) {
                return item;
            }
        }
        return null;
    }

    private static byte[] onePagePdf() throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            return output.toByteArray();
        }
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private record User(String id, String token) { }
    private record Upload(String documentId, String taskId) { }
}
