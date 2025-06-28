from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import date, time
from enum import Enum
from typing import Optional, TYPE_CHECKING


if TYPE_CHECKING:
    from signos.signos_vitales import SignosVitales


class EstadoCitaEnum(str, Enum):
    agendado = "agendado"
    para_signos = "para_signos"
    en_espera = "en_espera"
    en_consulta = "en_consulta"
    terminado = "terminado"
    perdida = "perdida"

class Cita(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    paciente_id: int = Field(foreign_key="user.id")
    medico_id: int = Field(foreign_key="user.id")

    fecha: date
    hora_inicio: time
    hora_fin: time

    estado: EstadoCitaEnum = Field(default=EstadoCitaEnum.agendado)
    signos_vitales: Optional["SignosVitales"] = Relationship(back_populates="cita")
