import { Link } from 'react-router-dom'

const menusPorRol = {
  super_admin: [
    { to: '/dashboard/crear-cuenta', label: 'Crear Usuario' },
    { to: '/dashboard/usuarios', label: 'Gestión de Usuarios' },
  ],
  medico: [
    { to: '/dashboard/expedientes', label: 'Ver Expedientes' },
  ],
  enfermero: [
    { to: '/dashboard/signos-vitales', label: 'Registrar Signos Vitales' },
  ],
  paciente: [
    { to: '/dashboard/historial', label: 'Mi Historial' },
    { to: '/dashboard/recetas', label: 'Recetas Médicas' },
  ],
  farmacologo: [
    { to: '/dashboard/stock', label: 'Stock de Medicamentos' },
  ]
}

function Sidebar({ role }) {
  const menu = menusPorRol[role] || []

  return (
    <div className="fixed top-0 left-0 w-64 h-screen bg-blue-800 text-white p-4 overflow-y-auto shadow-md z-50">
      <h2 className="text-lg font-bold mb-4">Panel - {role}</h2>
      <nav className="flex flex-col space-y-2">
        {menu.map((item, i) => (
          <Link key={i} to={item.to} className="hover:bg-blue-600 p-2 rounded">
            {item.label}
          </Link>
        ))}

        <Link to="/dashboard/actualizar-cuenta" className="hover:bg-blue-600 p-2 rounded">
          Actualizar Cuenta
        </Link>

        <button
          onClick={() => {
            localStorage.clear()
            window.location.href = '/login'
          }}
          className="mt-4 bg-red-600 hover:bg-red-700 p-2 rounded text-sm"
        >
          Cerrar sesión
        </button>
      </nav>
    </div>
  )
}

export default Sidebar
