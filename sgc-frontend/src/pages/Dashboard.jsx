import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import logo from '../assets/logo sgc.png'

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
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 ml-64 flex flex-col justify-center items-center text-center px-4">
        <img src={logo} alt="Logo SGC" className="h-50 w-50 mb-6 drop-shadow-xl" />
        <h1 className="text-4xl font-bold text-teal-800 mb-2">¡Bienvenido al Sistema de Gestión Clínica!</h1>
        <p className="text-lg text-gray-700">Utilice el menú de la izquierda para comenzar.</p>
      </div>
    </div>
  )
}

export default Dashboard
