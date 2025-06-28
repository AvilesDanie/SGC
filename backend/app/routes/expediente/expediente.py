from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...models.usuario.usuario import User, RoleEnum
from ...models.cita.cita import Cita
from ...models.expediente.expediente import Expediente

from ...schemas.expediente.expediente import ExpedienteCreate, ExpedienteRead

from ...database import get_session
from ...dependencies import get_current_user
from typing import List

router = APIRouter()

@router.post("/expedientes", response_model=ExpedienteRead)
def crear_expediente(
    data: ExpedienteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo los médicos pueden registrar expedientes.")

    cita = session.get(Cita, data.cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")
    if cita.medico_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes registrar expediente de una cita ajena.")

    nuevo = Expediente(**data.dict())
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return nuevo


@router.get("/expedientes/paciente/{paciente_id}", response_model=List[ExpedienteRead])
def obtener_expedientes_por_paciente(
    paciente_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo médicos pueden consultar expedientes.")

    citas = session.exec(
        select(Cita).where(
            Cita.paciente_id == paciente_id,
            Cita.medico_id == current_user.id
        )
    ).all()

    cita_ids = [c.id for c in citas]
    expedientes = session.exec(
        select(Expediente).where(Expediente.cita_id.in_(cita_ids)).order_by(Expediente.fecha)
    ).all()

    return expedientes
