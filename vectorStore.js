// Vector Store for RAG - manages recipe embeddings and retrieval
import { sampleRecipes } from "./recipeDatabase.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// In-memory store for embeddings (for demo - use Pinecone for production)
let recipeEmbeddings = new Map();

// Get embedding from OpenAI
export const getEmbedding = async (text) => {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("❌ Embedding error:", error.message);
    // Fallback: return simple hash-based embedding if OpenAI fails
    return generateSimpleEmbedding(text);
  }
};

// Simple embedding fallback (hash-based)
const generateSimpleEmbedding = (text) => {
  const words = text.toLowerCase().split(" ");
  const embedding = new Array(384).fill(0);

  words.forEach((word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash = hash & hash;
    }
    const index = Math.abs(hash) % 384;
    embedding[index] += 1;
  });

  // Normalize
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );
  return embedding.map((val) => val / (magnitude || 1));
};

// Calculate cosine similarity
const cosineSimilarity = (a, b) => {
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Initialize embeddings for all recipes
export const initializeVectorStore = async () => {
  console.log("🔄 Initializing recipe embeddings...");

  for (const recipe of sampleRecipes) {
    const textToEmbed = `${recipe.name} ${recipe.cuisine} ${
      recipe.description
    } ${recipe.ingredients.join(" ")}`;
    const embedding = await getEmbedding(textToEmbed);
    recipeEmbeddings.set(recipe.id, {
      recipe,
      embedding,
      textToEmbed,
    });
  }

  console.log(
    `✅ Vector store initialized with ${recipeEmbeddings.size} recipes`
  );
};

// Retrieve relevant recipes based on query
export const retrieveRelevantRecipes = async (query, options = {}) => {
  const {
    topK = 5,
    vegetarian = null,
    cuisine = null,
    maxCalories = null,
  } = options;

  // Get embedding for query
  const queryEmbedding = await getEmbedding(query);

  // Calculate similarity scores
  const results = [];

  for (const [recipeId, data] of recipeEmbeddings.entries()) {
    const { recipe, embedding } = data;

    // Apply filters
    if (vegetarian !== null && recipe.vegetarian !== vegetarian) continue;
    if (cuisine && recipe.cuisine !== cuisine) continue;
    if (maxCalories && recipe.calories > maxCalories) continue;

    // Calculate similarity
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    results.push({
      id: recipe.id,
      name: recipe.name,
      cuisine: recipe.cuisine,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
      vegetarian: recipe.vegetarian,
      allergies: recipe.allergies,
      description: recipe.description,
      similarity: similarity,
    });
  }

  // Sort by similarity and return top K
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
};

// Search recipes by multiple criteria
export const searchRecipes = async (criteria) => {
  const {
    cuisines = [],
    vegetarian = null,
    allergies = [],
    calorieRange = { min: 0, max: 1000 },
    proteinMin = 0,
    topK = 10,
  } = criteria;

  let filtered = Array.from(sampleRecipes);

  // Filter by vegetarian
  if (vegetarian !== null) {
    filtered = filtered.filter((r) => r.vegetarian === vegetarian);
  }

  // Filter by cuisine
  if (cuisines.length > 0) {
    filtered = filtered.filter((r) => cuisines.includes(r.cuisine));
  }

  // Filter by allergies (exclude recipes with allergens)
  if (allergies.length > 0) {
    filtered = filtered.filter((r) => {
      return !allergies.some((allergen) =>
        r.allergies.some((a) =>
          a.toLowerCase().includes(allergen.toLowerCase())
        )
      );
    });
  }

  // Filter by calories
  filtered = filtered.filter(
    (r) => r.calories >= calorieRange.min && r.calories <= calorieRange.max
  );

  // Filter by protein
  filtered = filtered.filter((r) => r.protein >= proteinMin);

  return filtered.slice(0, topK);
};

// Get recipe by ID
export const getRecipeById = (id) => {
  const data = recipeEmbeddings.get(id);
  return data ? data.recipe : null;
};

// Get similar recipes
export const getSimilarRecipes = async (recipeId, topK = 5) => {
  const data = recipeEmbeddings.get(recipeId);
  if (!data) return [];

  const { embedding } = data;
  const results = [];

  for (const [id, otherData] of recipeEmbeddings.entries()) {
    if (id === recipeId) continue;

    const similarity = cosineSimilarity(embedding, otherData.embedding);
    results.push({
      ...otherData.recipe,
      similarity,
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
};
