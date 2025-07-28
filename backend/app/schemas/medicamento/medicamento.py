from pydantic import BaseModel
from typing import Optional
from datetime import date
from ...models.medicamento.medicamento import FormaFarmaceuticaEnum, UnidadPresentacionEnum


class MedicamentoBase(BaseModel):
    nombre: str
    descripcion: Optional[str]
    concentracion: Optional[str]
    forma_farmaceutica: Optional[FormaFarmaceuticaEnum]
    unidad_presentacion: Optional[UnidadPresentacionEnum]
    stock: int
    fecha_vencimiento: Optional[date]
    laboratorio: Optional[str]
    precio_unitario: Optional[float]
    is_activo: Optional[bool] = True


class MedicamentoCreate(MedicamentoBase):
    pass


class MedicamentoRead(MedicamentoBase):
    id: int

    class Config:
        orm_mode = True


class MedicamentoUpdate(BaseModel):
    nombre: Optional[str]
    descripcion: Optional[str]
    concentracion: Optional[str]
    forma_farmaceutica: Optional[FormaFarmaceuticaEnum]
    unidad_presentacion: Optional[UnidadPresentacionEnum]
    stock: Optional[int]
    fecha_vencimiento: Optional[date]
    laboratorio: Optional[str]
    precio_unitario: Optional[float]
    is_activo: Optional[bool]
