import OpenAI from "openai";

const SYSTEM = `You are a query preprocessor for a document Q&A system.

Given the user's question (which may contain typos, abbreviations, or informal phrasing), produce:
1. "cleaned": a corrected, well-formed version of the question (fix typos, expand obvious abbreviations, keep the user's intent)
2. "variants": two alternative paraphrases that use different vocabulary the document might use

Strict rules:
- Do NOT change the topic or scope of the question.
- Do NOT answer the question.
- Do NOT add information that wasn't implied.
- If the input is already clean, "cleaned" should be essentially the same.
- Variants should be genuinely different phrasings, not trivial reorderings.

Respond ONLY with valid JSON in this exact shape:
{"cleaned": "...", "variants": ["...", "..."]}`;

function getClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export async function rewriteQuery(question) {
  try {
    const client = getClient();
    const res = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: question },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const cleaned =
      typeof parsed.cleaned === "string" && parsed.cleaned.trim()
        ? parsed.cleaned.trim()
        : question;

    const variants = Array.isArray(parsed.variants)
      ? parsed.variants
          .filter((v) => typeof v === "string" && v.trim() && v.trim() !== cleaned)
          .slice(0, 2)
      : [];

    return { cleaned, variants };
  } catch (err) {
    console.warn("queryRewriter failed, falling back to original:", err.message);
    return { cleaned: question, variants: [] };
  }
}
