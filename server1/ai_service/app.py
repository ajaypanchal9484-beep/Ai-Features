# server/ai_service/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import os
from dotenv import load_dotenv, find_dotenv

# Load .env from project root (if present) so env vars work when uvicorn is started
load_dotenv(find_dotenv())
import json
import httpx
import logging

# Configure API keys from env
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not (GROQ_API_KEY or GEMINI_API_KEY):
    logging.basicConfig()
    logging.getLogger(__name__).warning("No LLM API keys set (GROQ_API_KEY or GEMINI_API_KEY) — server will start but AI endpoints will fail until one is provided.")

# Gemini model id (adjust if needed)
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
# Groq model id (adjust if needed)
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")

async def call_groq(prompt: str, max_output_tokens: int = 800) -> dict:
    """Call Groq API using their chat completions endpoint (similar to OpenAI).
    
    Returns a response dict compatible with our extraction logic.
    """
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not configured")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_output_tokens,
        "temperature": 0.7
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            
            logging.getLogger(__name__).info(f"Groq API call status: {resp.status_code}")
            
            if resp.status_code in (200, 201):
                try:
                    data = resp.json()
                    # Convert Groq format to Gemini-like format for extraction
                    if "choices" in data and len(data["choices"]) > 0:
                        choice = data["choices"][0]
                        return {
                            "candidates": [{
                                "content": {
                                    "parts": [{"text": choice["message"]["content"]}],
                                    "role": "model"
                                }
                            }]
                        }
                    return data
                except Exception as e:
                    logging.getLogger(__name__).error(f"Failed to parse Groq response: {e}")
                    return {"raw": resp.text}
            else:
                try:
                    error_body = resp.text[:1000]
                except Exception:
                    error_body = '<unreadable body>'
                logging.getLogger(__name__).error(f"Groq API error {resp.status_code}: {error_body}")
                raise RuntimeError(f"Groq API error {resp.status_code}: {error_body}")
                
        except httpx.RequestError as e:
            logging.getLogger(__name__).error(f"Network error calling Groq API: {e}")
            raise RuntimeError(f"Network error: {e}")


async def call_gemini(prompt: str, max_output_tokens: int = 800) -> dict:
    """Call Google's Generative Language API using the generateContent endpoint.

    Uses the v1beta/generateContent endpoint with proper payload structure.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")
    
    # Use the correct Google AI endpoint: v1beta/generateContent with ?key= query param
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    
    # Proper payload structure for the generateContent endpoint
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": max_output_tokens,
            "temperature": 0.7
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json"
                }
            )
            
            # Log request details for debugging
            logging.getLogger(__name__).info(f"Gemini API call to {url}")
            logging.getLogger(__name__).info(f"Payload: {payload}")
            logging.getLogger(__name__).info(f"Response status: {resp.status_code}")
            
            if resp.status_code in (200, 201):
                try:
                    data = resp.json()
                    logging.getLogger(__name__).info(f"Gemini response: {data}")
                    return data
                except Exception as e:
                    logging.getLogger(__name__).error(f"Failed to parse JSON response: {e}")
                    return {"raw": resp.text}
            else:
                # Log error response
                try:
                    error_body = resp.text[:1000]
                except Exception:
                    error_body = '<unreadable body>'
                logging.getLogger(__name__).error(f"Gemini API error {resp.status_code}: {error_body}")
                raise RuntimeError(f"Gemini API error {resp.status_code}: {error_body}")
                
        except httpx.RequestError as e:
            logging.getLogger(__name__).error(f"Network error calling Gemini API: {e}")
            raise RuntimeError(f"Network error: {e}")


async def call_model(prompt: str, max_output_tokens: int = 800) -> dict:
    """Call LLM: prefer Groq, fallback to Gemini, then mock.

    This service prioritizes Groq (free & fast), falls back to Gemini, and
    returns a mock response for offline development.
    """
    if GROQ_API_KEY:
        try:
            return await call_groq(prompt, max_output_tokens=max_output_tokens)
        except Exception as e:
            logging.getLogger(__name__).warning(f"Groq call failed: {e}")
            # Try Gemini if available
            if GEMINI_API_KEY:
                try:
                    return await call_gemini(prompt, max_output_tokens=max_output_tokens)
                except Exception as e2:
                    logging.getLogger(__name__).warning(f"Gemini fallback also failed: {e2}")
            # Final fallback: mock response
            return {"candidates": [{"content": {"parts": [{"text": f"MOCK RESPONSE: {prompt[:500]}"}], "role": "model"}}]}

    if GEMINI_API_KEY:
        try:
            return await call_gemini(prompt, max_output_tokens=max_output_tokens)
        except Exception as e:
            logging.getLogger(__name__).warning(f"Gemini call failed: {e}")
            return {"candidates": [{"content": {"parts": [{"text": f"MOCK RESPONSE: {prompt[:500]}"}], "role": "model"}}]}

    # No keys configured: return mock response for offline/dev
    logging.getLogger(__name__).warning("No LLM API keys configured; returning mock response")
    return {"candidates": [{"content": {"parts": [{"text": f"MOCK RESPONSE: {prompt[:500]}"}], "role": "model"}}]}

def extract_text_from_gemini_response(data: dict) -> Optional[str]:
    """Extract text from Gemini API response (v1beta/generateContent format)."""
    if not isinstance(data, dict):
        return None
    
    # v1beta/generateContent response format: candidates -> [{ content: { parts: [{ text: '...' }] } }]
    candidates = data.get("candidates")
    if candidates and isinstance(candidates, list) and len(candidates) > 0:
        first_candidate = candidates[0]
        if isinstance(first_candidate, dict):
            content = first_candidate.get("content")
            if content and isinstance(content, dict):
                parts = content.get("parts")
                if parts and isinstance(parts, list):
                    texts = []
                    for part in parts:
                        if isinstance(part, dict) and "text" in part:
                            texts.append(part["text"])
                    if texts:
                        return "\n".join(texts)
    
    # Fallback: older format support
    # candidates -> [{ output: '...' }]
    candidates = data.get("candidates")
    if candidates and isinstance(candidates, list) and len(candidates) > 0:
        first = candidates[0]
        if isinstance(first, dict):
            if "output" in first and isinstance(first["output"], str):
                return first["output"]
    
    return None

app = FastAPI(title="Dailypilot AI Service")

# Simple exercise retrieval/seed loading
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
EXERCISES_FILE = os.path.join(DATA_DIR, "exercises.json")
try:
    with open(EXERCISES_FILE, "r", encoding="utf-8") as f:
        EXERCISES = json.load(f)
except Exception:
    EXERCISES = []

# Pydantic request models
class UserProfile(BaseModel):
    age: Optional[int]
    gender: Optional[str]
    weightKg: Optional[float]
    heightCm: Optional[float]
    fitnessGoal: Optional[str] = "general fitness"
    activityLevel: Optional[str] = "moderate"

class Preferences(BaseModel):
    durationMin: int = 30
    equipment: List[str] = []
    focus: Optional[str] = None
    intensity: Optional[str] = "moderate"

class WorkoutRequest(BaseModel):
    userProfile: UserProfile
    preferences: Preferences

class ChatRequest(BaseModel):
    userId: Optional[str] = None
    message: str
    conversationId: Optional[str] = None

# Simple retrieval: pick exercises that match equipment & focus
def retrieve_exercises(preferences: Preferences, limit: int = 6):
    matches = []
    for ex in EXERCISES:
        # match equipment: prefer exercises that require <= available equipment
        req_equip = set(ex.get("equipment", []))
        user_equip = set(preferences.equipment or [])
        equip_ok = req_equip.issubset(user_equip) or len(req_equip) == 0
        focus_ok = (preferences.focus is None) or (preferences.focus.lower() in (m.lower() for m in ex.get("primaryMuscles", [])) or preferences.focus.lower() in ex.get("name", "").lower())
        if equip_ok and focus_ok:
            matches.append(ex)
    # fallback: return first N if no good matches
    if not matches:
        matches = EXERCISES[:limit]
    return matches[:limit]

# Prompt template: instruct Gemini to return EXACT JSON only using schema
WORKOUT_PROMPT_TEMPLATE = """
You are FitPilot, an expert fitness coach. Return EXACT JSON only following this schema:
{{ "title": string, "durationMin": number, "exercises": [{{"name": string, "sets": number, "reps": string, "restSec": number, "notes": string}}], "gamification": { "xp": number, "badge": string } }}

User profile: {user_profile}
Preferences: {preferences}

Exercise library (provide name + short props): {exercises_text}

Create a gamified workout plan optimized for the user's duration and preferences. Keep items concise. Return valid JSON only.
"""

@app.post("/ai/workout")
async def generate_workout(body: WorkoutRequest):
    try:
        # retrieve exercise suggestions
        candidates = retrieve_exercises(body.preferences, limit=8)
        # build an exercises text block for prompt
        ex_texts = []
        for ex in candidates:
            ex_texts.append(f"- {ex.get('name')} (equipment: {','.join(ex.get('equipment',[]))}; muscles: {','.join(ex.get('primaryMuscles',[]))})")
        prompt = WORKOUT_PROMPT_TEMPLATE.format(
            user_profile=body.userProfile.json(),
            preferences=body.preferences.json(),
            exercises_text="\\n".join(ex_texts)
        )

        # Call Gemini via REST
        try:
            resp_json = await call_model(prompt, max_output_tokens=800)
        except Exception as e:
            # If the helper raised because of an HTTP error, include the message
            raise HTTPException(status_code=502, detail=f"LLM call failed: {e}")
        text = extract_text_from_gemini_response(resp_json)
        if not text:
            # fallback: return raw response
            return {"raw": resp_json}

        # Try to parse the JSON from the model response
        import re
        m = re.search(r'(\{.*\})', text, re.S)
        json_text = m.group(1) if m else text
        plan = json.loads(json_text)
        return {"plan": plan, "raw_text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

@app.post("/ai/chat")
async def chat(req: ChatRequest):
    try:
        # Simple passthrough chat: instruct Gemini to respond as a friendly coach.
        prompt = f"You are FitPilot, a friendly fitness coach. User says: {req.message}\nReply helpfully, do not provide medical diagnosis."
        try:
            resp_json = await call_model(prompt, max_output_tokens=400)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM call failed: {e}")
        text = extract_text_from_gemini_response(resp_json)
        if not text:
            return {"raw": resp_json}
        return {"reply": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))