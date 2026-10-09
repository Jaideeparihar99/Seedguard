from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import STATIC_PATH
from backend.database import initialize_database
from backend.routes import router as api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="SeedGuard API", version="0.2.0", lifespan=lifespan)
app.include_router(api_router)


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_PATH / "index.html")


app.mount("/", StaticFiles(directory=STATIC_PATH), name="static")
