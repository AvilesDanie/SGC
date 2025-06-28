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
  const [errores, setErrores] = useState({})


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

    const error = validarCampo(name, value)
    setErrores(prev => ({ ...prev, [name]: error }))
  }


  const validarCedulaEcuatoriana = (cedula) => {
    if (!/^\d{10}$/.test(cedula)) return false
    const provincia = parseInt(cedula.substring(0, 2))
    const tercerDigito = parseInt(cedula[2])
    if (provincia < 1 || provincia > 24 || tercerDigito >= 6) return false
    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    let suma = 0
    for (let i = 0; i < 9; i++) {
      let val = parseInt(cedula[i]) * coef[i]
      if (val >= 10) val -= 9
      suma += val
    }
    const verificador = (10 - (suma % 10)) % 10
    return verificador === parseInt(cedula[9])
  }

  const validarCampo = (name, value, touched = true) => {
    const hoy = new Date()
    const fechaActual = hoy.toISOString().split('T')[0]

    switch (name) {
      case 'cedula':
        if (!value) return 'La cédula es obligatoria.'
        if (!/^\d{10}$/.test(value)) return 'Debe tener 10 dígitos.'
        if (!validarCedulaEcuatoriana(value)) return 'Cédula no válida en Ecuador.'
        return ''
      case 'nombre':
      case 'apellido':
        if (!value) return `El ${name} es obligatorio.`
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras y espacios.'
        return ''
      case 'telefono':
        if (!value) return 'El teléfono es obligatorio.'
        if (!/^09\d{8}$/.test(value)) return 'Debe comenzar con 09 y tener 10 dígitos.'
        return ''
      case 'direccion':
        if (!value) return 'La dirección es obligatoria.'
        return ''
      case 'fecha_nacimiento':
        if (!value && touched) return 'La fecha es obligatoria.'
        if (value > fechaActual) return 'No puede ser futura.'
        return ''
      default:
        return ''
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const nuevosErrores = {}
    Object.entries(form).forEach(([key, value]) => {
      const msg = validarCampo(key, value)
      if (msg) nuevosErrores[key] = msg
    })

    setErrores(nuevosErrores)

    if (Object.keys(nuevosErrores).length > 0) return

    try {
      const token = localStorage.getItem('token')


      const usuariosExistentes = await axios.get('http://localhost:8000/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const existeCedula = usuariosExistentes.data.some(u => u.cedula === form.cedula)
      const existeTelefono = usuariosExistentes.data.some(u => u.telefono === form.telefono)

      if (existeCedula) {
        setErrores(prev => ({ ...prev, cedula: 'Cédula ya registrada.' }))
        return
      }

      if (existeTelefono) {
        setErrores(prev => ({ ...prev, telefono: 'Teléfono ya registrado.' }))
        return
      }


      const payload = {
        username: form.cedula,
        password: form.cedula,
        nombre: form.nombre.toUpperCase(),
        apellido: form.apellido.toUpperCase(),
        direccion: form.direccion.toUpperCase(),
        telefono: form.telefono,
        cedula: form.cedula,
        fecha_nacimiento: form.fecha_nacimiento,
        role: 'paciente'
      }

      await axios.post('http://localhost:8000/register', payload, {
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
      setErrores({})
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
                { id: "nombre", label: "Nombres", placeholder: "Ej. Juan Pablo" },
                { id: "apellido", label: "Apellidos", placeholder: "Ej. Pérez Mendoza" },
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
                  {errores[field.id] && (
                    <span className="text-sm text-red-600 mt-1">{errores[field.id]}</span>
                  )}
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
