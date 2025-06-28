from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from ...models.usuario.usuario import RoleEnum
from .horario_laboral import HorarioItem



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


class ExtendedUserCreate(UserCreate):
    especialidad: Optional[str] = None
    horario: Optional[List[HorarioItem]] = None


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


class Token(BaseModel):
    access_token: str
    token_type: str


class UsernameChangeRequest(BaseModel):
    nuevo_username: str
    password_actual: str

class PasswordChangeRequest(BaseModel):
    password_actual: str
    nueva_password: str