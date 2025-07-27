from fastapi import APIRouter, HTTPException
from sqlmodel import Session, delete, select

from ...models.usuario.usuario import User, RoleEnum
from ...models.usuario.horario_laboral import HorarioLaboral
from ...models.usuario.especialidad import Especialidad

from ...schemas.usuario.usuario import UserUpdate

from ...auth import get_password_hash
import re

router = APIRouter()

def validate_permissions(current_user, user):
    if not current_user:
        return
    role = current_user["role"]
    if role == RoleEnum.administrativo and user.role != RoleEnum.paciente:
        raise HTTPException(status_code=403, detail="Solo se puede registrar pacientes")
    if role != RoleEnum.super_admin and role != RoleEnum.administrativo:
        raise HTTPException(status_code=403, detail="No autorizado a registrar usuarios")

def check_existing_username(session, username):
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")

def check_duplicate_cedula(session, user):
    if user.role != RoleEnum.paciente:
        return
    cedula_duplicada = session.exec(
        select(User).where(
            (User.cedula == user.cedula) & (User.role == RoleEnum.paciente)
        )
    ).first()
    if cedula_duplicada:
        raise HTTPException(status_code=400, detail="Ya existe un paciente con esta cédula.")

def validate_user_fields(user):
    if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", user.nombre):
        raise HTTPException(status_code=400, detail="El nombre contiene caracteres inválidos")
    if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", user.apellido):
        raise HTTPException(status_code=400, detail="El apellido contiene caracteres inválidos")
    if " " in user.password:
        raise HTTPException(status_code=400, detail="La contraseña no puede contener espacios.")
    if user.role != RoleEnum.paciente:
        if not user.horario or not any(h.hora_inicio and h.hora_fin for h in user.horario):
            raise HTTPException(status_code=400, detail="Debe tener al menos un horario laboral válido.")

def handle_especialidad(session, user):
    if user.role != RoleEnum.medico:
        return None
    if not user.especialidad:
        raise HTTPException(status_code=400, detail="La especialidad es obligatoria para médicos")

    especialidad = session.exec(
        select(Especialidad).where(Especialidad.nombre == user.especialidad)
    ).first()
    if not especialidad:
        especialidad = Especialidad(nombre=user.especialidad)
        session.add(especialidad)
        session.commit()
        session.refresh(especialidad)
    return especialidad.id

def generate_numero_filiacion(session, user):
    if user.role != RoleEnum.paciente:
        return None
    count = session.exec(select(User).where(User.role == RoleEnum.paciente)).count()
    return f"PAC-{count + 1:05d}"

def create_horarios(session, nuevo_usuario, user):
    if user.role == RoleEnum.paciente or not user.horario:
        return
    for h in user.horario:
        horario = HorarioLaboral(
            user_id=nuevo_usuario.id,
            dia=h.dia,
            hora_inicio=h.hora_inicio,
            hora_fin=h.hora_fin
        )
        session.add(horario)
    session.commit()

def actualizar_campos_basicos(usuario: User, datos: UserUpdate):
    datos_dict = datos.dict(exclude_unset=True)
    for field, value in datos_dict.items():
        if field not in {"password", "especialidad", "horario"}:
            setattr(usuario, field, value)


def manejar_password(usuario: User, datos: UserUpdate):
    if datos.password and datos.password.strip():
        usuario.hashed_password = get_password_hash(datos.password)


def manejar_especialidad(session: Session, usuario: User, datos: UserUpdate):
    if datos.role == RoleEnum.medico and datos.especialidad:
        especialidad = session.exec(
            select(Especialidad).where(Especialidad.nombre == datos.especialidad)
        ).first()
        if not especialidad:
            especialidad = Especialidad(nombre=datos.especialidad)
            session.add(especialidad)
            session.commit()
            session.refresh(especialidad)
        usuario.especialidad_id = especialidad.id
    else:
        usuario.especialidad_id = None


def manejar_horarios(session: Session, usuario: User, datos: UserUpdate):
    if datos.role == RoleEnum.paciente or datos.horario is None:
        return

    session.exec(delete(HorarioLaboral).where(HorarioLaboral.user_id == usuario.id))
    session.commit()

    for item in datos.horario:
        nuevo_horario = HorarioLaboral(
            user_id=usuario.id,
            dia=item.dia,
            hora_inicio=item.hora_inicio,
            hora_fin=item.hora_fin
        )
        session.add(nuevo_horario)
    session.commit()




