# RAG System Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE/FRONTEND                           │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ POST /generateDiet
                   │ { email, profile }
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER                               │
│                    (index.js)                                    │
│                                                                  │
│  • CORS enabled                                                 │
│  • RAG middleware initialization                                │
│  • Error handling                                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ POST /generateDiet
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│            RAG MODULE INITIALIZATION                             │
│                                                                  │
│  1. initializeRecipeDatabase()                                  │
│     └─> Load 40 recipes into memory                            │
│                                                                  │
│  2. initializeVectorStore()                                     │
│     ├─> For each recipe:                                       │
│     │   ├─> Combine: name + cuisine + description             │
│     │   ├─> Create embedding (OpenAI or hash)                 │
│     │   └─> Store in memory map                               │
│     └─> Ready for search                                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              RETRIEVAL STEP (RAG)                                │
│           (vectorStore.js - searchRecipes)                      │
│                                                                  │
│  Input: User Profile                                            │
│  ├─ age, gender, weight                                        │
│  ├─ is_vegetarian (boolean)                                    │
│  ├─ allergies (array)                                          │
│  ├─ dietary_goal                                               │
│  └─ daily_calories                                             │
│                                                                  │
│  Filtering:                                                      │
│  1. Vegetarian filter                                           │
│     └─> Keep only veg/non-veg recipes as needed               │
│                                                                  │
│  2. Allergen filter                                             │
│     └─> Remove recipes with user's allergens                  │
│                                                                  │
│  3. Calorie range filter                                        │
│     └─> Keep 150-500 cal recipes (flexible)                   │
│                                                                  │
│  4. Protein filter                                              │
│     └─> Min 8g for veg, 15g for non-veg                      │
│                                                                  │
│  Output: ~15 filtered recipes                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│          RECIPE CATEGORIZATION                                   │
│          (mealPlanner.js)                                        │
│                                                                  │
│  ├─ Breakfast (< 300 cal) ──> 3 recipes                        │
│  ├─ Lunch (300-450 cal) ────> 3 recipes                        │
│  ├─ Dinner (250-400 cal) ───> 3 recipes                        │
│  └─ Snacks (< 200 cal) ─────> 2 recipes                        │
│                                                                  │
│  Format for prompt:                                              │
│  "✅ BREAKFAST OPTIONS:                                         │
│   - Oatmeal (280cal, 12g protein)                              │
│   - Smoothie (240cal, 20g protein)                             │
│   ..."                                                           │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│          ENHANCED PROMPT GENERATION                              │
│          (mealPlanner.js)                                        │
│                                                                  │
│  System Message:                                                 │
│  "You are a professional nutritionist.                          │
│   Return ONLY valid JSON.                                       │
│   Use recipes from provided database when possible."            │
│                                                                  │
│  User Message:                                                   │
│  ┌───────────────────────────────────────────────────┐         │
│  │ You are an expert nutritionist AI.                │         │
│  │                                                   │         │
│  │ RAG RECIPE DATABASE - SUITABLE OPTIONS:           │         │
│  │ ✅ BREAKFAST OPTIONS:                            │         │
│  │    - Oatmeal (280cal, 12g protein)              │         │
│  │    - Smoothie (240cal, 20g protein)             │         │
│  │    - Eggs (320cal, 18g protein)                 │         │
│  │                                                   │         │
│  │ ✅ LUNCH OPTIONS:                                │         │
│  │    - Dal Rice (350cal, 12g protein)             │         │
│  │    - Paneer Tikka (280cal, 15g protein)         │         │
│  │    - Grilled Fish (320cal, 38g protein)         │         │
│  │                                                   │         │
│  │ [Continue with dinner, snacks, constraints...]   │         │
│  │                                                   │         │
│  │ USER PROFILE:                                    │         │
│  │ - Age: 30 years                                 │         │
│  │ - Vegetarian: true                              │         │
│  │ - Allergies: nuts, dairy                         │         │
│  │ - Daily Calorie Target: 1800 calories           │         │
│  │                                                   │         │
│  │ MEAL DISTRIBUTION:                               │         │
│  │ - Breakfast: 450-540 cal                         │         │
│  │ - Lunch: 630-720 cal                             │         │
│  │ - Snacks: 90-180 cal                             │         │
│  │ - Dinner: 450-540 cal                            │         │
│  │                                                   │         │
│  │ Return ONLY valid JSON with meal plan            │         │
│  └───────────────────────────────────────────────────┘         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ LLM Generation
                   │ (Uses recipes from database, not inventing)
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│             GROQ API                                             │
│             (llama-3.1-8b-instant)                              │
│                                                                  │
│  Input: Enhanced prompt with recipe context                    │
│  Process: Generate meal plan JSON                              │
│  Output: Valid JSON meal plan                                  │
│                                                                  │
│  Response:                                                       │
│  {                                                              │
│    "breakfast": [                                              │
│      {                                                          │
│        "item": "Vegetable Dosa",                              │
│        "quantity": "2 pieces",                                 │
│        "calories": 220,                                        │
│        "protein_g": 8,                                         │
│        "carbs_g": 32,                                          │
│        "fats_g": 6                                             │
│      }                                                          │
│    ],                                                           │
│    ...                                                          │
│  }                                                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│           RESPONSE VALIDATION                                    │
│           (mealPlanner.js)                                      │
│                                                                  │
│  1. JSON Extraction                                             │
│     └─> Parse meal plan from response                         │
│                                                                  │
│  2. Vegetarian Validation                                       │
│     └─> Check no meat/fish/eggs if vegetarian                │
│                                                                  │
│  3. Allergen Validation                                         │
│     └─> Check no allergens in any meal                        │
│                                                                  │
│  4. Nutrition Validation                                        │
│     └─> Verify calories match target                          │
│                                                                  │
│  Status: ✅ PASSED or ❌ FAILED                                │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│         RESPONSE WITH RAG METADATA                               │
│                                                                  │
│  {                                                              │
│    "success": true,                                            │
│    "plan": { /* full meal plan */ },                          │
│    "rag_sources": {                                            │
│      "breakfast": [ /* 3 recipes used */ ],                   │
│      "lunch": [ /* 3 recipes used */ ],                       │
│      "dinner": [ /* 3 recipes used */ ],                      │
│      "snacks": [ /* 2 recipes used */ ]                       │
│    },                                                           │
│    "timestamp": "2025-12-24T19:00:00Z"                        │
│  }                                                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ JSON Response
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│            OPTIONAL: FIRESTORE SAVE                              │
│            (saveMealPlanToFirestore)                             │
│                                                                  │
│  Path: users/{email}/meal_history/{docId}                      │
│  Data:                                                           │
│  {                                                              │
│    email: "user@example.com",                                  │
│    date: "2025-12-24",                                         │
│    plan: { /* full meal plan */ },                            │
│    profile: { /* user profile data */ },                      │
│    created_at: "2025-12-24T19:00:00Z"                         │
│  }                                                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND/APP                                          │
│                                                                  │
│  Display:                                                        │
│  • Breakfast items with nutrition                              │
│  • Lunch items with nutrition                                  │
│  • Dinner items with nutrition                                 │
│  • Snacks with nutrition                                       │
│  • Total macros summary                                        │
│  • Source recipes (optional transparency)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
REQUEST FLOW:
─────────────

User Profile
     ↓
[searchRecipes()]
     ↓
Filtered Recipes (15 matched)
     ↓
Categorize by meal type
     ↓
[Enhanced Prompt with Recipes]
     ↓
Groq API
     ↓
Raw JSON Response
     ↓
Validate JSON
     ↓
Check Vegetarian/Allergies
     ↓
Final Meal Plan + RAG Sources
     ↓
Response to Frontend


DATABASE STRUCTURE:
──────────────────

recipeDatabase.js (40 recipes)
├─ Recipe 1: { id, name, cuisine, calories, macros, allergies, veg?, description, ingredients }
├─ Recipe 2: { ... }
└─ Recipe 40: { ... }
     ↓
vectorStore.js (In-memory embeddings)
├─ Recipe 1: { recipe_obj, embedding_vector, textToEmbed }
├─ Recipe 2: { ... }
└─ Recipe 40: { ... }
     ↓
searchRecipes() returns filtered & sorted results
```

---

## 🔄 Component Interaction

```
┌──────────────────┐
│   index.js       │ ◄─── Initialization
│  (Express)       │      (RAG Middleware)
└────────┬─────────┘
         │
         ├──► recipeDatabase.js ──► Load 40 recipes
         │
         └──► vectorStore.js ──► Create embeddings
                                  & search engine
                │
                ├─ getEmbedding()
                ├─ initializeVectorStore()
                ├─ searchRecipes()
                └─ retrieveRelevantRecipes()
                     │
                     └──► mealPlanner.js
                          ├─ generateMealPlan()
                          │  (uses RAG results)
                          │
                          ├─ saveMealPlanToFirestore()
                          ├─ getMealPlanHistory()
                          ├─ deleteMealPlan()
                          └─ updateMealPlanNotes()
                               │
                               └──► Firestore
                                   (optional save)
```

---

## ⚡ Performance Path

```
User Request (1ms)
    ↓
Database Search (10-50ms)
    ├─ Embedding query (5-10ms)
    ├─ Filter matching (5-20ms)
    └─ Sort results (1-5ms)
    ↓
Prompt Building (5ms)
    ├─ Format recipes
    └─ Combine with user data
    ↓
Groq API Call (2-10 seconds) ◄── BOTTLENECK
    ├─ LLM generation
    └─ Response streaming
    ↓
Validation (5-10ms)
    ├─ JSON parse
    ├─ Allergen check
    └─ Vegetarian check
    ↓
Response (1ms)

Total Time: ~2-10 seconds (dominated by Groq API)
RAG Overhead: ~20-65ms (~0.2-0.7%)
```

---

This architecture is designed to be:

- ✅ Scalable (easy to add recipes)
- ✅ Fast (RAG adds minimal overhead)
- ✅ Reliable (fallback modes)
- ✅ Transparent (shows sources)
- ✅ Maintainable (clean separation)
