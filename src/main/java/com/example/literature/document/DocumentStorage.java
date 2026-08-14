package com.example.literature.document;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;

public interface DocumentStorage {

    String store(String spaceId, String documentId, String filename, InputStream content) throws IOException;

    Path resolve(String storageKey);

    void delete(String storageKey) throws IOException;
}

