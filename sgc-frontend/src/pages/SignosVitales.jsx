import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../api/axiosConfig'
import { useNavigate } from 'react-router-dom'

const estadoToColor = {
    para_signos: 'bg-yellow-200 border-yellow-600',
    en_espera: 'bg-blue-200 border-blue-600'
}


function SignosVitales() {
    const [role, setRole] = useState(null)
    const [citas, setCitas] = useState([])
    const [pacientes, setPacientes] = useState({})
    const [medicos, setMedicos] = useState({})
    const [especialidades, setEspecialidades] = useState({})
    const [signosPorCita, setSignosPorCita] = useState({})
    const [modalCita, setModalCita] = useState(null)
    const [signos, setSignos] = useState({
        presion_arterial: '',
        peso: '',
        talla: '',
        temperatura: '',
        saturacion_oxigeno: ''
    })
    const [errores, setErrores] = useState({})

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
            })
            .catch(() => {
                localStorage.clear()
                navigate('/login', { replace: true })
            })
    }, [navigate])

    const cargarCitas = async () => {
        try {
            const res = await api.get('/citas/hoy')
            const citasFiltradas = res.data.filter(c => c.estado === 'para_signos' || c.estado === 'en_espera')
            setCitas(citasFiltradas)

            const pacientesIds = [...new Set(citasFiltradas.map(c => c.paciente_id))]
            const medicosIds = [...new Set(citasFiltradas.map(c => c.medico_id))]

            const pacientesData = {}
            const medicosData = {}
            const especialidadesData = {}
            const signosData = {}

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
                }),
                ...citasFiltradas.map(async (cita) => {
                    try {
                        const res = await api.get(`/signos-vitales/cita/${cita.id}`)
                        signosData[cita.id] = res.data
                    } catch {
                        // No hay signos vitales
                    }
                })
            ])

            setPacientes(pacientesData)
            setMedicos(medicosData)
            setEspecialidades(especialidadesData)
            setSignosPorCita(signosData)
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


    const abrirModal = (cita) => {
        setModalCita(cita)
        setSignos({
            presion_arterial: '',
            peso: '',
            talla: '',
            temperatura: '',
            saturacion_oxigeno: ''
        })
        setErrores({})
    }

    const validarCampo = (name, value) => {
        switch (name) {
            case 'presion_arterial':
                if (!value) return 'Campo obligatorio.'
                if (!/^\d{2,3}\/\d{2,3}$/.test(value)) return 'Formato inválido (ej: 120/80).'
                const [sistolica, diastolica] = value.split('/').map(Number)
                if (sistolica < 60 || sistolica > 140) return 'Sistólica debe ser entre 60 y 140.'
                if (diastolica < 30 || diastolica > 110) return 'Diastólica debe ser entre 30 y 110.'
                return ''
            case 'peso':
                if (!value) return 'Campo obligatorio.'
                const pesoNum = parseFloat(value)
                if (pesoNum < 1 || pesoNum > 120) return 'Peso debe ser entre 2 y 120 kg.'
                return ''
            case 'talla':
                if (!value) return 'Campo obligatorio.'
                const tallaNum = parseFloat(value)
                if (tallaNum < 80 || tallaNum > 200) return 'Talla debe ser entre 80 cm y 200 cm.'
                return ''
            case 'temperatura':
                if (!value) return 'Campo obligatorio.'
                const tempNum = parseFloat(value)
                if (tempNum < 35 || tempNum > 41.5) return 'Temperatura debe ser entre 35 y 41.5 °C.'
                return ''
            case 'saturacion_oxigeno':
                if (!value) return 'Campo obligatorio.'
                const satNum = parseFloat(value)
                if (satNum < 50 || satNum > 100) return 'Saturación debe ser entre 50 y 100 %.'
                return ''
            default:
                return ''
        }
    }


    const handleChange = (e) => {
        const { name, value } = e.target
        setSignos(prev => ({ ...prev, [name]: value }))

        const error = validarCampo(name, value)
        setErrores(prev => ({ ...prev, [name]: error }))
    }

    const guardarSignos = async () => {
        // Validar todos los campos antes de enviar
        const nuevosErrores = {}
        Object.entries(signos).forEach(([campo, valor]) => {
            const msg = validarCampo(campo, valor)
            if (msg) nuevosErrores[campo] = msg
        })
        setErrores(nuevosErrores)

        if (Object.keys(nuevosErrores).length > 0) return

        try {
            await api.post('/signos-vitales', { cita_id: modalCita.id, ...signos })
            setModalCita(null)
            cargarCitas()
        } catch (err) {
            alert('Error al guardar signos')
        }
    }
    const citasOrdenadas = [...citas].sort((a, b) => {
        if (a.estado === 'para_signos' && b.estado !== 'para_signos') return -1;
        if (a.estado !== 'para_signos' && b.estado === 'para_signos') return 1;
        return 0;
    });

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-white to-cyan-100">
            <Sidebar role={role} />

            <div className="flex-1 p-8 ml-64">
                <h1 className="text-3xl font-bold text-teal-800 mb-6">Signos Vitales</h1>

                <div className="space-y-4">
                    {/* Ordena las citas antes de mapearlas */}
                    {([...citas].sort((a, b) => {
                        if (a.estado === 'para_signos' && b.estado !== 'para_signos') return -1;
                        if (a.estado !== 'para_signos' && b.estado === 'para_signos') return 1;
                        return 0;
                    })).map(cita => {
                        const paciente = pacientes[cita.paciente_id];
                        const medico = medicos[cita.medico_id];
                        const especialidad = especialidades[cita.medico_id];
                        const signosCita = signosPorCita[cita.id];

                        return (
                            <div
                                key={cita.id}
                                className={`border-l-8 shadow ${estadoToColor[cita.estado.replace(' ', '_')] || 'bg-gray-100 border'} p-4 rounded`}
                            >
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    {/* Sección izquierda: Datos del paciente y cita */}
                                    <div className="flex-1">
                                        <p><strong>Paciente:</strong> {paciente?.nombre} {paciente?.apellido}</p>
                                        <p><strong>Cédula:</strong> {paciente?.cedula}</p>
                                        <p><strong>Médico:</strong> {medico?.nombre} {medico?.apellido} ({especialidad || '—'})</p>
                                        <p><strong>Hora:</strong> {cita.hora_inicio} - {cita.hora_fin}</p>
                                        <p><strong>Estado:</strong> {cita.estado}</p>

                                        {cita.estado === 'para_signos' && (
                                            <button
                                                onClick={() => abrirModal(cita)}
                                                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm"
                                            >
                                                Ingresar Signos Vitales
                                            </button>
                                        )}
                                    </div>

                                    {/* Sección derecha: Signos vitales (si existen) */}
                                    {signosCita && signosCita.signos_vitales && (
                                        <div className="flex-1 border-l md:border-l-2 border-gray-300 pl-4 text-sm text-gray-700">
                                            <p><strong>Presión arterial:</strong> {signosCita.signos_vitales.presion_arterial}</p>
                                            <p><strong>Peso:</strong> {signosCita.signos_vitales.peso} kg</p>
                                            <p><strong>Talla:</strong> {signosCita.signos_vitales.talla} cm</p>
                                            <p><strong>Temperatura:</strong> {signosCita.signos_vitales.temperatura} °C</p>
                                            <p><strong>Saturación de oxígeno:</strong> {signosCita.signos_vitales.saturacion_oxigeno} %</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>

            {modalCita && (
                <div className="fixed inset-0 bg-/50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 w-full max-w-lg rounded shadow-lg">
                        <h3 className="text-2xl font-bold mb-4">Ingresar Signos Vitales</h3>
                        <div className="space-y-2">
                            {[
                                { name: 'presion_arterial', placeholder: 'Presión arterial (mmHg) (ej: 120/80)' },
                                { name: 'peso', placeholder: 'Peso (kg)', type: 'number' },
                                { name: 'talla', placeholder: 'Talla (cm)', type: 'number' },
                                { name: 'temperatura', placeholder: 'Temperatura (°C)', type: 'number' },
                                { name: 'saturacion_oxigeno', placeholder: 'Saturación de oxígeno (%)', type: 'number' }
                            ].map(field => (
                                <div key={field.name} className="flex flex-col">
                                    <input
                                        name={field.name}
                                        placeholder={field.placeholder}
                                        type={field.type || 'text'}
                                        value={signos[field.name]}
                                        onChange={handleChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                                                e.preventDefault()
                                            }
                                        }}
                                        className="w-full border p-2 rounded"
                                    />

                                    {errores[field.name] && (
                                        <span className="text-red-500 text-sm">{errores[field.name]}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-end space-x-2">
                            <button onClick={guardarSignos} className="bg-green-600 text-white px-4 py-2 rounded">Guardar</button>
                            <button onClick={() => setModalCita(null)} className="bg-gray-400 px-4 py-2 rounded">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SignosVitales
