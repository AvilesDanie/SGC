from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, delete, or_, select
from models import Cita, Especialidad, EstadoCitaEnum, Expediente, HorarioLaboral, SignosVitales, User
from schemas import CitaCreate, CitaRead, CitaWithSignosRead, EstadoCita, EstadoCitaRequest, ExpedienteCreate, ExpedienteRead, ExtendedUserCreate, HorarioItem, SignosVitalesCreate, SignosVitalesRead, UserCreate, Token, UserRead, UserUpdate
from auth import get_password_hash, authenticate_user, create_access_token
from database import get_session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import date, timedelta
from dependencies import get_current_user
from fastapi import Security
from typing import List, Optional
from models import RoleEnum
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from fastapi import Header
import re
from sqlalchemy.orm import joinedload
from typing import List
from schemas import EspecialidadRead
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from models import User, HorarioLaboral, Especialidad, RoleEnum
from schemas import UserRead, HorarioItem
from dependencies import get_current_user
from sqlalchemy.orm import joinedload
from database import get_session
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, delete
from typing import Optional
from models import User, HorarioLaboral, Especialidad, RoleEnum
from schemas import ExtendedUserCreate
from dependencies import get_current_user
from auth import get_password_hash
from database import get_session
from datetime import time
from schemas import AccountUpdate  # importa el nuevo esquema
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

router = APIRouter()



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = "SECRET"
ALGORITHM = "HS256"

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




@router.post("/register")
def register_user(
    user: ExtendedUserCreate,
    session: Session = Depends(get_session),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    # Validar permisos de registro
    if current_user:
        if current_user["role"] == RoleEnum.administrativo:
            if user.role != RoleEnum.paciente:
                raise HTTPException(status_code=403, detail="Solo se puede registrar pacientes")
        else:
            if current_user["role"] != RoleEnum.super_admin:
                raise HTTPException(status_code=403, detail="Solo el super_admin puede crear este tipo de usuarios")
    
    
    
    # Validar si el usuario ya existe
    if session.exec(select(User).where(User.username == user.username)).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")

    # Validar cédula duplicada solo para pacientes
    if user.role == RoleEnum.paciente:
        cedula_duplicada = session.exec(
            select(User).where((User.cedula == user.cedula) & (User.role == RoleEnum.paciente))
        ).first()
        if cedula_duplicada:
            raise HTTPException(status_code=400, detail="Ya existe un paciente con esta cédula.")
    
    especialidad_id = None

    if user.role == RoleEnum.medico:
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
        especialidad_id = especialidad.id

    # Validaciones básicas
    if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", user.nombre):
        raise HTTPException(status_code=400, detail="El nombre contiene caracteres inválidos")
    if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", user.apellido):
        raise HTTPException(status_code=400, detail="El apellido contiene caracteres inválidos")
    if " " in user.password:
        raise HTTPException(status_code=400, detail="La contraseña no puede contener espacios.")

    if user.role != RoleEnum.paciente and (not user.horario or not any(h.hora_inicio and h.hora_fin for h in user.horario)):
        raise HTTPException(status_code=400, detail="El usuario debe tener al menos un horario laboral válido.")

    # Generar número de filiación si es paciente
    numero_filiacion = None
    if user.role == RoleEnum.paciente:
        count = len(session.exec(select(User).where(User.role == RoleEnum.paciente)).all())
        numero_filiacion = f"PAC-{count + 1:05d}"

    # Crear usuario
    try:
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

        session.add(nuevo_usuario)
        session.commit()
        session.refresh(nuevo_usuario)

        if user.role != RoleEnum.paciente and user.horario:
            for h in user.horario:
                horario = HorarioLaboral(
                    user_id=nuevo_usuario.id,
                    dia=h.dia,
                    hora_inicio=h.hora_inicio,
                    hora_fin=h.hora_fin
                )
                session.add(horario)
            session.commit()

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


@router.get("/especialidades", response_model=List[EspecialidadRead])
def obtener_especialidades(session: Session = Depends(get_session)):
    return session.exec(select(Especialidad)).all()





@router.put("/update-account")
def update_account(
    update_data: AccountUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if update_data.username != current_user.username:
        if session.exec(select(User).where(User.username == update_data.username)).first():
            raise HTTPException(status_code=400, detail="Nombre de usuario ya en uso.")

    current_user.username = update_data.username
    current_user.hashed_password = get_password_hash(update_data.password)

    session.add(current_user)
    session.commit()
    return {"message": "Cuenta actualizada exitosamente."}




@router.get("/usuarios", response_model=List[UserRead])
def listar_usuarios(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.super_admin:
        raise HTTPException(status_code=403, detail="Acceso denegado")

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

    datos_dict = datos.dict(exclude_unset=True)

    for field, value in datos_dict.items():
        if field in {"password", "especialidad", "horario"}:
            continue
        setattr(usuario, field, value)

    if datos.password and datos.password.strip():
        usuario.hashed_password = get_password_hash(datos.password)

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

    session.add(usuario)
    session.commit()

    if datos.role != RoleEnum.paciente and datos.horario is not None:
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

    # Eliminar horarios asociados si no hay cascada
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


@router.get("/usuarios/medicos/especialidad/{nombre_especialidad}", response_model=list[UserRead])
def obtener_medicos_por_especialidad(nombre_especialidad: str, session: Session = Depends(get_session)):
    especialidad = session.exec(
        select(Especialidad).where(Especialidad.nombre == nombre_especialidad)
    ).first()

    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada.")

    medicos = session.exec(
        select(User).where(
            User.role == RoleEnum.medico,
            User.especialidad_id == especialidad.id
        )
    ).all()

    if not medicos:
        raise HTTPException(status_code=404, detail="No hay médicos con esa especialidad.")

    return medicos


@router.get("/citas/medico/{medico_id}", response_model=List[CitaRead])
def obtener_citas_activas_por_medico(
    medico_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Validación de acceso por rol
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.medico, RoleEnum.administrativo]:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    hoy = date.today()

    citas = session.exec(
        select(Cita)
        .where(Cita.medico_id == medico_id)
        .where(Cita.fecha >= hoy)
        .where(Cita.estado.notin_([EstadoCita.terminado, EstadoCita.perdida]))
        .order_by(Cita.fecha, Cita.hora_inicio)
    ).all()

    return citas







@router.post("/citas")
async  def crear_cita(cita_data: CitaCreate, session: Session = Depends(get_session)):
    # Validar solapamiento
    conflictos = session.exec(
        select(Cita).where(
            Cita.medico_id == cita_data.medico_id,
            Cita.fecha == cita_data.fecha,
            or_(
                Cita.hora_inicio == cita_data.hora_inicio,
                Cita.hora_fin == cita_data.hora_fin,
                (Cita.hora_inicio < cita_data.hora_inicio) & (Cita.hora_fin > cita_data.hora_inicio),
                (Cita.hora_inicio < cita_data.hora_fin) & (Cita.hora_fin > cita_data.hora_fin),
                (Cita.hora_inicio >= cita_data.hora_inicio) & (Cita.hora_fin <= cita_data.hora_fin),
            )
        )
    ).first()

    if conflictos:
        raise HTTPException(status_code=400, detail="El médico ya tiene una cita en ese horario.")

    # Validar que esté dentro del horario laboral
    dia_nombre = cita_data.fecha.strftime("%A").lower()
    dias_map = {
        "monday": "lunes", "tuesday": "martes", "wednesday": "miércoles",
        "thursday": "jueves", "friday": "viernes", "saturday": "sábado", "sunday": "domingo"
    }
    dia_local = dias_map[dia_nombre]

    horario = session.exec(
        select(HorarioLaboral).where(
            HorarioLaboral.user_id == cita_data.medico_id,
            HorarioLaboral.dia == dia_local
        )
    ).first()

    if not horario:
        raise HTTPException(status_code=400, detail="El médico no tiene horario ese día.")

    def str_to_time(val):
        return time.fromisoformat(val) if isinstance(val, str) else val

    cita_inicio = str_to_time(cita_data.hora_inicio)
    cita_fin = str_to_time(cita_data.hora_fin)
    horario_inicio = str_to_time(horario.hora_inicio)
    horario_fin = str_to_time(horario.hora_fin)

    if not (horario_inicio <= cita_inicio < horario_fin and horario_inicio < cita_fin <= horario_fin):
        raise HTTPException(status_code=400, detail="La cita está fuera del horario laboral del médico.")

    nueva_cita = Cita.from_orm(cita_data)
    session.add(nueva_cita)
    session.commit()
    session.refresh(nueva_cita)
    # Notificar a todos los clientes
    await notificar_actualizacion()

    return {"message": "Cita creada exitosamente", "cita_id": nueva_cita.id}











@router.get("/citas/hoy", response_model=List[Cita])
def obtener_citas_hoy(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [
        RoleEnum.super_admin,
        RoleEnum.medico,
        RoleEnum.administrativo,
        RoleEnum.enfermero
    ]:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    hoy = date.today()

    citas = session.exec(
        select(Cita).where(Cita.fecha == hoy)
    ).all()

    return citas



@router.put("/citas/{cita_id}/para-signos")
async def marcar_cita_para_signos(
    cita_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.administrativo:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    cita.estado = EstadoCitaEnum.para_signos
    session.add(cita)
    session.commit()
    # Notificar a todos los clientes
    await notificar_actualizacion()

    return {"message": "Cita actualizada a 'para signos' correctamente."}




@router.get("/pacientes/{paciente_id}", response_model=UserRead)
def obtener_paciente_por_id(
    paciente_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Validar que el rol esté autorizado
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
    # Validar roles permitidos
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.administrativo, RoleEnum.enfermero, RoleEnum.farmacologo, RoleEnum.medico]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar médicos.")

    medico = session.exec(
        select(User).where(User.id == medico_id, User.role == RoleEnum.medico)
    ).first()

    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado.")

    return medico






@router.get("/medicos/{medico_id}/especialidad")
def obtener_especialidad_medico(
    medico_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Verificar permisos
    if current_user.role not in [RoleEnum.super_admin, RoleEnum.administrativo, RoleEnum.enfermero, RoleEnum.farmacologo, RoleEnum.medico]:
        raise HTTPException(status_code=403, detail="No autorizado.")

    medico = session.exec(
        select(User).where(User.id == medico_id, User.role == RoleEnum.medico)
    ).first()

    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado.")

    if not medico.especialidad:
        return {"especialidad": None}

    return {"especialidad": medico.especialidad.nombre}






















@router.post("/signos-vitales", response_model=SignosVitalesRead)
async  def crear_signos_vitales(signos: SignosVitalesCreate, session: Session = Depends(get_session)):
    # Verificar que la cita exista
    cita = session.get(Cita, signos.cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    # Crear los signos vitales
    nuevos_signos = SignosVitales(**signos.dict())
    session.add(nuevos_signos)

    # Cambiar el estado de la cita a "en_espera"
    cita.estado = EstadoCitaEnum.en_espera
    session.add(cita)

    session.commit()
    session.refresh(nuevos_signos)
    # Notificar a todos los clientes
    await notificar_actualizacion()
    return nuevos_signos




@router.get("/signos-vitales/cita/{cita_id}", response_model=CitaWithSignosRead)
def obtener_signos_vitales_por_cita(cita_id: int, session: Session = Depends(get_session)):
    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    # Consulta con join a signos vitales
    cita_completa = session.exec(
        select(Cita)
        .where(Cita.id == cita_id)
        .options(joinedload(Cita.signos_vitales))
    ).first()

    return cita_completa














# Conexiones activas
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/estado-citas")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Mantener la conexión abierta
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Función para notificar cambios
async def notificar_actualizacion():
    await manager.broadcast({"evento": "actualizacion_citas"})












@router.post("/expedientes", response_model=ExpedienteRead)
def crear_expediente(
    data: ExpedienteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo los médicos pueden registrar expedientes.")

    cita = session.get(Cita, data.cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")
    if cita.medico_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes registrar expediente de una cita ajena.")

    nuevo = Expediente(**data.dict())
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return nuevo


@router.get("/expedientes/paciente/{paciente_id}", response_model=List[ExpedienteRead])
def obtener_expedientes_por_paciente(
    paciente_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo médicos pueden consultar expedientes.")

    # Obtener todas las citas de este paciente y filtrar solo las del médico actual
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

    return expedientes


@router.put("/citas/{cita_id}/estado")
async def cambiar_estado_cita(
    cita_id: int,
    data: EstadoCitaRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    if current_user.role != RoleEnum.medico:
        raise HTTPException(status_code=403, detail="Solo médicos pueden actualizar el estado.")

    cita.estado = data.estado
    session.add(cita)
    session.commit()

    # 🔔 Notificar a los clientes conectados por WebSocket
    await notificar_actualizacion()

    return {"message": "Estado actualizado"}




@router.get("/citas/{cita_id}", response_model=CitaRead)
def obtener_cita_por_id(
    cita_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Permitir solo a médicos, admins o super admins acceder a esta info
    if current_user.role not in [RoleEnum.medico, RoleEnum.administrativo, RoleEnum.super_admin]:
        raise HTTPException(status_code=403, detail="No autorizado para consultar la cita.")

    cita = session.get(Cita, cita_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    return cita
