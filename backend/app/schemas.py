from pydantic import BaseModel
from typing import List, Optional
from models import RoleEnum
from datetime import date
from pydantic import BaseModel
from pydantic import BaseModel
from datetime import date, time
from enum import Enum



# Horario base
class HorarioItem(BaseModel):
    dia: str
    hora_inicio: str
    hora_fin: str


# Crear usuario (registro)
class UserCreate(BaseModel):
    username: str
    password: str
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date]
    direccion: Optional[str]
    telefono: Optional[str]
    cedula: str
    role: RoleEnum


# Para uso extendido al registrar médicos u otros roles
class ExtendedUserCreate(UserCreate):
    especialidad: Optional[str] = None
    horario: Optional[List[HorarioItem]] = None


# Esquema para lectura (GET)
class UserRead(BaseModel):
    id: int
    username: str
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date]
    direccion: Optional[str]
    telefono: Optional[str]
    cedula: str
    numero_filiacion: Optional[str]
    role: RoleEnum
    is_active: bool
    especialidad_nombre: Optional[str] = None
    horario: Optional[List[HorarioItem]] = []

    model_config = {
        "from_attributes": True
    }


# Esquema para edición
class UserUpdate(BaseModel):
    username: Optional[str]
    password: Optional[str]
    nombre: Optional[str]
    apellido: Optional[str]
    fecha_nacimiento: Optional[date]
    direccion: Optional[str]
    telefono: Optional[str]
    cedula: Optional[str]
    role: Optional[RoleEnum]
    especialidad: Optional[str]
    horario: Optional[List[HorarioItem]] = None


# Autenticación
class Token(BaseModel):
    access_token: str
    token_type: str




class EspecialidadRead(BaseModel):
    id: int
    nombre: str

    model_config = {
        "from_attributes": True
    }


class AccountUpdate(BaseModel):
    username: str
    password: str































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