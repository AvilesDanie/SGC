from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...models.cita.cita import Cita, EstadoCitaEnum
from ...models.signos.signos_vitales import SignosVitales

from ...schemas.cita.cita import CitaWithSignosRead
from ...schemas.signos.signos_vitales import SignosVitalesCreate, SignosVitalesRead

from ..websocket.websoket import notificar_actualizacion

from ...database import get_session
from sqlalchemy.orm import joinedload

router = APIRouter()

@router.post("/signos-vitales", response_model=SignosVitalesRead)
async  def crear_signos_vitales(signos: SignosVitalesCreate, session: Session = Depends(get_session)):
    cita = session.get(Cita, signos.cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    nuevos_signos = SignosVitales(**signos.dict())
    session.add(nuevos_signos)

    cita.estado = EstadoCitaEnum.en_espera
    session.add(cita)

    session.commit()
    session.refresh(nuevos_signos)
    await notificar_actualizacion()
    return nuevos_signos




@router.get("/signos-vitales/cita/{cita_id}", response_model=CitaWithSignosRead)
def obtener_signos_vitales_por_cita(cita_id: int, session: Session = Depends(get_session)):
    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    cita_completa = session.exec(
        select(Cita)
        .where(Cita.id == cita_id)
        .options(joinedload(Cita.signos_vitales))
    ).first()

    return cita_completa


