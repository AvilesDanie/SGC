from fastapi import FastAPI
from contextlib import asynccontextmanager

from users import router as user_router
from routes.roles_test import router as roles_router
from database import init_db
from fastapi.middleware.cors import CORSMiddleware



@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # Aquí se inicializa la base de datos al arrancar la app
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # o ["*"] si estás probando
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas
app.include_router(user_router)
app.include_router(roles_router)
