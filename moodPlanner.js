// moodPlanner.js
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Clean JSON safely
function extractJSON(text) {
  try {
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return JSON.parse(text.substring(start, end + 1));
  } catch (err) {
    throw new Error("Invalid JSON from AI");
  }
}

export async function generateMoodPlan(input) {
  const { mood, sleepQuality, energyLevel, workload, notes } = input;

  const prompt = `
Create a personalized daily plan based on the user's mood and energy.

User Input:
- Mood: ${mood}
- Sleep Quality: ${sleepQuality}
- Energy Level: ${energyLevel}
- Workload: ${workload}
- Notes: ${notes}

Rules:
✔ Adjust workout intensity based on energy  
✔ Reduce tasks if user feels stressed/tired  
✔ Add breaks if overwhelmed  
✔ Increase productivity tasks if feeling good  
✔ Recommend water, food, and rest  
✔ Return ONLY JSON (no backticks)

Output Format:
{
  "adjustedPlan": [
    { "time": "9:00 AM", "task": "Light workout", "reason": "Low energy" }
  ],
  "recommendations": [
    "Drink more water",
    "Take short breaks"
  ],
  "summary": "AI explanation here"
}
`;

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are an AI mood planner that outputs ONLY JSON.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0].message.content;
  return extractJSON(raw);
}
