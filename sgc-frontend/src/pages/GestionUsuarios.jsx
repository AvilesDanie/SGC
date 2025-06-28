import { useEffect, useState } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import { validarCampo, validarDuplicado } from '../utils/validaciones'

const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [filtro, setFiltro] = useState({ rol: '', nombre: '', especialidad: '' })
  const [modalUsuario, setModalUsuario] = useState(null)
  const [formEdit, setFormEdit] = useState(null)
  const [erroresEdit, setErroresEdit] = useState({})
  const [role, setRole] = useState('')

  const token = localStorage.getItem('token')
  const [especialidades, setEspecialidades] = useState([])
  const [usarOtraEspecialidad, setUsarOtraEspecialidad] = useState(false)


  useEffect(() => {
    const storedRole = localStorage.getItem('role')
    setRole(storedRole || '')
    fetchUsuarios()

    axios.get('http://localhost:8000/especialidades')
      .then(res => setEspecialidades(res.data))
      .catch(() => setEspecialidades([]))
  }, [])

  const fetchUsuarios = async () => {
    try {
      const res = await axios.get('http://localhost:8000/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsuarios(res.data)
    } catch (err) {
      console.error('Error al obtener usuarios', err)
    }
  }

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Deseas eliminar esta cuenta?')) return
    try {
      await axios.delete(`http://localhost:8000/usuarios/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchUsuarios()
    } catch {
      alert('No se pudo eliminar')
    }
  }

  const abrirModalEdicion = (usuario) => {
    setModalUsuario(usuario)
    setFormEdit({
      ...usuario,
      password: '',
      especialidad: usuario.especialidad_nombre || '',
      horario: usuario.horario || []
    })
    setErroresEdit({})
  }

  const updateHorario = (dia, campo, valor) => {
    setFormEdit((prev) => {
      const existente = prev.horario.find(h => h.dia === dia)
      const nuevoHorario = existente
        ? prev.horario.map(h => h.dia === dia ? { ...h, [campo]: valor } : h)
        : [...prev.horario, { dia, [campo]: valor }]

      // Validar en tiempo real
      setTimeout(() => validarHorarios(nuevoHorario), 0)

      return { ...prev, horario: nuevoHorario }
    })
  }


  const validarHorarios = (horario) => {
    let erroresHorario = {}
    let tieneAlMenosUnoValido = false

    diasSemana.forEach(dia => {
      const diaData = horario.find(h => h.dia === dia)
      if (diaData) {
        const { hora_inicio, hora_fin } = diaData
        if (hora_inicio && hora_fin) {
          if (hora_inicio >= hora_fin) {
            erroresHorario[dia] = 'Hora fin debe ser posterior a hora inicio.'
          } else {
            tieneAlMenosUnoValido = true
          }
        } else if (hora_inicio || hora_fin) {
          erroresHorario[dia] = 'Ambas horas deben estar completas.'
        }
      }
    })

    setErroresEdit(prev => ({
      ...prev,
      horario: !tieneAlMenosUnoValido ? 'Debe asignar al menos un horario válido.' : '',
      horarioPorDia: erroresHorario
    }))
  }


  const limpiarCampoHorario = (dia, campo) => {
    setFormEdit(prev => {
      const nuevoHorario = prev.horario.map(h => {
        if (h.dia === dia) {
          const limpio = { ...h, [campo]: '' }
          if (!limpio.hora_inicio && !limpio.hora_fin) return null
          return limpio
        }
        return h
      }).filter(Boolean)

      validarHorarioPorDia(dia, nuevoHorario.find(h => h.dia === dia))

      return { ...prev, horario: nuevoHorario }
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

    setErroresEdit(prev => ({
      ...prev,
      horario_detalle: {
        ...prev.horario_detalle,
        [dia]: error
      }
    }))
  }

  const handleGuardar = async () => {
    const nuevosErrores = {}

    Object.entries(formEdit).forEach(([key, value]) => {
      if (['id', 'numero_filiacion', 'is_active', 'especialidad_nombre'].includes(key)) return
      const error = validarCampo(key, value, formEdit.role)
      if (error) nuevosErrores[key] = error
    })

    if (formEdit.role !== 'paciente') {
      const detalles = {}
      let tieneValido = false

      diasSemana.forEach(dia => {
        const horario = formEdit.horario.find(h => h.dia === dia)
        if (horario) {
          if (!horario.hora_inicio || !horario.hora_fin) {
            detalles[dia] = 'Ambas horas deben estar completas.'
          } else if (horario.hora_inicio >= horario.hora_fin) {
            detalles[dia] = 'Hora fin debe ser posterior.'
          } else {
            tieneValido = true
          }
        }
      })

      if (!tieneValido) nuevosErrores.horario = 'Debe asignar al menos un horario válido.'
      if (Object.keys(detalles).length > 0) nuevosErrores.horario_detalle = detalles
    }

    setErroresEdit(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    try {
      const payload = {
        ...formEdit,
        nombre: formEdit.nombre.toUpperCase(),
        apellido: formEdit.apellido.toUpperCase(),
        direccion: formEdit.direccion.toUpperCase(),
        especialidad: formEdit.especialidad?.toUpperCase() || ''
      }

      await axios.put(`http://localhost:8000/usuarios/${modalUsuario.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setModalUsuario(null)
      fetchUsuarios()
    } catch {
      alert('Error al guardar los cambios')
    }
  }

  const usuariosFiltrados = usuarios.filter(u =>
    u.role !== 'super_admin' &&
    `${u.nombre} ${u.apellido}`.toLowerCase().includes(filtro.nombre.toLowerCase()) &&
    u.role.includes(filtro.rol) &&
    (!filtro.especialidad || (u.especialidad_nombre || '').toLowerCase().includes(filtro.especialidad.toLowerCase()))
  )

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <h2 className="text-3xl font-bold text-teal-800 mb-6">Gestión de Usuarios</h2>

        <div className="mb-6 flex flex-wrap md:flex-nowrap items-end gap-4">
          <div className="flex flex-col w-full md:w-1/3">
            <label htmlFor={"nombre"} className="text-sm text-gray-600 font-medium mb-1">Nombre</label>
            <input
              className="border px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Buscar por nombre"
              value={filtro.nombre}
              onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })}
            />
          </div>

          <div className="flex flex-col w-full md:w-1/3">
            <label htmlFor={"especialidad"} className="text-sm text-gray-600 font-medium mb-1">Especialidad</label>
            <input
              className="border px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Buscar por especialidad"
              value={filtro.especialidad}
              onChange={(e) => setFiltro({ ...filtro, especialidad: e.target.value })}
            />
          </div>

          <div className="flex flex-col w-full md:w-1/3">
            <label htmlFor="rol" className="text-sm text-gray-600 font-medium mb-1">Rol</label>
            <select
              className="border px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={filtro.rol}
              onChange={(e) => setFiltro({ ...filtro, rol: e.target.value })}
            >
              <option value="">Todos</option>
              {['super_admin', 'medico', 'enfermero', 'administrativo', 'farmacologo', 'paciente'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>



        <table className="w-full text-sm bg-white rounded shadow">
          <thead className="bg-teal-600 text-white text-left">
            <tr>
              {['Nombre', 'Usuario', 'Rol', 'Cédula', 'Filiación', 'Especialidad', 'Horario', 'Acciones'].map(h => (
                <th key={h} className="p-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.nombre} {u.apellido}</td>
                <td className="p-3">{u.username}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">{u.cedula}</td>
                <td className="p-3">{u.numero_filiacion || '-'}</td>
                <td className="p-3">{u.especialidad_nombre || '-'}</td>
                <td className="p-3">
                  {u.role !== 'paciente' && u.horario?.length > 0 ? (
                    <ul className="ml-4 list-disc">
                      {u.horario.map((h) => (
                        <li key={`${h.dia}-${h.hora_inicio}-${h.hora_fin}`}>
                          {h.dia}: {h.hora_inicio} - {h.hora_fin}
                        </li>
                      ))}

                    </ul>
                  ) : '-'}
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => abrirModalEdicion(u)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1 px-3 rounded shadow"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(u.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded shadow"
                  >
                    Eliminar
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {modalUsuario && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-center text-teal-800 mb-4">Editar Usuario</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'nombre', label: 'Nombre' },
                  { id: 'apellido', label: 'Apellido' },
                  { id: 'fecha_nacimiento', label: 'Fecha de Nacimiento', type: 'date' },
                  { id: 'direccion', label: 'Dirección' },
                  { id: 'telefono', label: 'Teléfono' },
                  { id: 'username', label: 'Usuario' },
                  { id: 'cedula', label: 'Cédula' },
                  { id: 'password', label: 'Contraseña', type: 'password' },
                ].map(({ id, label, type }) => (
                  <div key={id} className="flex flex-col">
                    <label className="text-sm font-medium">{label}</label>
                    <input
                      type={type || 'text'}
                      className="input"
                      value={formEdit[id] || ''}
                      onChange={async (e) => {
                        const val = e.target.value
                        setFormEdit(prev => ({ ...prev, [id]: val }))

                        const error = validarCampo(id, val, formEdit.role)

                        let errorDuplicado = ''
                        if (['username', 'cedula', 'telefono'].includes(id)) {
                          errorDuplicado = await validarDuplicado(id, val, formEdit.role, formEdit.id)
                        }

                        setErroresEdit(prev => ({
                          ...prev,
                          [id]: error || errorDuplicado
                        }))
                      }}

                    />
                    {erroresEdit[id] && <span className="text-sm text-red-500">{erroresEdit[id]}</span>}
                  </div>
                ))}
              </div>

              {formEdit.role === 'medico' && (
                <div className="mt-6">
                  <label htmlFor="edit-especialidad" className="text-sm font-medium">Especialidad</label>
                  <select
                    className="input w-full mb-2"
                    value={usarOtraEspecialidad ? '__otra__' : formEdit.especialidad}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__otra__') {
                        setUsarOtraEspecialidad(true)
                        setFormEdit(prev => ({ ...prev, especialidad: '' }))
                      } else {
                        setUsarOtraEspecialidad(false)
                        setFormEdit(prev => ({ ...prev, especialidad: val }))
                      }
                      const error = validarCampo('especialidad', val, formEdit.role)
                      setErroresEdit(prev => ({ ...prev, especialidad: error }))
                    }}
                  >
                    <option value="">Seleccionar especialidad</option>
                    {especialidades.map(e => (
                      <option key={e.id} value={e.nombre}>{e.nombre}</option>
                    ))}
                    <option value="__otra__">Otra...</option>
                  </select>

                  {usarOtraEspecialidad && (
                    <input
                      className="input w-full mb-2"
                      value={formEdit.especialidad}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormEdit(prev => ({ ...prev, especialidad: val }))
                        const error = validarCampo('especialidad', val, formEdit.role)
                        setErroresEdit(prev => ({ ...prev, especialidad: error }))
                      }}
                      placeholder="Nueva especialidad"
                    />
                  )}

                  {erroresEdit.especialidad && (
                    <span className="text-sm text-red-500">{erroresEdit.especialidad}</span>
                  )}

                  <h4 className="text-lg font-semibold text-teal-700 mt-4 mb-2">Horario laboral</h4>
                  {diasSemana.map((dia) => {
                    const h = formEdit.horario?.find((h) => h.dia === dia) || {}
                    return (
                      <div key={dia} className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <label className="capitalize w-24">{dia}</label>

                          <div className="flex items-center space-x-1">
                            <input
                              type="time"
                              value={h.hora_inicio || ''}
                              onChange={(e) => updateHorario(dia, 'hora_inicio', e.target.value)}
                              className="input-time"
                            />
                            {h.hora_inicio && (
                              <button
                                type="button"
                                onClick={() => limpiarCampoHorario(dia, 'hora_inicio')}
                                className="text-red-500 text-xs"
                                title="Borrar hora inicio"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <span>-</span>

                          <div className="flex items-center space-x-1">
                            <input
                              type="time"
                              value={h.hora_fin || ''}
                              onChange={(e) => updateHorario(dia, 'hora_fin', e.target.value)}
                              className="input-time"
                            />
                            {h.hora_fin && (
                              <button
                                type="button"
                                onClick={() => limpiarCampoHorario(dia, 'hora_fin')}
                                className="text-red-500 text-xs"
                                title="Borrar hora fin"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {erroresEdit.horarioPorDia?.[dia] && (
                          <p className="text-red-500 text-sm ml-24">{erroresEdit.horarioPorDia[dia]}</p>
                        )}
                      </div>
                    )
                  })}


                  {erroresEdit.horario && (
                    <p className="text-sm text-red-500 mt-2">{erroresEdit.horario}</p>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleGuardar}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setModalUsuario(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded shadow"
                >
                  Cancelar
                </button>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GestionUsuarios
