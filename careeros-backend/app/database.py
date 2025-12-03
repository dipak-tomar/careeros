import libsql_experimental as libsql
from contextlib import asynccontextmanager
from typing import Optional
import os

_connection = None
_turso_enabled = False

def get_connection():
    global _connection, _turso_enabled
    if _connection is None:
        from app.config import get_settings
        settings = get_settings()
        turso_url = settings.TURSO_URL
        turso_token = settings.TURSO_AUTH_TOKEN
        
        if turso_url and turso_token:
            # Convert libsql:// URL to https:// for direct HTTP connection
            http_url = turso_url.replace("libsql://", "https://")
            # Remove any local db files that might cause sync issues
            for f in ["careeros.db", "careeros.db-info", "careeros.db-shm", "careeros.db-wal"]:
                if os.path.exists(f):
                    try:
                        os.remove(f)
                    except:
                        pass
            # Connect directly to Turso via HTTP (no local replica)
            _connection = libsql.connect(http_url, auth_token=turso_token)
            _turso_enabled = True
        else:
            _connection = libsql.connect("careeros.db")
            _turso_enabled = False
    return _connection

def is_turso_enabled():
    return _turso_enabled


async def init_db():
    db = get_connection()
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    db.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            name TEXT,
            email TEXT,
            phone TEXT,
            location TEXT,
            linkedin TEXT,
            website TEXT,
            summary TEXT,
            branding_color TEXT DEFAULT '#000000',
            branding_font TEXT DEFAULT 'Inter',
            target_roles TEXT,
            user_values TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    db.execute("""
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            core_task TEXT NOT NULL,
            impact_metric TEXT,
            skills_used TEXT,
            tags TEXT,
            company TEXT,
            role TEXT,
            year INTEGER,
            verification_level TEXT DEFAULT 'Medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    db.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            job_title TEXT,
            company TEXT,
            job_url TEXT,
            job_description TEXT,
            status TEXT CHECK (status IN ('saved', 'applied', 'interview', 'offer', 'rejected')) DEFAULT 'saved',
            match_score INTEGER,
            notes TEXT,
            applied_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    db.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    db.commit()


class DBWrapper:
    """Wrapper to make libsql work with async context manager pattern."""
    def __init__(self, conn):
        self._conn = conn
        self._columns = ["id", "email", "hashed_password", "created_at", "user_id", "name", 
                        "phone", "location", "linkedin", "website", "summary", "branding_color",
                        "branding_font", "target_roles", "user_values", "updated_at", "core_task",
                        "impact_metric", "skills_used", "tags", "company", "role", "year",
                        "verification_level", "job_title", "job_url", "job_description", "status",
                        "match_score", "notes", "applied_at", "content"]
    
    async def execute(self, sql, params=()):
        result = self._conn.execute(sql, params)
        return CursorWrapper(result, self._conn)
    
    async def commit(self):
        self._conn.commit()


class CursorWrapper:
    """Wrapper to provide async fetchone/fetchall interface."""
    def __init__(self, result, conn):
        self._conn = conn
        self._rows = []
        self._columns = []
        if result is not None:
            if hasattr(result, 'description') and result.description:
                self._columns = [col[0] for col in result.description]
            try:
                self._rows = result.fetchall()
            except:
                self._rows = []
        self._idx = 0
    
    @property
    def lastrowid(self):
        result = self._conn.execute("SELECT last_insert_rowid()")
        row = result.fetchone()
        return row[0] if row else None
    
    async def fetchone(self):
        if self._idx >= len(self._rows):
            return None
        row = self._rows[self._idx]
        self._idx += 1
        if self._columns and isinstance(row, (list, tuple)):
            return dict(zip(self._columns, row))
        return row
    
    async def fetchall(self):
        result = []
        for row in self._rows:
            if self._columns and isinstance(row, (list, tuple)):
                result.append(dict(zip(self._columns, row)))
            else:
                result.append(row)
        return result


@asynccontextmanager
async def get_db():
    db = DBWrapper(get_connection())
    try:
        yield db
    finally:
        pass


async def dict_from_row(row) -> Optional[dict]:
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    if hasattr(row, 'keys'):
        return dict(row)
    return row
