import { useState } from 'react'
import api from '../api/axiosConfig'

function CalendarDayView({ fecha, medico, citas, setCitas, onVolver, paciente }) {
    const normalizar = str =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

    const diaNombre = normalizar(
        fecha.toLocaleDateString('es-EC', { weekday: 'long' })
    )

    const horario = medico.horario?.find(h => normalizar(h.dia) === diaNombre)
    const [inicio, setInicio] = useState('')
    const [fin, setFin] = useState('')
    const [modal, setModal] = useState(null)

    if (!horario) {
        return (
            <div className="text-center">
                <p className="text-red-600 font-semibold">El médico no tiene horario laboral para este día.</p>
                <button className="mt-4 bg-gray-300 px-4 py-2 rounded" onClick={onVolver}>Volver al calendario</button>
            </div>
        )
    }

    const strToDateTime = (t) => {
        const [h, m] = t.split(':').map(Number)
        const d = new Date(fecha)
        d.setHours(h, m, 0, 0)
        return d
    }

    const generarSegmentos = () => {
        const horaInicio = strToDateTime(horario.hora_inicio)
        const horaFin = strToDateTime(horario.hora_fin)

        const eventos = citas
            .filter(c => c.fecha === fecha.toISOString().split('T')[0])
            .flatMap(c => [
                { tiempo: strToDateTime(c.hora_inicio), tipo: 'start' },
                { tiempo: strToDateTime(c.hora_fin), tipo: 'end' }
            ])
            .sort((a, b) => a.tiempo - b.tiempo)

        const segmentos = []
        let actual = new Date(horaInicio)
        let ocupado = false

        for (const evento of eventos) {
            if (evento.tiempo > actual) {
                segmentos.push({
                    desde: actual.toTimeString().slice(0, 5),
                    hasta: evento.tiempo.toTimeString().slice(0, 5),
                    ocupado
                })
            }
            ocupado = evento.tipo === 'start'
            actual = evento.tiempo
        }

        if (actual < horaFin) {
            segmentos.push({
                desde: actual.toTimeString().slice(0, 5),
                hasta: horaFin.toTimeString().slice(0, 5),
                ocupado
            })
        }

        return segmentos
    }

    const segmentos = generarSegmentos()

    const handleCrearCita = async () => {
        if (!paciente || !inicio || !fin) return

        const iniDate = strToDateTime(inicio)
        const finDate = strToDateTime(fin)
        const diferencia = (finDate - iniDate) / (1000 * 60) // en minutos
        if (diferencia < 10) {
            setModal({ tipo: 'error', mensaje: 'La duración mínima de la cita debe ser de 10 minutos.' })
            return
        }

        const payload = {
            paciente_id: paciente.id,
            medico_id: medico.id,
            fecha: fecha.toISOString().split('T')[0],
            hora_inicio: inicio,
            hora_fin: fin,
            estado: 'agendado'
        }

        try {
            await api.post('/citas', payload)
            setModal({ tipo: 'success', mensaje: 'Cita creada exitosamente.' })
            setInicio('')
            setFin('')
        } catch (err) {
            const detalle = err.response?.data?.detail || 'Error al crear cita'
            setModal({ tipo: 'error', mensaje: detalle })
        }
    }

    const cerrarModal = async () => {
        if (modal?.tipo === 'success') {
            try {
                const res = await api.get(`/citas/medico/${medico.id}`)
                setCitas(res.data)
            } catch (err) {
                console.error('Error actualizando citas:', err)
            }
        }
        setModal(null)
    }



    return (
        <div>
            <h3 className="text-lg font-bold text-teal-800 mb-4">
                Horario del {fecha.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                {segmentos.map((seg, i) => (
                    <div
                        key={i}
                        className={`text-center py-2 rounded font-mono ${seg.ocupado ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                            }`}
                    >
                        {seg.desde} - {seg.hasta}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-end gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium">Hora inicio</label>
                    <input
                        type="time"
                        value={inicio}
                        min={horario.hora_inicio}
                        max={horario.hora_fin}
                        onChange={e => setInicio(e.target.value)}
                        className="input"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Hora fin</label>
                    <input
                        type="time"
                        value={fin}
                        min={inicio || horario.hora_inicio}
                        max={horario.hora_fin}
                        onChange={e => setFin(e.target.value)}
                        className="input"
                    />
                </div>

                <button
                    disabled={!inicio || !fin}
                    className={`px-5 py-2 rounded font-medium text-white ${inicio && fin ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-400 cursor-not-allowed'
                        }`}
                    onClick={handleCrearCita}
                >
                    Generar cita
                </button>
            </div>

            <button className="text-sm underline text-gray-600" onClick={onVolver}>
                ← Volver al calendario
            </button>

            {modal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
                        <h3 className={`text-xl font-bold mb-2 ${modal.tipo === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                            {modal.tipo === 'error' ? 'Error' : 'Éxito'}
                        </h3>
                        <p className="text-gray-700 mb-4">{modal.mensaje}</p>
                        <button
                            onClick={cerrarModal}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CalendarDayView
