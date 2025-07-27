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
    const [modalMedico, setModalMedico] = useState({ open: false, citaId: null })
    const [modalAsistencia, setModalAsistencia] = useState({ open: false, citaId: null })
    const [modalVerMedico, setModalVerMedico] = useState({ open: false, data: null })
    const [modalVerAsistencia, setModalVerAsistencia] = useState({ open: false, data: null })

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
        if (!medicoId) return

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

                    const [certMedico, certAsistencia] = await Promise.all([
                        api.get(`/certificados/medico/${cita.id}`).then(r => r.data).catch(() => null),
                        api.get(`/certificados/asistencia/${cita.id}`).then(r => r.data).catch(() => null)
                    ])

                    citasFiltradas.push({
                        ...cita,
                        signos_vitales: signosRes.data.signos_vitales,
                        certificado_medico: certMedico,
                        certificado_asistencia: certAsistencia
                    })
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

    function ModalCertificadoMedico({ open, onClose, citaId }) {
        const [diagnostico, setDiagnostico] = useState('')
        const [reposo, setReposo] = useState(1)
        const [observaciones, setObservaciones] = useState('')

        const guardar = async () => {
            try {
                await api.post('/certificados/medico', {
                    cita_id: citaId,
                    diagnostico,
                    reposo_dias: reposo,
                    observaciones
                })
                await cargarCitas(medicoId)
                onClose()
            } catch (err) {
                if (err.response?.status === 401) {
                    localStorage.clear()
                    navigate('/login')
                } else {
                    alert('Error al guardar certificado médico')
                }
            }
        }

        if (!open) return null
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-96 space-y-4">
                    <h2 className="text-xl font-bold text-teal-800">Certificado Médico</h2>
                    <input
                        className="input w-full"
                        placeholder="Diagnóstico"
                        value={diagnostico}
                        onChange={e => setDiagnostico(e.target.value)}
                    />
                    <input
                        type="number"
                        className="input w-full"
                        placeholder="Días de reposo"
                        value={reposo}
                        onChange={e => setReposo(e.target.value)}
                    />
                    <textarea
                        className="input w-full"
                        placeholder="Observaciones (opcional)"
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                    />
                    <div className="flex justify-end space-x-2">
                        <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded">Cancelar</button>
                        <button onClick={guardar} className="px-4 py-1 bg-teal-600 text-white rounded">Guardar</button>
                    </div>
                </div>
            </div>
        )
    }

    function ModalCertificadoAsistencia({ open, onClose, citaId }) {
        const [motivo, setMotivo] = useState('')
        const [horaEntrada, setHoraEntrada] = useState('')
        const [horaSalida, setHoraSalida] = useState('')
        const [errorHoras, setErrorHoras] = useState('')

        useEffect(() => {
            if (citaId) {
                api.get(`/citas/${citaId}`)
                    .then(res => {
                        const { hora_inicio, hora_fin } = res.data
                        setHoraEntrada(hora_inicio?.slice(0, 5) || '')
                        setHoraSalida(hora_fin?.slice(0, 5) || '')
                    })
                    .catch(() => {
                        setHoraEntrada('')
                        setHoraSalida('')
                    })
            }
        }, [citaId])

        const guardar = async () => {

            // Validación: formato HH:MM -> minutos totales
            const entradaMin = convertirHoraAMinutos(horaEntrada)
            const salidaMin = convertirHoraAMinutos(horaSalida)

            if (horaEntrada && horaSalida) {
                if (entradaMin > salidaMin) {
                    setErrorHoras('La hora de entrada no puede ser posterior a la de salida.')
                    return
                }

                if (salidaMin - entradaMin > 60) {
                    setErrorHoras('La diferencia entre entrada y salida no puede ser mayor a una hora.')
                    return
                }
            }

            try {
                await api.post('/certificados/asistencia', {
                    cita_id: citaId,
                    motivo,
                    hora_entrada: horaEntrada,
                    hora_salida: horaSalida
                })
                await cargarCitas(medicoId)
                onClose()
            } catch (err) {
                if (err.response?.status === 401) {
                    localStorage.clear()
                    navigate('/login')
                } else {
                    alert('Error al guardar certificado de asistencia')
                }
            }
        }

        const convertirHoraAMinutos = (hhmm) => {
            const [h, m] = hhmm.split(':').map(Number)
            return h * 60 + m
        }

        if (!open) return null

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-96 space-y-4">
                    <h2 className="text-xl font-bold text-teal-800">Certificado de Asistencia</h2>

                    <textarea
                        className="input w-full"
                        placeholder="Motivo (opcional)"
                        value={motivo}
                        onChange={e => setMotivo(e.target.value)}
                    />

                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Hora entrada</label>
                            <input
                                type="time"
                                className="input w-full"
                                value={horaEntrada}
                                onChange={e => {
                                    setHoraEntrada(e.target.value)
                                    setErrorHoras('')
                                }}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Hora salida</label>
                            <input
                                type="time"
                                className="input w-full"
                                value={horaSalida}
                                onChange={e => {
                                    setHoraSalida(e.target.value)
                                    setErrorHoras('')
                                }}
                            />
                        </div>
                    </div>

                    {errorHoras && (
                        <div className="text-red-600 text-sm text-center">{errorHoras}</div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2">
                        <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded">Cancelar</button>
                        <button onClick={guardar} className="px-4 py-1 bg-teal-600 text-white rounded">Guardar</button>
                    </div>
                </div>
            </div>
        )
    }


    function ModalVerCertificado({ open, onClose, certificado, tipo }) {
        if (!open || !certificado) return null

        const formato = (str) => new Date(str).toLocaleDateString()

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-[500px] max-w-full space-y-4">
                    <h2 className="text-2xl font-bold text-teal-800 text-center">
                        {tipo === "medico" ? "Certificado Médico" : "Certificado de Asistencia"}
                    </h2>

                    <div className="text-gray-800 space-y-2 text-sm max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
                        <p><strong>Paciente:</strong> {certificado.paciente_nombre}</p>
                        <p><strong>Médico:</strong> {certificado.medico_nombre}</p>
                        <p><strong>Fecha de cita:</strong> {formato(certificado.fecha_cita)}</p>

                        {tipo === "medico" ? (
                            <>
                                <p><strong>Diagnóstico:</strong> {certificado.diagnostico}</p>
                                <p><strong>Días de reposo:</strong> {certificado.reposo_dias}</p>
                                {certificado.observaciones && (
                                    <p><strong>Observaciones:</strong> {certificado.observaciones}</p>
                                )}
                                {/*<p><strong>Emitido el:</strong> {formato(certificado.fecha_emision)}</p>*/}
                            </>
                        ) : (
                            <>
                                {/*<p><strong>Fecha:</strong> {formato(certificado.fecha)}</p>*/}
                                <p><strong>Hora de entrada:</strong> {certificado.hora_entrada}</p>
                                <p><strong>Hora de salida:</strong> {certificado.hora_salida}</p>
                                {certificado.motivo && (
                                    <p><strong>Motivo:</strong> {certificado.motivo}</p>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex justify-end mt-4">
                        <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded">Cerrar</button>
                    </div>
                </div>
            </div>
        )
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
                                            <div className="mt-2 space-x-2">
                                                {cita.certificado_medico ? (
                                                    <button
                                                        className="bg-green-700 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalVerMedico({ open: true, data: cita.certificado_medico })}
                                                    >
                                                        Ver Cert. Médico
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalMedico({ open: true, citaId: cita.id })}
                                                    >
                                                        Cert. Médico
                                                    </button>
                                                )}

                                                {cita.certificado_asistencia ? (
                                                    <button
                                                        className="bg-purple-700 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalVerAsistencia({ open: true, data: cita.certificado_asistencia })}
                                                    >
                                                        Ver Cert. Asistencia
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalAsistencia({ open: true, citaId: cita.id })}
                                                    >
                                                        Cert. Asistencia
                                                    </button>
                                                )}

                                            </div>
                                        )}

                                    </div>
                                )
                            })
                    )}
                </div>

            </div>

            <ModalCertificadoMedico
                open={modalMedico.open}
                citaId={modalMedico.citaId}
                onClose={() => setModalMedico({ open: false, citaId: null })}
            />
            <ModalCertificadoAsistencia
                open={modalAsistencia.open}
                citaId={modalAsistencia.citaId}
                onClose={() => setModalAsistencia({ open: false, citaId: null })}
            />
            <ModalVerCertificado
                open={modalVerMedico.open}
                certificado={modalVerMedico.data}
                tipo="medico"
                onClose={() => setModalVerMedico({ open: false, data: null })}
            />

            <ModalVerCertificado
                open={modalVerAsistencia.open}
                certificado={modalVerAsistencia.data}
                tipo="asistencia"
                onClose={() => setModalVerAsistencia({ open: false, data: null })}
            />


        </div>

    )
}

export default Expedientes
