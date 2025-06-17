import { Link } from 'react-router-dom'
import logo from '../assets/logo sgc.png'

const menusPorRol = {
  super_admin: [
    { to: '/dashboard/crear-cuenta', label: 'Crear Usuario' },
    { to: '/dashboard/usuarios', label: 'Gestión de Usuarios' },
  ],
  medico: [
    { to: '/dashboard/expedientes', label: 'Ver Expedientes' },
  ],
  enfermero: [
    { to: '/dashboard/signosvitales', label: 'Registrar Signos Vitales' },
  ],
  paciente: [
    { to: '/dashboard/historial', label: 'Mi Historial' },
    { to: '/dashboard/recetas', label: 'Recetas Médicas' },
  ],
  farmacologo: [
    { to: '/dashboard/stock', label: 'Stock de Medicamentos' },
  ],
  administrativo: [
    { to: '/dashboard/registro', label: 'Registro de Paciente' },
    { to: '/dashboard/turno', label: 'Generar Turnos' },
    { to: '/dashboard/asistencia', label: 'Validar Asistencia' },
  ],
}

function Sidebar({ role }) {
  const menu = menusPorRol[role] || []

  return (
    <div className="fixed top-0 left-0 w-64 h-screen bg-teal-800 text-white flex flex-col justify-between shadow-lg z-50">
      {/* Encabezado con logo que redirige */}
      <div className="relative">
        <div className="bg-gradient-to-b from-black/90 to-transparent p-6">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90">
            <img src={logo} alt="Logo SGC" className="h-20 w-20" />
            <span className="text-4xl font-bold tracking-wide text-white">SGC</span>
          </Link>
          {/* Esto puede dar error*/}
          <h2 className="text-lg mt-4 font-semibold text-white">
            Panel - {role ? role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''}
          </h2>

        </div>
      </div>

      {/* Menú */}
      <div className="p-6 flex-1 overflow-y-auto">
        <nav className="flex flex-col space-y-2">
          {menu.map((item, i) => (
            <Link key={i} to={item.to} className="hover:bg-teal-700 p-2 rounded">
              {item.label}
            </Link>
          ))}

          <Link to="/dashboard/actualizar-cuenta" className="hover:bg-teal-700 p-2 rounded">
            Actualizar Cuenta
          </Link>
        </nav>
      </div>

      {/* Cerrar sesión */}
      <div className="p-6 border-t border-teal-700">
        <button
          onClick={() => {
            localStorage.clear()
            window.location.replace('/login')
          }}
          className="w-full bg-red-600 hover:bg-red-700 p-2 rounded text-sm font-semibold"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default Sidebar
