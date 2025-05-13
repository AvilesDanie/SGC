import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegistroPaciente from './pages/RegistroPaciente'
import Dashboard from './pages/Dashboard'
import CrearCuenta from './pages/CrearCuenta'
import ActualizarCuenta from './pages/ActualizarCuenta'
import GestionUsuarios from './pages/GestionUsuarios'
import GenerarTurno from './pages/GenerarTurno'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/crear-cuenta" element={<CrearCuenta />} />
      <Route path="/dashboard/actualizar-cuenta" element={<ActualizarCuenta />} />
      <Route path="/dashboard/usuarios" element={<GestionUsuarios />} />
      <Route path="/dashboard/registro" element={<RegistroPaciente />} />
      <Route path="/dashboard/turno" element={<GenerarTurno />} />
    </Routes>
  )
}

export default App
