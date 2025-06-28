from pydantic import BaseModel
from typing import Optional
from datetime import date, time
from pydantic import BaseModel


class SignosVitalesCreate(BaseModel):
    cita_id: int
    presion_arterial: str
    peso: float
    talla: float
    temperatura: float
    saturacion_oxigeno: float


class SignosVitalesRead(BaseModel):
    id: int
    cita_id: int
    presion_arterial: str
    peso: float
    talla: float
    temperatura: float
    saturacion_oxigeno: float

    class Config:
        orm_mode = True


