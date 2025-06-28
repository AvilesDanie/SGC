from typing import Optional
from pydantic import BaseModel
from datetime import date
from pydantic import BaseModel

class ExpedienteRead(BaseModel):
    id: int
    cita_id: int
    contenido: str
    fecha: date
    archivo_url: Optional[str]

    class Config:
        orm_mode = True
