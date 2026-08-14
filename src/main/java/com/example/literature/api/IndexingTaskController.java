package com.example.literature.api;

import com.example.literature.document.IndexingTaskService;
import com.example.literature.document.IndexingTaskView;
import com.example.literature.auth.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/indexing-tasks")
public class IndexingTaskController {

    private final IndexingTaskService tasks;

    public IndexingTaskController(IndexingTaskService tasks) {
        this.tasks = tasks;
    }

    @GetMapping("/{taskId}")
    public IndexingTaskView find(@PathVariable String taskId, Authentication authentication) {
        return tasks.find(taskId, CurrentUser.id(authentication));
    }

    @PostMapping("/{taskId}/retry")
    public IndexingTaskView retry(@PathVariable String taskId, Authentication authentication) {
        return tasks.retry(taskId, CurrentUser.id(authentication));
    }
}
