import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

async function testEmbedding(modelName) {
  try {
    console.log(`Testing embedding model: "${modelName}"...`);
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: modelName,
      model: modelName,
      apiKey: process.env.GEMINI_API_KEY,
      maxRetries: 0,
    });
    const vector = await embeddings.embedQuery("Hi, tell me about TCP.");
    console.log(`✅ Success: returned vector length = ${vector.length}`);
    return vector.length;
  } catch (err) {
    console.log(`❌ Failed with "${modelName}":`, err.message);
    return null;
  }
}

async function main() {
  const models = [
    "gemini-embedding-001",
    "text-embedding-004"
  ];
  for (const m of models) {
    await testEmbedding(m);
  }
}

main();
