from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...models.usuario.usuario import User

from ...schemas.usuario.usuario import PasswordChangeRequest, UsernameChangeRequest

from ...auth import get_password_hash, verify_password
from ...database import get_session
from ...dependencies import get_current_user

router = APIRouter()


@router.put("/update-username")
def update_username(
    data: UsernameChangeRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not verify_password(data.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    if data.nuevo_username != current_user.username:
        if session.exec(select(User).where(User.username == data.nuevo_username)).first():
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso.")

    current_user.username = data.nuevo_username

    session.add(current_user)
    session.commit()

    return {"message": "Nombre de usuario actualizado exitosamente."}

@router.put("/update-password")
def update_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if not verify_password(data.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    if " " in data.nueva_password:
        raise HTTPException(status_code=400, detail="La contraseña no puede contener espacios.")

    current_user.hashed_password = get_password_hash(data.nueva_password)

    session.add(current_user)
    session.commit()

    return {"message": "Contraseña actualizada exitosamente."}


