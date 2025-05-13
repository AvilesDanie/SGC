from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import date, time
import enum
from enum import Enum

class RoleEnum(str, enum.Enum):
    super_admin = "super_admin"
    medico = "medico"
    enfermero = "enfermero"
    administrativo = "administrativo"
    farmacologo = "farmacologo"
    paciente = "paciente"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    username: str = Field(index=True, unique=True)
    hashed_password: str
    
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date]
    direccion: Optional[str]
    telefono: Optional[str]
    cedula: str = Field(index=True)  # la validación por rol debe hacerse a nivel de lógica, no aquí
    numero_filiacion: Optional[str] = Field(default=None, index=True, unique=True)
    
    role: RoleEnum
    is_active: bool = True

    especialidad_id: Optional[int] = Field(default=None, foreign_key="especialidad.id")
    especialidad: Optional["Especialidad"] = Relationship(back_populates="medicos")
    
    horario: List["HorarioLaboral"] = Relationship(back_populates="usuario")


class Especialidad(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True, unique=True)
    medicos: List["User"] = Relationship(back_populates="especialidad")


class HorarioLaboral(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    dia: str
    hora_inicio: str
    hora_fin: str

    usuario: Optional["User"] = Relationship(back_populates="horario")













# Enum para estado de la cita
class EstadoCitaEnum(str, Enum):
    agendado = "agendado"
    para_signos = "para signos"
    en_espera = "en espera"
    en_consulta = "en consulta"
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
