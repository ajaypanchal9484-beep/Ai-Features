# Dailypilot_ai Backend Setup & Migration Guide

## 🎯 Overview

The Dailypilot_ai backend is a **Node.js + Express** server that provides AI-powered features for the Dailypilot app. It uses:

- **Groq LLM** (Free tier) for AI generation
- **Firebase Firestore** for persistent data storage
- **Email as user identifier** for all history tracking

---

## ✨ What's New in This Update

### Meal Planner Module (100% JavaScript/Node.js)

Previously: Python FastAPI implementation  
**Now:** Pure JavaScript with Groq SDK + Firestore

**Key Improvements:**

- ✅ **Strict Dietary Enforcement** - Vegetarian preferences absolutely respected
- ✅ **Email-based History** - All user data identified and stored by email
- ✅ **Firestore Integration** - Cloud-based persistent storage
- ✅ **No Python** - Entire backend is JavaScript
- ✅ **Unique Meal Plans** - Different suggestions each request (temperature: 1.0)
- ✅ **Comprehensive Validation** - Allergies, dietary restrictions, calorie accuracy

---

## 📁 Project Structure

```
Dailypilot_ai/
├── index.js                    # Main server (Express)
├── mealPlanner.js             # ⭐ NEW: Meal planning with Groq + Firestore
├── habitBuilder.js            # Habit generation
├── moodPlanner.js             # Mood analysis
├── stressAnalyzer.js          # Stress analysis
├── package.json               # Dependencies (firebase-admin added)
├── .env                       # Configuration
├── MEAL_PLANNER_API.md        # ⭐ NEW: Full API documentation
├── SETUP_GUIDE.md             # ⭐ NEW: This file
└── node_modules/              # Dependencies
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd Dailypilot_ai
npm install
```

**New dependencies installed:**

- `firebase-admin@^13.6.0` - Firestore integration

### 2. Configure Environment

Edit `.env` - Groq API key is already set:

```env
GROQ_API_KEY=gsk_...  # ✅ Already configured
GEMINI_API_KEY=AIz...  # ✅ Already configured

# OPTIONAL: Add Firebase credentials for Firestore history
# Option A: Embed JSON
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"..."}

# Option B: Path to file
FIREBASE_KEY_PATH=/path/to/serviceAccountKey.json
```

### 3. Start Server

**Development (with auto-reload):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

Server runs on: **http://localhost:4000**

---

## 🍽️ Meal Planner API

### Generate Meal Plan

```bash
curl -X POST http://localhost:4000/generateDiet \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@gmail.com",
    "profile": {
      "age": 28,
      "gender": "male",
      "height_cm": 175,
      "weight_kg": 75,
      "activity_level": "moderate",
      "dietary_goal": "maintain",
      "is_vegetarian": false,
      "allergies": ["peanuts", "shellfish"]
    }
  }'
```

### Get User's Meal History

```bash
curl http://localhost:4000/mealHistory/user@gmail.com?days=30
```

### Delete a Meal Plan

```bash
curl -X DELETE http://localhost:4000/mealHistory/user@gmail.com/doc-id-123
```

### Update Meal Notes

```bash
curl -X PUT http://localhost:4000/mealHistory/user@gmail.com/doc-id-123 \
  -H "Content-Type: application/json" \
  -d '{"notes": "Too much carbs, prefer protein-heavy meals"}'
```

---

## 🔥 Firestore Storage Structure

When a meal plan is generated, it's saved to Firestore with this structure:

```
Firestore
└── users
    └── user-gmail-com  (email with @ and . replaced by -)
        └── meal_history
            ├── meal-123
            ├── meal-124
            └── meal-125
                ├── email: "user@gmail.com"
                ├── date: "2025-12-08"
                ├── plan: {breakfast: [...], lunch: [...], ...}
                ├── profile: {age: 28, gender: "male", is_vegetarian: false, ...}
                ├── notes: "User feedback"
                ├── created_at: "2025-12-08T08:52:00.000Z"
                └── updated_at: "2025-12-08T08:52:00.000Z"
```

**Note:** Email normalized as: `user@gmail.com` → `user-gmail-com`

---

## 🔐 Security & Validation

### Vegetarian Enforcement

When `is_vegetarian: true`:

- AI instructed to use ONLY plant-based proteins (beans, tofu, paneer, etc.)
- System validates every meal item
- Throws error if ANY non-vegetarian keyword found
- Keywords checked: chicken, beef, meat, fish, shrimp, egg, salmon, turkey, etc.

**Example Error:**

```json
{
  "error": "❌ VALIDATION FAILED: Non-vegetarian item \"Chicken Curry\" given to vegetarian user!"
}
```

### Allergy Validation

- All meal items checked against allergy list
- Case-insensitive matching
- Error thrown if allergen found

**Example:**

```json
{
  "error": "❌ VALIDATION FAILED: Allergen \"peanuts\" found in \"Peanut Butter Smoothie\""
}
```

### Calorie Calculation

- Uses Harris-Benedict formula for Basal Metabolic Rate (BMR)
- Factors: age, gender, height, weight, activity level
- Adjusts for goals: ±300 calories (lose/gain/maintain)

---

## 📊 Request/Response Examples

### Example 1: Vegetarian User

```javascript
// Request
{
  "email": "priya@example.com",
  "profile": {
    "age": 25,
    "gender": "female",
    "height_cm": 160,
    "weight_kg": 55,
    "activity_level": "light",
    "dietary_goal": "maintain",
    "is_vegetarian": true,  // ⭐ VEGETARIAN
    "allergies": ["shellfish"]
  }
}

// Response will ONLY include vegetarian items:
{
  "success": true,
  "plan": {
    "breakfast": [
      {
        "item": "Chana Masala with Roti",
        "quantity": "1 plate",
        "calories": 350,
        "protein_g": 12,
        "carbs_g": 50,
        "fats_g": 7
      }
    ],
    "lunch": [
      {
        "item": "Paneer Tikka Salad",
        "quantity": "1 bowl",
        "calories": 400,
        ...
      }
    ],
    "snacks": [...],
    "dinner": [...],
    "total_calories": 1800,
    ...
  },
  "firestoreId": "meal-abc123",
  "firestorePath": "users/priya-example-com/meal_history/meal-abc123",
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

### Example 2: User with Allergies

```javascript
// Request
{
  "email": "alex@work.com",
  "profile": {
    "age": 30,
    "gender": "male",
    "height_cm": 180,
    "weight_kg": 80,
    "activity_level": "active",
    "dietary_goal": "lose",
    "is_vegetarian": false,
    "allergies": ["shellfish", "tree nuts", "dairy"]  // ⭐ ALLERGIES
  }
}

// Response will AVOID all allergies:
// - No shellfish (shrimp, crab, lobster, etc.)
// - No nuts (almonds, cashews, walnuts, etc.)
// - No dairy (milk, cheese, yogurt, butter, etc.)
```

---

## 🛠️ Troubleshooting

### Issue: "Firebase not initialized"

**Cause:** Firebase credentials not provided  
**Solution:**

1. Skip Firebase (meal plans still generate but won't be saved)
2. Add credentials to `.env` if you have Firebase project
3. See `/path/to/serviceAccountKey.json` in Firebase console

### Issue: Vegetarian plan still has meat

**Cause:** AI ignored instruction  
**Solution:** System validates and rejects - error will be thrown. Regenerate request.

### Issue: Calorie count seems wrong

**Solution:** Verify profile fields are accurate:

- `age` (years)
- `gender` (male/female)
- `height_cm` (centimeters)
- `weight_kg` (kilograms)
- `activity_level` (sedentary/light/moderate/active/very_active)

### Issue: Firestore quota exceeded

**Solution:** Firestore free tier limit is 50k reads/day

- Implement caching on frontend
- Batch requests
- Use `days=7` instead of `days=30` for history

---

## 📱 Frontend Integration (React Native)

```javascript
// In your React Native app (e.g., MealPlanner.tsx)

const generateMealPlan = async () => {
  try {
    const response = await fetch(
      `http://192.168.1.9:4000/generateDiet`, // Adjust IP
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userProfile.email,
          profile: {
            age: userProfile.age,
            gender: userProfile.gender,
            height_cm: userProfile.height_cm,
            weight_kg: userProfile.weight_kg,
            activity_level: userProfile.activity_level,
            dietary_goal: userProfile.dietary_goal,
            is_vegetarian: userProfile.is_vegetarian,
            allergies: userProfile.allergies || [],
          },
        }),
      }
    );

    const data = await response.json();
    if (data.success) {
      setMealPlan(data.plan);
      // History automatically saved to Firestore!
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

// Get past meal plans
const fetchHistory = async () => {
  const response = await fetch(
    `http://192.168.1.9:4000/mealHistory/${userEmail}?days=30`
  );
  const data = await response.json();
  setHistory(data.history);
};
```

---

## 📝 Key Configuration Updates

### package.json

Added:

```json
{
  "dependencies": {
    "firebase-admin": "^13.6.0" // ← NEW
  }
}
```

### .env

Added template for Firebase:

```env
# FIREBASE_SERVICE_ACCOUNT=...
# FIREBASE_KEY_PATH=...
```

### mealPlanner.js (NEW FILE)

- Groq meal plan generation
- Firestore persistence
- Email-based user identification
- Dietary validation
- Allergy checking

---

## 🚀 Deployment Notes

### For Vercel/Cloud Functions

The server already has proper structure for deployment:

- `vercel.json` configured
- Environment variables can be set in platform settings
- Firebase credentials can be passed via env vars

### For Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### For Local Development

```bash
# Terminal 1: Backend
cd Dailypilot_ai
npm run dev

# Terminal 2: Frontend (if needed)
cd ..
npm start
```

---

## 📚 API Documentation

Full API documentation with examples: See **MEAL_PLANNER_API.md**

---

## ✅ Checklist Before Going Live

- [ ] `.env` has valid `GROQ_API_KEY`
- [ ] `npm install` completed successfully
- [ ] `npm run dev` starts without errors
- [ ] Can call `/generateDiet` endpoint
- [ ] Firebase credentials added to `.env` (optional)
- [ ] Frontend updated to use new endpoint format
- [ ] Tested with vegetarian user profile
- [ ] Tested with allergies
- [ ] Server responds with proper JSON

---

## 📞 Support

**Issues?** Check:

1. Console logs in terminal
2. `.env` file configuration
3. Network connectivity
4. Firebase credentials validity
5. Groq API key validity

---

## 🎉 You're All Set!

The Dailypilot_ai backend is now:

- ✅ 100% JavaScript (no Python)
- ✅ Using Groq LLM for meal generation
- ✅ Storing meal history in Firestore by email
- ✅ Strictly respecting dietary preferences
- ✅ Validating allergies on every plan
- ✅ Ready for production deployment

Happy meal planning! 🍽️
