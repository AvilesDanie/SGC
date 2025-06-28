from pydantic import BaseModel
from datetime import date
from pydantic import BaseModel


class ExpedienteCreate(BaseModel):
    cita_id: int
    contenido: str

class ExpedienteRead(BaseModel):
    id: int
    cita_id: int
    contenido: str
    fecha: date

    class Config:
        orm_mode = True
