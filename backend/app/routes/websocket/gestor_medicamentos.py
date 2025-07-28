from typing import List
from fastapi import WebSocket

class GestorWebSocketMedicamentos:
    def __init__(self):
        self.conexiones: List[WebSocket] = []

    async def conectar(self, websocket: WebSocket):
        await websocket.accept()
        self.conexiones.append(websocket)

    def desconectar(self, websocket: WebSocket):
        self.conexiones.remove(websocket)

    async def notificar_cambio(self, evento: str, datos: dict = None):
        mensaje = {
            "evento": evento,
            "datos": datos or {}
        }
        for conexion in self.conexiones:
            await conexion.send_json(mensaje)

gestor_medicamentos = GestorWebSocketMedicamentos()
