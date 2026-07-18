from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
import uuid
from passlib.context import CryptContext
from backend.database import get_db
from backend.models import User
import hashlib

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def prepare_password(password: str) -> str:
    """Pre-hash password with SHA-256 to support arbitrary-length input."""
    if password is None:
        return ""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    pre = prepare_password(password)
    return pwd_context.hash(pre)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify against stored pbkdf2_sha256 hash and support legacy passwords."""
    if not hashed_password:
        return False
    pre = prepare_password(plain_password)
    try:
        if pwd_context.verify(pre, hashed_password):
            return True
    except Exception:
        pass
    try:
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except Exception:
        pass
    return False


def create_token() -> str:
    return str(uuid.uuid4())

# =============== REQUEST/RESPONSE MODELS ===============

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @validator("name")
    def name_must_not_be_empty(cls, value: str):
        if not value or not value.strip():
            raise ValueError("Full name is required")
        return value.strip()

    @validator("password")
    def password_strength(cls, value: str):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(ch.isupper() for ch in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(ch.islower() for ch in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(ch.isdigit() for ch in value):
            raise ValueError("Password must contain at least one digit")
        return value

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    id: str
    email: str
    name: str
    token: str

# =============== AUTH ENDPOINTS ===============

@router.post("/signup", response_model=AuthResponse)
async def signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=request.email,
            name=request.name,
            password=hash_password(request.password),
            token=create_token()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return AuthResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            token=user.token
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to create account: {str(e)}")

# =============== LOGIN ENDPOINT ===============

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login user"""
    try:
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        # First try verification using the prepared (sha256) form or raw bcrypt.
        if verify_password(request.password, user.password):
            # If stored password was a bcrypt of the raw password (legacy),
            # re-hash and store the new prepared hash (sha256 -> bcrypt) for safety.
            pre = prepare_password(request.password)
            try:
                if not pwd_context.verify(pre, user.password):
                    # previous hash matched raw password; upgrade to prepared hash
                    user.password = hash_password(request.password)
                    db.commit()
            except Exception:
                # If verification call above throws, ignore and continue
                pass
        else:
            # No match. Check for legacy plaintext storage and upgrade if found.
            if user.password == request.password:
                user.password = hash_password(request.password)
                db.commit()
            else:
                raise HTTPException(status_code=401, detail="Invalid email or password")

        user.token = create_token()
        db.commit()
        db.refresh(user)

        return AuthResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            token=user.token
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to log in: {str(e)}")

# =============== ME ENDPOINT ===============

@router.get("/me")
async def get_current_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get current user by auth token"""
    try:
        auth_token = token
        if not auth_token and authorization:
            _, _, auth_token = authorization.partition(" ")
        if not auth_token:
            raise HTTPException(status_code=401, detail="Missing auth token")

        user = db.query(User).filter(User.token == auth_token).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to load user: {str(e)}")

# =============== LOGOUT ENDPOINT ===============

@router.post("/logout")
async def logout(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Logout user"""
    try:
        auth_token = token
        if not auth_token and authorization:
            _, _, auth_token = authorization.partition(" ")
        if auth_token:
            user = db.query(User).filter(User.token == auth_token).first()
            if user:
                user.token = None
                db.commit()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unable to log out: {str(e)}")
