from pydantic import BaseModel

class EspecialidadRead(BaseModel):
    id: int
    nombre: str

    model_config = {
        "from_attributes": True
    }
