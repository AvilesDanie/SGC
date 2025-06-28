from pydantic import BaseModel
from typing import Optional
from datetime import date, time
from pydantic import BaseModel
from enum import Enum
from ..signos.signos_vitales import SignosVitalesRead



class EstadoCita(str, Enum):
    agendado = "agendado"
    para_signos = "para_signos"
    en_espera = "en_espera"
    en_consulta = "en_consulta"
    terminado = "terminado"
    perdida = "perdida"

class CitaRead(BaseModel):
    id: int
    paciente_id: int
    medico_id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: EstadoCita

    model_config = {
        "from_attributes": True
    }

class CitaCreate(BaseModel):
    paciente_id: int
    medico_id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: EstadoCita = EstadoCita.agendado

class EstadoCitaRequest(BaseModel):
    estado: EstadoCita

class CitaWithSignosRead(BaseModel):
    id: int
    paciente_id: int
    medico_id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: str
    signos_vitales: Optional[SignosVitalesRead]

    class Config:
        orm_mode = True


class MedicoInfo(BaseModel):
    id: int
    nombre: str
    apellido: str
    especialidad: Optional[str]

    class Config:
        orm_mode = True

class CitaWithMedicoRead(BaseModel):
    id: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: str
    medico: MedicoInfo

    class Config:
        orm_mode = True