from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from typing import Optional, TYPE_CHECKING


if TYPE_CHECKING:
    from cita.cita import Cita



class SignosVitales(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cita_id: int = Field(foreign_key="cita.id")

    presion_arterial: str
    peso: float
    talla: float
    temperatura: float
    saturacion_oxigeno: float
    cita: Optional["Cita"] = Relationship(back_populates="signos_vitales")

