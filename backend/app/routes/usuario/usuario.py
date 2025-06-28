from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, delete, select

from ...models.usuario.usuario import User, RoleEnum
from ...models.usuario.horario_laboral import HorarioLaboral
from ...models.usuario.especialidad import Especialidad

from ...schemas.usuario.usuario import ExtendedUserCreate, PasswordChangeRequest, Token, UserRead, UserUpdate, UsernameChangeRequest
from ...schemas.usuario.horario_laboral import HorarioItem

from ...auth import get_password_hash, authenticate_user, create_access_token, get_current_user_optional, verify_password
from ...database import get_session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from ...dependencies import get_current_user
from typing import List, Optional
import re
from sqlalchemy.orm import joinedload

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




@router.get("/usuarios/paciente/{cedula}", response_model=UserRead)
def obtener_paciente_por_cedula(cedula: str, session: Session = Depends(get_session)):
    paciente = session.exec(
        select(User).where(
            User.cedula == cedula,
            User.role == RoleEnum.paciente
        )
    ).first()

    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    return paciente

@router.get("/pacientes/{paciente_id}", response_model=UserRead)
def obtener_paciente_por_id(
    paciente_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.medico, RoleEnum.enfermero, RoleEnum.administrativo, RoleEnum.farmacologo]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar pacientes.")

    paciente = session.exec(
        select(User).where(User.id == paciente_id, User.role == RoleEnum.paciente)
    ).first()

    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    return paciente






@router.get("/medicos/{medico_id}", response_model=UserRead)
def obtener_medico_por_id(
    medico_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.administrativo, RoleEnum.enfermero, RoleEnum.farmacologo, RoleEnum.medico]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar médicos.")

    medico = session.exec(
        select(User).where(User.id == medico_id, User.role == RoleEnum.medico)
    ).first()

    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado.")

    return medico

