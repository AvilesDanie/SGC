import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from '../components/Sidebar'

function ActualizarCuenta() {
  const [role, setRole] = useState('')
  const [form, setForm] = useState({
    username: '',
    password: ''
  })
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true) // 👈 loader de validación
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')

    const { username, password } = form

    if (!username.trim() || !password.trim()) {
      setError('Todos los campos son obligatorios.')
      return
    }

    if (/\s/.test(username) || /\s/.test(password)) {
      setError('El nombre de usuario y la contraseña no deben contener espacios.')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.put('http://localhost:8000/update-account', {
        username,
        password
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      localStorage.clear()
      window.location.replace('/login') // 👈 navegación limpia tras cambio

    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Nombre de usuario en uso.')
      } else {
        setError('Error al actualizar. Intenta nuevamente.')
      }
    }
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />

      <div className="flex-1 ml-64 flex items-center justify-center">
        <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold text-teal-800 mb-6 text-center">
            Actualizar cuenta
          </h2>

          {mensaje && <p className="text-green-600 mb-4 text-center">{mensaje}</p>}
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Nuevo nombre de usuario</label>
              <input
                type="text"
                name="username"
                placeholder="ej. usuario123"
                value={form.username}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Nueva contraseña</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg transition duration-200"
            >
              Guardar cambios
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ActualizarCuenta
