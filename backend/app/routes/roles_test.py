from fastapi import APIRouter, Depends
from dependencies import require_role

router = APIRouter()

@router.get("/medico/expedientes")
def medico_area(user=Depends(require_role("medico"))):
    return {"msg": f"Dr. {user.full_name}, acceso concedido al módulo de expedientes."}

@router.get("/enfermeria/signos-vitales")
def enfermeria_area(user=Depends(require_role("enfermero"))):
    return {"msg": f"{user.full_name}, acceso concedido al módulo de enfermería."}

@router.get("/admin/gestionar-usuarios")
def admin_area(user=Depends(require_role("administrativo"))):
    return {"msg": f"{user.full_name}, acceso concedido al módulo administrativo."}

@router.get("/farmacia/stock")
def farmacia_area(user=Depends(require_role("farmacologo"))):
    return {"msg": f"{user.full_name}, acceso concedido al módulo de farmacia."}

@router.get("/paciente/mi-historial")
def paciente_area(user=Depends(require_role("paciente"))):
    return {"msg": f"{user.full_name}, acceso concedido al historial del paciente."}
