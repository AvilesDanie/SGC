// src/pages/Expedientes.js
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api/axiosConfig'

function Expedientes() {
    const [role, setRole] = useState(null)
    const [medicoId, setMedicoId] = useState(null)
    const [citas, setCitas] = useState([])
    const [pacientes, setPacientes] = useState({})
    const navigate = useNavigate()
    const [filtros, setFiltros] = useState({
        cedula: '',
        nombre: ''
    })

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return navigate('/login', { replace: true })

        api.get('/me')
            .then(res => {
                setRole(res.data.role)
                setMedicoId(res.data.id)
                cargarCitas(res.data.id)
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
                cargarCitas(medicoId)
            }
        }

        ws.onerror = (err) => console.error("WebSocket error", err)
        ws.onclose = () => console.log("WebSocket cerrado")

        return () => ws.close()
    }, [medicoId])


    const filtrar = (cita) => {
        const paciente = pacientes[cita.paciente_id]
        if (!paciente) return false

        const matchCedula = paciente.cedula.includes(filtros.cedula)
        const matchNombre = (`${paciente.nombre} ${paciente.apellido}`).toLowerCase().includes(filtros.nombre.toLowerCase())

        return matchCedula && matchNombre
    }


    const cargarCitas = async (medicoId) => {
        try {
            const res = await api.get('/citas/hoy')
            const citasFiltradas = []

            for (const cita of res.data) {
                if (cita.medico_id !== medicoId) continue
                try {
                    const signosRes = await api.get(`/signos-vitales/cita/${cita.id}`)
                    citasFiltradas.push({ ...cita, signos_vitales: signosRes.data.signos_vitales })
                } catch {
                    continue
                }
            }

            const pacientesData = {}
            await Promise.all(citasFiltradas.map(async c => {
                if (!pacientesData[c.paciente_id]) {
                    const res = await api.get(`/pacientes/${c.paciente_id}`)
                    pacientesData[c.paciente_id] = res.data
                }
            }))

            setCitas(citasFiltradas)
            setPacientes(pacientesData)
        } catch (err) {
            console.error(err)
        }
    }

    if (role !== 'medico') return null

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-white to-cyan-100">
            <Sidebar role={role} />
            <div className="flex-1 p-8 ml-64">
                <h1 className="text-3xl font-bold text-teal-800 mb-6">Expedientes</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                </div>



                <div className="space-y-4">
                    {citas.filter(cita => cita.signos_vitales).filter(filtrar).length === 0 ? (
                        <div className="text-center mt-20 text-2xl text-gray-500 font-semibold">
                            🕐 No hay citas con signos vitales que coincidan con los filtros.
                        </div>
                    ) : (

                        citas
                            .filter(cita => cita.signos_vitales)
                            .filter(filtrar)
                            .map(cita => {

                                const paciente = pacientes[cita.paciente_id]

                                return (
                                    <div
                                        key={cita.id}
                                        className={`border-l-8 p-4 rounded shadow ${cita.estado === 'terminado'
                                            ? 'border-red-600 bg-red-100'
                                            : 'border-blue-500 bg-blue-100'
                                            }`}
                                    >
                                        <p><strong>Paciente:</strong> {paciente?.nombre} {paciente?.apellido}</p>
                                        <p><strong>Hora:</strong> {cita.hora_inicio} - {cita.hora_fin}</p>
                                        <p><strong>Presión arterial:</strong> {cita.signos_vitales?.presion_arterial}</p>
                                        <p><strong>Peso:</strong> {cita.signos_vitales?.peso} kg</p>
                                        <p><strong>Talla:</strong> {cita.signos_vitales?.talla} cm</p>
                                        <p><strong>Temperatura:</strong> {cita.signos_vitales?.temperatura} °C</p>
                                        <p><strong>Saturación de oxígeno:</strong> {cita.signos_vitales?.saturacion_oxigeno} %</p>

                                        {cita.estado !== 'terminado' ? (
                                            <button
                                                onClick={() => navigate(`/dashboard/expediente/${cita.id}`)}
                                                className="mt-2 bg-blue-600 text-white px-4 py-1 rounded text-sm"
                                            >
                                                Abrir expediente
                                            </button>
                                        ) : (
                                            <p className="mt-2 text-sm text-red-700 font-semibold">
                                                Consulta finalizada
                                            </p>
                                        )}
                                    </div>
                                )
                            })
                    )}
                </div>

            </div>
        </div>
    )
}

export default Expedientes
