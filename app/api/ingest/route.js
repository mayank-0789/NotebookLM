import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { nanoid } from "nanoid";
import { indexDocuments } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "text/plain"];

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `File too large. Max ${MAX_BYTES / 1024 / 1024}MB.` },
        { status: 400 },
      );
    }
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(pdf|txt)$/i)) {
      return Response.json(
        { error: "Only PDF and TXT files are supported" },
        { status: 400 },
      );
    }

    let rawDocs;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const loader = new WebPDFLoader(file, { splitPages: true });
      rawDocs = await loader.load();
    } else {
      const text = await file.text();
      rawDocs = [
        new Document({
          pageContent: text,
          metadata: { source: file.name, page: 1 },
        }),
      ];
    }

    if (!rawDocs.length || !rawDocs.some((d) => d.pageContent?.trim())) {
      return Response.json(
        { error: "Could not extract any text from the document" },
        { status: 422 },
      );
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
    const chunks = await splitter.splitDocuments(rawDocs);

    for (const c of chunks) {
      c.metadata = {
        ...c.metadata,
        source: file.name,
        page: c.metadata?.loc?.pageNumber ?? c.metadata?.page ?? null,
      };
    }

    const sessionId = nanoid(10);
    const collectionName = `doc_${sessionId}`;
    await indexDocuments(chunks, collectionName);

    return Response.json({
      sessionId,
      fileName: file.name,
      pages: rawDocs.length,
      chunks: chunks.length,
    });
  } catch (err) {
    console.error("ingest error", err);
    return Response.json(
      { error: err?.message || "Ingestion failed" },
      { status: 500 },
    );
  }
}
