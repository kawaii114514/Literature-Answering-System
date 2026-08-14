# Literature Evidence Context

This context describes the language used to turn a collection of research papers into traceable evidence and grounded answers.

## Language

**Knowledge Space**:
A private collection of documents and conversations belonging to one research scope. Every document, retrieval, and conversation is isolated by its Knowledge Space.
_Avoid_: Workspace, corpus, tenant

**Literature Document**:
An uploaded research-paper PDF together with its identity, metadata, and processing status.
_Avoid_: File, paper record

**Evidence Passage**:
A page-traceable excerpt from a Literature Document that can support or contradict an answer.
_Avoid_: Chunk, context

**Indexing Task**:
The durable record of one attempt to parse a Literature Document and make its Evidence Passages retrievable.
_Avoid_: Job, ingestion request

**Citation**:
A stable reference from an answer to an Evidence Passage, including the Literature Document, page range, and original excerpt.
_Avoid_: Source, reference link

**Grounded Answer**:
An answer whose material claims are supported by Citations from the active Knowledge Space.
_Avoid_: Completion, response

**Refusal**:
The explicit result produced when the available Evidence Passages do not support a Grounded Answer.
_Avoid_: Empty answer, failure

**Conversation**:
The durable ordered history of questions and Grounded Answers within one Knowledge Space.
_Avoid_: Session, chat

