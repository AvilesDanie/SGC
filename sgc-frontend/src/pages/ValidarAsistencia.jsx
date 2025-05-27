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

const normalizarEstado = (estado) => estado.replace(/\s/g, '_')

function ValidarAsistencia() {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [citas, setCitas] = useState([])
  const [pacientes, setPacientes] = useState({})
  const [medicos, setMedicos] = useState({})
  const [especialidades, setEspecialidades] = useState({})
  const [filtros, setFiltros] = useState({
    cedula: '',
    nombre: '',
    medico: '',
    estado: ''
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
        cargarCitas()
        setLoading(false)
      })
      .catch(() => {
        localStorage.clear()
        navigate('/login', { replace: true })
      })
  }, [navigate])

  const cargarCitas = async () => {
    try {
      const res = await api.get('/citas/hoy')
      const citasHoy = res.data
      setCitas(citasHoy)

      const pacientesIds = [...new Set(citasHoy.map(c => c.paciente_id))]
      const medicosIds = [...new Set(citasHoy.map(c => c.medico_id))]

      const pacientesData = {}
      const medicosData = {}
      const especialidadesData = {}

      await Promise.all([
        ...pacientesIds.map(async (id) => {
          const res = await api.get(`/pacientes/${id}`)
          pacientesData[id] = res.data
        }),
        ...medicosIds.map(async (id) => {
          const resMedico = await api.get(`/medicos/${id}`)
          const resEsp = await api.get(`/medicos/${id}/especialidad`)
          medicosData[id] = resMedico.data
          especialidadesData[id] = resEsp.data.especialidad
        })
      ])

      setPacientes(pacientesData)
      setMedicos(medicosData)
      setEspecialidades(especialidadesData)
    } catch (err) {
      console.error('Error al cargar citas', err)
    }
  }

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/estado-citas")

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.evento === "actualizacion_citas") {
        cargarCitas() // recarga las citas cuando hay cambios
      }
    }

    ws.onclose = () => console.log("WebSocket cerrado")
    ws.onerror = (err) => console.error("WebSocket error", err)

    return () => ws.close()
  }, [])


  const filtrar = (cita) => {
    const paciente = pacientes[cita.paciente_id]
    const medico = medicos[cita.medico_id]
    if (!paciente || !medico) return false

    const matchCedula = paciente.cedula.includes(filtros.cedula)
    const matchNombre = (`${paciente.nombre} ${paciente.apellido}`).toLowerCase().includes(filtros.nombre.toLowerCase())
    const matchMedico = (`${medico.nombre} ${medico.apellido}`)?.toLowerCase()?.includes(filtros.medico.toLowerCase())
    const matchEstado = !filtros.estado || cita.estado.replace(' ', '_') === filtros.estado

    return matchCedula && matchNombre && matchMedico && matchEstado
  }

  const marcarParaSignos = async (id) => {
    try {
      await api.put(`/citas/${id}/para-signos`)
      await cargarCitas()
    } catch (err) {
      alert('No se pudo actualizar la cita.')
    }
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 p-8 ml-64">
        <h1 className="text-3xl font-bold text-teal-800 mb-6">Validar Asistencia</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar por cédula"
            value={filtros.cedula}
            onChange={e => setFiltros({ ...filtros, cedula: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Buscar por nombre"
            value={filtros.nombre}
            onChange={e => setFiltros({ ...filtros, nombre: e.target.value })}
            className="input"
          />
          <input
            type="text"
            placeholder="Buscar por médico"
            value={filtros.medico}
            onChange={e => setFiltros({ ...filtros, medico: e.target.value })}
            className="input"
          />
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
        </div>

        <div className="space-y-4">
          {([...citas].sort((a, b) => {
            if (a.estado === 'agendado' && b.estado !== 'agendado') return -1;
            if (a.estado !== 'agendado' && b.estado === 'agendado') return 1;
            return 0;
          })).filter(filtrar).map(cita => {
            const paciente = pacientes[cita.paciente_id];
            const medico = medicos[cita.medico_id];
            const especialidad = especialidades[cita.medico_id];

            return (
              <div
                key={cita.id}
                className={`border-l-8 shadow ${estadoToColor[normalizarEstado(cita.estado)] || 'bg-gray-100 border'} p-4 rounded`}
              >
                <p><strong>Paciente:</strong> {paciente?.nombre} {paciente?.apellido}</p>
                <p><strong>Cédula:</strong> {paciente?.cedula}</p>
                <p><strong>Hora:</strong> {cita.hora_inicio} - {cita.hora_fin}</p>
                <p><strong>Médico:</strong> {medico?.nombre} {medico?.apellido} ({especialidad || '—'})</p>
                <p><strong>Estado:</strong> {cita.estado.replace('_', ' ')}</p>

                {cita.estado === 'agendado' && role === 'administrativo' && (
                  <button
                    onClick={() => marcarParaSignos(cita.id)}
                    className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1 rounded text-sm"
                  >
                    Marcar como para signos
                  </button>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

export default ValidarAsistencia
