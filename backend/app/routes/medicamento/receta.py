from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import date

from app.models.cita.cita import Cita
from app.auth import get_current_user
from app.models.usuario.usuario import User, RoleEnum
from app.models.medicamento.medicamento import Medicamento
from app.models.medicamento.receta import Receta, RecetaMedicamento
from app.schemas.medicamento.receta import RecetaCreate, RecetaRead, RecetaMedicamentoRead
from ...auth import get_current_user
from ...database import get_session
import re
import json
router = APIRouter()

def calcular_total_dosis(dosis: str, frecuencia: str, duracion: str) -> int:
    """
    Estima el número total de unidades necesarias para un medicamento
    según la dosis, frecuencia y duración.
    """

    # Paso 1: convertir dosis a float
    try:
        dosis_float = float(re.findall(r"[\d\.]+", dosis)[0])
    except:
        dosis_float = 1.0  # default si falla el parseo

    # Paso 2: determinar tomas por día según frecuencia
    frecuencia = frecuencia.lower()
    if "cada" in frecuencia and "hora" in frecuencia:
        horas = int(re.findall(r"\d+", frecuencia)[0])
        tomas_por_dia = 24 // horas
    elif "vez" in frecuencia or "veces" in frecuencia:
        tomas_por_dia = int(re.findall(r"\d+", frecuencia)[0])
    else:
        tomas_por_dia = 3  # valor por defecto conservador

    # Paso 3: días de duración
    try:
        dias = int(re.findall(r"\d+", duracion)[0])
    except:
        dias = 3  # por defecto 3 días si no se puede leer

    # Total = dosis * tomas por día * días
    total = dosis_float * tomas_por_dia * dias

    # Redondear hacia arriba para asegurar cantidad suficiente
    return int(round(total + 0.5))


@router.post("/recetas", response_model=RecetaRead)
def crear_receta(data: RecetaCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    cita = session.get(Cita, data.cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.medico_id != user.id:
        raise HTTPException(status_code=403, detail="No autorizado para emitir receta en esta cita")

    receta = Receta(
        cita_id=cita.id,
        observaciones=data.observaciones or ''
    )

    session.add(receta)
    session.commit()
    session.refresh(receta)

    for m in data.medicamentos:
        medicamento = session.get(Medicamento, m.medicamento_id)
        if not medicamento:
            continue
        receta_med = RecetaMedicamento(
            receta_id=receta.id,
            medicamento_id=medicamento.id,
            dosis=m.dosis,
            frecuencia=m.frecuencia,
            duracion=m.duracion,
            indicaciones=m.indicaciones
        )
        session.add(receta_med)

    session.commit()
    return obtener_receta(receta.id, session, user)



@router.get("/recetas/pendientes", response_model=List[RecetaRead])
def recetas_pendientes(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    recetas = session.exec(
        select(Receta).where(Receta.estado.in_(["pendiente", "parcial"]))
    ).all()

    resultado = []

    for receta in recetas:
        cita = session.get(Cita, receta.cita_id)
        if not cita:
            continue
        paciente = session.get(User, cita.paciente_id)
        medico = session.get(User, cita.medico_id)

        # 🟡 Obtener medicamentos ya entregados desde observaciones
        entregados = set()
        try:
            observaciones_data = json.loads(receta.observaciones or '{}')
            entregados = set(observaciones_data.get('entregados', []))
        except json.JSONDecodeError:
            pass

        detalles = []
        for item in receta.medicamentos:
            medicamento = session.get(Medicamento, item.medicamento_id)
            detalles.append(RecetaMedicamentoRead(
                medicamento_id=item.medicamento_id,
                dosis=item.dosis,
                frecuencia=item.frecuencia,
                duracion=item.duracion,
                indicaciones=item.indicaciones,
                medicamento_nombre=medicamento.nombre,
                disponible=medicamento.stock > 0,
                stock=medicamento.stock,
                entregado=item.medicamento_id in entregados  # ✅ Marca si ya fue entregado
            ))

        resultado.append(RecetaRead(
            id=receta.id,
            fecha_emision=receta.fecha_emision,
            observaciones=receta.observaciones,
            paciente_nombre=f"{paciente.nombre} {paciente.apellido}",
            medico_nombre=f"{medico.nombre} {medico.apellido}",
            fecha_cita=cita.fecha,
            medicamentos=detalles
        ))

    return resultado





@router.get("/recetas/{receta_id}", response_model=RecetaRead)
def obtener_receta(receta_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    receta = session.get(Receta, receta_id)
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    cita = session.get(Cita, receta.cita_id)
    if not cita or (user.id not in [cita.paciente_id, cita.medico_id] and user.role != RoleEnum.super_admin):
        raise HTTPException(status_code=403, detail="No autorizado para ver esta receta")

    paciente = session.get(User, cita.paciente_id)
    medico = session.get(User, cita.medico_id)

    detalles = []
    for item in receta.medicamentos:
        medicamento = session.get(Medicamento, item.medicamento_id)
        detalles.append(RecetaMedicamentoRead(
            medicamento_id=item.medicamento_id,
            dosis=item.dosis,
            frecuencia=item.frecuencia,
            duracion=item.duracion,
            indicaciones=item.indicaciones,
            medicamento_nombre=medicamento.nombre,
            disponible=medicamento.stock > 0,
            stock=medicamento.stock
        ))

    return RecetaRead(
        id=receta.id,
        fecha_emision=receta.fecha_emision,
        observaciones=receta.observaciones,
        paciente_nombre=f"{paciente.nombre} {paciente.apellido}",
        medico_nombre=f"{medico.nombre} {medico.apellido}",
        fecha_cita=cita.fecha,
        medicamentos=detalles
    )


@router.get("/recetas/cita/{cita_id}", response_model=RecetaRead)
def obtener_receta_por_cita(cita_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    receta = session.exec(select(Receta).where(Receta.cita_id == cita_id)).first()
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    return obtener_receta(receta.id, session, user)




@router.post("/recetas/{receta_id}/autorizar")
def autorizar_entrega_total(
    receta_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    receta = session.get(Receta, receta_id)
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    for item in receta.medicamentos:
        medicamento = session.get(Medicamento, item.medicamento_id)
        cantidad = calcular_total_dosis(item.dosis, item.frecuencia, item.duracion)
        medicamento.stock = max(0, medicamento.stock - cantidad)
        session.add(medicamento)

    receta.estado = "entregada"
    receta.fecha_entrega = date.today()

    session.add(receta)
    session.commit()
    return {"message": "Receta entregada completamente"}





@router.post("/recetas/{receta_id}/autorizar-parcial")
def autorizar_entrega_parcial(
    receta_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    entregados = set(data.get("entregados", []))
    receta = session.get(Receta, receta_id)
    if not receta:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    # Leer lista actual de entregados desde observaciones
    entregados_previos = set()
    try:
        nota = json.loads(receta.observaciones or "{}")
        entregados_previos = set(nota.get("entregados", []))
    except json.JSONDecodeError:
        nota = {}

    # Filtrar los nuevos a entregar
    nuevos_entregados = entregados - entregados_previos

    if not nuevos_entregados:
        return {"message": "No hay nuevos medicamentos por entregar."}

    for item in receta.medicamentos:
        if item.medicamento_id in nuevos_entregados:
            medicamento = session.get(Medicamento, item.medicamento_id)
            cantidad = calcular_total_dosis(item.dosis, item.frecuencia, item.duracion)
            medicamento.stock = max(0, medicamento.stock - cantidad)
            session.add(medicamento)

    # Guardar combinación de anteriores + nuevos entregados
    nota["entregados"] = list(entregados_previos.union(nuevos_entregados))
    receta.observaciones = json.dumps(nota)

    # Cambiar estado
    ids_totales = {item.medicamento_id for item in receta.medicamentos}
    if set(nota["entregados"]) == ids_totales:
        receta.estado = "entregada"
        receta.fecha_entrega = date.today()
    else:
        receta.estado = "parcial"

    session.add(receta)
    session.commit()

    return {"message": "Entrega parcial registrada"}
