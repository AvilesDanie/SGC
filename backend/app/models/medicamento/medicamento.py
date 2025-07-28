from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
from datetime import date


class FormaFarmaceuticaEnum(str, Enum):
    tableta = "Tableta"
    capsula = "Cápsula"
    jarabe = "Jarabe"
    inyeccion = "Inyección"
    crema = "Crema"
    pomada = "Pomada"
    suspension = "Suspensión"
    gotas = "Gotas"
    aerosol = "Aerosol"


class UnidadPresentacionEnum(str, Enum):
    caja = "Caja"
    frasco = "Frasco"
    blíster = "Blíster"
    tubo = "Tubo"
    ampolla = "Ampolla"
    sobre = "Sobre"


class Medicamento(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    nombre: str = Field(index=True, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    concentracion: Optional[str] = Field(default=None, max_length=100)

    forma_farmaceutica: Optional[FormaFarmaceuticaEnum] = None
    unidad_presentacion: Optional[UnidadPresentacionEnum] = None

    stock: int = Field(default=0, ge=0)
    fecha_vencimiento: Optional[date] = None
    laboratorio: Optional[str] = Field(default=None, max_length=100)
    precio_unitario: Optional[float] = Field(default=0.0, ge=0.0)

    is_activo: bool = Field(default=True)
