package com.example.literature.document;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public final class LocalDocumentStorage implements DocumentStorage {

    private final Path root;

    public LocalDocumentStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public String store(String spaceId, String documentId, String filename, InputStream content) throws IOException {
        String safeName = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path target = root.resolve(spaceId).resolve(documentId + "-" + safeName).normalize();
        ensureInsideRoot(target);
        Files.createDirectories(target.getParent());
        Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        return root.relativize(target).toString().replace('\\', '/');
    }

    @Override
    public Path resolve(String storageKey) {
        Path target = root.resolve(storageKey).normalize();
        ensureInsideRoot(target);
        return target;
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(resolve(storageKey));
    }

    private void ensureInsideRoot(Path target) {
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Storage key escapes configured root");
        }
    }
}
