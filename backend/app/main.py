from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db

# Importa cada router de usuario
from app.routes.usuario.registro_usuario import router as registro_usuario_router
from app.routes.usuario.autenticacion import router as autenticacion_router
from app.routes.usuario.gestion_credenciales import router as gestion_credenciales_router
from app.routes.usuario.administracion import router as administracion_router
from app.routes.usuario.consulta_especifica_pacientes_medicos import router as consulta_usuarios_router
from app.routes.usuario.especialidad import router as especialidad_router

# Otros routers
from app.routes.cita.cita import router as cita_router
from app.routes.cita.certificado import router as certificado_router
from app.routes.expediente.expediente import router as expediente_router
from app.routes.signos.signos_vitales import router as signos_router
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

# Routers de usuario
app.include_router(registro_usuario_router, tags=["Usuarios - Registro"])
app.include_router(autenticacion_router, tags=["Usuarios - Autenticación"])
app.include_router(gestion_credenciales_router, tags=["Usuarios - Gestión de Credenciales"])
app.include_router(administracion_router, tags=["Usuarios - Administración"])
app.include_router(consulta_usuarios_router, tags=["Usuarios - Consulta de Pacientes y Médicos"])
app.include_router(especialidad_router, tags=["Usuarios - Especialidades"])

# Otros routers
app.include_router(cita_router, tags=["Citas"])
app.include_router(certificado_router, tags=["Certificados"])
app.include_router(expediente_router, tags=["Expedientes"])
app.include_router(signos_router, tags=["Signos Vitales"])
app.include_router(websocket_router, tags=["WebSocket"])
