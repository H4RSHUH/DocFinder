import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const COLLECTION_NAME = "docfinder";
const VECTOR_SIZE = 3072; // gemini-embedding-001 output dimension

let client = null;

/**
 * Returns a singleton QdrantClient instance.
 */
export function getClient() {
  if (!client) {
    client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return client;
}

/**
 * Returns the shared collection name used for all documents.
 */
export function getCollectionName() {
  return COLLECTION_NAME;
}

/**
 * Ensures the 'docfinder' collection exists in Qdrant with vector size 3072.
 * Recreates it if vector dimensions mismatch.
 */
export async function ensureCollection() {
  const qdrant = getClient();

  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (exists) {
      // Inspect existing collection to verify vector size
      try {
        const info = await qdrant.getCollection(COLLECTION_NAME);
        const currentSize = info.config?.params?.vectors?.size;

        if (currentSize !== VECTOR_SIZE) {
          console.warn(
            `⚠️ Qdrant collection '${COLLECTION_NAME}' vector dimension mismatch (found ${currentSize}, expected ${VECTOR_SIZE}). Recreating collection...`
          );
          await qdrant.deleteCollection(COLLECTION_NAME);
          await createNewCollection(qdrant);
        } else {
          console.log(`✅ Qdrant collection '${COLLECTION_NAME}' is ready (${VECTOR_SIZE}-dim)`);
        }
      } catch (err) {
        console.warn("⚠️ Could not check collection config, recreating collection...", err.message);
        await qdrant.deleteCollection(COLLECTION_NAME).catch(() => {});
        await createNewCollection(qdrant);
      }
    } else {
      await createNewCollection(qdrant);
    }
  } catch (error) {
    console.error("❌ Failed to initialize Qdrant collection:", error.message);
    throw error;
  }
}

async function createNewCollection(qdrant) {
  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: VECTOR_SIZE,
      distance: "Cosine",
    },
  });

  // Create payload indexes for efficient filtering
  await qdrant.createPayloadIndex(COLLECTION_NAME, {
    field_name: "docId",
    field_schema: "keyword",
  });

  await qdrant.createPayloadIndex(COLLECTION_NAME, {
    field_name: "fileName",
    field_schema: "keyword",
  });

  await qdrant.createPayloadIndex(COLLECTION_NAME, {
    field_name: "sessionId",
    field_schema: "keyword",
  });

  console.log(`✅ Created Qdrant collection '${COLLECTION_NAME}' (${VECTOR_SIZE}-dim)`);
}
