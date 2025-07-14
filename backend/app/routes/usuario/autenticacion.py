from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ...schemas.usuario.usuario import Token

from ...auth import authenticate_user, create_access_token
from ...database import get_session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from ...dependencies import get_current_user

router = APIRouter()




@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas o usuario inactivo")
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=30)
    )
    return {"access_token": access_token, "token_type": "bearer"}



@router.get("/me")
def get_current_logged_user(user=Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "cedula": user.cedula,
        "fecha_nacimiento": user.fecha_nacimiento,
        "direccion": user.direccion,
        "telefono": user.telefono,
        "numero_filiacion": user.numero_filiacion,
        "role": user.role,
        "especialidad_id": user.especialidad_id,
        "is_active": user.is_active
    }
