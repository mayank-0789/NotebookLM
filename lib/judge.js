import OpenAI from "openai";

const SYSTEM = `You are a relevance judge for a document Q&A system.

Given the user's question and a list of numbered chunks retrieved from a document, decide for each chunk whether it could help answer the question.

Grade each chunk as exactly one of:
- "relevant"   — directly answers or strongly supports answering the question
- "ambiguous"  — tangentially related; could provide useful context
- "irrelevant" — off-topic; does not help answer the question

Be strict: prefer "irrelevant" over "ambiguous" when a chunk clearly does not address the question.

Respond ONLY with valid JSON in this exact shape:
{"grades": [{"id": 1, "grade": "relevant"}, {"id": 2, "grade": "irrelevant"}]}

Include an entry for every chunk id. No other commentary.`;

function getClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function buildUserPrompt(question, chunks) {
  const list = chunks
    .map((c, i) => {
      const page = c.metadata?.page ?? "?";
      const text = (c.pageContent || "").slice(0, 500).replace(/\s+/g, " ").trim();
      return `[Chunk ${i + 1} | page ${page}]\n${text}`;
    })
    .join("\n\n");
  return `Question:\n${question}\n\nChunks:\n${list}`;
}

export async function gradeChunks(question, chunks) {
  if (!chunks.length) {
    return { kept: [], dropped: [], grades: [] };
  }

  try {
    const client = getClient();
    const res = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserPrompt(question, chunks) },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const gradesArr = Array.isArray(parsed.grades) ? parsed.grades : [];

    const gradeById = new Map();
    for (const g of gradesArr) {
      const id = typeof g?.id === "number" ? g.id : parseInt(g?.id, 10);
      const grade = typeof g?.grade === "string" ? g.grade.toLowerCase() : "ambiguous";
      if (Number.isFinite(id)) gradeById.set(id, grade);
    }

    const kept = [];
    const dropped = [];
    const grades = [];

    chunks.forEach((c, i) => {
      const grade = gradeById.get(i + 1) || "ambiguous";
      grades.push({ index: i, grade });
      if (grade === "irrelevant") {
        dropped.push(c);
      } else {
        kept.push(c);
      }
    });

    return { kept, dropped, grades };
  } catch (err) {
    console.warn("judge failed, keeping all chunks:", err.message);
    return {
      kept: chunks,
      dropped: [],
      grades: chunks.map((_, i) => ({ index: i, grade: "ambiguous" })),
    };
  }
}
