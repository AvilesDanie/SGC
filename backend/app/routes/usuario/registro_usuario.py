from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ...models.usuario.usuario import User

from ...schemas.usuario.usuario import ExtendedUserCreate

from ...auth import get_password_hash, get_current_user_optional
from ...database import get_session
from typing import Optional
from .validaciones import validate_permissions, check_existing_username, check_duplicate_cedula, validate_user_fields, handle_especialidad, generate_numero_filiacion, create_horarios

router = APIRouter()


@router.post("/register")
def register_user(
    user: ExtendedUserCreate,
    session: Session = Depends(get_session),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    validate_permissions(current_user, user)
    check_existing_username(session, user.username)
    check_duplicate_cedula(session, user)

    validate_user_fields(user)

    especialidad_id = handle_especialidad(session, user)

    numero_filiacion = generate_numero_filiacion(session, user)

    nuevo_usuario = User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        nombre=user.nombre,
        apellido=user.apellido,
        fecha_nacimiento=user.fecha_nacimiento,
        direccion=user.direccion,
        telefono=user.telefono,
        cedula=user.cedula,
        role=user.role,
        numero_filiacion=numero_filiacion,
        especialidad_id=especialidad_id,
        is_active=True
    )

    try:
        session.add(nuevo_usuario)
        session.commit()
        session.refresh(nuevo_usuario)

        create_horarios(session, nuevo_usuario, user)

        return {"msg": "Usuario creado exitosamente"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar el usuario: {str(e)}")



