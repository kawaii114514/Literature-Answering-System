package com.example.literature.document;

import com.example.literature.auth.SpaceAuthorizationService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
public class IndexingTaskService {

    private final IndexingTaskRepository tasks;
    private final IndexingTaskProcessor processor;
    private final ApplicationEventPublisher events;
    private final SpaceAuthorizationService authorization;
    private final LiteratureDocumentRepository documents;

    public IndexingTaskService(
            IndexingTaskRepository tasks,
            IndexingTaskProcessor processor,
            ApplicationEventPublisher events,
            SpaceAuthorizationService authorization,
            LiteratureDocumentRepository documents) {
        this.tasks = tasks;
        this.processor = processor;
        this.events = events;
        this.authorization = authorization;
        this.documents = documents;
    }

    @Async("indexingExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDocumentUploaded(DocumentUploadedEvent event) {
        processor.process(event.taskId());
    }

    @Transactional
    public IndexingTaskView retry(String taskId) {
        return retry(taskId, com.example.literature.auth.CurrentUser.LOCAL_DEVELOPER_ID);
    }

    @Transactional
    public IndexingTaskView retry(String taskId, String userId) {
        IndexingTask task = tasks.findById(taskId)
                .orElseThrow(() -> new IndexingTaskNotFoundException(taskId));
        LiteratureDocument document = documents.findById(task.documentId())
                .orElseThrow(() -> new DocumentNotFoundException(task.documentId()));
        authorization.requireEdit(document.spaceId(), userId);
        task.scheduleRetry();
        tasks.save(task);
        events.publishEvent(new DocumentUploadedEvent(taskId));
        return IndexingTaskView.from(task);
    }

    @Transactional(readOnly = true)
    public IndexingTaskView find(String taskId) {
        return find(taskId, com.example.literature.auth.CurrentUser.LOCAL_DEVELOPER_ID);
    }

    @Transactional(readOnly = true)
    public IndexingTaskView find(String taskId, String userId) {
        IndexingTask task = tasks.findById(taskId)
                .orElseThrow(() -> new IndexingTaskNotFoundException(taskId));
        LiteratureDocument document = documents.findById(task.documentId())
                .orElseThrow(() -> new DocumentNotFoundException(task.documentId()));
        authorization.requireView(document.spaceId(), userId);
        return IndexingTaskView.from(task);
    }

}
