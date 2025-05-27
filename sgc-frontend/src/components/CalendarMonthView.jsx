import { useState, useEffect } from 'react'
import { format } from 'date-fns'

import {
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isBefore,
  isSameDay
} from 'date-fns'
import { es } from 'date-fns/locale'

function CalendarMonthView({ medico, citas, onSelectDay }) {
  const [meses, setMeses] = useState([])

  useEffect(() => {
    const hoy = new Date()
    const listaMeses = []

    for (let i = 0; i <= 12; i++) {
      listaMeses.push(addMonths(hoy, i))
    }

    setMeses(listaMeses)
  }, [])

  const normalizar = str =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const getDiaEstado = (fecha) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0) // Normalizamos hora de hoy
    fecha.setHours(0, 0, 0, 0)

    if (isBefore(fecha, hoy)) return null // Bloqueamos días pasados (sin color y deshabilitados)

    const diaNombre = normalizar(
      fecha.toLocaleDateString('es-EC', { weekday: 'long' })
    )

    const horario = medico.horario?.find(h => normalizar(h.dia) === diaNombre)
    if (!horario) return null

    const diaISO = fecha.toISOString().split('T')[0]
    const citasDelDia = citas.filter(c => c.fecha === diaISO)

    const duracionCitas = citasDelDia.reduce((total, cita) => {
      const ini = new Date(`${cita.fecha}T${cita.hora_inicio}`)
      const fin = new Date(`${cita.fecha}T${cita.hora_fin}`)
      return total + (fin - ini)
    }, 0)

    const iniLaboral = new Date(`${diaISO}T${horario.hora_inicio}`)
    const finLaboral = new Date(`${diaISO}T${horario.hora_fin}`)
    const duracionLaboral = finLaboral - iniLaboral

    if (duracionCitas >= duracionLaboral) return 'bg-red-500'
    if (duracionCitas === 0) return 'bg-green-500'
    return 'bg-yellow-400'
  }


  return (
    <div className="space-y-8">
      {meses.map((mes, i) => {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const inicioMes = i === 0 ? hoy : startOfMonth(mes)
        const finMes = endOfMonth(mes)

        const dias = eachDayOfInterval({
          start: startOfWeek(inicioMes, { weekStartsOn: 1 }),
          end: endOfWeek(finMes, { weekStartsOn: 1 }),
        })

        return (
          <div key={i}>
            <h3 className="text-lg font-bold text-teal-700 mb-2">
              {format(mes, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-sm text-center">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} className="font-semibold">{d}</div>
              ))}

              {dias.map(dia => {
                const color = getDiaEstado(new Date(dia))
                const esDelMes = dia.getMonth() === mes.getMonth()

                const hoy = new Date()
                hoy.setHours(0, 0, 0, 0)
                dia.setHours(0, 0, 0, 0)

                const esFuturoOHoy = !isBefore(dia, hoy)

                return (
                  <button
                    key={dia}
                    onClick={() => onSelectDay(dia)}
                    disabled={!esDelMes || !esFuturoOHoy}
                    className={`aspect-square rounded ${color || 'bg-gray-200'
                      } ${!esDelMes || !esFuturoOHoy ? 'opacity-40 cursor-default' : 'hover:opacity-80'}`}
                    title={format(dia, 'PPP', { locale: es })}
                  >
                    {format(dia, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CalendarMonthView
