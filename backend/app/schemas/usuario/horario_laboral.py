from pydantic import BaseModel

class HorarioItem(BaseModel):
    dia: str
    hora_inicio: str
    hora_fin: str
