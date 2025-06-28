import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../components/Sidebar'

function ActualizarCuenta() {
  const [role, setRole] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [usernameForm, setUsernameForm] = useState({
    nuevo_username: '',
    password_actual: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    password_actual: '',
    nueva_password: ''
  })

  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedRole = localStorage.getItem('role')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setRole(storedRole || '')
    setLoading(false)
  }, [navigate])

  const handleUsernameChange = (e) => {
    const { name, value } = e.target
    setUsernameForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  const submitUsernameChange = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const { nuevo_username, password_actual } = usernameForm
    if (!nuevo_username.trim() || !password_actual.trim()) {
      setError('Todos los campos son obligatorios.')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.put('http://localhost:8000/update-username', {
        nuevo_username,
        password_actual
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      localStorage.clear()
      window.location.replace('/login')
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Error al actualizar.')
      } else {
        setError('Error al actualizar. Intenta nuevamente.')
      }
    }
  }

  const submitPasswordChange = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const { password_actual, nueva_password } = passwordForm
    if (!password_actual.trim() || !nueva_password.trim()) {
      setError('Todos los campos son obligatorios.')
      return
    }

    if (/\s/.test(nueva_password)) {
      setError('La contraseña no puede contener espacios.')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.put('http://localhost:8000/update-password', {
        password_actual,
        nueva_password
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      localStorage.clear()
      window.location.replace('/login')
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Error al actualizar.')
      } else {
        setError('Error al actualizar. Intenta nuevamente.')
      }
    }
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />

      <div className="flex-1 ml-64 flex flex-col items-center justify-center space-y-4">
        {mensaje && <p className="text-green-600 mb-2">{mensaje}</p>}
        {error && <p className="text-red-500 mb-2">{error}</p>}

        <button
          onClick={() => setShowUsernameModal(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Cambiar nombre de usuario
        </button>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Cambiar contraseña
        </button>

        {/* Modal cambiar username */}
        {showUsernameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Cambiar nombre de usuario</h3>
              <form onSubmit={submitUsernameChange} className="space-y-4">
                <div>
                  <label htmlFor="nuevo_username" className="block text-gray-700">Nuevo nombre de usuario</label>
                  <input
                    type="text"
                    name="nuevo_username"
                    value={usernameForm.nuevo_username}
                    onChange={handleUsernameChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="username_password_actual" className="block text-gray-700">Contraseña actual</label>
                  <input
                    type="password"
                    name="password_actual"
                    value={usernameForm.password_actual}
                    onChange={handleUsernameChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowUsernameModal(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-teal-600 text-white px-4 py-2 rounded"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal cambiar contraseña */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Cambiar contraseña</h3>
              <form onSubmit={submitPasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="password_actual" className="block text-gray-700">Contraseña actual</label>
                  <input
                    type="password"
                    name="password_actual"
                    value={passwordForm.password_actual}
                    onChange={handlePasswordChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="nueva_password" className="block text-gray-700">Nueva contraseña</label>
                  <input
                    type="password"
                    name="nueva_password"
                    value={passwordForm.nueva_password}
                    onChange={handlePasswordChange}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-4 py-2 rounded"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActualizarCuenta
