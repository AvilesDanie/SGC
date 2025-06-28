from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, or_, select

from ...models.usuario.usuario import User, RoleEnum
from ...models.usuario.horario_laboral import HorarioLaboral
from ...models.cita.cita import Cita, EstadoCitaEnum

from ...schemas.cita.cita import CitaCreate, CitaRead, EstadoCita, EstadoCitaRequest

from ..websocket.websoket import notificar_actualizacion

from ...database import get_session
from datetime import date, time
from ...dependencies import get_current_user
from typing import List

router = APIRouter()

@router.get("/citas/medico/{medico_id}", response_model=List[CitaRead])
def obtener_citas_activas_por_medico(
    medico_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.medico, RoleEnum.administrativo]:
        raise HTTPException(status_code=403, detail="Acceso denegado, solo super admin, médico o administrativo pueden ver las citas.")

    hoy = date.today()

    citas = session.exec(
        select(Cita)
        .where(Cita.medico_id == medico_id)
        .where(Cita.fecha >= hoy)
        .where(Cita.estado.notin_([EstadoCita.terminado, EstadoCita.perdida]))
        .order_by(Cita.fecha, Cita.hora_inicio)
    ).all()

    return citas

@router.post("/citas")
async  def crear_cita(cita_data: CitaCreate, session: Session = Depends(get_session)):
    conflictos = session.exec(
        select(Cita).where(
            Cita.medico_id == cita_data.medico_id,
            Cita.fecha == cita_data.fecha,
            or_(
                Cita.hora_inicio == cita_data.hora_inicio,
                Cita.hora_fin == cita_data.hora_fin,
                (Cita.hora_inicio < cita_data.hora_inicio) & (Cita.hora_fin > cita_data.hora_inicio),
                (Cita.hora_inicio < cita_data.hora_fin) & (Cita.hora_fin > cita_data.hora_fin),
                (Cita.hora_inicio >= cita_data.hora_inicio) & (Cita.hora_fin <= cita_data.hora_fin),
            )
        )
    ).first()

    if conflictos:
        raise HTTPException(status_code=400, detail="El médico ya tiene una cita en ese horario.")

    dia_nombre = cita_data.fecha.strftime("%A").lower()
    dias_map = {
        "monday": "lunes", "tuesday": "martes", "wednesday": "miércoles",
        "thursday": "jueves", "friday": "viernes", "saturday": "sábado", "sunday": "domingo"
    }
    dia_local = dias_map[dia_nombre]

    horario = session.exec(
        select(HorarioLaboral).where(
            HorarioLaboral.user_id == cita_data.medico_id,
            HorarioLaboral.dia == dia_local
        )
    ).first()

    if not horario:
        raise HTTPException(status_code=400, detail="El médico no tiene horario ese día.")

    def str_to_time(val):
        return time.fromisoformat(val) if isinstance(val, str) else val

    cita_inicio = str_to_time(cita_data.hora_inicio)
    cita_fin = str_to_time(cita_data.hora_fin)
    horario_inicio = str_to_time(horario.hora_inicio)
    horario_fin = str_to_time(horario.hora_fin)

    if not (horario_inicio <= cita_inicio < horario_fin and horario_inicio < cita_fin <= horario_fin):
        raise HTTPException(status_code=400, detail="La cita está fuera del horario laboral del médico.")

    nueva_cita = Cita.from_orm(cita_data)
    session.add(nueva_cita)
    session.commit()
    session.refresh(nueva_cita)
    await notificar_actualizacion()

    return {"message": "Cita creada exitosamente", "cita_id": nueva_cita.id}

@router.get("/citas/hoy", response_model=List[Cita])
def obtener_citas_hoy(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [
        RoleEnum.super_admin,
        RoleEnum.medico,
        RoleEnum.administrativo,
        RoleEnum.enfermero
    ]:
        raise HTTPException(status_code=403, detail="Acceso denegado, solo super admin, médico, administrativo o enfermero pueden ver las citas de hoy.")

    hoy = date.today()

    citas = session.exec(
        select(Cita).where(Cita.fecha == hoy)
    ).all()

    return citas

@router.put("/citas/{cita_id}/para-signos")
async def marcar_cita_para_signos(
    cita_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.administrativo:
        raise HTTPException(status_code=403, detail="Acceso denegado, solo administrativo puede marcar para signos.")

    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    cita.estado = EstadoCitaEnum.para_signos
    session.add(cita)
    session.commit()
    await notificar_actualizacion()

    return {"message": "Cita actualizada a 'para signos' correctamente."}

@router.put("/citas/{cita_id}/estado")
async def cambiar_estado_cita(
    cita_id: int,
    data: EstadoCitaRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    if current_user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo médicos pueden actualizar el estado.")

    cita.estado = data.estado
    session.add(cita)
    session.commit()

    await notificar_actualizacion()

    return {"message": "Estado actualizado"}

@router.get("/citas/{cita_id}", response_model=CitaRead)
def obtener_cita_por_id(
    cita_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.medico, RoleEnum.administrativo, RoleEnum.super_admin]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar la cita.")

    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    return cita

