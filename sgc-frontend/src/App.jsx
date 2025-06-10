import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegistroPaciente from './pages/RegistroPaciente'
import Dashboard from './pages/Dashboard'
import CrearCuenta from './pages/CrearCuenta'
import ActualizarCuenta from './pages/ActualizarCuenta'
import GestionUsuarios from './pages/GestionUsuarios'
import GenerarTurno from './pages/GenerarTurno'
import ValidarAsistencia from './pages/ValidarAsistencia'
import SignosVitales from './pages/SignosVitales'
import PrivateRoute from './components/PrivateRoute'
import Expedientes from './pages/Expedientes'
import EditarExpediente from './pages/EditarExpediente'
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/crear-cuenta"
        element={
          <PrivateRoute>
            <CrearCuenta />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/actualizar-cuenta"
        element={
          <PrivateRoute>
            <ActualizarCuenta />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/usuarios"
        element={
          <PrivateRoute>
            <GestionUsuarios />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/registro"
        element={
          <PrivateRoute>
            <RegistroPaciente />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/turno"
        element={
          <PrivateRoute>
            <GenerarTurno />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/asistencia"
        element={
          <PrivateRoute>
            <ValidarAsistencia />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/signosvitales"
        element={
          <PrivateRoute>
            <SignosVitales />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/expedientes"
        element={
          <PrivateRoute>
            <Expedientes />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/expediente/:id"
        element={
          <PrivateRoute>
            <EditarExpediente />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
