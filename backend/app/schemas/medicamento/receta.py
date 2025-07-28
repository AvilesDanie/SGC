from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class RecetaMedicamentoBase(BaseModel):
    medicamento_id: int
    dosis: str
    frecuencia: str
    duracion: str
    indicaciones: Optional[str] = None


class RecetaMedicamentoRead(RecetaMedicamentoBase):
    medicamento_nombre: str
    disponible: bool
    stock: int
    entregado: Optional[bool] = False

class RecetaCreate(BaseModel):
    cita_id: int
    observaciones: Optional[str]
    medicamentos: List[RecetaMedicamentoBase]


class RecetaRead(BaseModel):
    id: int
    fecha_emision: date
    observaciones: Optional[str]
    paciente_nombre: str
    medico_nombre: str
    fecha_cita: date
    medicamentos: List[RecetaMedicamentoRead]

    class Config:
        orm_mode = True
