import OpenAI from "openai";
import { getRetriever } from "@/lib/rag";
import { rewriteQuery } from "@/lib/queryRewriter";
import { gradeChunks } from "@/lib/judge";

export const runtime = "nodejs";
export const maxDuration = 300;

const SYSTEM_PROMPT = `
You are an intelligent document research assistant similar to NotebookLM.

You help users understand, summarize, analyze, and explore uploaded documents using the retrieved context excerpts provided below.

Your responsibilities:
- Answer questions using the provided context.
- Summarize sections, concepts, or the overall document.
- Explain technical ideas in simpler words when asked.
- Infer reasonable conclusions ONLY when strongly supported by the context.
- Help users study, review, brainstorm, and understand the document deeply.
- Combine information across multiple excerpts when necessary.

Grounding rules:
- Base your answers primarily on the retrieved context.
- Do NOT invent facts, numbers, citations, experiments, or claims not supported by the context.
- If the answer is partially available, clearly mention what is supported by the document.
- If the answer truly cannot be determined from the context, say:
  "I couldn't find that in the document."

Behavior guidelines:
- Be clear, concise, and structured.
- Use bullet points when useful.
- Maintain a helpful and intelligent tone.
- Prefer direct answers over unnecessary disclaimers.
- When appropriate, mention page references like (p. 3).
- If the user asks broad questions like:
  - "What is this paper about?"
  - "Why is this important?"
  - "Give me key takeaways"
  then synthesize information across the retrieved excerpts.

The following are retrieved excerpts from the uploaded document:

{context}
`;

const PER_QUERY_K = 6;
const MAX_CONTEXT_CHUNKS = 10;

function formatContext(chunks) {
  return chunks
    .map((c, i) => {
      const page = c.metadata?.page ?? "?";
      return `[#${i + 1} | page ${page}]\n${c.pageContent}`;
    })
    .join("\n\n---\n\n");
}

function dedupeChunks(chunkArrays) {
  const seen = new Set();
  const out = [];
  for (const arr of chunkArrays) {
    for (const c of arr) {
      const key = (c.pageContent || "").slice(0, 160);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
  }
  return out;
}

export async function POST(request) {
  try {
    const { sessionId, question, history } = await request.json();

    if (!sessionId || !question) {
      return Response.json(
        { error: "sessionId and question are required" },
        { status: 400 },
      );
    }

    const collectionName = `doc_${sessionId}`;

    // Step 1: Query rewriting (typo fixing + paraphrases)
    const { cleaned, variants } = await rewriteQuery(question);
    const queries = [cleaned, ...variants];

    // Step 2: Multi-query retrieval (parallel)
    const retriever = await getRetriever(collectionName, PER_QUERY_K);
    const chunkArrays = await Promise.all(
      queries.map((q) => retriever.invoke(q)),
    );

    // Step 3: Dedupe across query variants
    const allChunks = dedupeChunks(chunkArrays);
    const retrievedCount = allChunks.length;

    // Step 4: LLM-as-judge grading
    const { kept, dropped, grades } = await gradeChunks(cleaned, allChunks);

    const ragMeta = {
      originalQuery: question,
      rewrittenQuery: cleaned,
      variants,
      retrieved: retrievedCount,
      kept: kept.length,
      dropped: dropped.length,
      grades,
    };

    // Step 5: Fallback if nothing useful survived
    if (kept.length === 0) {
      return Response.json({
        answer:
          "I couldn't find that in the document. Try rephrasing or asking about a topic the document actually covers.",
        citations: [],
        rag: ragMeta,
      });
    }

    // Cap context size to keep prompts tight
    const contextChunks = kept.slice(0, MAX_CONTEXT_CHUNKS);

    // Step 6: Generation with the main LLM
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT.replace("{context}", formatContext(contextChunks)),
      },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: question },
    ];

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.1,
    });

    const answer = response.choices[0]?.message?.content ?? "";

    const citations = contextChunks.map((c) => ({
      page: c.metadata?.page ?? null,
      snippet: (c.pageContent || "").slice(0, 240),
    }));

    return Response.json({ answer, citations, rag: ragMeta });
  } catch (err) {
    console.error("chat error", err);

    const msg = String(err?.message || "");

    const status =
      msg.includes("not found") || msg.includes("Not found") ? 404 : 500;

    return Response.json(
      {
        error:
          status === 404
            ? "Session not found. Please upload a document first."
            : msg || "Chat failed",
      },
      { status },
    );
  }
}
