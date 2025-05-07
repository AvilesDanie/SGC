import { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar' // asegúrate de que la ruta es correcta

function ActualizarCuenta() {
  const [role, setRole] = useState('')
  const [form, setForm] = useState({
    username: '',
    password: ''
  })

  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const storedRole = localStorage.getItem('role')
    setRole(storedRole || '')
  }, [])

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
      window.location.href = '/login'

    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Nombre de usuario en uso.')
      } else {
        setError('Error al actualizar. Intenta nuevamente.')
      }
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar role={role} />

      <div className="flex-1 p-6 ml-64">
        <h2 className="text-2xl font-bold mb-4">Actualizar cuenta</h2>
        {mensaje && <p className="text-green-600 mb-2">{mensaje}</p>}
        {error && <p className="text-red-500 mb-2">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="username"
            placeholder="Nuevo nombre de usuario"
            value={form.username}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
          <input
            type="password"
            name="password"
            placeholder="Nueva contraseña"
            value={form.password}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Guardar cambios
          </button>
        </form>
      </div>
    </div>
  )
}

export default ActualizarCuenta
