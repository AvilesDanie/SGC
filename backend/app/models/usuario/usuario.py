from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional, TYPE_CHECKING
from datetime import date
from enum import Enum

if TYPE_CHECKING:
    from .especialidad import Especialidad
    from .horario_laboral import HorarioLaboral

class RoleEnum(str, Enum):
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
    cedula: str = Field(index=True)
    numero_filiacion: Optional[str] = Field(default=None, index=True, unique=True)

    role: RoleEnum
    is_active: bool = True

    especialidad_id: Optional[int] = Field(default=None, foreign_key="especialidad.id")
    especialidad: Optional["Especialidad"] = Relationship(back_populates="medicos")

    horario: List["HorarioLaboral"] = Relationship(back_populates="usuario")
