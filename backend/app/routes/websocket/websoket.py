from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from .gestor_medicamentos import gestor_medicamentos

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()


async def notificar_actualizacion():
    await manager.broadcast({"evento": "actualizacion_citas"})


@router.websocket("/ws/estado-citas")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def notificar_actualizacion():
    await manager.broadcast({"evento": "actualizacion_citas"})

@router.websocket("/ws/medicamentos")
async def websocket_medicamentos(websocket: WebSocket):
    await gestor_medicamentos.conectar(websocket)
    try:
        while True:
            await websocket.receive_text()  # Mantener la conexión viva
    except WebSocketDisconnect:
        gestor_medicamentos.desconectar(websocket)



class GestorWebSocketRecetas:
    def __init__(self):
        self.conexiones: List[WebSocket] = []

    async def conectar(self, websocket: WebSocket):
        await websocket.accept()
        self.conexiones.append(websocket)

    def desconectar(self, websocket: WebSocket):
        self.conexiones.remove(websocket)

    async def notificar(self, evento: str, datos: dict = None):
        mensaje = {
            "evento": evento,
            "datos": datos or {}
        }
        for conexion in self.conexiones:
            await conexion.send_json(mensaje)

gestor_recetas = GestorWebSocketRecetas()


@router.websocket("/ws/recetas")
async def ws_recetas(websocket: WebSocket):
    await gestor_recetas.conectar(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        gestor_recetas.desconectar(websocket)
