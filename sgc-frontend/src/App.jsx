import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegistroPaciente from './pages/RegistroPaciente'
import Dashboard from './pages/Dashboard'
import CrearCuenta from './pages/CrearCuenta'
import ActualizarCuenta from './pages/ActualizarCuenta' // ← Nuevo
import GestionUsuarios from './pages/GestionUsuarios'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro-paciente" element={<RegistroPaciente />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/crear-cuenta" element={<CrearCuenta />} />
      <Route path="/dashboard/actualizar-cuenta" element={<ActualizarCuenta />} />
      <Route path="/dashboard/usuarios" element={<GestionUsuarios />} />
    </Routes>
  )
}

export default App
