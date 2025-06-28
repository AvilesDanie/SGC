import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const rolesDisponibles = ['medico', 'enfermero', 'administrativo', 'farmacologo', 'paciente', 'super_admin']

const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

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

  const [errores, setErrores] = useState({})
  const [role, setRole] = useState('')
  const [especialidades, setEspecialidades] = useState([])
  const [usarOtraEspecialidad, setUsarOtraEspecialidad] = useState(false)
  const [mensajeGlobal, setMensajeGlobal] = useState('')
  const navigate = useNavigate()
  const [touched, setTouched] = useState({ fecha_nacimiento: true })
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem('role')
    setRole(role || '')
    if (role !== 'super_admin') navigate('/dashboard')

    axios.get('http://localhost:8000/especialidades')
      .then(res => setEspecialidades(res.data))
      .catch(() => setEspecialidades([]))
  }, [])


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

  function validarCedula(value) {
    if (!value) return 'La cédula es obligatoria.'
    if (!/^\d{10}$/.test(value)) return 'Debe tener 10 dígitos.'
    if (!validarCedulaEcuatoriana(value)) return 'Cédula no válida en Ecuador.'
    return ''
  }

  function validarNombreApellido(value, field) {
    if (!value) return `El ${field} es obligatorio.`
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras y espacios.'
    return ''
  }

  function validarTelefono(value) {
    if (!value) return 'El teléfono es obligatorio.'
    if (!/^09\d{8}$/.test(value)) return 'Debe comenzar con 09 y tener 10 dígitos.'
    return ''
  }

  function validarUsername(value) {
    if (!value) return 'Usuario obligatorio.'
    if (/\s/.test(value)) return 'Sin espacios.'
    if (value.length < 4) return 'Debe tener al menos 4 caracteres.'
    return ''
  }

  function validarPassword(value) {
    if (!value) return 'Contraseña obligatoria.'
    if (/\s/.test(value)) return 'Sin espacios.'
    if (value.length < 4) return 'Debe tener al menos 4 caracteres.'
    return ''
  }

  function validarFechaNacimiento(value, touched, role) {
    if (!value && touched) return 'La fecha es obligatoria.'

    const fechaActual = new Date().toISOString().split('T')[0]
    if (value > fechaActual) return 'No puede ser futura.'

    const nacimiento = new Date(value)
    const hoy = new Date()
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const m = hoy.getMonth() - nacimiento.getMonth()
    const d = hoy.getDate() - nacimiento.getDate()
    if (m < 0 || (m === 0 && d < 0)) edad--

    if (edad > 120) return 'Edad no puede ser mayor a 120 años.'
    if (role !== 'paciente' && edad < 22) return 'Edad no puede ser menor a 22 años.'
    return ''
  }


  function validarEspecialidad(value, role) {
    if (role === 'medico') {
      if (!value) return 'Especialidad obligatoria.'
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras.'
    }
    return ''
  }



  const validarCampo = (name, value) => {
    switch (name) {
      case 'cedula':
        return validarCedula(value)
      case 'nombre':
        return validarNombreApellido(value, 'nombre')
      case 'apellido':
        return validarNombreApellido(value, 'apellido')
      case 'fecha_nacimiento':
        return validarFechaNacimiento(value, touched.fecha_nacimiento, form.role)
      case 'telefono':
        return validarTelefono(value)
      case 'direccion':
        return value ? '' : 'La dirección es obligatoria.'
      case 'username':
        return validarUsername(value)
      case 'password':
        return validarPassword(value)
      case 'especialidad':
        return validarEspecialidad(value, form.role)
      default:
        return ''
    }
  }


  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))

    const error = validarCampo(name, value)
    setErrores(prev => ({ ...prev, [name]: error }))

    if (['cedula', 'telefono', 'username'].includes(name) && value.length >= 3) {
      const token = localStorage.getItem('token')

      if (!token) {
        console.warn('Token no disponible, no se puede validar duplicado')
        return
      }

      axios.get('http://localhost:8000/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const duplicado = res.data.find(u => u[name] === value)

          if (duplicado) {
            const mismoRolEsPaciente = form.role === 'paciente' || duplicado.role === 'paciente'
            const ambosSonPacientes = form.role === 'paciente' && duplicado.role === 'paciente'

            if (!mismoRolEsPaciente || ambosSonPacientes) {
              setErrores(prev => ({
                ...prev,
                [name]: `${name[0].toUpperCase() + name.slice(1)} ya está registrado para otro usuario.`
              }))
            }
          }
        })
        .catch(err => {
          console.error('Error validando duplicado:', err)
        })
    }

  }

  function validarFechaCambioRol(value, rol) {
    const hoy = new Date();
    const fechaActual = hoy.toISOString().split('T')[0];
    if (!value) return '';
    if (value > fechaActual) return 'No puede ser futura.';

    const nacimiento = new Date(value);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    const d = hoy.getDate() - nacimiento.getDate();
    if (m < 0 || (m === 0 && d < 0)) edad--;

    if (edad > 120) return 'Edad no puede ser mayor a 120 años.';
    if (rol !== 'paciente' && edad < 22) return 'Edad no puede ser menor a 22 años.';
    return '';
  }

  async function validarDuplicadosAlCambiarRol(form, nuevoRol) {
    const token = localStorage.getItem('token');
    const campos = ['cedula', 'telefono', 'username'];
    const nuevosErrores = {};

    if (!token) return nuevosErrores;

    try {
      const res = await axios.get('http://localhost:8000/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });

      for (const campo of campos) {
        const valor = form[campo];
        if (valor?.length >= 3) {
          nuevosErrores[campo] = obtenerErrorDuplicado(res.data, campo, valor, nuevoRol);
        }
      }
    } catch (err) {
      console.warn('Error validando duplicados al cambiar rol:', err);
    }

    return nuevosErrores;
  }

  function obtenerErrorDuplicado(usuarios, campo, valor, nuevoRol) {
    const duplicado = usuarios.find(u => u[campo] === valor);
    if (!duplicado) return '';

    const unoEsPaciente = nuevoRol === 'paciente' || duplicado.role === 'paciente';
    const ambosPacientes = nuevoRol === 'paciente' && duplicado.role === 'paciente';

    if (!unoEsPaciente || ambosPacientes) {
      return `${campo[0].toUpperCase() + campo.slice(1)} ya está registrado para otro usuario.`;
    }
    return '';
  }



  const handleRoleChange = async (e) => {
    const nuevoRol = e.target.value;

    setForm(prev => ({ ...prev, role: nuevoRol, especialidad: '', horario: [] }));
    setUsarOtraEspecialidad(false);

    const errorFecha = validarFechaCambioRol(form.fecha_nacimiento, nuevoRol);
    const nuevosErrores = await validarDuplicadosAlCambiarRol(form, nuevoRol);

    setErrores(prev => ({
      ...prev,
      ...nuevosErrores,
      especialidad: '',
      fecha_nacimiento: errorFecha
    }));
  };





  const handleEspecialidadChange = (e) => {
    const value = e.target.value
    if (value === '__otra__') {
      setUsarOtraEspecialidad(true)
      setForm(prev => ({ ...prev, especialidad: '' }))
    } else {
      setUsarOtraEspecialidad(false)
      setForm(prev => ({ ...prev, especialidad: value }))
    }
    const error = validarCampo('especialidad', value)
    setErrores(prev => ({ ...prev, especialidad: error }))
  }

  const updateHorario = (dia, campo, valor) => {
    setForm(prev => {
      const existente = prev.horario.find(h => h.dia === dia)
      const horarioActualizado = existente
        ? prev.horario.map(h => h.dia === dia ? { ...h, [campo]: valor } : h)
        : [...prev.horario, { dia, [campo]: valor }]

      validarHorarioPorDia(dia, horarioActualizado.find(h => h.dia === dia))

      if (form.role !== 'paciente') {
        const { horariosValidos } = calcularHorariosValidos(horarioActualizado)
        if (horariosValidos === 0) {
          setMensajeGlobal('Debe asignar al menos un horario válido.')
        } else {
          setMensajeGlobal('')
        }
      }

      return { ...prev, horario: horarioActualizado }
    })
  }


  const validarHorarioPorDia = (dia, horario) => {
    const { hora_inicio, hora_fin } = horario || {}

    let error = ''
    if (hora_inicio && hora_fin) {
      if (hora_inicio >= hora_fin) {
        error = 'Hora fin debe ser posterior a hora inicio.'
      }
    } else if (hora_inicio || hora_fin) {
      error = 'Ambas horas deben estar completas.'
    }

    setErrores(prev => ({
      ...prev,
      horario: {
        ...prev.horario,
        [dia]: error
      }
    }))
  }



  const limpiarCampoHorario = (dia, campo) => {
    setForm(prev => {
      const nuevoHorario = prev.horario.map(h => {
        if (h.dia === dia) {
          const limpio = { ...h, [campo]: '' }
          if (!limpio.hora_inicio && !limpio.hora_fin) return null
          return limpio
        }
        return h
      }).filter(Boolean)

      if (form.role !== 'paciente') {
        const { horariosValidos } = calcularHorariosValidos(nuevoHorario)
        if (horariosValidos === 0) {
          setMensajeGlobal('Debe asignar al menos un horario válido.')
        } else {
          setMensajeGlobal('')
        }
      }

      return { ...prev, horario: nuevoHorario }
    })
  }


  const calcularHorariosValidos = (horarios) => {
    let horariosValidos = 0
    let erroresHorario = {}

    diasSemana.forEach((dia) => {
      const horarioDia = horarios.find(h => h.dia === dia)
      if (horarioDia) {
        const { hora_inicio, hora_fin } = horarioDia
        if (hora_inicio && hora_fin) {
          if (hora_inicio < hora_fin) {
            horariosValidos++
          } else {
            erroresHorario[dia] = 'Hora fin debe ser posterior a hora inicio.'
          }
        } else if (hora_inicio || hora_fin) {
          erroresHorario[dia] = 'Ambas horas deben estar completas.'
        }
      }
    })

    return { horariosValidos, erroresHorario }
  }

  function construirPayload(form) {
    const payload = {
      ...form,
      nombre: form.nombre.toUpperCase(),
      apellido: form.apellido.toUpperCase(),
      direccion: form.direccion.toUpperCase(),
      especialidad: form.especialidad?.toUpperCase() || ''
    };

    if (form.role !== 'paciente') payload.horario = form.horario;
    if (form.role !== 'medico') delete payload.especialidad;

    return payload;
  }

  function reiniciarFormulario() {
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
    });
    setTouched({ fecha_nacimiento: true });
    setErrores({});
  }

  function manejarErrorSubmit(err) {
    console.error('Error al crear usuario:', err);

    if (err.response) {
      if (err.response.status === 400 && err.response.data?.detail) {
        setMensajeGlobal(`Error: ${err.response.data.detail}`);
      } else if (err.response.status === 401) {
        setMensajeGlobal('No autorizado. Por favor inicie sesión nuevamente.');
        localStorage.clear();
        window.location.href = '/login';
      } else {
        setMensajeGlobal('Error inesperado en el servidor.');
      }
    } else if (err.request) {
      setMensajeGlobal('No se recibió respuesta del servidor.');
    } else {
      setMensajeGlobal('Error al crear el usuario.');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeGlobal('');

    const nuevosErrores = {};
    Object.entries(form).forEach(([key, value]) => {
      const msg = validarCampo(key, value);
      if (msg) nuevosErrores[key] = msg;
    });

    let horariosValidos = 0;
    let erroresHorario = {};
    if (form.role !== 'paciente') {
      const resultadoHorarios = calcularHorariosValidos(form.horario);
      horariosValidos = resultadoHorarios.horariosValidos;
      erroresHorario = resultadoHorarios.erroresHorario;

      if (horariosValidos === 0) {
        setMensajeGlobal('Debe asignar al menos un horario válido.');
      }
    }

    setErrores(prev => ({
      ...prev,
      ...nuevosErrores,
      horario: erroresHorario
    }));

    if (Object.keys(nuevosErrores).length > 0) return;

    try {
      const token = localStorage.getItem('token');
      const payload = construirPayload(form);

      await axios.post('http://localhost:8000/register', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setModalAbierto(true);
      reiniciarFormulario();
    } catch (err) {
      manejarErrorSubmit(err);
    }
  };


  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="bg-white shadow-xl rounded-xl p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-teal-800 mb-6 text-center">Crear nueva cuenta</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: "cedula", label: "Cédula", placeholder: "1712345678" },
                { id: "nombre", label: "Nombres", placeholder: "Juan Pablo" },
                { id: "apellido", label: "Apellidos", placeholder: "Pérez Mendoza" },
                { id: "telefono", label: "Teléfono", placeholder: "0991234567" },
                { id: "direccion", label: "Dirección", placeholder: "Av. Siempre Viva" },
              ].map((field) => (
                <div key={field.id} className="flex flex-col">
                  <label htmlFor={field.id} className="text-gray-700 font-medium">{field.label}</label>
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={form[field.id]}
                    onChange={handleChange}
                    className="border rounded px-4 py-2"
                  />
                  {errores[field.id] && (
                    <span className="text-red-500 text-sm">{errores[field.id]}</span>
                  )}


                </div>
              ))}
              <div className="flex flex-col">
                <label htmlFor="fecha_nacimiento" className="text-gray-700 font-medium">Fecha de nacimiento</label>
                <input
                  id="fecha_nacimiento"
                  name="fecha_nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={handleChange}
                  onBlur={() => setTouched(prev => ({ ...prev, fecha_nacimiento: true }))}
                  className="border rounded px-4 py-2"
                />
                {errores.fecha_nacimiento && touched.fecha_nacimiento && (
                  <span className="text-red-500 text-sm">{errores.fecha_nacimiento}</span>
                )}
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label htmlFor="role" className="text-gray-700 font-medium">Rol</label>
                <select name="role" value={form.role} onChange={handleRoleChange} className="border rounded px-4 py-2">
                  {rolesDisponibles.map(r => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>

              </div>

              <div className="flex flex-col">
                <label htmlFor="username" className="text-gray-700 font-medium">Usuario</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="border rounded px-4 py-2"
                />
                {errores.username && <span className="text-red-500 text-sm">{errores.username}</span>}
              </div>

              <div className="flex flex-col">
                <label htmlFor="password" className="text-gray-700 font-medium">Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="border rounded px-4 py-2"
                />
                {errores.password && <span className="text-red-500 text-sm">{errores.password}</span>}
              </div>
            </div>

            {form.role === 'medico' && (
              <div className="flex flex-col">
                <label htmlFor="especialidad" className="text-gray-700 font-medium">Especialidad</label>
                <select onChange={handleEspecialidadChange} className="border rounded px-4 py-2">
                  <option value="">Seleccionar especialidad</option>
                  {especialidades.map(e => (
                    <option key={e.id} value={e.nombre}>{e.nombre}</option>
                  ))}
                  <option value="__otra__">Otra...</option>
                </select>
                {usarOtraEspecialidad && (
                  <input
                    name="especialidad"
                    value={form.especialidad}
                    onChange={handleChange}
                    className="border rounded px-4 py-2 mt-2"
                    placeholder="Nueva especialidad"
                  />
                )}
                {errores.especialidad && <span className="text-red-500 text-sm">{errores.especialidad}</span>}
              </div>
            )}

            {form.role !== 'paciente' && (
              <div>
                <h3 className="text-lg font-semibold text-teal-700 mb-2">Horario laboral</h3>
                {diasSemana.map((dia, i) => {
                  const horarioDia = form.horario.find(h => h.dia === dia) || {}
                  const errorDia = errores.horario?.[dia]
                  return (
                    <div key={dia} className="mb-2">
                      <div className="flex items-center space-x-2">
                        <label className="w-24 capitalize text-gray-600">{dia}</label>

                        <div className="flex items-center space-x-1">
                          <input
                            type="time"
                            value={horarioDia.hora_inicio || ''}
                            onChange={(e) => updateHorario(dia, 'hora_inicio', e.target.value)}
                            className="border px-2 py-1 rounded"
                          />
                          {horarioDia.hora_inicio && (
                            <button type="button" onClick={() => limpiarCampoHorario(dia, 'hora_inicio')} className="text-red-500 text-sm">X</button>
                          )}
                        </div>

                        <span>-</span>

                        <div className="flex items-center space-x-1">
                          <input
                            type="time"
                            value={horarioDia.hora_fin || ''}
                            onChange={(e) => updateHorario(dia, 'hora_fin', e.target.value)}
                            className="border px-2 py-1 rounded"
                          />
                          {horarioDia.hora_fin && (
                            <button type="button" onClick={() => limpiarCampoHorario(dia, 'hora_fin')} className="text-red-500 text-sm">X</button>
                          )}
                        </div>
                      </div>
                      {errorDia && (
                        <div className="ml-24 text-red-500 text-sm">{errorDia}</div>
                      )}
                    </div>
                  )
                })}


              </div>
            )}{mensajeGlobal && (
              <div className={`text-center mb-4 text-sm font-semibold ${mensajeGlobal.includes('exitosamente') ? 'text-green-600' : 'text-red-600'}`}>
                {mensajeGlobal}
              </div>
            )}

            <button type="submit" className="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700">
              Crear cuenta
            </button>
          </form>

        </div>
      </div>
      {modalAbierto && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">¡Éxito!</h2>
            <p className="text-gray-700 mb-6">El usuario fue creado exitosamente.</p>
            <button
              onClick={() => setModalAbierto(false)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default CrearCuenta
