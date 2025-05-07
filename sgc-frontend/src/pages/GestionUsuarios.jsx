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
    <div className="flex h-screen">
      <Sidebar role={role} />

      <div className="flex-1 p-6 ml-64">


        <h2 className="text-2xl font-bold mb-4">Gestión de Usuarios</h2>

        <div className="mb-4 flex space-x-4">
          <input
            placeholder="Filtrar por nombre"
            className="border p-2 rounded"
            value={filtro.nombre}
            onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })}
          />
          <input
            placeholder="Filtrar por especialidad"
            className="border p-2 rounded"
            value={filtro.especialidad}
            onChange={(e) => setFiltro({ ...filtro, especialidad: e.target.value })}
          />
          <select
            className="border p-2 rounded"
            value={filtro.rol}
            onChange={(e) => setFiltro({ ...filtro, rol: e.target.value })}
          >
            <option value="">Todos los roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="medico">Médico</option>
            <option value="enfermero">Enfermero</option>
            <option value="paciente">Paciente</option>
            <option value="administrativo">Administrativo</option>
            <option value="farmacologo">Farmacólogo</option>
          </select>
        </div>

        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-blue-200 text-left">
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Usuario</th>
              <th className="p-2 border">Rol</th>
              <th className="p-2 border">Cédula</th>
              <th className="p-2 border">Filiación</th>
              <th className="p-2 border">Especialidad</th>
              <th className="p-2 border">Horario</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.id} className="border">
                <td className="p-2">{u.nombre} {u.apellido}</td>
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.cedula}</td>
                <td className="p-2">{u.numero_filiacion || '-'}</td>
                <td className="p-2">{u.especialidad_nombre || '-'}</td>
                <td className="p-2">
                  {u.role !== 'paciente' && u.horario?.length > 0 ? (
                    <ul className="list-disc ml-4">
                      {u.horario.map((h, i) => (
                        <li key={i}>{h.dia}: {h.hora_inicio} - {h.hora_fin}</li>
                      ))}
                    </ul>
                  ) : '-'}
                </td>
                <td className="p-2 space-x-2">
                  <button onClick={() => abrirModalEdicion(u)} className="bg-yellow-500 text-white px-2 py-1 rounded">Editar</button>
                  <button onClick={() => handleEliminar(u.id)} className="bg-red-600 text-white px-2 py-1 rounded">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {modalUsuario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 w-full max-w-4xl rounded shadow-lg overflow-y-auto max-h-[90vh]">
              <h3 className="text-2xl font-bold mb-6">Editar Usuario</h3>

              <div className="grid grid-cols-2 gap-4">
                <input className="border p-2 rounded" placeholder="Nombre"
                  value={formEdit.nombre || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })}
                />
                <input className="border p-2 rounded" placeholder="Apellido"
                  value={formEdit.apellido || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, apellido: e.target.value })}
                />
                <input className="border p-2 rounded" type="date"
                  value={formEdit.fecha_nacimiento || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, fecha_nacimiento: e.target.value })}
                />
                <input className="border p-2 rounded" placeholder="Dirección"
                  value={formEdit.direccion || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, direccion: e.target.value })}
                />
                <input className="border p-2 rounded" placeholder="Teléfono"
                  value={formEdit.telefono || ''}
                  onChange={(e) => setFormEdit({ ...formEdit, telefono: e.target.value })}
                />
                <input className="border p-2 rounded" placeholder="Usuario"
                  value={formEdit.username}
                  onChange={(e) => setFormEdit({ ...formEdit, username: e.target.value })}
                />
                <input className="border p-2 rounded" placeholder="Cédula"
                  value={formEdit.cedula}
                  onChange={(e) => setFormEdit({ ...formEdit, cedula: e.target.value })}
                />
                <input className="border p-2 rounded" placeholder="Nueva contraseña"
                  value={formEdit.password}
                  onChange={(e) => setFormEdit({ ...formEdit, password: e.target.value })}
                  type="password"
                />

                <select className="border p-2 rounded col-span-2"
                  value={formEdit.role}
                  onChange={(e) => setFormEdit({ ...formEdit, role: e.target.value })}>
                  <option value="super_admin">super_admin</option>
                  <option value="medico">medico</option>
                  <option value="enfermero">enfermero</option>
                  <option value="administrativo">administrativo</option>
                  <option value="farmacologo">farmacologo</option>
                  <option value="paciente">paciente</option>
                </select>

                {formEdit.role === 'medico' && (
                  <>
                    <input className="border p-2 rounded col-span-2" placeholder="Especialidad"
                      value={formEdit.especialidad}
                      onChange={(e) => setFormEdit({ ...formEdit, especialidad: e.target.value })}
                    />
                    <div className="col-span-2">
                      <h4 className="font-semibold mb-2 mt-2">Horario laboral</h4>
                      {diasSemana.map(dia => (
                        <div key={dia} className="flex items-center space-x-2 mb-2">
                          <label className="capitalize w-24">{dia}</label>
                          <input type="time"
                            value={formEdit.horario?.find(h => h.dia === dia)?.hora_inicio || ''}
                            onChange={(e) => updateHorario(dia, 'hora_inicio', e.target.value)}
                            className="border p-1 rounded"
                          />
                          <span>-</span>
                          <input type="time"
                            value={formEdit.horario?.find(h => h.dia === dia)?.hora_fin || ''}
                            onChange={(e) => updateHorario(dia, 'hora_fin', e.target.value)}
                            className="border p-1 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleGuardar}>Guardar</button>
                <button className="bg-gray-400 px-4 py-2 rounded" onClick={() => setModalUsuario(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default GestionUsuarios
