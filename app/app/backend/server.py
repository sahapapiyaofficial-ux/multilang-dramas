from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pathlib import Path
from passlib.context import CryptContext
from jose import jwt, JWTError
import os
import uuid
import logging
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'reeldrama-dev-secret-change-me-in-prod')
JWT_ALGO = 'HS256'
JWT_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=[\"bcrypt\"], deprecated=\"auto\")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=\"/api/auth/login\", auto_error=False)

app = FastAPI(title=\"ReelDrama API\")
api = APIRouter(prefix=\"/api\")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============ MODELS ============
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    role: str = \"user\"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = \"bearer\"
    user: UserPublic


class ReelCreate(BaseModel):
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    language: str
    category: str
    duration: int = 60


class Reel(BaseModel):
    id: str
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    language: str
    category: str
    duration: int
    views: int = 0
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime
    liked: bool = False
    saved: bool = False


class CommentCreate(BaseModel):
    text: str


class Comment(BaseModel):
    id: str
    reel_id: str
    user_id: str
    user_name: str
    text: str
    created_at: datetime


# ============ HELPERS ============
def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, hp: str) -> bool:
    return pwd_context.verify(p, hp)


def create_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({\"sub\": user_id, \"role\": role, \"exp\": exp}, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get(\"sub\")
        if not user_id:
            return None
        user = await db.users.find_one({\"id\": user_id}, {\"_id\": 0, \"hashed_password\": 0})
        return user
    except JWTError:
        return None


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)):
    user = await get_current_user_optional(token)
    if not user:
        raise HTTPException(status_code=401, detail=\"Not authenticated\")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get(\"role\") != \"admin\":
        raise HTTPException(status_code=403, detail=\"Admin only\")
    return user


def _reel_to_public(doc: dict, liked_ids: set, saved_ids: set) -> Reel:
    return Reel(
        id=doc[\"id\"],
        title=doc[\"title\"],
        description=doc[\"description\"],
        video_url=doc[\"video_url\"],
        thumbnail_url=doc[\"thumbnail_url\"],
        language=doc[\"language\"],
        category=doc[\"category\"],
        duration=doc.get(\"duration\", 60),
        views=doc.get(\"views\", 0),
        likes_count=doc.get(\"likes_count\", 0),
        comments_count=doc.get(\"comments_count\", 0),
        created_at=doc.get(\"created_at\", datetime.now(timezone.utc)),
        liked=doc[\"id\"] in liked_ids,
        saved=doc[\"id\"] in saved_ids,
    )


async def get_user_reactions(user_id: Optional[str]) -> tuple:
    if not user_id:
        return set(), set()
    liked_docs = await db.likes.find({\"user_id\": user_id}, {\"_id\": 0, \"reel_id\": 1}).to_list(1000)
    saved_docs = await db.watchlists.find({\"user_id\": user_id}, {\"_id\": 0, \"reel_id\": 1}).to_list(1000)
    return {d[\"reel_id\"] for d in liked_docs}, {d[\"reel_id\"] for d in saved_docs}


# ============ AUTH ROUTES ============
@api.post(\"/auth/register\", response_model=TokenResponse)
async def register(payload: UserRegister):
    existing = await db.users.find_one({\"email\": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail=\"Email already registered\")
    user_id = str(uuid.uuid4())
    user_doc = {
        \"id\": user_id,
        \"email\": payload.email,
        \"name\": payload.name or payload.email.split(\"@\")[0],
        \"hashed_password\": hash_password(payload.password),
        \"role\": \"user\",
        \"created_at\": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, \"user\")
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user_id, email=payload.email, name=user_doc[\"name\"], role=\"user\"),
    )


@api.post(\"/auth/login\", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({\"email\": payload.email})
    if not user or not verify_password(payload.password, user[\"hashed_password\"]):
        raise HTTPException(status_code=401, detail=\"Invalid credentials\")
    token = create_token(user[\"id\"], user.get(\"role\", \"user\"))
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user[\"id\"], email=user[\"email\"], name=user.get(\"name\"), role=user.get(\"role\", \"user\")),
    )


@api.get(\"/auth/me\", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return UserPublic(id=user[\"id\"], email=user[\"email\"], name=user.get(\"name\"), role=user.get(\"role\", \"user\"))


# ============ REELS ROUTES ============
@api.get(\"/reels\", response_model=List[Reel])
async def list_reels(
    language: Optional[str] = None,
    category: Optional[str] = None,
    user=Depends(get_current_user_optional),
):
    query = {}
    if language and language.lower() != \"all\":
        query[\"language\"] = language
    if category and category.lower() != \"all\":
        query[\"category\"] = category
    docs = await db.reels.find(query, {\"_id\": 0}).sort(\"created_at\", -1).to_list(500)
    liked_ids, saved_ids = await get_user_reactions(user[\"id\"] if user else None)
    return [_reel_to_public(d, liked_ids, saved_ids) for d in docs]


@api.get(\"/reels/languages\")
async def list_languages():
    langs = await db.reels.distinct(\"language\")
    return {\"languages\": langs}


@api.get(\"/reels/categories\")
async def list_categories():
    cats = await db.reels.distinct(\"category\")
    return {\"categories\": cats}


@api.get(\"/reels/watchlist\", response_model=List[Reel])
async def get_watchlist(user=Depends(get_current_user)):
    saved = await db.watchlists.find({\"user_id\": user[\"id\"]}, {\"_id\": 0}).sort(\"created_at\", -1).to_list(500)
    reel_ids = [s[\"reel_id\"] for s in saved]
    if not reel_ids:
        return []
    docs = await db.reels.find({\"id\": {\"$in\": reel_ids}}, {\"_id\": 0}).to_list(500)
    liked_ids, saved_ids = await get_user_reactions(user[\"id\"])
    # Preserve saved order
    docs_map = {d[\"id\"]: d for d in docs}
    ordered = [docs_map[rid] for rid in reel_ids if rid in docs_map]
    return [_reel_to_public(d, liked_ids, saved_ids) for d in ordered]


@api.get(\"/reels/{reel_id}\", response_model=Reel)
async def get_reel(reel_id: str, user=Depends(get_current_user_optional)):
    doc = await db.reels.find_one({\"id\": reel_id}, {\"_id\": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=\"Reel not found\")
    liked_ids, saved_ids = await get_user_reactions(user[\"id\"] if user else None)
    return _reel_to_public(doc, liked_ids, saved_ids)


@api.post(\"/reels/{reel_id}/like\")
async def like_reel(reel_id: str, user=Depends(get_current_user)):
    reel = await db.reels.find_one({\"id\": reel_id})
    if not reel:
        raise HTTPException(status_code=404, detail=\"Reel not found\")
    existing = await db.likes.find_one({\"reel_id\": reel_id, \"user_id\": user[\"id\"]})
    if existing:
        await db.likes.delete_one({\"reel_id\": reel_id, \"user_id\": user[\"id\"]})
        await db.reels.update_one({\"id\": reel_id}, {\"$inc\": {\"likes_count\": -1}})
        return {\"liked\": False}
    await db.likes.insert_one({
        \"reel_id\": reel_id,
        \"user_id\": user[\"id\"],
        \"created_at\": datetime.now(timezone.utc),
    })
    await db.reels.update_one({\"id\": reel_id}, {\"$inc\": {\"likes_count\": 1}})
    return {\"liked\": True}


@api.post(\"/reels/{reel_id}/watchlist\")
async def toggle_watchlist(reel_id: str, user=Depends(get_current_user)):
    reel = await db.reels.find_one({\"id\": reel_id})
    if not reel:
        raise HTTPException(status_code=404, detail=\"Reel not found\")
    existing = await db.watchlists.find_one({\"reel_id\": reel_id, \"user_id\": user[\"id\"]})
    if existing:
        await db.watchlists.delete_one({\"reel_id\": reel_id, \"user_id\": user[\"id\"]})
        return {\"saved\": False}
    await db.watchlists.insert_one({
        \"reel_id\": reel_id,
        \"user_id\": user[\"id\"],
        \"created_at\": datetime.now(timezone.utc),
    })
    return {\"saved\": True}


@api.post(\"/reels/{reel_id}/view\")
async def add_view(reel_id: str):
    await db.reels.update_one({\"id\": reel_id}, {\"$inc\": {\"views\": 1}})
    return {\"ok\": True}


@api.get(\"/reels/{reel_id}/comments\", response_model=List[Comment])
async def get_comments(reel_id: str):
    docs = await db.comments.find({\"reel_id\": reel_id}, {\"_id\": 0}).sort(\"created_at\", -1).to_list(500)
    return [Comment(**d) for d in docs]


@api.post(\"/reels/{reel_id}/comments\", response_model=Comment)
async def add_comment(reel_id: str, payload: CommentCreate, user=Depends(get_current_user)):
    reel = await db.reels.find_one({\"id\": reel_id})
    if not reel:
        raise HTTPException(status_code=404, detail=\"Reel not found\")
    comment = {
        \"id\": str(uuid.uuid4()),
        \"reel_id\": reel_id,
        \"user_id\": user[\"id\"],
        \"user_name\": user.get(\"name\") or user[\"email\"].split(\"@\")[0],
        \"text\": payload.text,
        \"created_at\": datetime.now(timezone.utc),
    }
    await db.comments.insert_one(comment)
    await db.reels.update_one({\"id\": reel_id}, {\"$inc\": {\"comments_count\": 1}})
    return Comment(**comment)


@api.post(\"/reels\", response_model=Reel)
async def create_reel(payload: ReelCreate, admin=Depends(require_admin)):
    reel_doc = {
        \"id\": str(uuid.uuid4()),
        \"title\": payload.title,
        \"description\": payload.description,
        \"video_url\": payload.video_url,
        \"thumbnail_url\": payload.thumbnail_url,
        \"language\": payload.language,
        \"category\": payload.category,
        \"duration\": payload.duration,
        \"views\": 0,
        \"likes_count\": 0,
        \"comments_count\": 0,
        \"created_at\": datetime.now(timezone.utc),
        \"created_by\": admin[\"id\"],
    }
    await db.reels.insert_one(reel_doc)
    return _reel_to_public(reel_doc, set(), set())


# ============ SEED ============
SAMPLE_REELS = [
    {
        \"title\": \"Midnight Rendezvous\",
        \"description\": \"A billionaire and a struggling artist meet under the city lights. Their forbidden romance unfolds.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1518676590629-3dcba9c5a5c9?w=600&q=80\",
        \"language\": \"English\",
        \"category\": \"Romance\",
    },
    {
        \"title\": \"प्यार की रात\",
        \"description\": \"एक अरबपति और एक कलाकार की मुलाकात शहर की रोशनी में। एक निषिद्ध प्रेम कहानी।\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80\",
        \"language\": \"Hindi\",
        \"category\": \"Romance\",
    },
    {
        \"title\": \"The Last Witness\",
        \"description\": \"She saw something she shouldn't have. Now she's running for her life through the neon-lit streets.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80\",
        \"language\": \"English\",
        \"category\": \"Thriller\",
    },
    {
        \"title\": \"Amor Prohibido\",
        \"description\": \"Dos mundos, un solo amor. Una historia que no debía existir.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80\",
        \"language\": \"Spanish\",
        \"category\": \"Romance\",
    },
    {
        \"title\": \"காதல் மழை\",
        \"description\": \"மழை நின்றது. ஆனால் அவளின் இதயம் இன்னும் துடிக்கிறது.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1533450718592-29d45635f0a9?w=600&q=80\",
        \"language\": \"Tamil\",
        \"category\": \"Romance\",
    },
    {
        \"title\": \"The CEO's Contract\",
        \"description\": \"A billion-dollar deal comes with one condition: marry his rival's daughter.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80\",
        \"language\": \"English\",
        \"category\": \"Drama\",
    },
    {
        \"title\": \"మౌన ప్రేమ\",
        \"description\": \"మాట్లాడని ప్రేమకథ. కళ్ళే అన్నీ చెప్పాయి.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1512070679279-8988d32161be?w=600&q=80\",
        \"language\": \"Telugu\",
        \"category\": \"Romance\",
    },
    {
        \"title\": \"Shadow Games\",
        \"description\": \"In a city where trust is a luxury, one detective plays the ultimate game.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600&q=80\",
        \"language\": \"English\",
        \"category\": \"Thriller\",
    },
    {
        \"title\": \"बंधन\",
        \"description\": \"एक शादी। दो अजनबी। एक अनकही कहानी।\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1490723286627-4b66e6b2882a?w=600&q=80\",
        \"language\": \"Hindi\",
        \"category\": \"Drama\",
    },
    {
        \"title\": \"Laugh Track\",
        \"description\": \"A stand-up comedian meets his match — the audience heckler he can't stop thinking about.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&q=80\",
        \"language\": \"English\",
        \"category\": \"Comedy\",
    },
    {
        \"title\": \"El Secreto de Media Noche\",
        \"description\": \"Cada noche, ella desaparece. Cada mañana, él la busca.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600&q=80\",
        \"language\": \"Spanish\",
        \"category\": \"Thriller\",
    },
    {
        \"title\": \"வானம் நீலம்\",
        \"description\": \"ஒரு புத்தகம். ஒரு காதல். ஒரு நினைவு.\",
        \"video_url\": \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4\",
        \"thumbnail_url\": \"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80\",
        \"language\": \"Tamil\",
        \"category\": \"Drama\",
    },
]


async def seed_data():
    # Seed admin
    admin_email = \"[email protected]\"
    await db.users.update_one(
        {\"email\": admin_email},
        {\"$setOnInsert\": {
            \"id\": str(uuid.uuid4()),
            \"email\": admin_email,
            \"name\": \"Admin\",
            \"hashed_password\": hash_password(\"admin123\"),
            \"role\": \"admin\",
            \"created_at\": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    logger.info(\"Admin seeded: [email protected] / admin123\")

    # Seed reels only if empty
    count = await db.reels.count_documents({})
    if count == 0:
        docs = []
        now = datetime.now(timezone.utc)
        for i, r in enumerate(SAMPLE_REELS):
            docs.append({
                \"id\": str(uuid.uuid4()),
                **r,
                \"duration\": 60,
                \"views\": 1000 + i * 250,
                \"likes_count\": 100 + i * 30,
                \"comments_count\": 10 + i * 5,
                \"created_at\": now - timedelta(hours=i),
            })
        await db.reels.insert_many(docs)
        logger.info(f\"Seeded {len(docs)} reels\")


@app.on_event(\"startup\")
async def on_startup():
    await seed_data()


@app.on_event(\"shutdown\")
async def on_shutdown():
    client.close()


@api.get(\"/\")
async def root():
    return {\"message\": \"ReelDrama API\", \"status\": \"ok\"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[\"*\"],
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)
"
Observation: Overwrite successful: /app/backend/server.py
