from sqlmodel import SQLModel, create_engine, Session, select
from .models.usuario.usuario import User, RoleEnum
from .auth import get_password_hash
from datetime import date
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        existing = session.exec(select(User).where(User.role == RoleEnum.super_admin)).first()
        if not existing:
            admin = User(
                username="admin",
                hashed_password=get_password_hash("admin"),
                role=RoleEnum.super_admin,
                cedula="0102030405",
                nombre="Admin",
                apellido="Principal",
                fecha_nacimiento=date(1980, 1, 1),
                direccion="Dirección central",
                telefono="0999999999",
                numero_filiacion="ADM001",
                is_active=True
            )
            session.add(admin)
            session.commit()
