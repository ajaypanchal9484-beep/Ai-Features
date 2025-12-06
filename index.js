import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { generateHabitPlan } from "./habitBuilder.js";
import { generateMoodPlan } from "./moodPlanner.js";
import { analyzeStress } from "./stressAnalyzer.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// GROQ CLIENT (FREE)
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function calculateCalories(user) {
  const { age, gender, height, weight, activity, goal } = user;

  let bmr =
    10 * weight + 6.25 * height - 5 * age + (gender === "male" ? 5 : -161);

  const activityFactor = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };

  let calories = bmr * (activityFactor[activity] || 1.2);

  if (goal === "lose") calories -= 300;
  if (goal === "gain") calories += 300;

  return Math.round(calories);
}

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
    const user = req.body;
    const calories = calculateCalories(user);

    const prompt = `
Generate a healthy diet plan for a user.

User info:
Calories needed: ${calories}
Veg: ${user.veg}
Allergies: ${user.allergies}
Goal: ${user.goal}

Return ONLY clean JSON in following format (do NOT add anything else):
{
  "calories": 2100,
  "breakfast": [{ "item": "Oats", "quantity": "1 bowl", "cal": 350 }],
  "lunch": [{ "item": "Veg Thali", "quantity": "1 plate", "cal": 600 }],
  "snacks": [],
  "dinner": [],
  "summary": "Short summary..."
}
`;

    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a diet expert AI." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";

    res.json(JSON.parse(content));
  } catch (err) {
    console.error(err);
    res.json({ error: err.message });
  }
});

app.listen(4000, () => {
  console.log("GROQ Diet AI running on http://localhost:4000");
});
