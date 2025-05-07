import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function Dashboard() {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    axios.get('http://localhost:8000/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setRole(res.data.role)
        setLoading(false)
      })
      .catch(() => {
        localStorage.clear()
        navigate('/login')
      })
  }, [])

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="flex h-screen">
      <Sidebar role={role} />
      <div className="flex-1 p-6 ml-64">
        <h1 className="text-2xl font-bold mb-4">Bienvenido al sistema</h1>
        <p>Seleccione una opción del menú.</p>
      </div>
    </div>
  )
}

export default Dashboard
