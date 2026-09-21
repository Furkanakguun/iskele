from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import activity, auth, docker, health, jobs, repos, settings
from app.services.users import ensure_seed_users


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_seed_users(get_settings())
    yield


app = FastAPI(title="Iskele API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(auth.users_router, prefix="/api")
app.include_router(repos.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(docker.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
