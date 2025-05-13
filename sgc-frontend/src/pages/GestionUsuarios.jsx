import { useEffect, useState } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar' // ajusta la ruta si es necesario

const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [filtro, setFiltro] = useState({ rol: '', nombre: '', especialidad: '' })
  const [modalUsuario, setModalUsuario] = useState(null)
  const [formEdit, setFormEdit] = useState(null)
  const [role, setRole] = useState('')

  const token = localStorage.getItem('token')

  useEffect(() => {
    const storedRole = localStorage.getItem('role')
    setRole(storedRole || '')
    fetchUsuarios()
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
  }

  const updateHorario = (dia, campo, valor) => {
    setFormEdit((prev) => {
      const existente = prev.horario.find(h => h.dia === dia)
      const nuevoHorario = existente
        ? prev.horario.map(h => h.dia === dia ? { ...h, [campo]: valor } : h)
        : [...prev.horario, { dia, [campo]: valor }]
      return { ...prev, horario: nuevoHorario }
    })
  }

  const handleGuardar = async () => {
    try {
      await axios.put(`http://localhost:8000/usuarios/${modalUsuario.id}`, formEdit, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setModalUsuario(null)
      fetchUsuarios()
    } catch {
      alert('Error al guardar los cambios')
    }
  }

  const usuariosFiltrados = usuarios.filter(u =>
    `${u.nombre} ${u.apellido}`.toLowerCase().includes(filtro.nombre.toLowerCase()) &&
    u.role.includes(filtro.rol) &&
    (!filtro.especialidad || (u.especialidad_nombre || '').toLowerCase().includes(filtro.especialidad.toLowerCase()))
  )

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 ml-64 p-8 overflow-y-auto">



        <h2 className="text-3xl font-bold text-teal-800 mb-6">Gestión de Usuarios</h2>

        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <input
            placeholder="Nombre"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
            value={filtro.nombre}
            onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })}
          />
          <input
            placeholder="Especialidad"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
            value={filtro.especialidad}
            onChange={(e) => setFiltro({ ...filtro, especialidad: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
            value={filtro.rol}
            onChange={(e) => setFiltro({ ...filtro, rol: e.target.value })}
          >
            <option value="">Rol</option>
            {['super_admin', 'medico', 'enfermero', 'administrativo', 'farmacologo', 'paciente'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>


        <table className="w-full border border-gray-200 text-sm shadow-sm rounded-md overflow-hidden bg-white">
          <thead className="bg-teal-600 text-white text-left">
            <tr>
              {['Nombre', 'Usuario', 'Rol', 'Cédula', 'Filiación', 'Especialidad', 'Horario', 'Acciones'].map((h, i) => (
                <th key={i} className="p-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuariosFiltrados.map((u) => (
              <tr key={u.id} className="hover:bg-teal-50 transition">
                <td className="p-3">{u.nombre} {u.apellido}</td>
                <td className="p-3">{u.username}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">{u.cedula}</td>
                <td className="p-3">{u.numero_filiacion || '-'}</td>
                <td className="p-3">{u.especialidad_nombre || '-'}</td>
                <td className="p-3">
                  {u.role !== 'paciente' && u.horario?.length > 0 ? (
                    <ul className="list-disc ml-5">
                      {u.horario.map((h, i) => (
                        <li key={i}>{h.dia}: {h.hora_inicio} - {h.hora_fin}</li>
                      ))}
                    </ul>
                  ) : '-'}
                </td>
                <td className="p-3 space-x-2">
                  <button onClick={() => abrirModalEdicion(u)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm">
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(u.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {modalUsuario && (
          <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 px-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-teal-800 mb-6 text-center">Editar Usuario</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input
                  className="input"
                  placeholder="Nombre"
                  value={formEdit.nombre || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Apellido"
                  value={formEdit.apellido || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, apellido: e.target.value })}
                />
                <input
                  className="input"
                  type="date"
                  value={formEdit.fecha_nacimiento || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, fecha_nacimiento: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Dirección"
                  value={formEdit.direccion || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, direccion: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Teléfono"
                  value={formEdit.telefono || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, telefono: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Usuario"
                  value={formEdit.username}
                  onChange={(e) => setFormEdit({ ...formEdit, username: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Cédula"
                  value={formEdit.cedula}
                  onChange={(e) => setFormEdit({ ...formEdit, cedula: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Nueva contraseña"
                  type="password"
                  value={formEdit.password}
                  onChange={(e) => setFormEdit({ ...formEdit, password: e.target.value })}
                />

                <select
                  className="input col-span-1 md:col-span-2"
                  value={formEdit.role}
                  onChange={(e) => setFormEdit({ ...formEdit, role: e.target.value })}
                >
                  <option value="super_admin">super_admin</option>
                  <option value="medico">medico</option>
                  <option value="enfermero">enfermero</option>
                  <option value="administrativo">administrativo</option>
                  <option value="farmacologo">farmacologo</option>
                  <option value="paciente">paciente</option>
                </select>
              </div>

              {/* Especialidad y horario para médicos */}
              {formEdit.role === 'medico' && (
                <div className="mt-6">
                  <input
                    className="input w-full mb-4"
                    placeholder="Especialidad"
                    value={formEdit.especialidad}
                    onChange={(e) => setFormEdit({ ...formEdit, especialidad: e.target.value })}
                  />
                  <h4 className="text-lg font-semibold text-teal-700 mb-2">Horario laboral</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {diasSemana.map(dia => (
                      <div key={dia} className="flex items-center gap-2">
                        <label className="capitalize w-24">{dia}</label>
                        <input
                          type="time"
                          value={formEdit.horario?.find(h => h.dia === dia)?.hora_inicio || ''}
                          onChange={(e) => updateHorario(dia, 'hora_inicio', e.target.value)}
                          className="input-time"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={formEdit.horario?.find(h => h.dia === dia)?.hora_fin || ''}
                          onChange={(e) => updateHorario(dia, 'hora_fin', e.target.value)}
                          className="input-time"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="mt-8 flex justify-end gap-4">
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-medium"
                  onClick={handleGuardar}
                >
                  Guardar
                </button>
                <button
                  className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded font-medium"
                  onClick={() => setModalUsuario(null)}
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
