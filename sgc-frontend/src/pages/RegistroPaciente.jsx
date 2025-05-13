import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

function RegistroPaciente() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    direccion: '',
    telefono: '',
    cedula: ''
  })

  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [role, setRole] = useState('')

  useEffect(() => {
    const role = localStorage.getItem('role')
    setRole(role || '')
    if (!role || (role !== 'super_admin' && role !== 'administrativo')) {
      navigate('/dashboard')
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const validarCedulaEcuatoriana = (cedula) => {
    if (!/^\d{10}$/.test(cedula)) return false
    const provincia = parseInt(cedula.substring(0, 2))
    const tercerDigito = parseInt(cedula[2])
    if (provincia < 1 || provincia > 24 || tercerDigito >= 6) return false
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    let suma = 0
    for (let i = 0; i < 9; i++) {
      let val = parseInt(cedula[i]) * coeficientes[i]
      if (val >= 10) val -= 9
      suma += val
    }
    const digitoVerificador = (10 - (suma % 10)) % 10
    return digitoVerificador === parseInt(cedula[9])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const { cedula, nombre, apellido, fecha_nacimiento, direccion, telefono } = form

    if (!cedula || !nombre || !apellido || !fecha_nacimiento || !direccion || !telefono) {
      setError('Todos los campos son obligatorios.')
      return
    }

    if (!validarCedulaEcuatoriana(cedula)) {
      setError('La cédula ingresada no es válida en Ecuador.')
      return
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
      setError('El nombre no puede contener caracteres especiales ni números.')
      return
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
      setError('El apellido no puede contener caracteres especiales ni números.')
      return
    }

    const fechaActual = new Date().toISOString().split('T')[0]
    if (fecha_nacimiento > fechaActual) {
      setError('La fecha de nacimiento no puede ser futura.')
      return
    }

    if (!/^09\d{8}$/.test(telefono)) {
      setError('El teléfono debe iniciar con 09 y tener exactamente 10 dígitos.')
      return
    }

    try {
      const token = localStorage.getItem('token')

      await axios.post('http://localhost:8000/register', {
        username: cedula,
        password: cedula,
        nombre,
        apellido,
        fecha_nacimiento,
        direccion,
        telefono,
        cedula,
        role: 'paciente'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMensaje('Paciente registrado exitosamente.')
      setForm({
        nombre: '',
        apellido: '',
        fecha_nacimiento: '',
        direccion: '',
        telefono: '',
        cedula: ''
      })
    } catch (err) {
      setError('Error al registrar el paciente.')
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />

      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="bg-white shadow-xl rounded-xl p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-teal-800 mb-6 text-center">Registro de Paciente</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: "cedula", label: "Cédula", placeholder: "Ej. 1712345678" },
                { id: "nombre", label: "Nombre", placeholder: "Ej. Juan" },
                { id: "apellido", label: "Apellido", placeholder: "Ej. Pérez" },
                { id: "telefono", label: "Teléfono", placeholder: "Ej. 0991234567" },
                { id: "direccion", label: "Dirección", placeholder: "Ej. Av. Siempre Viva 123" },
                { id: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date", placeholder: "" }
              ].map((field) => (
                <div key={field.id} className="flex flex-col">
                  <label htmlFor={field.id} className="text-gray-700 font-medium mb-1">{field.label}</label>
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={form[field.id]}
                    onChange={handleChange}
                    className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              ))}
            </div>

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg transition duration-200">
              Registrar paciente
            </button>

            {(mensaje || error) && (
              <div className={`mt-4 p-4 rounded ${mensaje ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {mensaje || error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegistroPaciente
