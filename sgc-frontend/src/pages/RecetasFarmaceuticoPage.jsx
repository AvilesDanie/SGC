import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/recetas';

const RecetasFarmaceuticoPage = () => {
    const [recetas, setRecetas] = useState([]);
    const [seleccionados, setSeleccionados] = useState({});
    const [role, setRole] = useState('');
    const token = localStorage.getItem('token');

    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        setRole(storedRole || '');

        fetchRecetas();

        const socket = new WebSocket(WS_URL);
        socket.onmessage = () => fetchRecetas();
        return () => socket.close();
    }, []);

    const fetchRecetas = async () => {
        if (!token) {
            console.warn('Token no encontrado. No se puede autenticar.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/recetas/pendientes`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                console.error('Error en respuesta:', res.status, await res.text());
                return;
            }

            const data = await res.json();
            setRecetas(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error al cargar recetas:', err);
        }
    };


    const toggleMedicamento = (recetaId, medId) => {
        setSeleccionados(prev => ({
            ...prev,
            [recetaId]: prev[recetaId]?.includes(medId)
                ? prev[recetaId].filter(id => id !== medId)
                : [...(prev[recetaId] || []), medId]
        }));
    };

    const autorizarEntrega = async (recetaId, parcial = false) => {
        try {
            const res = await fetch(`${API_URL}/recetas/${recetaId}/${parcial ? 'autorizar-parcial' : 'autorizar'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: parcial ? JSON.stringify({ entregados: seleccionados[recetaId] || [] }) : null,
            });

            if (!res.ok) throw new Error('No se pudo autorizar entrega');
            fetchRecetas();
        } catch (err) {
            console.error('Error en autorización:', err);
        }
    };

    const estadoMedicamento = (stock) => {
        if (stock === 0) return { label: 'Agotado', color: 'text-red-600' };
        if (stock <= 10) return { label: 'Casi agotado', color: 'text-yellow-600' };
        return { label: 'Disponible', color: 'text-green-700' };
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
            <Sidebar role={role} />
            <div className="flex-1 ml-64 p-8 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-teal-800">Entrega de Recetas</h2>

                {recetas.length === 0 && (
                    <p className="text-gray-500 text-center mt-20">🕐 No hay recetas pendientes</p>
                )}

                {recetas.map(receta => (
                    <div key={receta.id} className="bg-white p-4 shadow rounded mb-6">
                        <h3 className="text-lg font-semibold mb-2">
                            Receta #{receta.id} - {new Date(receta.fecha_emision).toLocaleDateString()}
                        </h3>
                        <p><strong>Paciente:</strong> {receta.paciente_nombre}</p>
                        <p><strong>Médico:</strong> {receta.medico_nombre}</p>
                        <p><strong>Cita:</strong> {new Date(receta.fecha_cita).toLocaleDateString()}</p>
                        {/*receta.observaciones && (
                            <p className="mt-2 text-sm italic text-gray-700">{receta.observaciones}</p>
                        )*/}

                        <table className="w-full mt-4 table-auto border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2">Entregar</th>
                                    <th className="p-2">Medicamento</th>
                                    <th className="p-2">Dosis</th>
                                    <th className="p-2">Frecuencia</th>
                                    <th className="p-2">Duración</th>
                                    <th className="p-2">Stock</th>
                                    <th className="p-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receta.medicamentos.map(item => {
                                    const estado = estadoMedicamento(item.stock);
                                    return (
                                        <tr key={item.medicamento_id} className="border-t">
                                            <td className="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    disabled={item.entregado}  // 👈 bloquea si ya fue entregado
                                                    checked={(seleccionados[receta.id] || []).includes(item.medicamento_id)}
                                                    onChange={() => toggleMedicamento(receta.id, item.medicamento_id)}
                                                />
                                                {item.entregado && (
                                                    <span className="text-xs text-green-600 ml-1">✔ Entregado</span>
                                                )}

                                            </td>
                                            <td className="p-2">{item.medicamento_nombre}</td>
                                            <td className="p-2">{item.dosis}</td>
                                            <td className="p-2">{item.frecuencia}</td>
                                            <td className="p-2">{item.duracion}</td>
                                            <td className="p-2 text-center">{item.stock}</td>
                                            <td className={`p-2 text-center font-medium ${estado.color}`}>● {estado.label}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="mt-4 flex gap-4">
                            <button
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                onClick={() => autorizarEntrega(receta.id, false)}
                            >
                                Entregar Todo
                            </button>

                            <button
                                className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded disabled:opacity-50"
                                onClick={() => autorizarEntrega(receta.id, true)}
                                disabled={!seleccionados[receta.id] || seleccionados[receta.id].length === 0}
                            >
                                Entrega Parcial
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecetasFarmaceuticoPage;
