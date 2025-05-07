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


  return (
    <div className="flex h-screen">
      <Sidebar role={role} />

      <div className="flex-1 p-6 ml-64">
        <h1 className="text-2xl font-bold mb-4">Crear nueva cuenta</h1>
        {mensaje && <p className="text-green-600 mb-2">{mensaje}</p>}
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="cedula" placeholder="Cédula" value={form.cedula} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="apellido" placeholder="Apellido" value={form.apellido} onChange={handleChange} className="w-full border p-2 rounded" />
          <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="direccion" placeholder="Dirección" value={form.direccion} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} className="w-full border p-2 rounded" />

          <select name="role" value={form.role} onChange={handleRoleChange} className="w-full border p-2 rounded">
            {rolesDisponibles.map((r, i) => <option key={i} value={r}>{r}</option>)}
          </select>

          <input name="username" placeholder="Usuario" value={form.username} onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} className="w-full border p-2 rounded" />

          {form.role === 'medico' && (
            <>
              <label className="block">Especialidad:</label>
              <select onChange={handleEspecialidadChange} className="w-full border p-2 rounded">
                <option value="">Seleccionar especialidad</option>
                {especialidades.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                <option value="__otra__">Otra...</option>
              </select>
              {usarOtraEspecialidad && (
                <input
                  name="especialidad"
                  placeholder="Nueva especialidad"
                  value={form.especialidad}
                  onChange={handleChange}
                  className="w-full border p-2 rounded mt-2"
                />
              )}
            </>
          )}

          {form.role !== 'paciente' && (
            <>
              <h3 className="text-lg font-semibold mt-4 mb-2">Horario laboral</h3>
              {diasSemana.map((dia, i) => (
                <div key={i} className="flex items-center space-x-2 mb-2">
                  <label className="w-24 capitalize">{dia}</label>
                  <input type="time" onChange={(e) => updateHorario(dia, 'hora_inicio', e.target.value)} className="border p-1 rounded" />
                  <span>-</span>
                  <input type="time" onChange={(e) => updateHorario(dia, 'hora_fin', e.target.value)} className="border p-1 rounded" />
                </div>
              ))}
            </>
          )}

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Crear cuenta</button>
        </form>
      </div>
    </div>
  )
}

export default CrearCuenta
