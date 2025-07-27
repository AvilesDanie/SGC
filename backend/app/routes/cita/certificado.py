from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from datetime import date

from ...database import get_session
from ...auth import get_current_user
from ...models.usuario.usuario import User, RoleEnum
from ...models.cita.cita import Cita
from ...models.cita.certificado import CertificadoMedico, CertificadoAsistencia
from ...schemas.cita.certificado import (
    CertificadoMedicoCreate, CertificadoMedicoRead,
    CertificadoAsistenciaCreate, CertificadoAsistenciaRead
)

router = APIRouter()


def only_medico(user: User):
    if user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo los médicos pueden generar certificados")


def can_view_certificado(user: User, cita: Cita):
    if user.role not in [RoleEnum.medico, RoleEnum.paciente]:
        raise HTTPException(status_code=403, detail="No autorizado")
    if user.role == RoleEnum.paciente and user.id != cita.paciente_id:
        raise HTTPException(status_code=403, detail="No puedes ver certificados ajenos")
    if user.role == RoleEnum.medico and user.id != cita.medico_id:
        raise HTTPException(status_code=403, detail="No puedes ver certificados de otros médicos")


# ---------------- Crear certificados ------------------

@router.post("/certificados/medico", response_model=CertificadoMedicoRead)
def crear_certificado_medico(
    data: CertificadoMedicoCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    only_medico(user)

    cita = session.get(Cita, data.cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    cert = CertificadoMedico(
        cita_id=data.cita_id,
        diagnostico=data.diagnostico,
        reposo_dias=data.reposo_dias,
        observaciones=data.observaciones,
        fecha_emision=date.today()
    )

    session.add(cert)
    session.commit()
    session.refresh(cert)

    return CertificadoMedicoRead(
        id=cert.id,
        diagnostico=cert.diagnostico,
        reposo_dias=cert.reposo_dias,
        fecha_emision=cert.fecha_emision,
        observaciones=cert.observaciones,
        paciente_nombre=f"{cita.medico.nombre} {cita.medico.apellido}",
        medico_nombre=f"{cita.medico.nombre} {cita.medico.apellido}",
        fecha_cita=cita.fecha,
        hora_inicio=cita.hora_inicio,
        hora_fin=cita.hora_fin
    )


@router.post("/certificados/asistencia", response_model=CertificadoAsistenciaRead)
def crear_certificado_asistencia(
    data: CertificadoAsistenciaCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    only_medico(user)

    cita = session.get(Cita, data.cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    cert = CertificadoAsistencia(
        cita_id=data.cita_id,
        fecha=cita.fecha,
        hora_entrada=data.hora_entrada or cita.hora_inicio,
        hora_salida=data.hora_salida or cita.hora_fin,
        motivo=data.motivo
    )

    session.add(cert)
    session.commit()
    session.refresh(cert)

    return CertificadoAsistenciaRead(
        id=cert.id,
        fecha=cert.fecha,
        hora_entrada=cert.hora_entrada,
        hora_salida=cert.hora_salida,
        motivo=cert.motivo,
        paciente_nombre=f"{cita.medico.nombre} {cita.medico.apellido}",
        medico_nombre=f"{cita.medico.nombre} {cita.medico.apellido}",
        fecha_cita=cita.fecha
    )


# ---------------- Obtener certificados ------------------

@router.get("/certificados/medico/{cita_id}", response_model=CertificadoMedicoRead)
def ver_certificado_medico(
    cita_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    cert = session.exec(select(CertificadoMedico).where(CertificadoMedico.cita_id == cita_id)).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    cita = session.exec(
        select(Cita)
        .where(Cita.id == cita_id)
        .options(selectinload(Cita.medico), selectinload(Cita.paciente))
    ).first()
    can_view_certificado(user, cita)

    return CertificadoMedicoRead(
        id=cert.id,
        diagnostico=cert.diagnostico,
        reposo_dias=cert.reposo_dias,
        fecha_emision=cert.fecha_emision,
        observaciones=cert.observaciones,
        paciente_nombre=f"{cita.paciente.nombre} {cita.paciente.apellido}",
        medico_nombre=f"{cita.medico.nombre} {cita.medico.apellido}",
        fecha_cita=cita.fecha,
        hora_inicio=cita.hora_inicio,
        hora_fin=cita.hora_fin
    )


@router.get("/certificados/asistencia/{cita_id}", response_model=CertificadoAsistenciaRead)
def ver_certificado_asistencia(
    cita_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    cert = session.exec(select(CertificadoAsistencia).where(CertificadoAsistencia.cita_id == cita_id)).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    cita = session.exec(
        select(Cita)
        .where(Cita.id == cita_id)
        .options(selectinload(Cita.medico), selectinload(Cita.paciente))
    ).first()
    can_view_certificado(user, cita)

    return CertificadoAsistenciaRead(
        id=cert.id,
        fecha=cert.fecha,
        hora_entrada=cert.hora_entrada,
        hora_salida=cert.hora_salida,
        motivo=cert.motivo,
        paciente_nombre=f"{cita.paciente.nombre} {cita.paciente.apellido}",
        medico_nombre=f"{cita.medico.nombre} {cita.medico.apellido}",
        fecha_cita=cita.fecha
    )
