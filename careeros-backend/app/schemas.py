from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class ProfileBase(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    summary: Optional[str] = None
    branding_color: Optional[str] = "#000000"
    branding_font: Optional[str] = "Inter"
    target_roles: Optional[List[str]] = []
    values: Optional[List[str]] = []


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class AchievementBase(BaseModel):
    core_task: str
    impact_metric: Optional[str] = None
    skills_used: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    company: Optional[str] = None
    role: Optional[str] = None
    year: Optional[int] = None
    verification_level: Optional[str] = "Medium"


class AchievementCreate(AchievementBase):
    pass


class AchievementUpdate(AchievementBase):
    pass


class AchievementResponse(AchievementBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class ApplicationBase(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    job_url: Optional[str] = None
    job_description: Optional[str] = None
    status: Optional[str] = "saved"
    match_score: Optional[int] = None
    notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(ApplicationBase):
    pass


class ApplicationResponse(ApplicationBase):
    id: int
    user_id: int
    applied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    achievement_extracted: Optional[AchievementCreate] = None


class TailorRequest(BaseModel):
    job_description: str


class TailorResponse(BaseModel):
    tailored_summary: str
    selected_achievements: List[dict]
    match_score: int
    suggestions: List[str]
