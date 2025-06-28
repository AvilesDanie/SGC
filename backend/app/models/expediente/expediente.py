from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date


class Expediente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cita_id: int = Field(foreign_key="cita.id")
    contenido: str
    fecha: date = Field(default_factory=date.today)
