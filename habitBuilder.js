// habitBuilder.js
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Clean JSON safely (removes ```json and extra text)
function extractJSON(text) {
  try {
    // Remove code blocks
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Find first { and last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start !== -1 && end !== -1) {
      const jsonString = text.substring(start, end + 1);
      return JSON.parse(jsonString);
    }

    throw new Error("No valid JSON object found.");
  } catch (err) {
    console.log("JSON Parse Error:", err);
    throw new Error("Invalid JSON from AI");
  }
}

export async function generateHabitPlan(user) {
  const { wakeTime, sleepTime, habits, goal } = user;

  const prompt = `
You are an AI habit and routine planner.

RETURN ONLY PURE JSON. NO backticks. NO explanation. NO text outside JSON.

User Info:
- Wake Time: ${wakeTime}
- Sleep Time: ${sleepTime}
- Goal: ${goal}
- Habits: ${habits.join(", ")}

Output format:

{
  "schedule": [
    { "time": "6:00 AM", "task": "Wake up", "duration": "10 min" },
    { "time": "6:10 AM", "task": "Meditation", "duration": "15 min" }
  ],
  "notes": "Summary here"
}
`;

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "You ONLY return JSON." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  return extractJSON(raw);
}
