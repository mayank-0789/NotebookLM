# NotebookLM Lite

NotebookLM Lite is a Retrieval-Augmented Generation (RAG) application that allows users to upload documents and interact with them conversationally.

Instead of behaving like a generic chatbot, the application grounds its responses in the uploaded document itself. Users can upload PDFs or text files, ask questions in natural language, and receive context-aware answers generated from semantically retrieved document chunks.

The project was built to explore practical GenAI system design using:

- vector databases
- semantic retrieval
- embeddings
- grounded prompting
- production-style RAG pipelines 
- conversational document interfaces

The overall goal was to create a lightweight NotebookLM-inspired assistant capable of helping users study, summarize, analyze, and explore long-form documents.

---

# Live Demo

Add your deployment link here.

```text
https://notebook-lm-seven.vercel.app/
```

---

# Features

## Document Upload

- Upload PDF documents
- Upload TXT files
- File validation and size limits
- Automatic text extraction
- Page-aware metadata handling

---

## Retrieval-Augmented Generation (RAG)

- Semantic chunk retrieval
- Vector similarity search
- Context-grounded responses
- Reduced hallucinations
- Multi-turn conversational retrieval

---

## Conversational Document Chat

Users can:

- ask questions about documents
- summarize papers
- request explanations
- generate insights
- understand technical concepts
- explore ideas conversationally

The assistant behaves more like a research companion than a traditional extractive QA system.

---

# Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router, React, Tailwind CSS |
| Backend | Next.js API Routes |
| Vector Database | Qdrant Cloud |
| Embeddings | HuggingFace Inference API |
| Embedding Model | sentence-transformers/all-MiniLM-L6-v2 |
| LLM Provider | Groq |
| Language Model | llama-3.3-70b-versatile |
| RAG Framework | LangChain |
| PDF Parsing | WebPDFLoader |
| Session Persistence | localStorage |
| Deployment | Vercel |

---

# High-Level Architecture

```text
                ┌────────────────────┐
                │   User Uploads     │
                │ PDF / TXT Document │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Document Parsing   │
                │ WebPDFLoader       │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Text Chunking      │
                │ Recursive Splitter │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Embedding Creation │
                │ HuggingFace API    │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Qdrant Vector DB   │
                │ Semantic Storage   │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ User Question      │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Similarity Search  │
                │ Top-K Retrieval    │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Prompt Construction│
                │ Context Injection  │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Groq LLM Inference │
                │ Llama 3.3 70B      │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Final Grounded     │
                │ Answer + Citations │
                └────────────────────┘
```

---

# RAG Pipeline Breakdown

# 1. Document Upload

The application supports:

- PDF documents
- TXT files

Maximum file size:

```text
15 MB
```

When a file is uploaded:

1. The file is validated
2. Text is extracted
3. PDF pages are parsed
4. Metadata is attached
5. Documents are converted into LangChain documents

PDF parsing is handled using:

```text
WebPDFLoader
```

TXT files are converted into a single document object.

---

# 2. Chunking Strategy

After extraction, the document text is split into semantic chunks.

The project uses:

```text
RecursiveCharacterTextSplitter
```

---

## Configuration

| Parameter | Value |
|---|---|
| chunkSize | 1500 |
| chunkOverlap | 100 |
| separators | ["\n\n", "\n", ". ", " ", ""] |

---

## Why Chunking Is Necessary

Large documents cannot fit entirely into an LLM context window efficiently.

Chunking allows:

- scalable retrieval
- semantic indexing
- efficient prompting
- lower token usage
- improved retrieval precision

---

## Separator Hierarchy

Chunks are split in this order:

```text
Paragraph → Line → Sentence → Word → Character
```

This preserves natural document structure as much as possible.

---

# 3. Embedding Generation

Each chunk is converted into a vector embedding.

The project uses:

```text
sentence-transformers/all-MiniLM-L6-v2
```

through the HuggingFace Inference API.

---

## Embedding Dimensions

The embedding model generates:

```text
384-dimensional vectors
```

optimized for semantic similarity search.

---

# 4. Vector Database

Generated embeddings are stored inside:

```text
Qdrant Cloud
```

Qdrant was chosen because it provides:

- fast vector similarity search
- scalable retrieval
- metadata filtering
- cloud-hosted persistence
- strong LangChain integration
- beginner-friendly APIs

---

## Collection Design

Every uploaded document gets its own isolated collection.

Example:

```text
doc_a82Kx91
```

This prevents:

- retrieval leakage
- cross-document contamination
- mixed-context responses

and keeps retrieval clean and session-specific.

---

# 5. Semantic Retrieval

When a user asks a question:

1. The query is embedded
2. Qdrant performs similarity search
3. Top matching chunks are retrieved
4. Retrieved context is injected into the prompt

Current retrieval depth:

```text
Top 8 chunks
```

---

# 6. Prompt Engineering

The system prompt was carefully designed to balance:

```text
strict grounding + intelligent synthesis
```

instead of behaving like a rigid extractive QA system.

---

## Assistant Responsibilities

The assistant is instructed to:

- answer using retrieved context
- summarize information
- explain concepts clearly
- synthesize across excerpts
- infer carefully when strongly supported
- avoid unsupported hallucinations

---

## Prompt Philosophy

Instead of forcing the assistant to:

```text
answer ONLY from context
```

it behaves more like:

```text
an intelligent research assistant grounded in the document
```

This significantly improves usability and conversational quality.

---

# 7. Language Model Layer

The application uses:

```text
Groq
```

for inference.

---

## Current Model

```text
llama-3.3-70b-versatile
```

This model was selected because it provides:

- strong reasoning quality
- fast inference speed
- excellent conversational performance
- high-quality RAG responses

---

# API Design

# /api/ingest

## Method

```http
POST
```

---

## Input

```text
multipart/form-data
```

Field:

```text
file
```

Supported formats:

- PDF
- TXT

---

## Responsibilities

The route performs:

1. file validation
2. parsing
3. chunking
4. embedding generation
5. vector indexing
6. session creation

---

## Response

```json
{
  "sessionId": "abc123",
  "fileName": "paper.pdf",
  "pages": 12,
  "chunks": 42
}
```

---

# /api/chat

## Method

```http
POST
```

---

## Input

```json
{
  "sessionId": "abc123",
  "question": "What is this paper about?",
  "history": []
}
```

---

## Responsibilities

The route performs:

1. semantic retrieval
2. prompt construction
3. grounded generation
4. citation preparation
5. answer delivery

---

## Response

```json
{
  "answer": "The paper discusses...",
  "citations": [
    {
      "page": 2,
      "snippet": "..."
    }
  ]
}
```

---

# Frontend Experience

The frontend was intentionally designed to remain:

- minimal
- document-focused
- distraction-free

---

## Current Features

- drag-and-drop uploads
- conversational interface
- source citations
- loading states
- responsive layout
- error handling
- auto-scrolling chat
- persistent sessions

---

# Project Structure

```text
app/
  page.js
  layout.js

  api/
    ingest/
      route.js

    chat/
      route.js

lib/
  rag.js
```

---

# Environment Variables

Create:

```text
.env.local
```

Add:

```env
GROQ_API_KEY=your_groq_key

HUGGINGFACE_API_KEY=your_hf_key

QDRANT_URL=https://your-cluster.qdrant.io

QDRANT_API_KEY=your_qdrant_api_key
```

---

# Local Development

# 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

---

# 2. Run Development Server

```bash
npm run dev
```

---

# 3. Open Application

```text
http://localhost:3000
```

---

# Deployment

The project is designed to be deployed on:

```text
Vercel
```

---

## Deployment Steps

1. Push repository to GitHub
2. Import repository into Vercel
3. Add environment variables
4. Deploy application

---

# Challenges Faced During Development

## 1. Gemini API Restrictions

Initial versions used Gemini APIs.

Issues encountered:

- unsupported model access
- API permission errors
- project-level restrictions
- unstable embedding endpoints

---

## 2. OpenRouter Instability

OpenRouter introduced:

- provider instability
- missing free endpoints
- rate limits
- inconsistent model availability

---

## 3. Local HuggingFace Deployment Issues

Running local transformers caused:

- ONNX runtime failures
- missing native libraries
- Vercel serverless incompatibility

This led to migration toward hosted inference APIs.

---

## 4. Session Persistence Problems

Refreshing the page initially cleared:

- uploaded documents
- chat history
- retrieval sessions

This was solved using browser persistence.

---

# Learning Outcomes

This project provided hands-on experience with:

- Retrieval-Augmented Generation
- vector databases
- semantic embeddings
- prompt engineering
- LangChain workflows
- scalable retrieval pipelines
- conversational AI systems
- grounded generation
- serverless deployment
- production-style GenAI architecture

---

# Conclusion

NotebookLM Lite demonstrates how modern AI systems can move beyond generic chatbot behavior and become document-aware research assistants.

The project combines:

- semantic retrieval
- vector similarity search
- grounded prompting
- conversational interfaces
- persistent context
- scalable RAG architecture

into a system focused on helping users understand and interact with knowledge more effectively.

Rather than treating the language model as the sole source of truth, the application treats the uploaded document as the primary knowledge source while the LLM acts as the reasoning and explanation layer.

This grounding-first approach significantly improves:

- reliability
- explainability
- transparency
- user trust

and represents one of the core ideas behind modern Retrieval-Augmented Generation systems.

