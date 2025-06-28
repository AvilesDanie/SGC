import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo sgc.png'

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
        <div className="h-screen flex justify-center items-center bg-gradient-to-br from-teal-100 to-cyan-200">
            <form
                onSubmit={handleLogin}
                className="bg-white shadow-xl rounded-2xl px-10 py-8 w-full max-w-md animate-fade-in"
            >
                <div className="flex justify-center mb-6">
                    <img src={logo} alt="Logo SGC" className="h-20 w-auto" />
                </div>
                <h2 className="text-2xl font-semibold text-center text-gray-700 mb-4">Iniciar Sesión</h2>
                {error && <p className="text-red-600 text-sm mb-3 text-center">{error}</p>}
                <label className="block mb-2 text-gray-700 font-medium">Usuario</label>
                <input
                    type="text"
                    placeholder="Ingrese su usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full border border-gray-300 rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <label className="block mb-2 text-gray-700 font-medium">Contraseña</label>
                <input
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold w-full py-2 rounded-lg transition duration-200"
                >
                    Ingresar
                </button>
            </form>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.6s ease-out;
                }
            `}</style>
        </div>
    )
}

export default LoginPage
