import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

let embeddingsInstance = null;

export function getEmbeddings() {
  if (!embeddingsInstance) {
    embeddingsInstance = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: "sentence-transformers/all-MiniLM-L6-v2",
    });
  }

  return embeddingsInstance;
}

export function qdrantConfig(collectionName) {
  return {
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    collectionName,
  };
}

export async function indexDocuments(docs, collectionName) {
  return QdrantVectorStore.fromDocuments(
    docs,
    getEmbeddings(),
    qdrantConfig(collectionName),
  );
}

export async function getRetriever(collectionName, k = 8) {
  const store = await QdrantVectorStore.fromExistingCollection(
    getEmbeddings(),
    qdrantConfig(collectionName),
  );

  return store.asRetriever({
    k,
  });
}