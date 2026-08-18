package com.example.literature.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SpaceApiTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void createReturnsSerializableSpaceView() throws Exception {
        mvc.perform(post("/api/v1/spaces")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Serializable Space"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.ownerUserId").isNotEmpty())
                .andExpect(jsonPath("$.name").value("Serializable Space"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }
}
