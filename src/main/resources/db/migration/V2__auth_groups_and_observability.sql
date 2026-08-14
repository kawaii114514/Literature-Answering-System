ALTER TABLE app_user ADD COLUMN password_hash VARCHAR(200);
ALTER TABLE app_user ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE research_group (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    owner_user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_group_owner FOREIGN KEY (owner_user_id) REFERENCES app_user(id)
);

CREATE TABLE group_member (
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    member_role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (group_id, user_id),
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES research_group(id),
    CONSTRAINT fk_group_member_user FOREIGN KEY (user_id) REFERENCES app_user(id)
);

ALTER TABLE knowledge_space ADD COLUMN group_id VARCHAR(36);
ALTER TABLE knowledge_space ADD CONSTRAINT fk_space_group
    FOREIGN KEY (group_id) REFERENCES research_group(id);

CREATE TABLE space_member (
    space_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    member_role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (space_id, user_id),
    CONSTRAINT fk_space_member_space FOREIGN KEY (space_id) REFERENCES knowledge_space(id),
    CONSTRAINT fk_space_member_user FOREIGN KEY (user_id) REFERENCES app_user(id)
);

INSERT INTO space_member (space_id, user_id, member_role, created_at)
VALUES ('00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001', 'OWNER', CURRENT_TIMESTAMP);

ALTER TABLE indexing_task ADD COLUMN parse_duration_ms BIGINT;
ALTER TABLE indexing_task ADD COLUMN chunk_duration_ms BIGINT;
ALTER TABLE indexing_task ADD COLUMN vector_index_duration_ms BIGINT;
ALTER TABLE indexing_task ADD COLUMN keyword_index_duration_ms BIGINT;
ALTER TABLE indexing_task ADD COLUMN total_duration_ms BIGINT;
ALTER TABLE indexing_task ADD COLUMN passage_count INT;

CREATE TABLE request_trace (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    space_id VARCHAR(36) NOT NULL,
    strategy VARCHAR(30) NOT NULL,
    outcome VARCHAR(30) NOT NULL,
    retrieval_duration_ms BIGINT,
    fusion_duration_ms BIGINT,
    rerank_duration_ms BIGINT,
    model_duration_ms BIGINT,
    prompt_tokens BIGINT,
    completion_tokens BIGINT,
    total_tokens BIGINT,
    candidate_count INT,
    result_count INT,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_trace_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT fk_trace_space FOREIGN KEY (space_id) REFERENCES knowledge_space(id)
);

CREATE INDEX idx_trace_space_created ON request_trace(space_id, created_at);
