import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'college.settings')
django.setup()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.fastapi_app import router as fastapi_router

app = FastAPI(
    title="Excel University College Management System API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fastapi_router, prefix="/api")

django_application = get_asgi_application()
app.mount("/", django_application)

application = app
