# React Native Frontend Update Guide

## 📱 How to Update MealPlanner.tsx for New Backend

Your React Native app currently calls the old Python FastAPI endpoint. Here's how to update it for the new Node.js backend with Firestore support.

---

## 🔄 API Endpoint Changes

### OLD Endpoint (Don't use)

```javascript
POST http://192.168.1.9:8000/ai/meal-plan
or
POST http://192.168.1.9:3000/api/ai/meal-plan
```

### NEW Endpoint (Use this)

```javascript
POST http://192.168.1.9:4000/generateDiet
```

**Server:** Runs on port **4000** (changed from 8000/3000)

---

## 📝 Request Body Format Update

### OLD Format (Don't use)

```javascript
{
  "user_id": "user123",
  "profile": {
    "age": 28,
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 75,
    "activity_level": "moderate",
    "dietary_goal": "maintain"
  }
}
```

### NEW Format (Use this)

```javascript
{
  "email": "user@gmail.com",          // ← ADD THIS (primary identifier)
  "profile": {
    "age": 28,
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 75,
    "activity_level": "moderate",
    "dietary_goal": "maintain",
    "is_vegetarian": false,             // ← ADD THIS (for validation)
    "allergies": ["peanuts"]            // ← ADD THIS (for safety)
  },
  "notes": "Prefer Indian cuisine"      // ← OPTIONAL (user feedback)
}
```

---

## 💻 Code Update Examples

### In MealPlanner.tsx - Update the generateMealPlan() function

**BEFORE (Old Code):**

```typescript
const generateMealPlan = async () => {
  try {
    setLoading(true);

    const response = await fetch(
      `http://192.168.1.9:3000/api/ai/meal-plan`, // ❌ OLD URL
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userProfile.id, // ❌ OLD: user_id
          profile: {
            age: userProfile.age,
            gender: userProfile.gender,
            height_cm: userProfile.height_cm,
            weight_kg: userProfile.weight_kg,
            activity_level: userProfile.activity_level,
            dietary_goal: userProfile.dietary_goal,
          },
        }),
      }
    );

    const data = await response.json();
    setMealPlan(data.plan);
  } catch (error) {
    console.error("Error generating meal plan:", error);
  } finally {
    setLoading(false);
  }
};
```

**AFTER (New Code):**

```typescript
const generateMealPlan = async () => {
  try {
    setLoading(true);

    // Get user email from profile/auth
    const userEmail = userProfile.email || "user@example.com";

    const response = await fetch(
      `http://192.168.1.9:4000/generateDiet`, // ✅ NEW URL & PORT
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail, // ✅ NEW: email as identifier
          profile: {
            age: userProfile.age,
            gender: userProfile.gender,
            height_cm: userProfile.height_cm,
            weight_kg: userProfile.weight_kg,
            activity_level: userProfile.activity_level,
            dietary_goal: userProfile.dietary_goal,
            is_vegetarian: userProfile.is_vegetarian, // ✅ NEW: dietary preference
            allergies: userProfile.allergies || [], // ✅ NEW: allergy safety
          },
          notes: userNotes, // ✅ OPTIONAL: user feedback
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      setMealPlan(data.plan);

      // ✅ NEW: Meal is auto-saved to Firestore!
      console.log("Meal saved to Firestore:", data.firestoreId);
      console.log("Firestore path:", data.firestorePath);
    } else {
      console.error("Error:", data.error);
      Alert.alert("Error", data.error || "Failed to generate meal plan");
    }
  } catch (error) {
    console.error("Error generating meal plan:", error);
    Alert.alert("Error", "Failed to connect to server");
  } finally {
    setLoading(false);
  }
};
```

---

## 🔍 Response Format Update

### OLD Response Format

```json
{
  "breakfast": [...],
  "lunch": [...],
  "snacks": [...],
  "dinner": [...],
  "calories": 2100,
  "summary": "..."
}
```

### NEW Response Format

```json
{
  "success": true,
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
  "firestoreId": "meal-2025-12-08-001",
  "firestorePath": "users/user-gmail-com/meal_history/meal-2025-12-08-001",
  "message": "Meal plan generated and saved",
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

### Update the display logic:

```typescript
// OLD: setMealPlan(data.plan)
// NEW: setMealPlan(data.plan)  ← Still the same, but wrapped in .plan

// NEW: Store Firestore ID for history tracking
if (data.firestoreId) {
  await AsyncStorage.setItem("lastMealId", data.firestoreId);
}
```

---

## 📋 Get Meal History (NEW Feature)

### NEW Endpoint to fetch past meal plans

```javascript
const fetchMealHistory = async () => {
  try {
    const userEmail = userProfile.email;
    const days = 30; // Last 30 days

    const response = await fetch(
      `http://192.168.1.9:4000/mealHistory/${userEmail}?days=${days}`
    );

    const data = await response.json();

    if (data.success) {
      console.log(`Found ${data.count} meal plans`);

      // data.history = [
      //   {
      //     docId: "meal-123",
      //     date: "2025-12-08",
      //     plan: {...},
      //     profile: {...},
      //     created_at: "2025-12-08T10:30:00.000Z"
      //   }
      // ]

      setMealHistory(data.history);
    }
  } catch (error) {
    console.error("Error fetching history:", error);
  }
};
```

---

## 🗑️ Delete a Meal Plan (NEW Feature)

### NEW Endpoint to remove a meal plan

```javascript
const deleteMealPlan = async (docId) => {
  try {
    const userEmail = userProfile.email;

    const response = await fetch(
      `http://192.168.1.9:4000/mealHistory/${userEmail}/${docId}`,
      { method: "DELETE" }
    );

    const data = await response.json();

    if (data.success) {
      console.log("Meal plan deleted");
      // Refresh history
      await fetchMealHistory();
    }
  } catch (error) {
    console.error("Error deleting meal plan:", error);
  }
};
```

---

## 📝 Update Meal Notes (NEW Feature)

### NEW Endpoint to add feedback

```javascript
const updateMealNotes = async (docId, notes) => {
  try {
    const userEmail = userProfile.email;

    const response = await fetch(
      `http://192.168.1.9:4000/mealHistory/${userEmail}/${docId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes }),
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log("Notes updated");
    }
  } catch (error) {
    console.error("Error updating notes:", error);
  }
};
```

---

## ⚠️ Error Handling Updates

### NEW Error Responses to handle

**Dietary Validation Error:**

```json
{
  "success": false,
  "error": "❌ VALIDATION FAILED: Non-vegetarian item \"Chicken Curry\" given to vegetarian user!"
}
```

**Allergy Error:**

```json
{
  "success": false,
  "error": "❌ VALIDATION FAILED: Allergen \"peanuts\" found in \"Peanut Butter Smoothie\""
}
```

**Update your error handling:**

```typescript
if (!data.success) {
  console.error("API Error:", data.error);

  // Check for validation failures
  if (data.error.includes("VALIDATION FAILED")) {
    Alert.alert("Meal Plan Issue", data.error, [
      { text: "OK" },
      { text: "Try Again", onPress: generateMealPlan },
    ]);
  } else {
    Alert.alert("Error", data.error);
  }

  return;
}
```

---

## 📱 Complete Updated Function

Here's a complete replacement for your meal plan generation function:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

const generateMealPlan = async () => {
  try {
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!userProfile.email) {
      Alert.alert("Error", "Email is required in user profile");
      return;
    }

    if (userProfile.age < 15 || userProfile.weight_kg < 30) {
      Alert.alert("Error", "Invalid age or weight");
      return;
    }

    const requestBody = {
      email: userProfile.email,
      profile: {
        age: userProfile.age,
        gender: userProfile.gender || "male",
        height_cm: userProfile.height_cm || 170,
        weight_kg: userProfile.weight_kg || 70,
        activity_level: userProfile.activity_level || "moderate",
        dietary_goal: userProfile.dietary_goal || "maintain",
        is_vegetarian: userProfile.is_vegetarian || false,
        allergies: userProfile.allergies || [],
      },
      notes: null,
    };

    console.log("📋 Generating meal plan for:", userProfile.email);
    console.log("Vegetarian:", userProfile.is_vegetarian);

    const response = await fetch("http://192.168.1.9:4000/generateDiet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.success && data.plan) {
      console.log("✅ Meal plan generated successfully");
      console.log("Saved to Firestore:", data.firestoreId);

      // Save the meal plan
      setMealPlan(data.plan);

      // Save metadata to AsyncStorage
      await AsyncStorage.setItem(
        "lastMealPlan",
        JSON.stringify({
          firestoreId: data.firestoreId,
          timestamp: data.timestamp,
          plan: data.plan,
        })
      );

      // Show success message
      Alert.alert("Success", "Meal plan generated and saved!", [
        { text: "OK" },
      ]);
    } else {
      // Handle error response
      const errorMsg = data.error || "Failed to generate meal plan";
      setError(errorMsg);

      console.error("❌ Error:", errorMsg);

      if (errorMsg.includes("VALIDATION FAILED")) {
        Alert.alert("Dietary Issue", errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
    }
  } catch (error) {
    console.error("Network error:", error);
    setError(error.message);
    Alert.alert(
      "Connection Error",
      "Cannot connect to server. Check IP address and ensure server is running."
    );
  } finally {
    setLoading(false);
  }
};

// Helper: Fetch meal history
const fetchMealHistory = async () => {
  try {
    if (!userProfile.email) return;

    const response = await fetch(
      `http://192.168.1.9:4000/mealHistory/${userProfile.email}?days=30`
    );

    const data = await response.json();

    if (data.success) {
      setMealHistory(data.history);
      console.log(`✅ Loaded ${data.count} meal plans`);
    }
  } catch (error) {
    console.error("Error fetching history:", error);
  }
};
```

---

## ✅ Checklist for Frontend Update

- [ ] Update API endpoint URL from port 3000/8000 to **4000**
- [ ] Change endpoint from `/api/ai/meal-plan` to `/generateDiet`
- [ ] Add `email` field to request body
- [ ] Add `is_vegetarian` field to profile
- [ ] Add `allergies` array to profile
- [ ] Update response parsing to use `data.plan` instead of `data`
- [ ] Add error handling for `VALIDATION FAILED` messages
- [ ] Test with vegetarian user profile
- [ ] Test with user who has allergies
- [ ] Verify Firestore ID is returned
- [ ] Update state to store `firestoreId`
- [ ] Test new history fetch endpoints (optional)

---

## 🧪 Quick Test Commands

### Test Vegetarian User

```bash
curl -X POST http://192.168.1.9:4000/generateDiet \
  -H "Content-Type: application/json" \
  -d '{
    "email": "priya@example.com",
    "profile": {
      "age": 25,
      "gender": "female",
      "height_cm": 160,
      "weight_kg": 55,
      "activity_level": "light",
      "dietary_goal": "maintain",
      "is_vegetarian": true,
      "allergies": []
    }
  }'

# Should return: Only vegetarian meals (paneer, beans, tofu, vegetables)
# Should NOT return: Chicken, meat, fish, eggs
```

### Test User with Allergies

```bash
curl -X POST http://192.168.1.9:4000/generateDiet \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@work.com",
    "profile": {
      "age": 30,
      "gender": "male",
      "height_cm": 180,
      "weight_kg": 80,
      "activity_level": "active",
      "dietary_goal": "lose",
      "is_vegetarian": false,
      "allergies": ["shellfish", "peanuts", "dairy"]
    }
  }'

# Should NOT return: Shellfish, peanuts, dairy products
```

---

## 🎉 You're Ready!

Once you update your React Native app with these changes:

✅ Meals will be generated by Groq LLM (better quality)  
✅ Dietary preferences will be strictly enforced  
✅ Allergy validation prevents dangerous recommendations  
✅ History is saved to Firestore (persistent)  
✅ Email-based identification (no complex user management)  
✅ Unique meal suggestions each time

---

## 📞 Need Help?

Check the documentation:

- **SETUP_GUIDE.md** - Backend setup & troubleshooting
- **MEAL_PLANNER_API.md** - Full API reference
- **IMPLEMENTATION_SUMMARY.md** - What changed & why

---

Happy coding! 🚀
