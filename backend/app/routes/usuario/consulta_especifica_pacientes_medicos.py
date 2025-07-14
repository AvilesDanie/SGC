from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...models.usuario.usuario import User, RoleEnum

from ...schemas.usuario.usuario import UserRead

from ...database import get_session
from ...dependencies import get_current_user

router = APIRouter()



@router.get("/usuarios/paciente/{cedula}", response_model=UserRead)
def obtener_paciente_por_cedula(cedula: str, session: Session = Depends(get_session)):
    paciente = session.exec(
        select(User).where(
            User.cedula == cedula,
            User.role == RoleEnum.paciente
        )
    ).first()

    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    return paciente

@router.get("/pacientes/{paciente_id}", response_model=UserRead)
def obtener_paciente_por_id(
    paciente_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.medico, RoleEnum.enfermero, RoleEnum.administrativo, RoleEnum.farmacologo]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar pacientes.")

    paciente = session.exec(
        select(User).where(User.id == paciente_id, User.role == RoleEnum.paciente)
    ).first()

    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    return paciente






@router.get("/medicos/{medico_id}", response_model=UserRead)
def obtener_medico_por_id(
    medico_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.administrativo, RoleEnum.enfermero, RoleEnum.farmacologo, RoleEnum.medico]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar médicos.")

    medico = session.exec(
        select(User).where(User.id == medico_id, User.role == RoleEnum.medico)
    ).first()

    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado.")

    return medico

