from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from ...models.usuario.usuario import User, RoleEnum
from ...models.cita.cita import Cita
from ...models.expediente.expediente import Expediente

from ...schemas.expediente.expediente import ExpedienteRead

from ...database import get_session
from ...dependencies import get_current_user
from typing import List, Optional
from fastapi import UploadFile, File, Form
import os
from uuid import uuid4

router = APIRouter()

@router.post("/expedientes", response_model=ExpedienteRead)
def crear_expediente(
    cita_id: int = Form(...),
    contenido: str = Form(...),
    archivo: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo los médicos pueden registrar expedientes.")

    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")
    if cita.medico_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes registrar expediente de una cita ajena.")

    expediente = Expediente(
        cita_id=cita_id,
        contenido=contenido
    )

    session.add(expediente)
    session.commit()
    session.refresh(expediente)

    archivo_url = None

    if archivo:
        base_path = f"./media/expedientes/paciente_{cita.paciente_id}/medico_{cita.medico_id}/cita_{cita.id}"
        os.makedirs(base_path, exist_ok=True)

        file_name = f"expediente_{expediente.id}_{uuid4().hex}.pdf"
        file_location = os.path.join(base_path, file_name)

        with open(file_location, "wb") as f:
            f.write(archivo.file.read())

        expediente.archivo_path = file_location
        session.add(expediente)
        session.commit()
        session.refresh(expediente)

        relative_path = os.path.relpath(file_location, "media")
        archivo_url = f"/media/{relative_path.replace(os.sep, '/')}"
    
    return ExpedienteRead(
        id=expediente.id,
        cita_id=expediente.cita_id,
        contenido=expediente.contenido,
        fecha=expediente.fecha,
        archivo_url=archivo_url
    )


@router.get("/expedientes/paciente/{paciente_id}", response_model=List[ExpedienteRead])
def obtener_expedientes_por_paciente(
    paciente_id: int,
    request: Request,
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

    expediente_list = []
    for e in expedientes:
        if e.archivo_path:
            relative_path = os.path.relpath(e.archivo_path, "media")
            archivo_url = str(request.base_url) + f"media/{relative_path.replace(os.sep, '/')}"
        else:
            archivo_url = None

        expediente_list.append(
            ExpedienteRead(
                id=e.id,
                cita_id=e.cita_id,
                contenido=e.contenido,
                fecha=e.fecha,
                archivo_url=archivo_url
            )
        )

    return expediente_list
