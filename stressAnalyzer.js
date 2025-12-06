// stressAnalyzer.js
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

export async function analyzeStress(input) {
  const { sleepHours, workHours, physicalActivity, mood, fatigueLevel } = input;

  const prompt = `
Analyze the user's stress and burnout risk using psychology-based patterns.

User Info:
- Sleep Hours: ${sleepHours}
- Work Hours: ${workHours}
- Physical Activity: ${physicalActivity}
- Mood: ${mood}
- Fatigue Level: ${fatigueLevel}

Rules:
✔ Calculate burnout risk score (0–100)  
✔ Determine stress level (Low, Medium, High, Critical)  
✔ Suggest rest, hydration, sleep improvements  
✔ Suggest reducing workload if required  
✔ Return ONLY JSON  

Output Format:
{
  "burnoutScore": 67,
  "stressLevel": "High",
  "analysis": "User is experiencing lack of sleep and high workload.",
  "recommendations": [
    "Take a 20 minute break",
    "Reduce workload",
    "Increase sleep to 7 hours"
  ]
}
`;

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are a stress & burnout analysis AI that outputs ONLY JSON.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0].message.content;
  return extractJSON(raw);
}
