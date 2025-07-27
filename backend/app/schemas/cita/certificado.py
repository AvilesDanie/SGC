from pydantic import BaseModel
from datetime import date, time
from typing import Optional


# -------- Certificado Médico --------

class CertificadoMedicoCreate(BaseModel):
    cita_id: int
    diagnostico: str
    reposo_dias: int
    observaciones: Optional[str] = None


class CertificadoMedicoRead(BaseModel):
    id: int
    diagnostico: str
    reposo_dias: int
    fecha_emision: date
    observaciones: Optional[str]
    
    paciente_nombre: str
    medico_nombre: str
    fecha_cita: date
    hora_inicio: time
    hora_fin: time

    class Config:
        from_attributes = True


# -------- Certificado de Asistencia --------

class CertificadoAsistenciaCreate(BaseModel):
    cita_id: int
    motivo: Optional[str] = None
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None

class CertificadoAsistenciaRead(BaseModel):
    id: int
    fecha: date
    hora_entrada: time
    hora_salida: time
    motivo: Optional[str]

    paciente_nombre: str
    medico_nombre: str
    fecha_cita: date

    class Config:
        from_attributes = True
