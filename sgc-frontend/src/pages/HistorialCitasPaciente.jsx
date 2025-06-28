import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api/axiosConfig'

const estadoToColor = {
  agendado: 'bg-green-200 border-green-600',
  para_signos: 'bg-yellow-200 border-yellow-600',
  en_espera: 'bg-blue-200 border-blue-600',
  en_consulta: 'bg-purple-200 border-purple-600',
  terminado: 'bg-pink-200 border-pink-600',
  perdida: 'bg-red-200 border-red-600',
}

function HistorialCitasPaciente() {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState([])
  const [filtros, setFiltros] = useState({
    estado: '',
    fecha: '',
    medico: '',
    especialidad: ''
  })

  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    api.get('/me')
      .then(res => {
        setRole(res.data.role)
        if (res.data.role !== 'paciente') {
          alert('Solo los pacientes pueden ver esta página.')
          navigate('/', { replace: true })
        } else {
          cargarHistorial()
        }
        setLoading(false)
      })
      .catch(() => {
        localStorage.clear()
        navigate('/login', { replace: true })
      })
  }, [navigate])

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/estado-citas")

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.evento === "actualizacion_citas") {
        cargarHistorial()
      }
    }

    ws.onclose = () => console.log("WebSocket cerrado")
    ws.onerror = (err) => console.error("WebSocket error", err)

    return () => ws.close()
  }, [])

  const cargarHistorial = async () => {
    try {
      const res = await api.get('/citas/historial')
      setCitas(res.data)
    } catch (err) {
      console.error('Error al cargar historial', err)
    }
  }

  const filtrar = (cita) => {
    const matchEstado = !filtros.estado || cita.estado === filtros.estado
    const matchFecha = !filtros.fecha || cita.fecha === filtros.fecha
    const matchMedico = `${cita.medico.nombre} ${cita.medico.apellido}`.toLowerCase().includes(filtros.medico.toLowerCase())
    const matchEspecialidad = !filtros.especialidad || (cita.medico.especialidad?.toLowerCase().includes(filtros.especialidad.toLowerCase()))
    return matchEstado && matchFecha && matchMedico && matchEspecialidad
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 p-8 ml-64">
        <h1 className="text-3xl font-bold text-teal-800 mb-6">Mi Historial de Citas</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <select
            value={filtros.estado}
            onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
            className="input"
          >
            <option value="">Todos los estados</option>
            <option value="agendado">Agendado</option>
            <option value="para_signos">Para signos</option>
            <option value="en_espera">En espera</option>
            <option value="en_consulta">En consulta</option>
            <option value="terminado">Terminado</option>
            <option value="perdida">Perdida</option>
          </select>
          <input
            type="date"
            value={filtros.fecha}
            onChange={e => setFiltros({ ...filtros, fecha: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Buscar por médico"
            value={filtros.medico}
            onChange={e => setFiltros({ ...filtros, medico: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Buscar por especialidad"
            value={filtros.especialidad}
            onChange={e => setFiltros({ ...filtros, especialidad: e.target.value })}
            className="input"
          />
        </div>

        <div className="space-y-4">
          {citas.filter(filtrar).length === 0 ? (
            <div className="text-center mt-20 text-2xl text-gray-500 font-semibold">
              🕐 No hay citas que coincidan con los filtros.
            </div>
          ) : (
            citas
              .filter(filtrar)
              .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
              .map(cita => (
                <div
                  key={cita.id}
                  className={`border-l-8 shadow ${estadoToColor[cita.estado] || 'bg-gray-100 border'} p-4 rounded`}
                >
                  <p><strong>Fecha:</strong> {cita.fecha}</p>
                  <p><strong>Hora:</strong> {cita.hora_inicio} - {cita.hora_fin}</p>
                  <p><strong>Médico:</strong> {cita.medico.nombre} {cita.medico.apellido}</p>
                  <p><strong>Especialidad:</strong> {cita.medico.especialidad || '—'}</p>
                  <p><strong>Estado:</strong> {cita.estado.replace('_', ' ')}</p>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}

export default HistorialCitasPaciente
