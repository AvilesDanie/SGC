from fastapi import FastAPI
from contextlib import asynccontextmanager

from fastapi.middleware.cors import CORSMiddleware
from .database import init_db

from app.routes.cita.cita import router as cita_router
from app.routes.expediente.expediente import router as expediente_router
from app.routes.signos.signos_vitales import router as signos_router
from app.routes.usuario.usuario import router as usuario_router
from app.routes.usuario.especialidad import router as especialidad_router
from app.routes.websocket.websoket import router as websocket_router

import os
from fastapi.staticfiles import StaticFiles

os.makedirs("./media/expedientes", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory="media"), name="media")


app.include_router(cita_router, tags=["Citas"])
app.include_router(expediente_router, tags=["Expedientes"])
app.include_router(signos_router, tags=["Signos Vitales"])
app.include_router(usuario_router,tags=["Usuarios"])
app.include_router(especialidad_router, tags=["Especialidades"])
app.include_router(websocket_router, tags=["WebSocket"])
