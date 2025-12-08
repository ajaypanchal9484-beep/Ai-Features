import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { generateHabitPlan } from "./habitBuilder.js";
import { generateMoodPlan } from "./moodPlanner.js";
import { analyzeStress } from "./stressAnalyzer.js";
import {
  generateMealPlan,
  saveMealPlanToFirestore,
  getMealPlanHistory,
  deleteMealPlan,
  updateMealPlanNotes,
} from "./mealPlanner.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// GROQ CLIENT (FREE)
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post("/generateHabitPlan", async (req, res) => {
  try {
    const result = await generateHabitPlan(req.body);
    res.json(result);
  } catch (err) {
    console.log(err);
    res.json({ error: err.message });
  }
});

app.post("/generateMoodPlan", async (req, res) => {
  try {
    const result = await generateMoodPlan(req.body);
    res.json(result);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post("/analyzeStress", async (req, res) => {
  try {
    const result = await analyzeStress(req.body);
    res.json(result);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post("/generateDiet", async (req, res) => {
  try {
    const { email, profile } = req.body;

    if (!email || !profile) {
      return res.status(400).json({
        error: "Missing email or profile in request body",
      });
    }

    console.log(
      `\n📋 NEW MEAL PLAN REQUEST - User: ${email}, Vegetarian: ${profile.is_vegetarian}`
    );

    // Generate meal plan with Groq
    const result = await generateMealPlan(profile);

    if (result.success) {
      // Save to Firestore
      const saved = await saveMealPlanToFirestore(
        email,
        result.plan,
        profile,
        req.body.notes || null
      );

      console.log(`✅ Meal plan generated and saved for ${email}\n`);

      res.json({
        success: true,
        plan: result.plan,
        firestoreId: saved.docId || null,
        firestorePath: saved.path || null,
        message: "Meal plan generated and saved",
        timestamp: result.timestamp,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to generate meal plan",
      });
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Meal plan generation failed",
    });
  }
});

// ─────────────────────────────────────────────────────────
// GET meal plan history for a user (by email)
// ─────────────────────────────────────────────────────────
app.get("/mealHistory/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const days = parseInt(req.query.days) || 30;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log(`📖 Fetching ${days}-day meal history for: ${email}`);

    const history = await getMealPlanHistory(email, days);

    res.json({
      success: true,
      email: email,
      history: history,
      count: history.length,
      days: days,
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve meal history",
    });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE a specific meal plan
// ─────────────────────────────────────────────────────────
app.delete("/mealHistory/:email/:docId", async (req, res) => {
  try {
    const { email, docId } = req.params;

    if (!email || !docId) {
      return res.status(400).json({ error: "Email and docId are required" });
    }

    console.log(`🗑️  Deleting meal plan: ${docId} for ${email}`);

    const result = await deleteMealPlan(email, docId);

    res.json(result);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to delete meal plan",
    });
  }
});

// ─────────────────────────────────────────────────────────
// UPDATE meal plan notes
// ─────────────────────────────────────────────────────────
app.put("/mealHistory/:email/:docId", async (req, res) => {
  try {
    const { email, docId } = req.params;
    const { notes } = req.body;

    if (!email || !docId) {
      return res.status(400).json({ error: "Email and docId are required" });
    }

    console.log(`📝 Updating notes for meal plan: ${docId}`);

    const result = await updateMealPlanNotes(email, docId, notes);

    res.json(result);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to update meal plan",
    });
  }
});

app.listen(4000, () => {
  console.log("GROQ Diet AI running on http://localhost:4000");
});
