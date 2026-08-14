package com.example.literature.document;

import java.io.IOException;
import java.nio.file.Path;

public interface DocumentParser {

    ParsedDocument parse(Path path) throws IOException;
}

