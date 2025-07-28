import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'

const WS_URL = 'ws://localhost:8000/ws/medicamentos';
const API_URL = 'http://localhost:8000';

const MedicamentosPage = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [form, setForm] = useState(initialForm());
  const [editando, setEditando] = useState(false);
  const [role, setRole] = useState('');

  const token = localStorage.getItem('token');

  function initialForm() {
    return {
      nombre: '',
      descripcion: '',
      concentracion: '',
      forma_farmaceutica: 'Tableta',
      unidad_presentacion: 'Caja',
      stock: 0,
      fecha_vencimiento: '',
      laboratorio: '',
      precio_unitario: 0,
    };
  }

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    setRole(storedRole || '');
    fetchMedicamentos();

    const socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
      const { evento } = JSON.parse(event.data);
      if (['crear', 'actualizar', 'eliminar'].includes(evento)) {
        fetchMedicamentos();
      }
    };

    return () => socket.close();
  }, []);

  const fetchMedicamentos = async () => {
    try {
      const res = await fetch(`${API_URL}/medicamentos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('No autorizado o error de red');

      const data = await res.json();
      setMedicamentos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al obtener medicamentos:', err);
      if (err.message.includes('No autorizado')) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = editando
      ? `${API_URL}/medicamentos/${form.id}`
      : `${API_URL}/medicamentos`;

    const method = editando ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Error en guardar medicamento');

      setForm(initialForm());
      setEditando(false);
    } catch (err) {
      console.error('Error al guardar medicamento:', err);
    }
  };

  const handleEdit = (med) => {
    setForm(med);
    setEditando(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar medicamento?')) {
      try {
        const res = await fetch(`${API_URL}/medicamentos/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Error al eliminar');
      } catch (err) {
        console.error('Error al eliminar medicamento:', err);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
          <Sidebar role={role} />
          <div className="flex-1 ml-64 p-8 overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <input className="input" placeholder="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
          <input className="input" placeholder="Descripción" name="descripcion" value={form.descripcion} onChange={handleChange} />
          <input className="input" placeholder="Concentración" name="concentracion" value={form.concentracion} onChange={handleChange} />
          <select className="input" name="forma_farmaceutica" value={form.forma_farmaceutica} onChange={handleChange}>
            {['Tableta', 'Cápsula', 'Jarabe', 'Inyección', 'Crema', 'Pomada', 'Suspensión', 'Gotas', 'Aerosol'].map(f => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <select className="input" name="unidad_presentacion" value={form.unidad_presentacion} onChange={handleChange}>
            {['Caja', 'Frasco', 'Blíster', 'Tubo', 'Ampolla', 'Sobre'].map(u => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <input type="number" className="input" placeholder="Stock" name="stock" value={form.stock} onChange={handleChange} />
          <input type="date" className="input" name="fecha_vencimiento" value={form.fecha_vencimiento} onChange={handleChange} />
          <input className="input" placeholder="Laboratorio" name="laboratorio" value={form.laboratorio} onChange={handleChange} />
          <input type="number" className="input" step="0.01" placeholder="Precio Unitario" name="precio_unitario" value={form.precio_unitario} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">
          {editando ? 'Actualizar' : 'Crear'}
        </button>
      </form>

      <table className="table-auto w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Nombre</th>
            <th className="p-2">Forma</th>
            <th className="p-2">Unidad</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Vencimiento</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {medicamentos.map(med => (
            <tr key={med.id} className="border-t">
              <td className="p-2">{med.nombre}</td>
              <td className="p-2">{med.forma_farmaceutica}</td>
              <td className="p-2">{med.unidad_presentacion}</td>
              <td className="p-2">{med.stock}</td>
              <td className="p-2">{med.fecha_vencimiento || '-'}</td>
              <td className="p-2 space-x-2">
                <button className="btn btn-sm btn-blue" onClick={() => handleEdit(med)}>Editar</button>
                <button className="btn btn-sm btn-red" onClick={() => handleDelete(med.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default MedicamentosPage;
