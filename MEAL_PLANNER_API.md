# Meal Planner API Documentation

## Overview
The Meal Planner module uses **Groq LLM** to generate personalized meal plans and stores history in **Firestore** using email as the user identifier.

## Key Features
✅ **Strict Dietary Preferences** - Respects vegetarian/non-vegetarian choices absolutely  
✅ **Allergy Safety** - Validates against all user allergies  
✅ **Calorie Calculation** - Harris-Benedict formula for accurate TDEE  
✅ **Firestore Storage** - Persistent meal history by email  
✅ **Unique Plans** - Different meals generated each time (temperature: 1.0)  
✅ **Email-based Identification** - Uses email as the primary user identifier  

---

## API Endpoints

### 1. Generate Meal Plan
**POST** `/generateDiet`

Generates a personalized meal plan and saves to Firestore.

**Request Body:**
```json
{
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
  },
  "notes": "Prefer Indian cuisine"
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "breakfast": [
      {
        "item": "Oats with almonds",
        "quantity": "1 bowl",
        "calories": 350,
        "protein_g": 12,
        "carbs_g": 45,
        "fats_g": 8
      }
    ],
    "lunch": [...],
    "snacks": [...],
    "dinner": [...],
    "total_calories": 2100,
    "total_protein_g": 75,
    "total_carbs_g": 280,
    "total_fats_g": 65,
    "summary": "Balanced meal plan..."
  },
  "firestoreId": "doc-id-123",
  "firestorePath": "users/user-gmail-com/meal_history/doc-id-123",
  "timestamp": "2025-12-08T08:52:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing email or profile
- `500` - Generation or Firestore error

---

### 2. Get Meal History
**GET** `/mealHistory/:email?days=30`

Retrieves all meal plans for a user from the past N days.

**Parameters:**
- `email` (path, required) - User email (e.g., `user@gmail.com`)
- `days` (query, optional) - Number of days to look back (default: 30)

**Example:**
```
GET /mealHistory/user@gmail.com?days=7
```

**Response:**
```json
{
  "success": true,
  "email": "user@gmail.com",
  "count": 5,
  "days": 7,
  "history": [
    {
      "docId": "meal-123",
      "date": "2025-12-08",
      "plan": {
        "breakfast": [...],
        "lunch": [...],
        "snacks": [...],
        "dinner": [...]
      },
      "profile": {
        "age": 28,
        "gender": "male",
        "is_vegetarian": false,
        "allergies": ["peanuts"]
      },
      "notes": "Prefer Indian cuisine",
      "created_at": "2025-12-08T08:52:00.000Z",
      "updated_at": "2025-12-08T08:52:00.000Z"
    }
  ]
}
```

---

### 3. Delete Meal Plan
**DELETE** `/mealHistory/:email/:docId`

Removes a specific meal plan from history.

**Parameters:**
- `email` (path, required) - User email
- `docId` (path, required) - Document ID from Firestore

**Example:**
```
DELETE /mealHistory/user@gmail.com/meal-123
```

**Response:**
```json
{
  "success": true,
  "message": "Meal plan deleted"
}
```

---

### 4. Update Meal Plan Notes
**PUT** `/mealHistory/:email/:docId`

Updates notes/feedback for a specific meal plan.

**Parameters:**
- `email` (path, required) - User email
- `docId` (path, required) - Document ID from Firestore

**Request Body:**
```json
{
  "notes": "Too many calories, need lower protein meals next time"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notes updated"
}
```

---

## Firestore Data Structure

**Collection Path:** `users/{emailNormalized}/meal_history`

Where `emailNormalized` = email with `@` and `.` replaced by `-`

Example: `user@gmail.com` → `user-gmail-com`

**Document Schema:**
```json
{
  "email": "user@gmail.com",
  "date": "2025-12-08",
  "plan": {
    "breakfast": [...],
    "lunch": [...],
    "snacks": [...],
    "dinner": [...],
    "total_calories": 2100,
    "total_protein_g": 75,
    "total_carbs_g": 280,
    "total_fats_g": 65,
    "summary": "..."
  },
  "profile": {
    "age": 28,
    "gender": "male",
    "is_vegetarian": false,
    "dietary_goal": "maintain",
    "activity_level": "moderate",
    "allergies": ["peanuts", "shellfish"]
  },
  "notes": "Optional feedback",
  "created_at": "2025-12-08T08:52:00.000Z",
  "updated_at": "2025-12-08T08:52:00.000Z"
}
```

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

Ensures `firebase-admin` is installed.

### 2. Configure Firebase (Optional)
If using Firestore history storage, add credentials to `.env`:

**Option A: Environment Variable**
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project","private_key":"..."}
```

**Option B: File Path**
```env
FIREBASE_KEY_PATH=/path/to/serviceAccountKey.json
```

### 3. Start Server
```bash
npm run dev    # Development with nodemon
npm start      # Production
```

Server runs on **http://localhost:4000**

---

## Validation & Safety Features

### ✅ Vegetarian Enforcement
- If `is_vegetarian: true`, the system:
  - Instructs AI to use ONLY plant-based proteins
  - Validates each meal item AGAINST non-veg keywords
  - Throws error if any meat/fish/egg found
  - Keywords: chicken, beef, fish, shrimp, egg, salmon, tuna, turkey, etc.

### ✅ Allergy Validation
- Checks all meal items against user's allergy list
- Throws error if allergen found in any item
- Case-insensitive matching

### ✅ Calorie Accuracy
- Uses Harris-Benedict formula for BMR
- Considers: age, gender, height, weight, activity level
- Adjusts ±300 cal for goal (lose/gain/maintain)

### ✅ Meal Distribution
- Breakfast: 25-30% of daily calories
- Lunch: 35-40% of daily calories
- Snacks: 5-10% of daily calories
- Dinner: 25-30% of daily calories

---

## Error Handling

### Common Errors

**Missing Email/Profile:**
```json
{
  "error": "Missing email or profile in request body"
}
```

**Dietary Restriction Violation:**
```json
{
  "error": "❌ VALIDATION FAILED: Non-vegetarian item \"Chicken Biryani\" given to vegetarian user!"
}
```

**Allergen Found:**
```json
{
  "error": "❌ VALIDATION FAILED: Allergen \"peanuts\" found in \"Peanut Butter Toast\""
}
```

**Firebase Not Available:**
```json
{
  "success": true,
  "plan": {...},
  "firestoreId": null,
  "firestorePath": null,
  "message": "Meal plan generated but not saved (Firebase unavailable)"
}
```

---

## Usage Examples

### Frontend Integration (React Native)

```javascript
// Generate meal plan
const response = await fetch('http://your-server:4000/generateDiet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: user.email,
    profile: {
      age: 28,
      gender: 'male',
      height_cm: 175,
      weight_kg: 75,
      activity_level: 'moderate',
      dietary_goal: 'maintain',
      is_vegetarian: false,
      allergies: ['peanuts', 'shellfish']
    }
  })
});

const data = await response.json();
console.log('Generated plan:', data.plan);

// Get history
const historyResponse = await fetch(
  `http://your-server:4000/mealHistory/${user.email}?days=30`
);
const history = await historyResponse.json();
console.log('Past meals:', history.history);
```

---

## Environment Variables

```env
# Required
GROQ_API_KEY=gsk_...

# Optional (for Gemini support)
GEMINI_API_KEY=AIzaSy...

# Optional (for Firestore)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
# OR
FIREBASE_KEY_PATH=/path/to/serviceAccountKey.json
```

---

## Performance Notes

- **Meal Generation:** 2-5 seconds (Groq API)
- **Firestore Save:** 1-2 seconds
- **History Retrieval:** <1 second (cached queries)
- **Validation:** <100ms (in-memory check)

---

## Support & Troubleshooting

### Firebase Not Initializing?
- Check `.env` has valid Firebase credentials
- See console warnings - they indicate which init failed
- Meal plans will still generate but won't be saved to Firestore

### Vegetarian Plans Still Have Meat?
- AI may interpret "vegetarian" loosely
- System validates every item and throws error if meat found
- If error occurs, regenerate request

### Calorie Count Off?
- Verify profile: age, gender, height_cm, weight_kg, activity_level
- Harris-Benedict formula used for calculation
- Groq AI provides estimates (±5-10% variance normal)

---

## Version
- **mealPlanner.js**: 1.0.0
- **Groq Model**: llama-3.1-8b-instant
- **Firebase Admin SDK**: ^13.6.0

---
