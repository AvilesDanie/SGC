from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import date, time
from enum import Enum
from typing import Optional, TYPE_CHECKING
from .certificado import CertificadoAsistencia, CertificadoMedico



if TYPE_CHECKING:
    from ...models.usuario.usuario import User
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

    # Relaciones
    medico: Optional["User"] = Relationship(sa_relationship_kwargs={"primaryjoin": "Cita.medico_id==User.id"})
    paciente: Optional["User"] = Relationship(sa_relationship_kwargs={"primaryjoin": "Cita.paciente_id==User.id"})
    signos_vitales: Optional["SignosVitales"] = Relationship(back_populates="cita")
    certificado_medico: Optional["CertificadoMedico"] = Relationship(back_populates="cita")
    certificado_asistencia: Optional["CertificadoAsistencia"] = Relationship(back_populates="cita")


