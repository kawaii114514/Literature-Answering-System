CREATE TABLE app_user (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL
);

CREATE TABLE knowledge_space (
    id VARCHAR(36) PRIMARY KEY,
    owner_user_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_space_owner FOREIGN KEY (owner_user_id) REFERENCES app_user(id)
);

CREATE TABLE literature_document (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    stored_path VARCHAR(1000) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    title VARCHAR(500) NOT NULL,
    authors VARCHAR(1000),
    publication_year INT,
    page_count INT,
    status VARCHAR(30) NOT NULL,
    failure_reason VARCHAR(2000),
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_document_space FOREIGN KEY (space_id) REFERENCES knowledge_space(id),
    CONSTRAINT uk_document_space_hash UNIQUE (space_id, sha256)
);

CREATE TABLE indexing_task (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    status VARCHAR(30) NOT NULL,
    attempt_count INT NOT NULL,
    failure_reason VARCHAR(2000),
    created_at TIMESTAMP(6) NOT NULL,
    started_at TIMESTAMP(6),
    completed_at TIMESTAMP(6),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_task_document FOREIGN KEY (document_id) REFERENCES literature_document(id)
);

CREATE INDEX idx_task_document ON indexing_task(document_id);

CREATE TABLE evidence_passage (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    space_id VARCHAR(36) NOT NULL,
    ordinal_no INT NOT NULL,
    page_start INT NOT NULL,
    page_end INT NOT NULL,
    passage_text TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_passage_document FOREIGN KEY (document_id) REFERENCES literature_document(id),
    CONSTRAINT fk_passage_space FOREIGN KEY (space_id) REFERENCES knowledge_space(id),
    CONSTRAINT uk_passage_document_ordinal UNIQUE (document_id, ordinal_no)
);

CREATE INDEX idx_passage_space ON evidence_passage(space_id);

CREATE TABLE conversation (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL,
    title VARCHAR(300) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_conversation_space FOREIGN KEY (space_id) REFERENCES knowledge_space(id)
);

CREATE INDEX idx_conversation_space_updated ON conversation(space_id, updated_at);

CREATE TABLE conversation_message (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sequence_no INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversation(id),
    CONSTRAINT uk_message_conversation_sequence UNIQUE (conversation_id, sequence_no)
);

INSERT INTO app_user (id, username, display_name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'developer', 'Local Developer', CURRENT_TIMESTAMP);

INSERT INTO knowledge_space (id, owner_user_id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Default Knowledge Space', CURRENT_TIMESTAMP);
