# 🚀 RAG Quick Start Guide

## What Was Implemented

Your meal planner now uses **RAG (Retrieval-Augmented Generation)** - a system that:

1. Searches a recipe database for suitable options
2. Retrieves matching recipes based on user preferences
3. Feeds those recipes to the AI for generation
4. Results in better, more consistent meal plans

---

## ✅ Installation Complete!

All files created and dependencies installed:

```
✅ recipeDatabase.js     - 40+ curated recipes
✅ vectorStore.js        - Semantic search engine
✅ Updated mealPlanner.js - Uses RAG retrieval
✅ Updated index.js      - Initializes RAG on startup
✅ Updated package.json  - Added dependencies
✅ npm install           - Dependencies installed
```

---

## 🎯 To Test the RAG System

### 1. Start the server:

```bash
npm run dev
```

### 2. Send a test request:

```bash
curl -X POST http://localhost:3000/generateDiet \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "profile": {
      "age": 30,
      "gender": "male",
      "height_cm": 180,
      "weight_kg": 75,
      "activity_level": "moderate",
      "dietary_goal": "lose",
      "is_vegetarian": false,
      "allergies": []
    }
  }'
```

### 3. You'll see RAG logs:

```
🔍 RAG: Searching recipe database...
✅ Using 11 recipes from knowledge base
✅ RAG Sources used: 3 breakfast + 3 lunch + 3 dinner + 2 snacks recipes
```

---

## 📊 Recipe Database Stats

The system includes:

- **40 recipes** across multiple cuisines
- **Indian** (vegetarian & non-vegetarian)
- **Mediterranean** (healthy, seafood options)
- **Asian** (Thai, stir-fry, tofu options)
- **Mexican** (beans, chicken tacos)
- **Italian** (pasta, salmon)
- **Breakfast & Snacks** (oats, smoothies, nuts)

All recipes have:

- Calories & macros (protein, carbs, fats)
- Allergen information
- Description and ingredients
- Cuisine type

---

## 🔑 Key Features

### ✅ Semantic Search

- Finds recipes similar to user's profile
- Respects dietary restrictions
- Filters by allergies automatically

### ✅ Fallback Mode

- Works without OpenAI API (uses hash-based embeddings)
- Better quality with OpenAI (optional)
- No single point of failure

### ✅ Easy to Expand

- Add recipes: Just add objects to `sampleRecipes` array
- Add 500+ recipes gradually
- Scale to Pinecone for production

### ✅ Validated Output

- All meals respect vegetarian restrictions
- Allergens filtered out automatically
- Calorie targets met

---

## 📝 Optional: Add OpenAI for Better Embeddings

If you want better semantic search (recommended for production):

1. Get OpenAI API key: https://platform.openai.com/
2. Add to `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
```

3. Restart the server

That's it! The system automatically uses better embeddings.

---

## 📚 File Reference

| File                    | Purpose                            |
| ----------------------- | ---------------------------------- |
| `recipeDatabase.js`     | All 40 recipes with nutrition data |
| `vectorStore.js`        | Search engine & embeddings         |
| `mealPlanner.js`        | RAG-enhanced meal generation       |
| `index.js`              | API server & RAG initialization    |
| `RAG_IMPLEMENTATION.md` | Detailed documentation             |

---

## 🎓 How It Works (Simple)

```
User Request
    ↓
Search Recipe DB (by allergies, vegetarian, calories)
    ↓
Retrieve Top Recipes
    ↓
Build Enhanced Prompt with Recipes
    ↓
Groq AI Generates from Database
    ↓
Validate Output
    ↓
Return Meal Plan
```

**Key difference:** AI now generates from your data, not inventing.

---

## ❓ FAQs

**Q: Will this break my frontend?**
A: No! API response format is identical.

**Q: How do I add more recipes?**
A: Edit `recipeDatabase.js` - add objects to `sampleRecipes` array.

**Q: Do I need to pay for anything?**
A: No! Works free with Groq. OpenAI optional for better embeddings.

**Q: What if it's slow?**
A: Vector search is milliseconds. Should be same speed or faster.

**Q: Can I use my own recipe database?**
A: Yes! Replace the recipes in `recipeDatabase.js`.

---

## 🚀 Next Steps

1. **Test it** - Run the server and send test requests
2. **Add recipes** - Expand to 100+ recipes as needed
3. **Monitor** - Check logs to see RAG working
4. **Scale** - Add OpenAI embeddings when ready
5. **Grow** - Migrate to Pinecone as you scale

---

**Everything is ready to use!** 🎉

Start the server and test: `npm run dev`
