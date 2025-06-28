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
    const [filtros, setFiltros] = useState({
        cedula: '',
        nombre: '',
        medico: ''
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
                cargarCitas()
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
        const matchMedico = (`${medico.nombre} ${medico.apellido}`).toLowerCase().includes(filtros.medico.toLowerCase())

        return matchCedula && matchNombre && matchMedico
    }
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
        if (!value) return 'Campo obligatorio.';

        if (name === 'presion_arterial') {
            if (!/^\d{2,3}\/\d{2,3}$/.test(value)) return 'Formato inválido (ej: 120/80).';
            const [sistolica, diastolica] = value.split('/').map(Number);
            if (sistolica < 60 || sistolica > 140) return 'Sistólica debe ser entre 60 y 140.';
            if (diastolica < 30 || diastolica > 110) return 'Diastólica debe ser entre 30 y 110.';
            return '';
        }

        const config = {
            peso: { min: 2.5, max: 120, label: 'Peso', unidad: 'kg' },
            talla: { min: 50, max: 220, label: 'Talla', unidad: 'cm' },
            temperatura: { min: 35, max: 41.5, label: 'Temperatura', unidad: '°C' },
            saturacion_oxigeno: { min: 50, max: 100, label: 'Saturación', unidad: '%' }
        };

        if (config[name]) {
            const { min, max, label, unidad } = config[name];
            const num = parseFloat(value);
            if (isNaN(num)) return `${label} debe ser numérico.`;
            if (num < min || num > max) return `${label} debe ser entre ${min} y ${max} ${unidad}.`;
            return '';
        }

        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target
        const nuevoSigno = { ...signos, [name]: value }

        const errorActual = validarCampo(name, value)

        const pesoStr = nuevoSigno.peso
        const tallaStr = nuevoSigno.talla
        const pesoErr = validarCampo('peso', pesoStr)
        const tallaErr = validarCampo('talla', tallaStr)

        const nuevosErrores = {
            ...errores,
            [name]: errorActual
        }

        if (name !== 'peso' && pesoErr) nuevosErrores.peso = pesoErr
        if (name !== 'talla' && tallaErr) nuevosErrores.talla = tallaErr

        if (!pesoErr && !tallaErr) {
            const peso = parseFloat(pesoStr)
            const talla = parseFloat(tallaStr)
            const imc = peso / Math.pow(talla / 100, 2)
            const imcRounded = Math.round(imc * 10) / 10

            if (imcRounded < 10 || imcRounded > 60) {
                const imcText = `⚠️ IMC fuera de rango (${imcRounded}).`

                let minPeso = (10 * Math.pow(talla / 100, 2))
                let maxPeso = (60 * Math.pow(talla / 100, 2))
                minPeso = Math.max(minPeso, 2.5)
                maxPeso = Math.min(maxPeso, 120)

                let minTalla = Math.sqrt(peso / 60) * 100
                let maxTalla = Math.sqrt(peso / 10) * 100
                minTalla = Math.max(minTalla, 50)
                maxTalla = Math.min(maxTalla, 220)

                nuevosErrores.peso = `${imcText} Peso ideal: ${minPeso.toFixed(2)} - ${maxPeso.toFixed(2)} kg.`
                nuevosErrores.talla = `${imcText} Talla ideal: ${minTalla.toFixed(2)} - ${maxTalla.toFixed(2)} cm.`

            } else {
                delete nuevosErrores.peso
                delete nuevosErrores.talla
            }

        }

        setSignos(nuevoSigno)
        setErrores(nuevosErrores)
    }

    const guardarSignos = async () => {
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
            const mensaje = err?.response?.data?.detail || 'Ocurrió un error al guardar los signos vitales.';
            alert(mensaje);

        }
    }



    return (
        <div className="flex min-h-screen bg-gradient-to-br from-white to-cyan-100">
            <Sidebar role={role} />
            <div className="flex-1 p-8 ml-64">
                <h1 className="text-3xl font-bold text-teal-800 mb-6">Signos Vitales</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                </div>
                <div className="space-y-4">
                    {[...citas].filter(filtrar).length === 0 ? (
                        <div className="text-center mt-20 text-2xl text-gray-500 font-semibold">
                            🕐 No hay citas pendientes para signos vitales o los filtros no coinciden.
                        </div>
                    ) : (
                        [...citas]
                            .sort((a, b) => {
                                if (a.estado === 'para_signos' && b.estado !== 'para_signos') return -1;
                                if (a.estado !== 'para_signos' && b.estado === 'para_signos') return 1;
                                return 0;
                            })
                            .filter(filtrar)
                            .map(cita => {

                                const paciente = pacientes[cita.paciente_id];
                                const medico = medicos[cita.medico_id];
                                const especialidad = especialidades[cita.medico_id];
                                const signosCita = signosPorCita[cita.id];

                                return (
                                    <div
                                        key={cita.id}
                                        className={`border-l-8 shadow ${estadoToColor[cita.estado.replace(' ', '_')] || 'bg-gray-100 border'
                                            } p-4 rounded`}
                                    >

                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            <div className="flex-1">
                                                <p><strong>Paciente:</strong> {paciente?.nombre} {paciente?.apellido}</p>
                                                <p>
                                                    <strong>
                                                        Cédula:
                                                    </strong>
                                                    {paciente?.cedula}
                                                </p>
                                                <p>
                                                    <strong>
                                                        Médico:
                                                    </strong>
                                                    {' '}
                                                    <span>
                                                        {`${medico?.nombre ?? ''} ${medico?.apellido ?? ''}`}{" "}
                                                        {especialidad ? `(${especialidad})` : "(\u2014)"}
                                                    </span>
                                                </p>


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

                                            {signosCita?.signos_vitales && (
                                                <div className="flex-1 border-l md:border-l-2 border-gray-300 pl-4 text-sm text-gray-700">
                                                    <p>
                                                        <strong>
                                                            Presión arterial:
                                                        </strong>
                                                        {signosCita.signos_vitales.presion_arterial}
                                                    </p>
                                                    <p><strong>Peso:</strong> {signosCita.signos_vitales.peso} kg</p>
                                                    <p><strong>Talla:</strong> {signosCita.signos_vitales.talla} cm</p>
                                                    <p>
                                                        <strong>
                                                            Temperatura:
                                                        </strong>
                                                        {signosCita.signos_vitales.temperatura}
                                                        °C
                                                    </p>
                                                    <p>
                                                        <strong>
                                                            Saturación de oxígeno:
                                                        </strong>
                                                        {signosCita.signos_vitales.saturacion_oxigeno}
                                                        %
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                    )}
                </div>
            </div>

            {modalCita && (
                <div className="fixed inset-0 bg-gray-800/50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 w-full max-w-lg rounded shadow-lg">
                        <h3 className="text-2xl font-bold mb-4">Ingresar Signos Vitales</h3>
                        <div className="space-y-2">
                            {[
                                { name: 'presion_arterial', label: 'Presión arterial (mmHg)', placeholder: 'Ej: 120/80' },
                                { name: 'peso', label: 'Peso (kg)', type: 'number', placeholder: 'Ej: 70' },
                                { name: 'talla', label: 'Talla (cm)', type: 'number', placeholder: 'Ej: 170' },
                                { name: 'temperatura', label: 'Temperatura (°C)', type: 'number', placeholder: 'Ej: 36.5' },
                                { name: 'saturacion_oxigeno', label: 'Saturación de oxígeno (%)', type: 'number', placeholder: 'Ej: 98' }
                            ].map(field => (
                                <div key={field.name} className="flex flex-col">
                                    <label className="text-sm font-medium mb-1">{field.label}</label>
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
                                    {errores[field.name]?.trim() && (
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
