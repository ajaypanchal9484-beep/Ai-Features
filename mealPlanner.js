import Groq from "groq-sdk";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize Groq Client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize Firebase Admin SDK (if credentials available)
let db = null;

const initializeFirebase = async () => {
  if (!admin.apps.length && process.env.FIREBASE_KEY_PATH) {
    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
      );
      if (Object.keys(serviceAccount).length > 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        db = admin.firestore();
        console.log("✅ Firebase initialized successfully");
      }
    } catch (err) {
      console.warn(
        "⚠️ Firebase initialization skipped (credentials not available)"
      );
    }
  }
};

// Initialize on import
await initializeFirebase();

// Helper: Clean and extract JSON from AI response
const extractJSON = (text) => {
  try {
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("No JSON found in response");
    }
    return JSON.parse(text.substring(start, end + 1));
  } catch (err) {
    console.error("JSON extraction error:", err);
    throw new Error("Invalid JSON from AI response");
  }
};

// Calculate Daily Calorie Needs (Harris-Benedict Formula)
const calculateCalories = (profile) => {
  const {
    age,
    gender,
    height_cm = 170,
    weight_kg = 70,
    activity_level = "moderate",
    dietary_goal = "maintain",
  } = profile;

  // BMR (Basal Metabolic Rate)
  let bmr;
  if (gender === "male") {
    bmr = 88.362 + 13.397 * weight_kg + 4.799 * height_cm - 5.677 * age;
  } else {
    bmr = 447.593 + 9.247 * weight_kg + 3.098 * height_cm - 4.33 * age;
  }

  // Activity factor
  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const factor = activityFactors[activity_level] || 1.2;
  let tdee = bmr * factor;

  // Adjust for goal
  if (dietary_goal === "lose") tdee -= 300;
  else if (dietary_goal === "gain") tdee += 300;

  return Math.round(tdee);
};

// Main meal plan generation function
export const generateMealPlan = async (profile) => {
  const {
    age = 25,
    gender = "male",
    height_cm = 170,
    weight_kg = 70,
    activity_level = "moderate",
    dietary_goal = "maintain",
    is_vegetarian = false,
    allergies = [],
    email = "user@example.com",
  } = profile;

  const calories = calculateCalories(profile);
  const dietType = is_vegetarian
    ? "STRICTLY VEGETARIAN (no meat, fish, poultry, or seafood - only plant-based and dairy products)"
    : "non-vegetarian (can include meat, fish, chicken)";

  const allergiesStr = allergies.length ? allergies.join(", ") : "none";

  // Random cuisine styles for variety
  const cuisines = [
    "Indian",
    "Mediterranean",
    "Asian",
    "Mexican",
    "Thai",
    "Middle Eastern",
    "Italian",
  ];
  const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];

  const prompt = `You are an expert nutritionist AI. Generate a PERSONALIZED daily meal plan that is unique and different from previous suggestions.

USER PROFILE:
- Age: ${age} years
- Gender: ${gender}
- Height: ${height_cm} cm
- Weight: ${weight_kg} kg
- Activity Level: ${activity_level}
- Dietary Goal: ${dietary_goal}
- Diet Type: ${dietType}
- Allergies/Restrictions: ${allergiesStr}
- Daily Calorie Target: ${calories} calories

STRICT REQUIREMENTS FOR THIS MEAL PLAN:
${
  is_vegetarian
    ? `❌ ABSOLUTELY NO CHICKEN, MEAT, FISH, SEAFOOD, OR EGGS
✅ ONLY vegetarian options: beans, lentils, tofu, paneer, vegetables, nuts, seeds, dairy products, grains`
    : `✅ You can use all protein sources including chicken, fish, meat`
}
❌ MUST AVOID all allergies: ${allergiesStr}
✅ Focus cuisine: ${randomCuisine}
✅ Create UNIQUE meals - NOT generic suggestions
✅ Realistic portions and macro distribution

MEAL DISTRIBUTION (target ${calories} calories):
- Breakfast: 25-30% (${Math.round(calories * 0.25)}-${Math.round(
    calories * 0.3
  )} cal)
- Lunch: 35-40% (${Math.round(calories * 0.35)}-${Math.round(
    calories * 0.4
  )} cal)
- Snacks: 5-10% (${Math.round(calories * 0.05)}-${Math.round(
    calories * 0.1
  )} cal)
- Dinner: 25-30% (${Math.round(calories * 0.25)}-${Math.round(
    calories * 0.3
  )} cal)

For EACH meal item provide: name, quantity, calories, protein(g), carbs(g), fats(g)

RETURN ONLY VALID JSON (NO EXTRA TEXT):
{
  "breakfast": [{"item": "name", "quantity": "amount", "calories": 300, "protein_g": 10, "carbs_g": 45, "fats_g": 8}],
  "lunch": [...],
  "snacks": [...],
  "dinner": [...],
  "total_calories": ${calories},
  "total_protein_g": 0,
  "total_carbs_g": 0,
  "total_fats_g": 0,
  "summary": "Personalized meal plan summary for this user"
}`;

  try {
    console.log(`🍽️  Generating meal plan for: ${email}`);
    console.log(`   Vegetarian: ${is_vegetarian}, Goal: ${dietary_goal}`);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a professional nutritionist. Return ONLY valid JSON. STRICTLY RESPECT DIETARY RESTRICTIONS AND ALLERGIES.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 1.0,
      max_tokens: 1500,
    });

    const rawResponse = completion.choices[0]?.message?.content || "{}";
    console.log("✅ Groq response received");

    const mealData = extractJSON(rawResponse);

    // CRITICAL: Validate vegetarian constraint
    if (is_vegetarian) {
      const nonVegKeywords = [
        "chicken",
        "meat",
        "beef",
        "mutton",
        "lamb",
        "pork",
        "fish",
        "shrimp",
        "prawn",
        "egg",
        "salmon",
        "tuna",
        "turkey",
      ];

      const allItems = [
        ...mealData.breakfast,
        ...mealData.lunch,
        ...mealData.snacks,
        ...mealData.dinner,
      ];

      for (const item of allItems) {
        const itemStr = item.item.toLowerCase();
        for (const keyword of nonVegKeywords) {
          if (itemStr.includes(keyword)) {
            throw new Error(
              `❌ VALIDATION FAILED: Non-vegetarian item "${item.item}" given to vegetarian user!`
            );
          }
        }
      }
    }

    // Validate allergies
    if (allergies.length > 0) {
      const allItems = [
        ...mealData.breakfast,
        ...mealData.lunch,
        ...mealData.snacks,
        ...mealData.dinner,
      ];

      for (const item of allItems) {
        const itemStr = item.item.toLowerCase();
        for (const allergen of allergies) {
          if (itemStr.includes(allergen.toLowerCase())) {
            throw new Error(
              `❌ VALIDATION FAILED: Allergen "${allergen}" found in "${item.item}"`
            );
          }
        }
      }
    }

    console.log("✅ Validation passed - meal plan is safe");

    return {
      success: true,
      plan: mealData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Meal plan generation error:", error.message);
    throw error;
  }
};

// Save meal plan to Firestore with email as identifier
export const saveMealPlanToFirestore = async (
  email,
  plan,
  profile,
  notes = null
) => {
  if (!db) {
    console.warn("⚠️ Firebase not initialized - skipping Firestore save");
    return { success: false, message: "Firebase not available" };
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString();

    // Normalize email to use as collection path (replace @ and . with -)
    const emailNormalized = email.replace(/[@.]/g, "-");

    const mealDoc = {
      email: email,
      date: today,
      plan: plan,
      profile: {
        age: profile.age,
        gender: profile.gender,
        is_vegetarian: profile.is_vegetarian,
        dietary_goal: profile.dietary_goal,
        activity_level: profile.activity_level,
        allergies: profile.allergies || [],
      },
      notes: notes,
      created_at: timestamp,
      updated_at: timestamp,
    };

    // Save to Firestore path: users/{email}/meal_history/{docId}
    const docRef = await db
      .collection("users")
      .doc(emailNormalized)
      .collection("meal_history")
      .add(mealDoc);

    console.log(
      `✅ Meal plan saved to Firestore: users/${emailNormalized}/meal_history/${docRef.id}`
    );

    return {
      success: true,
      docId: docRef.id,
      path: `users/${emailNormalized}/meal_history/${docRef.id}`,
      savedData: mealDoc,
    };
  } catch (error) {
    console.error("❌ Firestore save error:", error.message);
    return { success: false, error: error.message };
  }
};

// Get meal plan history from Firestore for a specific email
export const getMealPlanHistory = async (email, days = 30) => {
  if (!db) {
    console.warn(
      "⚠️ Firebase not initialized - cannot retrieve history from Firestore"
    );
    return [];
  }

  try {
    const emailNormalized = email.replace(/[@.]/g, "-");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    const snapshot = await db
      .collection("users")
      .doc(emailNormalized)
      .collection("meal_history")
      .where("date", ">=", cutoffDateStr)
      .orderBy("date", "desc")
      .get();

    const history = [];
    snapshot.forEach((doc) => {
      history.push({
        docId: doc.id,
        ...doc.data(),
      });
    });

    console.log(
      `✅ Retrieved ${history.length} meal plans from Firestore for ${email}`
    );
    return history;
  } catch (error) {
    console.error("❌ Firestore retrieval error:", error.message);
    return [];
  }
};

// Delete a specific meal plan by docId
export const deleteMealPlan = async (email, docId) => {
  if (!db) {
    return { success: false, message: "Firebase not initialized" };
  }

  try {
    const emailNormalized = email.replace(/[@.]/g, "-");

    await db
      .collection("users")
      .doc(emailNormalized)
      .collection("meal_history")
      .doc(docId)
      .delete();

    console.log(
      `✅ Meal plan deleted: users/${emailNormalized}/meal_history/${docId}`
    );
    return { success: true, message: "Meal plan deleted" };
  } catch (error) {
    console.error("❌ Firestore delete error:", error.message);
    return { success: false, error: error.message };
  }
};

// Update a meal plan with notes
export const updateMealPlanNotes = async (email, docId, notes) => {
  if (!db) {
    return { success: false, message: "Firebase not initialized" };
  }

  try {
    const emailNormalized = email.replace(/[@.]/g, "-");

    await db
      .collection("users")
      .doc(emailNormalized)
      .collection("meal_history")
      .doc(docId)
      .update({
        notes: notes,
        updated_at: new Date().toISOString(),
      });

    console.log(
      `✅ Meal plan notes updated: users/${emailNormalized}/meal_history/${docId}`
    );
    return { success: true, message: "Notes updated" };
  } catch (error) {
    console.error("❌ Firestore update error:", error.message);
    return { success: false, error: error.message };
  }
};

export default {
  generateMealPlan,
  saveMealPlanToFirestore,
  getMealPlanHistory,
  deleteMealPlan,
  updateMealPlanNotes,
};
