import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            const res = await axios.post('http://localhost:8000/token', new URLSearchParams({
                username,
                password
            }))

            const { access_token } = res.data
            localStorage.setItem('token', access_token)

            // Opcional: consultar /me para saber el rol
            const me = await axios.get('http://localhost:8000/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            })

            const role = me.data.role
            localStorage.setItem('role', role)
            navigate('/dashboard')
        } catch (err) {
            setError('Credenciales inválidas')
        }
    }

    return (
        <div className="h-screen flex justify-center items-center bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white shadow-md rounded p-6 w-80">
                <h2 className="text-xl font-bold mb-4">Iniciar Sesión</h2>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <input type="text" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} className="w-full border p-2 mb-3 rounded" />
                <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2 mb-4 rounded" />
                <button className="bg-blue-500 hover:bg-blue-600 text-white w-full py-2 rounded">Ingresar</button>
                <p className="mt-4 text-sm text-center">
                    ¿No tienes cuenta? <a href="/registro-paciente" className="text-blue-600">Regístrate</a>
                </p>
            </form>
        </div>
    )
}

export default LoginPage
