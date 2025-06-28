import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import CalendarMonthView from '../components/CalendarMonthView'
import CalendarDayView from '../components/CalendarDayView'
import api from '../api/axiosConfig'

function GenerarTurno() {
  const [role, setRole] = useState(null)
  const [cedula, setCedula] = useState('')
  const [paciente, setPaciente] = useState(null)
  const [especialidades, setEspecialidades] = useState([])
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState('')
  const [medicos, setMedicos] = useState([])
  const [medicoSeleccionado, setMedicoSeleccionado] = useState(null)
  const [citas, setCitas] = useState([])
  const [vistaDia, setVistaDia] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    api.get('/especialidades')
      .then(res => setEspecialidades(res.data))

    api.get('/me')
      .then(res => setRole(res.data.role))
      .catch(() => {
        localStorage.clear()
        navigate('/login')
      })
  }, [])

  const buscarPaciente = async () => {
    try {
      const res = await api.get(`/usuarios/paciente/${cedula}`)
      setPaciente(res.data)
    } catch {
      setPaciente(null)
      alert('Paciente no encontrado')
    }
  }

  const seleccionarEspecialidad = async (especialidad) => {
    setEspecialidadSeleccionada(especialidad)
    setMedicoSeleccionado(null)
    setCitas([])
    setVistaDia(null)

    try {
      const res = await api.get(`/usuarios/medicos/especialidad/${especialidad}`)
      setMedicos(res.data)
    } catch {
      setMedicos([])
      alert('No hay médicos para esta especialidad')
    }
  }

  const seleccionarMedico = async (medico) => {
    setMedicoSeleccionado(medico)
    setVistaDia(null)

    const res = await api.get(`/citas/medico/${medico.id}`)
    setCitas(res.data)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold text-teal-800 mb-6">Generar Turno</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-semibold text-teal-700">Buscar paciente</h2>
            <input
              type="text"
              placeholder="Cédula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="input"
            />
            <button
              onClick={buscarPaciente}
              className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
            >
              Buscar
            </button>
            {paciente && (
              <p className="text-gray-700">Paciente: <strong>{paciente.nombre} {paciente.apellido}</strong></p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-semibold text-teal-700">Seleccionar médico</h2>

            <select
              className="input"
              value={especialidadSeleccionada}
              onChange={(e) => seleccionarEspecialidad(e.target.value)}
            >
              <option value="">Selecciona una especialidad</option>
              {especialidades.map(e => (
                <option key={e.id} value={e.nombre}>{e.nombre}</option>
              ))}
            </select>

            <select
              className="input"
              value={medicoSeleccionado?.id || ''}
              onChange={(e) => {
                const medico = medicos.find(m => m.id === parseInt(e.target.value))
                if (medico) seleccionarMedico(medico)
              }}
              disabled={!medicos.length}
            >
              <option value="">Selecciona un médico</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
              ))}
            </select>
          </div>
        </div>

        {medicoSeleccionado && !vistaDia && (
          <CalendarMonthView
            medico={medicoSeleccionado}
            citas={citas}
            onSelectDay={setVistaDia}
          />
        )}

        {medicoSeleccionado && vistaDia && (
          <CalendarDayView
            fecha={vistaDia}
            medico={medicoSeleccionado}
            citas={citas}
            setCitas={setCitas}
            onVolver={() => setVistaDia(null)}
            paciente={paciente}
          />
        )}
      </div>
    </div>
  )
}

export default GenerarTurno
