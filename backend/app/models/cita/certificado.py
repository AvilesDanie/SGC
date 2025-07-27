from sqlmodel import SQLModel, Field, Relationship
from datetime import date, time
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .cita import Cita

class CertificadoMedico(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cita_id: int = Field(foreign_key="cita.id")

    diagnostico: str
    reposo_dias: int
    fecha_emision: date
    observaciones: Optional[str] = None

    cita: Optional["Cita"] = Relationship(back_populates="certificado_medico")


class CertificadoAsistencia(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cita_id: int = Field(foreign_key="cita.id")

    fecha: date
    hora_entrada: time
    hora_salida: time
    motivo: Optional[str] = None

    cita: Optional["Cita"] = Relationship(back_populates="certificado_asistencia")
