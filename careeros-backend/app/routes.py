import json
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    UserCreate, UserLogin, Token, UserResponse,
    get_password_hash, verify_password, create_access_token, get_current_user
)
from app.schemas import (
    ProfileCreate, ProfileUpdate, ProfileResponse,
    AchievementCreate, AchievementUpdate, AchievementResponse,
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ChatRequest, ChatResponse, TailorRequest, TailorResponse,
    ResumeExtractRequest, ResumeExtractResponse
)
from app.database import get_db, dict_from_row
from app.ai_service import chat_with_interviewer, tailor_resume, extract_profile_from_resume
from app.config import get_settings

settings = get_settings()

router = APIRouter()


@router.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (user.email,))
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        hashed_password = get_password_hash(user.password)
        cursor = await db.execute(
            "INSERT INTO users (email, hashed_password) VALUES (?, ?)",
            (user.email, hashed_password)
        )
        await db.commit()
        user_id = cursor.lastrowid
        
        await db.execute(
            "INSERT INTO profiles (user_id, email) VALUES (?, ?)",
            (user_id, user.email)
        )
        await db.commit()
    
    access_token = create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, email, hashed_password FROM users WHERE email = ?",
            (user.email,)
        )
        row = await cursor.fetchone()
        db_user = await dict_from_row(row)
    
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": db_user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM profiles WHERE user_id = ?",
            (current_user["id"],)
        )
        row = await cursor.fetchone()
        profile = await dict_from_row(row)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile.get("target_roles"):
        try:
            profile["target_roles"] = json.loads(profile["target_roles"])
        except:
            profile["target_roles"] = []
    else:
        profile["target_roles"] = []
    
    if profile.get("user_values"):
        try:
            profile["values"] = json.loads(profile["user_values"])
        except:
            profile["values"] = []
    else:
        profile["values"] = []
    
    return profile


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    profile_update: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        target_roles = json.dumps(profile_update.target_roles) if profile_update.target_roles else "[]"
        user_values = json.dumps(profile_update.values) if profile_update.values else "[]"
        
        await db.execute("""
            UPDATE profiles SET
                name = ?, email = ?, phone = ?, location = ?,
                linkedin = ?, website = ?, summary = ?,
                branding_color = ?, branding_font = ?,
                target_roles = ?, user_values = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (
            profile_update.name, profile_update.email, profile_update.phone,
            profile_update.location, profile_update.linkedin, profile_update.website,
            profile_update.summary, profile_update.branding_color, profile_update.branding_font,
            target_roles, user_values, current_user["id"]
        ))
        await db.commit()
        
        cursor = await db.execute(
            "SELECT * FROM profiles WHERE user_id = ?",
            (current_user["id"],)
        )
        row = await cursor.fetchone()
        profile = await dict_from_row(row)
    
    if profile.get("target_roles"):
        try:
            profile["target_roles"] = json.loads(profile["target_roles"])
        except:
            profile["target_roles"] = []
    else:
        profile["target_roles"] = []
    
    if profile.get("user_values"):
        try:
            profile["values"] = json.loads(profile["user_values"])
        except:
            profile["values"] = []
    else:
        profile["values"] = []
    
    return profile


@router.get("/achievements", response_model=List[AchievementResponse])
async def get_achievements(current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM achievements WHERE user_id = ? ORDER BY created_at DESC",
            (current_user["id"],)
        )
        rows = await cursor.fetchall()
    
    achievements = []
    for row in rows:
        achievement = await dict_from_row(row)
        if achievement.get("skills_used"):
            try:
                achievement["skills_used"] = json.loads(achievement["skills_used"])
            except:
                achievement["skills_used"] = []
        else:
            achievement["skills_used"] = []
        
        if achievement.get("tags"):
            try:
                achievement["tags"] = json.loads(achievement["tags"])
            except:
                achievement["tags"] = []
        else:
            achievement["tags"] = []
        
        achievements.append(achievement)
    
    return achievements


@router.post("/achievements", response_model=AchievementResponse)
async def create_achievement(
    achievement: AchievementCreate,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        skills_used = json.dumps(achievement.skills_used) if achievement.skills_used else "[]"
        tags = json.dumps(achievement.tags) if achievement.tags else "[]"
        
        cursor = await db.execute("""
            INSERT INTO achievements (user_id, core_task, impact_metric, skills_used, tags, company, role, year, verification_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user["id"], achievement.core_task, achievement.impact_metric,
            skills_used, tags, achievement.company, achievement.role,
            achievement.year, achievement.verification_level
        ))
        await db.commit()
        achievement_id = cursor.lastrowid
        
        cursor = await db.execute(
            "SELECT * FROM achievements WHERE id = ?",
            (achievement_id,)
        )
        row = await cursor.fetchone()
        new_achievement = await dict_from_row(row)
    
    if new_achievement.get("skills_used"):
        try:
            new_achievement["skills_used"] = json.loads(new_achievement["skills_used"])
        except:
            new_achievement["skills_used"] = []
    else:
        new_achievement["skills_used"] = []
    
    if new_achievement.get("tags"):
        try:
            new_achievement["tags"] = json.loads(new_achievement["tags"])
        except:
            new_achievement["tags"] = []
    else:
        new_achievement["tags"] = []
    
    return new_achievement


@router.put("/achievements/{achievement_id}", response_model=AchievementResponse)
async def update_achievement(
    achievement_id: int,
    achievement_update: AchievementUpdate,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM achievements WHERE id = ? AND user_id = ?",
            (achievement_id, current_user["id"])
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Achievement not found")
        
        skills_used = json.dumps(achievement_update.skills_used) if achievement_update.skills_used else "[]"
        tags = json.dumps(achievement_update.tags) if achievement_update.tags else "[]"
        
        await db.execute("""
            UPDATE achievements SET
                core_task = ?, impact_metric = ?, skills_used = ?, tags = ?,
                company = ?, role = ?, year = ?, verification_level = ?
            WHERE id = ? AND user_id = ?
        """, (
            achievement_update.core_task, achievement_update.impact_metric,
            skills_used, tags, achievement_update.company, achievement_update.role,
            achievement_update.year, achievement_update.verification_level,
            achievement_id, current_user["id"]
        ))
        await db.commit()
        
        cursor = await db.execute(
            "SELECT * FROM achievements WHERE id = ?",
            (achievement_id,)
        )
        row = await cursor.fetchone()
        updated = await dict_from_row(row)
    
    if updated.get("skills_used"):
        try:
            updated["skills_used"] = json.loads(updated["skills_used"])
        except:
            updated["skills_used"] = []
    else:
        updated["skills_used"] = []
    
    if updated.get("tags"):
        try:
            updated["tags"] = json.loads(updated["tags"])
        except:
            updated["tags"] = []
    else:
        updated["tags"] = []
    
    return updated


@router.delete("/achievements/{achievement_id}")
async def delete_achievement(
    achievement_id: int,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM achievements WHERE id = ? AND user_id = ?",
            (achievement_id, current_user["id"])
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Achievement not found")
        
        await db.execute(
            "DELETE FROM achievements WHERE id = ? AND user_id = ?",
            (achievement_id, current_user["id"])
        )
        await db.commit()
    
    return {"message": "Achievement deleted"}


@router.get("/applications", response_model=List[ApplicationResponse])
async def get_applications(current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC",
            (current_user["id"],)
        )
        rows = await cursor.fetchall()
    
    applications = []
    for row in rows:
        app = await dict_from_row(row)
        applications.append(app)
    
    return applications


@router.post("/applications", response_model=ApplicationResponse)
async def create_application(
    application: ApplicationCreate,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute("""
            INSERT INTO applications (user_id, job_title, company, job_url, job_description, status, match_score, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user["id"], application.job_title, application.company,
            application.job_url, application.job_description, application.status,
            application.match_score, application.notes
        ))
        await db.commit()
        app_id = cursor.lastrowid
        
        cursor = await db.execute(
            "SELECT * FROM applications WHERE id = ?",
            (app_id,)
        )
        row = await cursor.fetchone()
        new_app = await dict_from_row(row)
    
    return new_app


@router.put("/applications/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: int,
    application_update: ApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM applications WHERE id = ? AND user_id = ?",
            (application_id, current_user["id"])
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Application not found")
        
        applied_at = None
        if application_update.status == "applied":
            applied_at = datetime.utcnow().isoformat()
        
        await db.execute("""
            UPDATE applications SET
                job_title = ?, company = ?, job_url = ?, job_description = ?,
                status = ?, match_score = ?, notes = ?, applied_at = COALESCE(?, applied_at),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        """, (
            application_update.job_title, application_update.company,
            application_update.job_url, application_update.job_description,
            application_update.status, application_update.match_score,
            application_update.notes, applied_at,
            application_id, current_user["id"]
        ))
        await db.commit()
        
        cursor = await db.execute(
            "SELECT * FROM applications WHERE id = ?",
            (application_id,)
        )
        row = await cursor.fetchone()
        updated = await dict_from_row(row)
    
    return updated


@router.delete("/applications/{application_id}")
async def delete_application(
    application_id: int,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM applications WHERE id = ? AND user_id = ?",
            (application_id, current_user["id"])
        )
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Application not found")
        
        await db.execute(
            "DELETE FROM applications WHERE id = ? AND user_id = ?",
            (application_id, current_user["id"])
        )
        await db.commit()
    
    return {"message": "Application deleted"}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 20",
            (current_user["id"],)
        )
        rows = await cursor.fetchall()
        chat_history = [await dict_from_row(row) for row in rows]
        
        await db.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)",
            (current_user["id"], "user", request.message)
        )
        await db.commit()
    
    response_text, achievement = await chat_with_interviewer(request.message, chat_history)
    
    async with get_db() as db:
        await db.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)",
            (current_user["id"], "assistant", response_text)
        )
        await db.commit()
        
        if achievement:
            skills_used = json.dumps(achievement.skills_used) if achievement.skills_used else "[]"
            tags = json.dumps(achievement.tags) if achievement.tags else "[]"
            
            await db.execute("""
                INSERT INTO achievements (user_id, core_task, impact_metric, skills_used, tags, company, role, year, verification_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                current_user["id"], achievement.core_task, achievement.impact_metric,
                skills_used, tags, achievement.company, achievement.role,
                achievement.year, achievement.verification_level or "Medium"
            ))
            await db.commit()
    
    return ChatResponse(
        response=response_text,
        achievement_extracted=achievement
    )


@router.get("/chat/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC",
            (current_user["id"],)
        )
        rows = await cursor.fetchall()
        messages = [await dict_from_row(row) for row in rows]
    
    return {"messages": messages}


@router.delete("/chat/history")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    async with get_db() as db:
        await db.execute(
            "DELETE FROM chat_messages WHERE user_id = ?",
            (current_user["id"],)
        )
        await db.commit()
    
    return {"message": "Chat history cleared"}


@router.post("/tailor", response_model=TailorResponse)
async def tailor(
    request: TailorRequest,
    current_user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM profiles WHERE user_id = ?",
            (current_user["id"],)
        )
        row = await cursor.fetchone()
        profile = await dict_from_row(row)
        
        if profile and profile.get("target_roles"):
            try:
                profile["target_roles"] = json.loads(profile["target_roles"])
            except:
                profile["target_roles"] = []
        
        cursor = await db.execute(
            "SELECT * FROM achievements WHERE user_id = ?",
            (current_user["id"],)
        )
        rows = await cursor.fetchall()
        achievements = []
        for row in rows:
            achievement = await dict_from_row(row)
            if achievement.get("skills_used"):
                try:
                    achievement["skills_used"] = json.loads(achievement["skills_used"])
                except:
                    achievement["skills_used"] = []
            achievements.append(achievement)
    
    result = await tailor_resume(request.job_description, profile or {}, achievements)
    
    return TailorResponse(**result)


@router.post("/extract-profile", response_model=ResumeExtractResponse)
async def extract_profile(
    request: ResumeExtractRequest,
    current_user: dict = Depends(get_current_user)
):
    """Extract profile information from resume text using AI."""
    result = await extract_profile_from_resume(request.resume_text)
    return ResumeExtractResponse(**result)
