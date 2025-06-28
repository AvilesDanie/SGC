from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .usuario import User

class HorarioLaboral(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    dia: str
    hora_inicio: str
    hora_fin: str

    usuario: Optional["User"] = Relationship(back_populates="horario")
