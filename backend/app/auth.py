from fastapi import Depends, Header, HTTPException
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from .models.usuario.usuario import User
from sqlmodel import Session, select
import os
from dotenv import load_dotenv
from jose import jwt, JWTError
from .utils.security import verify_password
from .database import get_session 



load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def authenticate_user(session: Session, username: str, password: str):
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user

def get_current_user_optional(authorization: str = Header(default=None)):
    if authorization is None:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "username": payload.get("sub"),
            "role": payload.get("role")
        }
    except (JWTError, ValueError):
        return None




def get_current_user(
    authorization: str = Header(...),
    session: Session = Depends(get_session)
) -> User:
    # Validar que el header exista y sea Bearer
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autorización requerido")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Formato de autorización inválido")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        username: str = payload.get("sub")
        role: str = payload.get("role")

        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Token inválido")

    except (JWTError, ValueError) as e:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    user = session.exec(select(User).where(User.username == username)).first()
    print("current_user.role repr:", repr(user.role))
    print("current_user.role type:", type(user.role))

    print(f"Usuario autenticado: {user.username}, Rol: {user.role}")
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no autorizado")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario inactivo")

    return user
