# Persist indexing tasks and execute them in-process for the MVP

Each indexing attempt is persisted before a bounded Spring executor processes it asynchronously. RabbitMQ and Kafka are deliberately deferred until multi-instance delivery guarantees are required; the persisted state, attempt count, and failure reason make the current workflow observable and retryable without introducing a message broker into the first vertical slice.

