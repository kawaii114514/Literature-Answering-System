package com.example.literature.retrieval;

import com.example.literature.config.ApplicationProperties;
import com.example.literature.document.EvidencePassage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.StringField;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.index.Term;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;
import org.springframework.stereotype.Component;

@Component
public final class LuceneEvidenceAdapter implements KeywordEvidenceIndexer, KeywordEvidenceRetriever {

    private final Directory directory;
    private final StandardAnalyzer analyzer = new StandardAnalyzer();

    public LuceneEvidenceAdapter(ApplicationProperties properties) {
        try {
            Path root = properties.storage().luceneRoot();
            Files.createDirectories(root);
            this.directory = FSDirectory.open(root);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to open Lucene index", exception);
        }
    }

    @Override
    public synchronized void replaceDocument(String spaceId, String documentId, List<EvidencePassage> passages) {
        try (IndexWriter writer = writer()) {
            writer.deleteDocuments(new Term("documentId", documentId));
            for (EvidencePassage passage : passages) {
                org.apache.lucene.document.Document doc = new org.apache.lucene.document.Document();
                doc.add(new StringField("passageId", passage.id(), Field.Store.YES));
                doc.add(new StringField("documentId", documentId, Field.Store.YES));
                doc.add(new StringField("spaceId", spaceId, Field.Store.YES));
                doc.add(new StringField("pageStart", Integer.toString(passage.pageStart()), Field.Store.YES));
                doc.add(new StringField("pageEnd", Integer.toString(passage.pageEnd()), Field.Store.YES));
                doc.add(new TextField("text", passage.text(), Field.Store.YES));
                writer.addDocument(doc);
            }
            writer.commit();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to update keyword index", exception);
        }
    }

    @Override
    public synchronized void deleteDocument(String spaceId, String documentId) {
        try (IndexWriter writer = writer()) {
            writer.deleteDocuments(new Term("documentId", documentId));
            writer.commit();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to delete keyword index entries", exception);
        }
    }

    @Override
    public synchronized List<RetrievedEvidence> retrieve(String spaceId, String query, int limit) {
        try (DirectoryReader reader = DirectoryReader.open(directory)) {
            IndexSearcher searcher = new IndexSearcher(reader);
            Query parsed = new QueryParser("text", analyzer).parse(QueryParser.escape(query));
            Query scoped = new org.apache.lucene.search.BooleanQuery.Builder()
                    .add(parsed, org.apache.lucene.search.BooleanClause.Occur.MUST)
                    .add(new org.apache.lucene.search.TermQuery(new Term("spaceId", spaceId)),
                            org.apache.lucene.search.BooleanClause.Occur.FILTER)
                    .build();
            var hits = searcher.search(scoped, limit).scoreDocs;
            List<RetrievedEvidence> results = new ArrayList<>(hits.length);
            for (var hit : hits) {
                var doc = searcher.doc(hit.doc);
                results.add(new RetrievedEvidence(0, doc.get("passageId"), doc.get("documentId"), "",
                        Integer.parseInt(doc.get("pageStart")), Integer.parseInt(doc.get("pageEnd")),
                        doc.get("text"), hit.score));
            }
            return results;
        } catch (org.apache.lucene.index.IndexNotFoundException exception) {
            return List.of();
        } catch (IOException | ParseException exception) {
            throw new IllegalStateException("Unable to query keyword index", exception);
        }
    }

    private IndexWriter writer() throws IOException {
        return new IndexWriter(directory, new IndexWriterConfig(analyzer).setOpenMode(IndexWriterConfig.OpenMode.CREATE_OR_APPEND));
    }

}
