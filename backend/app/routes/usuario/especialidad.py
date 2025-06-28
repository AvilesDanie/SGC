from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...models.usuario.usuario import User, RoleEnum
from ...models.usuario.especialidad import Especialidad

from ...schemas.usuario.usuario import UserRead
from ...schemas.usuario.especialidad import EspecialidadRead

from ...database import get_session
from ...dependencies import get_current_user
from typing import List

router = APIRouter()

@router.get("/especialidades", response_model=List[EspecialidadRead])
def obtener_especialidades(session: Session = Depends(get_session)):
    stmt = (
        select(Especialidad)
        .join(Especialidad.medicos)
        .where(User.role == RoleEnum.medico, User.is_active == True)
        .distinct()
    )
    return session.exec(stmt).all()



@router.get("/usuarios/medicos/especialidad/{nombre_especialidad}", response_model=list[UserRead])
def obtener_medicos_por_especialidad(nombre_especialidad: str, session: Session = Depends(get_session)):
    especialidad = session.exec(
        select(Especialidad).where(Especialidad.nombre == nombre_especialidad)
    ).first()

    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada.")

    medicos = session.exec(
        select(User).where(
            User.role == RoleEnum.medico,
            User.especialidad_id == especialidad.id
        )
    ).all()

    if not medicos:
        raise HTTPException(status_code=404, detail="No hay médicos con esa especialidad.")

    return medicos


@router.get("/medicos/{medico_id}/especialidad")
def obtener_especialidad_medico(
    medico_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.administrativo, RoleEnum.enfermero, RoleEnum.farmacologo, RoleEnum.medico]:
        raise HTTPException(status_code=403, detail="No autorizado.")

    medico = session.exec(
        select(User).where(User.id == medico_id, User.role == RoleEnum.medico)
    ).first()

    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado.")

    if not medico.especialidad:
        return {"especialidad": None}

    return {"especialidad": medico.especialidad.nombre}


