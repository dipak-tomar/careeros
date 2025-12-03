import google.generativeai as genai
import json
import re
from typing import Optional, List, Tuple, Dict
from app.config import get_settings
from app.schemas import AchievementCreate

settings = get_settings()


PROFILE_EXTRACTION_PROMPT = """You are an expert resume parser. Extract profile information from the following resume text.

Extract the following fields if present:
- name: Full name of the person
- email: Email address
- phone: Phone number
- location: City, State or full address
- linkedin: LinkedIn URL or profile
- website: Personal website or portfolio URL
- summary: A professional summary (generate one if not present based on their experience)
- target_roles: List of job titles they seem to be targeting based on their experience

Respond in this exact JSON format:
{
  "name": "extracted name or null",
  "email": "extracted email or null",
  "phone": "extracted phone or null",
  "location": "extracted location or null",
  "linkedin": "extracted linkedin or null",
  "website": "extracted website or null",
  "summary": "extracted or generated summary",
  "target_roles": ["role1", "role2"]
}

RESUME TEXT:
"""


async def extract_profile_from_resume(resume_text: str) -> Dict:
    """Extract profile information from resume text using AI."""
    if not configure_gemini():
        return {
            "error": "AI features require a Gemini API key. Please configure GEMINI_API_KEY."
        }
    
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    prompt = PROFILE_EXTRACTION_PROMPT + resume_text
    
    response = model.generate_content(prompt)
    response_text = response.text
    
    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
    
    return {
        "error": "Unable to extract profile information. Please try again."
    }


def configure_gemini():
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return True
    return False


INTERVIEWER_SYSTEM_PROMPT = """You are an expert career coach and interviewer helping users build their professional profile. Your goal is to extract specific, measurable achievements from their work experience.

RULES:
1. Ask focused questions about their work experience, one at a time
2. When they describe an achievement, probe for specific metrics (numbers, percentages, time saved, revenue generated, etc.)
3. If their answer lacks metrics, ask follow-up questions like "How many?", "What was the percentage increase?", "How much time/money did this save?"
4. Once you have a complete achievement with metrics, extract it in JSON format
5. Be encouraging but persistent about getting concrete numbers

When you have extracted a complete achievement, respond with the achievement in this exact JSON format at the END of your message:
```json
{
  "achievement_extracted": {
    "core_task": "Brief description of what they did",
    "impact_metric": "The measurable result (e.g., 'Reduced latency by 40%')",
    "skills_used": ["skill1", "skill2"],
    "tags": ["tag1", "tag2"],
    "company": "Company name if mentioned",
    "role": "Role if mentioned",
    "year": null
  }
}
```

If no achievement is ready to be extracted yet, just respond conversationally without the JSON block."""


TAILOR_SYSTEM_PROMPT = """You are an expert resume tailor. Given a job description and a user's achievements, you will:
1. Analyze the job requirements
2. Select the most relevant achievements
3. Suggest how to tailor the resume summary
4. Calculate a match score (0-100)

Respond in this exact JSON format:
{
  "tailored_summary": "A 2-3 sentence professional summary tailored to this job",
  "selected_achievements": [
    {
      "id": achievement_id,
      "relevance_reason": "Why this achievement is relevant"
    }
  ],
  "match_score": 75,
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}"""


async def chat_with_interviewer(
    user_message: str,
    chat_history: List[dict]
) -> Tuple[str, Optional[AchievementCreate]]:
    if not configure_gemini():
        return "AI features require a Gemini API key. Please configure GEMINI_API_KEY in the environment.", None
    
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    messages = [{"role": "user", "parts": [INTERVIEWER_SYSTEM_PROMPT]}]
    messages.append({"role": "model", "parts": ["I understand. I'll help extract achievements with specific metrics from the user's work experience."]})
    
    for msg in chat_history:
        role = "user" if msg["role"] == "user" else "model"
        messages.append({"role": role, "parts": [msg["content"]]})
    
    messages.append({"role": "user", "parts": [user_message]})
    
    chat = model.start_chat(history=messages[:-1])
    response = chat.send_message(user_message)
    response_text = response.text
    
    achievement = None
    json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            if "achievement_extracted" in data:
                achievement = AchievementCreate(**data["achievement_extracted"])
                response_text = response_text.replace(json_match.group(0), "").strip()
                response_text += "\n\n✓ Achievement captured!"
        except (json.JSONDecodeError, ValueError):
            pass
    
    return response_text, achievement


async def tailor_resume(
    job_description: str,
    profile: dict,
    achievements: List[dict]
) -> dict:
    if not configure_gemini():
        return {
            "tailored_summary": "AI features require a Gemini API key.",
            "selected_achievements": [],
            "match_score": 0,
            "suggestions": ["Configure GEMINI_API_KEY to enable AI features"]
        }
    
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    achievements_text = "\n".join([
        f"ID {a['id']}: {a['core_task']} - {a.get('impact_metric', 'No metric')} (Skills: {a.get('skills_used', [])})"
        for a in achievements
    ])
    
    profile_text = f"""
    Name: {profile.get('name', 'Not set')}
    Target Roles: {profile.get('target_roles', [])}
    Summary: {profile.get('summary', 'Not set')}
    """
    
    prompt = f"""{TAILOR_SYSTEM_PROMPT}

JOB DESCRIPTION:
{job_description}

USER PROFILE:
{profile_text}

USER ACHIEVEMENTS:
{achievements_text}

Analyze and respond with the JSON format specified above."""

    response = model.generate_content(prompt)
    response_text = response.text
    
    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass
    
    return {
        "tailored_summary": "Unable to generate tailored summary. Please try again.",
        "selected_achievements": [],
        "match_score": 0,
        "suggestions": ["Try providing more details in the job description"]
    }
