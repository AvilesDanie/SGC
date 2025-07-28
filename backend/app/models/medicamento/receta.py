from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import date

from ...models.medicamento.medicamento import Medicamento


class Receta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    cita_id: int = Field(foreign_key="cita.id", unique=True)
    fecha_emision: date = Field(default_factory=date.today)
    observaciones: Optional[str] = None

    medicamentos: List["RecetaMedicamento"] = Relationship(back_populates="receta")
    estado: str = Field(default="pendiente")  # opciones: pendiente, entregada, cancelada
    fecha_entrega: Optional[date] = None

    
class RecetaMedicamento(SQLModel, table=True):
    receta_id: int = Field(foreign_key="receta.id", primary_key=True)
    medicamento_id: int = Field(foreign_key="medicamento.id", primary_key=True)

    dosis: str
    frecuencia: str
    duracion: str
    indicaciones: Optional[str] = None

    receta: "Receta" = Relationship(back_populates="medicamentos")
    medicamento: "Medicamento" = Relationship()
