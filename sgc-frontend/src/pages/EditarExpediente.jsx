import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api/axiosConfig'

function calcularEdad(fechaNacimiento) {
  const nacimiento = new Date(fechaNacimiento)
  const hoy = new Date()
  let años = hoy.getFullYear() - nacimiento.getFullYear()
  let meses = hoy.getMonth() - nacimiento.getMonth()
  let dias = hoy.getDate() - nacimiento.getDate()

  if (dias < 0) {
    meses--
    dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate()
  }
  if (meses < 0) {
    años--
    meses += 12
  }

  return `${años} años, ${meses} meses, ${dias} días`
}

function EditarExpediente() {
  const { id } = useParams() // cita_id
  const [role, setRole] = useState(null)
  const [cita, setCita] = useState(null)
  const [paciente, setPaciente] = useState(null)
  const [signos, setSignos] = useState(null)
  const [expediente, setExpediente] = useState([])
  const [nota, setNota] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return navigate('/login')

    api.get('/me')
      .then(res => {
        setRole(res.data.role)
        cargarDatos()
      })
      .catch(() => {
        localStorage.clear()
        navigate('/login')
      })
  }, [id, navigate])

  const cargarDatos = async () => {
    try {
      const resCita = await api.get(`/citas/${id}`)
      const resPaciente = await api.get(`/pacientes/${resCita.data.paciente_id}`)
      const resSignos = await api.get(`/signos-vitales/cita/${id}`)
      const resExpediente = await api.get(`/expedientes/paciente/${resCita.data.paciente_id}`)

      setCita(resCita.data)
      setPaciente(resPaciente.data)
      setSignos(resSignos.data.signos_vitales)
      setExpediente(resExpediente.data)
    } catch (err) {
      console.error(err)
    }
  }

  const guardarNota = async () => {
    try {
      await api.post('/expedientes', {
        cita_id: cita.id,
        contenido: `🩺 Signos vitales:\n${JSON.stringify(signos, null, 2)}\n\n📝 Nota del médico:\n${nota}`
      })
      await api.put(`/citas/${cita.id}/estado`, { estado: 'terminado' })

      navigate('/dashboard/expedientes') // <- Redirigir aquí
    } catch (err) {
      alert('Error al guardar expediente')
    }
  }


  if (!cita || !paciente || !signos) return <div className="p-8">Cargando...</div>

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 p-8 ml-64">
        <h1 className="text-3xl font-bold text-teal-800 mb-4">Expediente del Paciente</h1>

        <div className="mb-6 bg-white shadow p-4 rounded">
          <p><strong>Nombre:</strong> {paciente.nombre} {paciente.apellido}</p>
          <p><strong>Cédula:</strong> {paciente.cedula}</p>
          <p><strong>Fecha de nacimiento:</strong> {new Date(paciente.fecha_nacimiento).toLocaleDateString()}</p>
          <p><strong>Edad:</strong> {calcularEdad(paciente.fecha_nacimiento)}</p>
        </div>

        <div className="mb-6 bg-white shadow p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Signos Vitales de la Cita</h2>
          <p><strong>Presión arterial:</strong> {signos.presion_arterial}</p>
          <p><strong>Peso:</strong> {signos.peso} kg</p>
          <p><strong>Talla:</strong> {signos.talla} cm</p>
          <p><strong>Temperatura:</strong> {signos.temperatura} °C</p>
          <p><strong>Saturación de oxígeno:</strong> {signos.saturacion_oxigeno} %</p>
        </div>

        

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Nueva Nota</h2>
          <textarea
            rows="8"
            className="w-full border p-2 rounded"
            placeholder="Escriba aquí las notas del médico..."
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
          <button
            onClick={guardarNota}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
          >
            Guardar Nota
          </button>
        </div>






        <div className="space-y-4 mb-6">
          <br />
          <h1 className="text-2xl font-bold text-teal-800 mb-4">Historial del Expediente</h1>
          {expediente.map((entry, index) => (
            <div key={index} className="bg-gray-100 p-4 rounded shadow">
              <p className="text-sm text-gray-500">📅 {new Date(entry.fecha).toLocaleString()}</p>
              <div className="mt-2 text-sm space-y-2">
                {entry.contenido.split('\n\n').map((section, idx) => {
                  if (section.startsWith('🩺 Signos vitales:')) {
                    try {
                      const jsonPart = section.split('🩺 Signos vitales:\n')[1]
                      const datos = JSON.parse(jsonPart)

                      return (
                        <div key={idx} className="bg-white p-3 rounded border">
                          <h3 className="font-semibold mb-1">🩺 Signos Vitales:</h3>
                          <p><strong>Presión arterial:</strong> {datos.presion_arterial}</p>
                          <p><strong>Peso:</strong> {datos.peso} kg</p>
                          <p><strong>Talla:</strong> {datos.talla} cm</p>
                          <p><strong>Temperatura:</strong> {datos.temperatura} °C</p>
                          <p><strong>Saturación de oxígeno:</strong> {datos.saturacion_oxigeno} %</p>
                        </div>
                      )
                    } catch (e) {
                      return <pre key={idx} className="whitespace-pre-wrap">{section}</pre>
                    }
                  } else if (section.startsWith('📝 Nota del médico:')) {
                    const nota = section.replace('📝 Nota del médico:\n', '')
                    return (
                      <div key={idx} className="bg-white p-3 rounded border">
                        <h3 className="font-semibold mb-1">📝 Nota del médico:</h3>
                        <p>{nota}</p>
                      </div>
                    )
                  } else {
                    return <pre key={idx} className="whitespace-pre-wrap">{section}</pre>
                  }
                })}
              </div>

            </div>
          ))}
        </div>

      </div>



    </div>
  )
}

export default EditarExpediente
