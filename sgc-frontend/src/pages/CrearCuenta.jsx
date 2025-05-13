import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'


const rolesDisponibles = [
  'medico',
  'enfermero',
  'administrativo',
  'farmacologo',
  'paciente',
  'super_admin'
]

const diasSemana = [
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'
]

function CrearCuenta() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    direccion: '',
    telefono: '',
    cedula: '',
    role: 'medico',
    especialidad: '',
    horario: []
  })
  const [role, setRole] = useState('')
  const [especialidades, setEspecialidades] = useState([])
  const [usarOtraEspecialidad, setUsarOtraEspecialidad] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const role = localStorage.getItem('role')
    setRole(role || '')

    if (role !== 'super_admin') {
      navigate('/dashboard')
    }

    axios.get('http://localhost:8000/especialidades')
      .then(res => setEspecialidades(res.data))
      .catch(() => setEspecialidades([]))
  }, [])


  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (e) => {
    const role = e.target.value
    setForm({
      username: '',
      password: '',
      nombre: '',
      apellido: '',
      fecha_nacimiento: '',
      direccion: '',
      telefono: '',
      cedula: '',
      role,
      especialidad: '',
      horario: []
    })
    setUsarOtraEspecialidad(false)

    setError('')
    setMensaje('')
  }

  const handleEspecialidadChange = (e) => {
    const value = e.target.value
    if (value === '__otra__') {
      setUsarOtraEspecialidad(true)
      setForm(prev => ({ ...prev, especialidad: '' }))
    } else {
      setUsarOtraEspecialidad(false)
      setForm(prev => ({ ...prev, especialidad: value }))
    }
  }

  const updateHorario = (dia, campo, valor) => {
    setForm((prev) => {
      const existente = prev.horario.find(h => h.dia === dia)
      let nuevoHorario
      if (existente) {
        nuevoHorario = prev.horario.map(h =>
          h.dia === dia ? { ...h, [campo]: valor } : h
        )
      } else {
        nuevoHorario = [...prev.horario, { dia, [campo]: valor }]
      }
      return { ...prev, horario: nuevoHorario }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    // Validar campos obligatorios
    const { cedula, nombre, apellido, fecha_nacimiento, direccion, telefono, username, password } = form

    if (!cedula || !nombre || !apellido || !fecha_nacimiento || !direccion || !telefono || !username || !password) {
      setError('Todos los campos son obligatorios.')
      return
    }

    // Validar cédula ecuatoriana
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

    if (!validarCedulaEcuatoriana(cedula)) {
      setError('La cédula ingresada no es válida en Ecuador.')
      return
    }

    // Validar nombre y apellido
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
      setError('El nombre no puede contener caracteres especiales ni números.')
      return
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
      setError('El apellido no puede contener caracteres especiales ni números.')
      return
    }

    // Validar fecha de nacimiento
    const fechaActual = new Date().toISOString().split('T')[0]
    if (fecha_nacimiento > fechaActual) {
      setError('La fecha de nacimiento no puede ser futura.')
      return
    }

    // Validar edad mínima (22 años) para roles distintos a paciente
    if (form.role !== 'paciente') {
      const hoy = new Date()
      const nacimiento = new Date(fecha_nacimiento)
      const edad = hoy.getFullYear() - nacimiento.getFullYear()
      const mesDiferencia = hoy.getMonth() - nacimiento.getMonth()
      const diaDiferencia = hoy.getDate() - nacimiento.getDate()
      const edadFinal = mesDiferencia < 0 || (mesDiferencia === 0 && diaDiferencia < 0) ? edad - 1 : edad

      if (edadFinal < 22) {
        setError('Los usuarios con rol distinto a paciente deben tener al menos 22 años.')
        return
      }
    }


    // Validar teléfono
    if (!/^09\d{8}$/.test(telefono)) {
      setError('El teléfono debe iniciar con 09 y tener exactamente 10 dígitos.')
      return
    }

    // Validar username y password sin espacios
    if (/\s/.test(username)) {
      setError('El nombre de usuario no debe contener espacios.')
      return
    }
    if (/\s/.test(password)) {
      setError('La contraseña no debe contener espacios.')
      return
    }

    // Validaciones específicas para médico
    if (form.role === 'medico') {
      if (!form.especialidad.trim()) {
        setError('Debe ingresar una especialidad.')
        return
      }

      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.especialidad)) {
        setError('La especialidad no puede contener caracteres especiales ni números.')
        return
      }

      const horariosValidos = form.horario.filter(
        h => h.hora_inicio && h.hora_fin && h.hora_inicio < h.hora_fin
      )
      if (horariosValidos.length === 0) {
        setError('El médico debe tener al menos un día con horario válido.')
        return
      }
    }

    // Enviar solicitud
    try {
      const token = localStorage.getItem('token')

      const payload = {
        username: form.username,
        password: form.password,
        nombre: form.nombre,
        apellido: form.apellido,
        fecha_nacimiento: form.fecha_nacimiento,
        direccion: form.direccion,
        telefono: form.telefono,
        cedula: form.cedula,
        role: form.role
      }

      if (form.role === 'medico') {
        payload.especialidad = form.especialidad
      }

      if (form.role !== 'paciente') {
        payload.horario = form.horario
      }

      await axios.post('http://localhost:8000/register', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMensaje('Usuario creado exitosamente.')
      setForm({
        username: '',
        password: '',
        nombre: '',
        apellido: '',
        fecha_nacimiento: '',
        direccion: '',
        telefono: '',
        cedula: '',
        role: form.role,
        especialidad: '',
        horario: []
      })
      // o reinicia todo
    } catch (err) {
      setError('Error al crear el usuario. Verifica los datos.')
    }
  }

  const [modalVisible, setModalVisible] = useState(false)
  const [modalContent, setModalContent] = useState({ tipo: '', mensaje: '' })

  useEffect(() => {
    if (mensaje) {
      setModalContent({ tipo: 'success', mensaje })
      setModalVisible(true)
    }
    if (error) {
      setModalContent({ tipo: 'error', mensaje: error })
      setModalVisible(true)
    }
  }, [mensaje, error])

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />

      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="bg-white shadow-xl rounded-xl p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-teal-800 mb-6 text-center">Crear nueva cuenta</h1>



          <form onSubmit={handleSubmit} className="space-y-8">
            {/* === DATOS PERSONALES === */}
            <div>
              <h2 className="text-lg font-semibold text-teal-700 mb-4">Datos personales</h2>
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
                    <label htmlFor={field.id} className="text-gray-700 font-medium mb-1">
                      {field.label}
                    </label>
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
            </div>

            {/* === CREDENCIALES Y ROL === */}
            <div>
              <h2 className="text-lg font-semibold text-teal-700 mb-4">Rol y credenciales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label htmlFor="role" className="text-gray-700 font-medium mb-1">Rol</label>
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleRoleChange}
                    className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {rolesDisponibles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label htmlFor="username" className="text-gray-700 font-medium mb-1">Usuario</label>
                  <input
                    id="username"
                    name="username"
                    placeholder="Ej. juanperez"
                    value={form.username}
                    onChange={handleChange}
                    className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="password" className="text-gray-700 font-medium mb-1">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Ej. ********"
                    value={form.password}
                    onChange={handleChange}
                    className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>
            </div>

            {/* Especialidad */}
            {form.role === 'medico' && (
              <>
              <h2 className="text-lg font-semibold text-teal-700 mb-4">Especialidad</h2>

                <select onChange={handleEspecialidadChange} className="input">
                  <option value="">Seleccionar especialidad</option>
                  {especialidades.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                  <option value="__otra__">Otra...</option>
                </select>
                {usarOtraEspecialidad && (
                  <input name="especialidad" placeholder="Nueva especialidad" value={form.especialidad} onChange={handleChange} className="input" />
                )}
              </>
            )}

            {/* Horarios */}
            {form.role !== 'paciente' && (
              <>
                <h3 className="text-lg font-semibold mt-6 text-teal-700">Horario laboral</h3>
                {diasSemana.map((dia, i) => (
                  <div key={i} className="flex items-center space-x-2 mb-2">
                    <label className="w-24 capitalize text-gray-600">{dia}</label>
                    <input type="time" onChange={(e) => updateHorario(dia, 'hora_inicio', e.target.value)} className="input-time" />
                    <span>-</span>
                    <input type="time" onChange={(e) => updateHorario(dia, 'hora_fin', e.target.value)} className="input-time" />
                  </div>
                ))}
              </>
            )}

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg transition duration-200">
              Crear cuenta
            </button>
          </form>
        </div>
      </div>


      {/* Mensajes de estado */}
      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className={`text-xl font-bold mb-2 ${modalContent.tipo === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {modalContent.tipo === 'error' ? 'Error' : 'Éxito'}
            </h3>
            <p className="text-gray-700 mb-4">{modalContent.mensaje}</p>
            <div className="text-right">
              <button
                onClick={() => setModalVisible(false)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


    </div>


  )
}

export default CrearCuenta
