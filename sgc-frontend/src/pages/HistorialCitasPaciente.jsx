import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api/axiosConfig'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  const [modalReceta, setModalReceta] = useState({ open: false, recetaId: null })

  const abrirReceta = async (citaId) => {
    try {
      const receta = await api.get(`/recetas/cita/${citaId}`).then(r => r.data).catch(() => null)
      if (receta) {
        setModalReceta({ open: true, recetaId: receta.id })
      } else {
        alert("No hay receta registrada para esta cita.")
      }
    } catch (err) {
      alert('Error al cargar receta')
    }
  }


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

  const [modalCert, setModalCert] = useState({ open: false, tipo: null, data: null })

  const abrirCertificado = async (tipo, citaId) => {
    try {
      const endpoint = tipo === 'medico'
        ? `/certificados/medico/${citaId}`
        : `/certificados/asistencia/${citaId}`
      const res = await api.get(endpoint)
      setModalCert({ open: true, tipo, data: res.data })
    } catch (err) {
      alert('Error al cargar el certificado')
    }
  }



  function ModalVerCertificado({ open, tipo, data, onClose }) {
    if (!open || !data) return null

    const formato = str => new Date(str).toLocaleDateString()

    const descargarPDF = async () => {
      const input = document.getElementById('pdf-content')
      const canvas = await html2canvas(input)
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${tipo === 'medico' ? 'certificado_medico' : 'certificado_asistencia'}.pdf`)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-lg w-[500px] max-w-full space-y-4 relative">
          <h2 className="text-2xl font-bold text-teal-800 text-center">
            {tipo === "medico" ? "Certificado Médico" : "Certificado de Asistencia"}
          </h2>

          <div
            id="pdf-content"
            style={{
              maxWidth: '500px',
              padding: '30px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              lineHeight: '1.6',
              border: '1px solid #ccc',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              overflow: 'hidden',
            }}
          >

            <h3 style={{
              textAlign: 'center',
              fontSize: '18px',
              textDecoration: 'underline',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}>
              {tipo === "medico" ? "CERTIFICADO MÉDICO" : "CERTIFICADO DE ASISTENCIA"}
            </h3>

            <p><strong>Paciente:</strong> {data.paciente_nombre}</p>
            <p><strong>Médico:</strong> {data.medico_nombre}</p>
            <p><strong>Fecha de cita:</strong> {formato(data.fecha_cita)}</p>

            {tipo === "medico" ? (
              <>
                <p><strong>Diagnóstico:</strong> {data.diagnostico}</p>
                <p><strong>Días de reposo:</strong> {data.reposo_dias}</p>
                {data.observaciones && <p><strong>Observaciones:</strong> {data.observaciones}</p>}
                <p><strong>Emitido el:</strong> {formato(data.fecha_emision)}</p>
              </>
            ) : (
              <>
                <p><strong>Fecha:</strong> {formato(data.fecha)}</p>
                <p><strong>Hora de entrada:</strong> {data.hora_entrada}</p>
                <p><strong>Hora de salida:</strong> {data.hora_salida}</p>
                {data.motivo && <p><strong>Motivo:</strong> {data.motivo}</p>}
              </>
            )}
          </div>

          <div className="flex justify-end mt-4 space-x-2">
            <button onClick={descargarPDF} className="px-4 py-1 bg-teal-600 text-white rounded">
              Descargar PDF
            </button>
            <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded">Cerrar</button>
          </div>
        </div>
      </div>
    )
  }


  function ModalVerReceta({ open, recetaId, onClose }) {
    const [receta, setReceta] = useState(null)

    const cargarReceta = async () => {
      if (!recetaId) return
      try {
        const res = await api.get(`/recetas/${recetaId}`)
        setReceta(res.data)
      } catch (err) {
        console.error('Error cargando receta:', err)
      }
    }

    useEffect(() => {
      if (open) cargarReceta()
    }, [open, recetaId])

    useEffect(() => {
      if (!recetaId) return
      const ws = new WebSocket('ws://localhost:8000/ws/medicamentos')
      ws.onmessage = async (event) => {
        const { evento } = JSON.parse(event.data)
        if (["crear", "actualizar", "eliminar"].includes(evento)) {
          cargarReceta()
        }
      }
      return () => ws.close()
    }, [recetaId])

    if (!open || !receta) return null

    const formatoFecha = (str) => new Date(str).toLocaleDateString()

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-lg w-[700px] max-w-full space-y-4">
          <h2 className="text-2xl font-bold text-teal-800 text-center">Receta Médica</h2>

          <div className="text-gray-800 text-sm space-y-2 max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
            <p><strong>Paciente:</strong> {receta.paciente_nombre}</p>
            <p><strong>Médico:</strong> {receta.medico_nombre}</p>
            <p><strong>Fecha de emisión:</strong> {formatoFecha(receta.fecha_emision)}</p>
            {receta.observaciones && (
              <p><strong>Observaciones:</strong> {receta.observaciones}</p>
            )}
            <hr className="my-2" />
            <h3 className="text-lg font-semibold text-teal-700 mb-1">Medicamentos:</h3>
            {receta.medicamentos.length === 0 ? (
              <p>No se registraron medicamentos.</p>
            ) : (
              receta.medicamentos.map((m, i) => {
                let estadoTexto = 'Disponible'
                let color = 'text-green-700'

                if (m.stock === 0 || m.disponible === false) {
                  estadoTexto = 'Agotado'
                  color = 'text-red-600'
                } else if (m.stock <= 10) {
                  estadoTexto = 'Casi agotado'
                  color = 'text-yellow-600'
                }

                return (
                  <div key={i} className="border-b pb-2 mb-2">
                    <div className="flex justify-between items-center">
                      <p><strong>Medicamento:</strong> {m.medicamento_nombre}</p>
                      <span className={`text-sm font-semibold ${color}`}>● {estadoTexto}</span>
                    </div>
                    <p><strong>Dosis:</strong> {m.dosis}</p>
                    <p><strong>Frecuencia:</strong> {m.frecuencia}</p>
                    <p><strong>Duración:</strong> {m.duracion}</p>
                    {m.indicaciones && <p><strong>Indicaciones:</strong> {m.indicaciones}</p>}
                  </div>
                )
              })
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded">Cerrar</button>
          </div>
        </div>
      </div>
    )
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
                  {cita.estado === 'terminado' && (
                    <div className="mt-2 space-x-2">
                      {cita.certificado_medico && (
                        <button
                          onClick={() => abrirCertificado("medico", cita.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Ver Cert. Médico
                        </button>
                      )}
                      {cita.certificado_asistencia && (
                        <button
                          onClick={() => abrirCertificado("asistencia", cita.id)}
                          className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Ver Cert. Asistencia
                        </button>
                      )}
                      {cita.tiene_receta && (
                        <button
                          onClick={() => abrirReceta(cita.id)}
                          className="bg-cyan-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Ver Receta
                        </button>
                      )}


                    </div>
                  )}

                </div>
              ))
          )}
        </div>
      </div>
      <ModalVerCertificado
        open={modalCert.open}
        tipo={modalCert.tipo}
        data={modalCert.data}
        onClose={() => setModalCert({ open: false, tipo: null, data: null })}
      />

      <ModalVerReceta
        open={modalReceta.open}
        recetaId={modalReceta.recetaId}
        onClose={() => setModalReceta({ open: false, recetaId: null })}
      />


    </div>
  )
}

export default HistorialCitasPaciente
