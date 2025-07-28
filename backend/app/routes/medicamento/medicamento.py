from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ...dependencies import require_role
from ...models.medicamento.receta import Receta
from ...models.usuario.usuario import User
from ...database import get_session
from ...models.medicamento.medicamento import Medicamento
from ...schemas.medicamento.medicamento import MedicamentoCreate, MedicamentoRead, MedicamentoUpdate
from ..websocket.gestor_medicamentos import gestor_medicamentos
from ..websocket.websoket import gestor_recetas

router = APIRouter()


@router.post("/medicamentos", response_model=MedicamentoRead)
async def crear_medicamento(med: MedicamentoCreate, session: Session = Depends(get_session)):
    nuevo = Medicamento(**med.dict())
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    await gestor_medicamentos.notificar_cambio("crear", {"id": nuevo.id})
    return nuevo



@router.get("/medicamentos", response_model=list[MedicamentoRead])
def listar_medicamentos(session: Session = Depends(get_session)):
    medicamentos = session.exec(select(Medicamento)).all()
    return medicamentos


@router.get("/medicamentos/{med_id}", response_model=MedicamentoRead)
def obtener_medicamento(med_id: int, session: Session = Depends(get_session)):
    med = session.get(Medicamento, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    return med


@router.put("/medicamentos/{med_id}", response_model=MedicamentoRead)
async def actualizar_medicamento(med_id: int, datos: MedicamentoUpdate, session: Session = Depends(get_session)):
    med = session.get(Medicamento, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="No encontrado")

    for campo, valor in datos.dict(exclude_unset=True).items():
        setattr(med, campo, valor)

    session.add(med)
    session.commit()
    session.refresh(med)
    await gestor_medicamentos.notificar_cambio("actualizar", {"id": med.id})
    return med


@router.delete("/medicamentos/{med_id}")
async def eliminar_medicamento(med_id: int, session: Session = Depends(get_session)):
    med = session.get(Medicamento, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="No encontrado")
    session.delete(med)
    session.commit()
    await gestor_medicamentos.notificar_cambio("eliminar", {"id": med_id})
    return {"ok": True}


@router.post("/recetas/{receta_id}/autorizar")
async def autorizar_entrega(
    receta_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role("farmacologo"))
):
    receta = session.get(Receta, receta_id)
    if not receta or receta.estado != "pendiente":
        raise HTTPException(status_code=400, detail="No se puede autorizar")

    for item in receta.medicamentos:
        medicamento = session.get(Medicamento, item.medicamento_id)
        if not medicamento or medicamento.stock <= 0:
            raise HTTPException(status_code=400, detail=f"{medicamento.nombre} sin stock")

        medicamento.stock -= 1
        session.add(medicamento)

    receta.estado = "entregada"
    receta.fecha_entrega = date.today()
    session.add(receta)
    session.commit()

    # Notificar por WebSocket
    await gestor_recetas.notificar("entregada", {"receta_id": receta.id})

    return {"ok": True}
