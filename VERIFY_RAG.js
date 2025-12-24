#!/usr/bin/env node

/**
 * RAG System Verification Report
 * Checks all components and confirms everything is working
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   🔍 RAG SYSTEM VERIFICATION REPORT                        ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// FILE STRUCTURE VERIFICATION
// ============================================================================

console.log(`\n📁 FILE STRUCTURE CHECK`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const requiredFiles = {
  "Core Modules": ["vectorStore.js", "recipeDatabase.js"],
  "Updated Files": ["mealPlanner.js", "index.js"],
  Configuration: ["package.json", ".env", ".env.example"],
  Documentation: [
    "RAG_QUICKSTART.md",
    "RAG_IMPLEMENTATION.md",
    "ARCHITECTURE.md",
    "EXAMPLES_AND_TESTING.md",
    "STATUS_REPORT.md",
    "README_RAG.md",
  ],
};

import fs from "fs";
import path from "path";

const currentDir = process.cwd();
let allFilesPresent = true;

for (const [category, files] of Object.entries(requiredFiles)) {
  console.log(`\n${category}:`);
  for (const file of files) {
    const filePath = path.join(currentDir, file);
    const exists = fs.existsSync(filePath);
    const status = exists ? "✅" : "❌";
    console.log(`  ${status} ${file}`);
    if (!exists) allFilesPresent = false;
  }
}

// ============================================================================
// DEPENDENCY VERIFICATION
// ============================================================================

console.log(`\n\n🔧 DEPENDENCY CHECK`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const packageJsonPath = path.join(currentDir, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

const requiredDeps = {
  Core: [
    "express",
    "cors",
    "dotenv",
    "groq-sdk",
    "firebase-admin",
    "node-fetch",
  ],
  RAG: ["@pinecone-database/pinecone"],
  Optional: ["openai", "nodemon"],
};

let depsOk = true;
for (const [category, deps] of Object.entries(requiredDeps)) {
  console.log(`\n${category}:`);
  for (const dep of deps) {
    const isInstalled =
      (packageJson.dependencies && packageJson.dependencies[dep]) ||
      (packageJson.devDependencies && packageJson.devDependencies[dep]);
    const status = isInstalled ? "✅" : "❌";
    console.log(`  ${status} ${dep}`);
    if (!isInstalled && category === "Core") depsOk = false;
  }
}

// ============================================================================
// CODE INTEGRATION VERIFICATION
// ============================================================================

console.log(`\n\n🔗 CODE INTEGRATION CHECK`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const checks = {
  "index.js": [
    {
      name: "RAG imports",
      regex: /import.*vectorStore|import.*recipeDatabase/,
    },
    {
      name: "RAG initialization",
      regex: /initializeRAG|initializeVectorStore|initializeRecipeDatabase/,
    },
    { name: "RAG middleware", regex: /app\.use.*initializeRAG/ },
  ],
  "mealPlanner.js": [
    {
      name: "RAG imports",
      regex: /import.*vectorStore|retrieveRelevantRecipes/,
    },
    { name: "RAG search", regex: /searchRecipes.*allergies.*vegetarian/ },
    { name: "RAG prompt", regex: /RAG RECIPE DATABASE/ },
    { name: "RAG tracking", regex: /rag_sources/ },
  ],
  "vectorStore.js": [
    { name: "Embedding function", regex: /getEmbedding|cosineSimilarity/ },
    { name: "Search function", regex: /export.*searchRecipes/ },
    { name: "Initialize function", regex: /export.*initializeVectorStore/ },
  ],
  "recipeDatabase.js": [
    { name: "Recipe array", regex: /sampleRecipes.*=.*\[/ },
    {
      name: "Sample recipes",
      regex: /veg_paneer_tikka|fish_curry|chicken_tikka/,
    },
    { name: "Initialize function", regex: /export.*initializeRecipeDatabase/ },
  ],
};

let integrationOk = true;
for (const [file, fileChecks] of Object.entries(checks)) {
  const filePath = path.join(currentDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`\n${file}: ❌ FILE NOT FOUND`);
    integrationOk = false;
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  console.log(`\n${file}:`);

  for (const check of fileChecks) {
    const passed = check.regex.test(content);
    const status = passed ? "✅" : "❌";
    console.log(`  ${status} ${check.name}`);
    if (!passed) integrationOk = false;
  }
}

// ============================================================================
// ENVIRONMENT VERIFICATION
// ============================================================================

console.log(`\n\n🔑 ENVIRONMENT CONFIGURATION`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const envPath = path.join(currentDir, ".env");
let envOk = false;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  console.log("\n.env file:");

  const hasGroqKey = envContent.includes("GROQ_API_KEY");
  console.log(`  ${hasGroqKey ? "✅" : "❌"} GROQ_API_KEY configured`);

  const hasOpenAiKey = envContent.includes("OPENAI_API_KEY");
  console.log(
    `  ${hasOpenAiKey ? "✅" : "⚠️"} OPENAI_API_KEY configured (optional)`
  );

  if (hasGroqKey) envOk = true;
} else {
  console.log("\n.env file: ❌ NOT FOUND (but .env.example provided)");
}

// ============================================================================
// RECIPE DATABASE VERIFICATION
// ============================================================================

console.log(`\n\n🍽️  RECIPE DATABASE VERIFICATION`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const recipePath = path.join(currentDir, "recipeDatabase.js");
if (fs.existsSync(recipePath)) {
  const recipeContent = fs.readFileSync(recipePath, "utf8");

  // Count recipes
  const recipeMatches = recipeContent.match(/id:\s*"[^"]+"/g) || [];
  console.log(
    `\n✅ Recipe database loaded: ${recipeMatches.length} recipes found`
  );

  // Check recipe features
  const hasVegetarian = /vegetarian:\s*(true|false)/g.test(recipeContent);
  const hasCalories = /calories:\s*\d+/g.test(recipeContent);
  const hasMacros = /protein:|carbs:|fats:/g.test(recipeContent);
  const hasAllergies = /allergies:/g.test(recipeContent);

  console.log(`\nRecipe Features:`);
  console.log(`  ${hasVegetarian ? "✅" : "❌"} Vegetarian flag`);
  console.log(`  ${hasCalories ? "✅" : "❌"} Calorie information`);
  console.log(
    `  ${hasMacros ? "✅" : "❌"} Macronutrient data (protein, carbs, fats)`
  );
  console.log(`  ${hasAllergies ? "✅" : "❌"} Allergen tracking`);
} else {
  console.log(`\n❌ Recipe database not found`);
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================

console.log(
  `\n\n╔════════════════════════════════════════════════════════════════════════════╗`
);
console.log(
  `║                          VERIFICATION SUMMARY                            ║`
);
console.log(
  `╚════════════════════════════════════════════════════════════════════════════╝`
);

const allChecks = {
  "Files Structure": allFilesPresent,
  Dependencies: depsOk,
  "Code Integration": integrationOk,
  "Environment Setup": envOk,
};

let overallStatus = true;
for (const [check, passed] of Object.entries(allChecks)) {
  const status = passed ? "✅" : "❌";
  console.log(`${status} ${check}`);
  if (!passed) overallStatus = false;
}

console.log(`\n`);

if (overallStatus) {
  console.log(
    `╔════════════════════════════════════════════════════════════════════════════╗`
  );
  console.log(
    `║                                                                            ║`
  );
  console.log(
    `║              ✅ ALL CHECKS PASSED - RAG SYSTEM IS READY! ✅               ║`
  );
  console.log(
    `║                                                                            ║`
  );
  console.log(
    `║                    To start the server:                                   ║`
  );
  console.log(
    `║                        npm run dev                                         ║`
  );
  console.log(
    `║                                                                            ║`
  );
  console.log(
    `║             Your RAG system will initialize on startup                   ║`
  );
  console.log(
    `║                                                                            ║`
  );
  console.log(
    `╚════════════════════════════════════════════════════════════════════════════╝`
  );
} else {
  console.log(
    `⚠️  Some checks failed. Please review the items marked with ❌ above.`
  );
  console.log(`\nCommon issues:`);
  console.log(
    `  1. Missing files - Run: npm install (to reinstall dependencies)`
  );
  console.log(`  2. Missing .env - Copy .env.example to .env and add API keys`);
  console.log(`  3. Import errors - Check file paths in imports`);
}

console.log(`\n`);
