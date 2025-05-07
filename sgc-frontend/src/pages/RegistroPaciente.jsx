import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function RegistroPaciente() {
  const [form, setForm] = useState({ username: '', password: '', full_name: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:8000/register', {
        ...form,
        role: 'paciente'
      })
      navigate('/login')
    } catch (err) {
      setError('No se pudo crear la cuenta')
    }
  }

  return (
    <div className="h-screen flex justify-center items-center bg-green-50">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Registro de Paciente</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input name="username" placeholder="Usuario" onChange={handleChange} className="w-full border p-2 mb-3 rounded" />
        <input name="full_name" placeholder="Nombre completo" onChange={handleChange} className="w-full border p-2 mb-3 rounded" />
        <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} className="w-full border p-2 mb-4 rounded" />
        <button className="bg-green-500 hover:bg-green-600 text-white w-full py-2 rounded">Registrarse</button>
      </form>
    </div>
  )
}

export default RegistroPaciente
