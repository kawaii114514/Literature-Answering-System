# Separate durable records from retrieval indexes and caches

The system uses MySQL as the durable source of truth for Knowledge Spaces, Literature Documents, Indexing Tasks, Evidence Passages, and Conversations; Qdrant is a replaceable vector retrieval index, while Redis accelerates Conversation restoration but never becomes its only durable copy. This costs more adapters than a single-database design, but preserves auditability and allows retrieval and caching technologies to evolve without losing user data.

