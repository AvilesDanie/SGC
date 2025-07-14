from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, delete, select

from ...models.usuario.usuario import User, RoleEnum
from ...models.usuario.horario_laboral import HorarioLaboral
from ...schemas.usuario.usuario import UserRead, UserUpdate
from ...schemas.usuario.horario_laboral import HorarioItem

from ...database import get_session
from ...dependencies import get_current_user
from typing import List
from sqlalchemy.orm import joinedload
from .validaciones import actualizar_campos_basicos, manejar_password, manejar_especialidad, manejar_horarios

router = APIRouter()



@router.get("/usuarios", response_model=List[UserRead])
def listar_usuarios(
    session: Session = Depends(get_session),
):
    
    usuarios = session.exec(
        select(User).where(User.is_active == True).options(joinedload(User.especialidad))
    ).all()

    usuarios_read = []

    for u in usuarios:
        horarios = []
        if u.role != RoleEnum.paciente:
            horarios_db = session.exec(
                select(HorarioLaboral).where(HorarioLaboral.user_id == u.id)
            ).all()
            horarios = [
                HorarioItem(dia=h.dia, hora_inicio=h.hora_inicio, hora_fin=h.hora_fin)
                for h in horarios_db
            ]

        usuarios_read.append(UserRead(
            id=u.id,
            username=u.username,
            nombre=u.nombre,
            apellido=u.apellido,
            fecha_nacimiento=u.fecha_nacimiento,
            direccion=u.direccion,
            telefono=u.telefono,
            cedula=u.cedula,
            numero_filiacion=u.numero_filiacion,
            role=u.role,
            is_active=u.is_active,
            especialidad_nombre=u.especialidad.nombre if u.especialidad else None,
            horario=horarios
        ))

    return usuarios_read



@router.put("/usuarios/{user_id}")
def editar_usuario(
    user_id: int,
    datos: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.super_admin:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    usuario = session.get(User, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    actualizar_campos_basicos(usuario, datos)
    manejar_password(usuario, datos)
    manejar_especialidad(session, usuario, datos)
    session.add(usuario)
    session.commit()
    manejar_horarios(session, usuario, datos)

    return {"message": "Usuario actualizado exitosamente"}





@router.delete("/usuarios/{user_id}")
def eliminar_usuario(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.super_admin:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    usuario = session.get(User, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    session.exec(delete(HorarioLaboral).where(HorarioLaboral.user_id == user_id))
    session.commit()

    usuario.is_active = False
    session.add(usuario)
    session.commit()
    return {"message": "Usuario desactivado correctamente"}

