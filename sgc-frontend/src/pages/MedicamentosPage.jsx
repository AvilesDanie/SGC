import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const WS_URL = 'ws://localhost:8000/ws/medicamentos';
const API_URL = 'http://localhost:8000';

function initialForm() {
  return {
    id: undefined,
    nombre: '',
    descripcion: '',
    concentracion: '',
    forma_farmaceutica: 'Tableta',
    unidad_presentacion: 'Caja',
    stock: '',
    fecha_vencimiento: '',
    laboratorio: '',
    precio_unitario: '',
  };
}

const MedicamentosPage = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [form, setForm] = useState(initialForm());
  const [editando, setEditando] = useState(false);
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [enviando, setEnviando] = useState(false);

  const token = localStorage.getItem('token');

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
    socket.onerror = (e) => console.error('WS error', e);

    return () => socket.close();
  }, []);

  const fetchMedicamentos = async () => {
    try {
      const res = await fetch(`${API_URL}/medicamentos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No autorizado o error de red');
      const data = await res.json();
      setMedicamentos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al obtener medicamentos:', err);
      if (String(err.message || '').includes('No autorizado')) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
  };

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const onBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validate({ ...form, [name]: form[name] }));
  };

  const validate = (values) => {
    const e = {};
    // nombre
    if (!values.nombre?.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (values.nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres.';

    // forma / unidad
    if (!values.forma_farmaceutica) e.forma_farmaceutica = 'Obligatorio.';
    if (!values.unidad_presentacion) e.unidad_presentacion = 'Obligatorio.';

    // stock
    if (values.stock === '' || values.stock === null || values.stock === undefined) {
      e.stock = 'El stock es obligatorio.';
    } else if (!/^\d+$/.test(String(values.stock))) {
      e.stock = 'Debe ser un entero ≥ 0.';
    } else if (Number(values.stock) < 0) {
      e.stock = 'No puede ser negativo.';
    }

    // fecha_vencimiento: requerida y >= hoy
    if (!values.fecha_vencimiento) {
      e.fecha_vencimiento = 'La fecha de vencimiento es obligatoria.';
    } else {
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      const fv = new Date(values.fecha_vencimiento + 'T00:00:00');
      if (fv < hoy) e.fecha_vencimiento = 'Debe ser hoy o una fecha futura.';
    }

    // precio_unitario
    if (values.precio_unitario === '' || values.precio_unitario === null || values.precio_unitario === undefined) {
      e.precio_unitario = 'El precio unitario es obligatorio.';
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(values.precio_unitario))) {
      e.precio_unitario = 'Formato inválido (máx. 2 decimales).';
    } else if (Number(values.precio_unitario) < 0) {
      e.precio_unitario = 'No puede ser negativo.';
    }

    // opcionales: descripcion, concentracion, laboratorio → sin validación
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      nombre: true,
      forma_farmaceutica: true,
      unidad_presentacion: true,
      stock: true,
      fecha_vencimiento: true,
      precio_unitario: true,
    });
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const url = editando ? `${API_URL}/medicamentos/${form.id}` : `${API_URL}/medicamentos`;
    const method = editando ? 'PUT' : 'POST';

    const payload = {
      ...form,
      stock: Number(form.stock),
      precio_unitario: Number(form.precio_unitario),
    };

    try {
      setEnviando(true);
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error en guardar medicamento');
      setForm(initialForm());
      setTouched({});
      setErrors({});
      setEditando(false);
      await fetchMedicamentos();
    } catch (err) {
      console.error('Error al guardar medicamento:', err);
      alert('No se pudo guardar el medicamento.');
    } finally {
      setEnviando(false);
    }
  };

  const handleEdit = (med) => {
    setForm({
      id: med.id,
      nombre: med.nombre ?? '',
      descripcion: med.descripcion ?? '',
      concentracion: med.concentracion ?? '',
      forma_farmaceutica: med.forma_farmaceutica ?? 'Tableta',
      unidad_presentacion: med.unidad_presentacion ?? 'Caja',
      stock: String(med.stock ?? '0'),
      fecha_vencimiento: med.fecha_vencimiento ?? '',
      laboratorio: med.laboratorio ?? '',
      precio_unitario: String(med.precio_unitario ?? '0'),
    });
    setTouched({});
    setErrors({});
    setEditando(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar medicamento?')) return;
    try {
      const res = await fetch(`${API_URL}/medicamentos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchMedicamentos();
      if (editando && form.id === id) {
        setForm(initialForm());
        setEditando(false);
      }
    } catch (err) {
      console.error('Error al eliminar medicamento:', err);
      alert('No se pudo eliminar.');
    }
  };

  const cancelEdit = () => {
    setForm(initialForm());
    setTouched({});
    setErrors({});
    setEditando(false);
  };

  const labelCls = "text-sm font-medium text-gray-700 mt-1";
  const inputBase = "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-300";
  const errorText = "text-xs text-red-600 mt-1";
  const fieldClass = (name) => `${inputBase} ${errors[name] && touched[name] ? 'border-red-500' : 'border-gray-300'}`;

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-cyan-100">
      <Sidebar role={role} />
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-teal-800 mb-4">Medicamentos</h1>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow mb-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-teal-700">{editando ? 'Editar medicamento' : 'Crear medicamento'}</h2>
          <p className="text-xs text-gray-500">Los campos marcados con <span className="text-red-600">*</span> son obligatorios.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <label htmlFor="nombre" className={labelCls}>Nombre <span className="text-red-600">*</span></label>
            <div className="sm:col-span-2">
              <input
                id="nombre" name="nombre"
                className={fieldClass('nombre')}
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                onBlur={onBlur}
                aria-invalid={!!(errors.nombre && touched.nombre)}
                aria-describedby={errors.nombre && touched.nombre ? 'err-nombre' : undefined}
              />
              {errors.nombre && touched.nombre && <div id="err-nombre" className={errorText}>{errors.nombre}</div>}
            </div>

            <label htmlFor="descripcion" className={labelCls}>Descripción</label>
            <div className="sm:col-span-2">
              <input
                id="descripcion" name="descripcion"
                className={fieldClass('descripcion')}
                value={form.descripcion}
                onChange={(e) => setField('descripcion', e.target.value)}
                onBlur={onBlur}
              />
            </div>

            <label htmlFor="concentracion" className={labelCls}>Concentración</label>
            <div className="sm:col-span-2">
              <input
                id="concentracion" name="concentracion"
                className={fieldClass('concentracion')}
                value={form.concentracion}
                onChange={(e) => setField('concentracion', e.target.value)}
                onBlur={onBlur}
              />
            </div>

            <label htmlFor="forma_farmaceutica" className={labelCls}>Forma farmacéutica <span className="text-red-600">*</span></label>
            <div className="sm:col-span-2">
              <select
                id="forma_farmaceutica" name="forma_farmaceutica"
                className={fieldClass('forma_farmaceutica')}
                value={form.forma_farmaceutica}
                onChange={(e) => setField('forma_farmaceutica', e.target.value)}
                onBlur={onBlur}
              >
                {['Tableta', 'Cápsula', 'Jarabe', 'Inyección', 'Crema', 'Pomada', 'Suspensión', 'Gotas', 'Aerosol'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {errors.forma_farmaceutica && touched.forma_farmaceutica && <div className={errorText}>{errors.forma_farmaceutica}</div>}
            </div>

            <label htmlFor="unidad_presentacion" className={labelCls}>Unidad de presentación <span className="text-red-600">*</span></label>
            <div className="sm:col-span-2">
              <select
                id="unidad_presentacion" name="unidad_presentacion"
                className={fieldClass('unidad_presentacion')}
                value={form.unidad_presentacion}
                onChange={(e) => setField('unidad_presentacion', e.target.value)}
                onBlur={onBlur}
              >
                {['Caja', 'Frasco', 'Blíster', 'Tubo', 'Ampolla', 'Sobre'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {errors.unidad_presentacion && touched.unidad_presentacion && <div className={errorText}>{errors.unidad_presentacion}</div>}
            </div>

            <label htmlFor="stock" className={labelCls}>Stock <span className="text-red-600">*</span></label>
            <div className="sm:col-span-2">
              <input
                id="stock" name="stock" type="number" inputMode="numeric" min={0}
                className={fieldClass('stock')}
                value={form.stock}
                onChange={(e) => setField('stock', e.target.value)}
                onBlur={onBlur}
                aria-invalid={!!(errors.stock && touched.stock)}
                aria-describedby={errors.stock && touched.stock ? 'err-stock' : undefined}
              />
              {errors.stock && touched.stock && <div id="err-stock" className={errorText}>{errors.stock}</div>}
            </div>

            <label htmlFor="fecha_vencimiento" className={labelCls}>Fecha de vencimiento <span className="text-red-600">*</span></label>
            <div className="sm:col-span-2">
              <input
                id="fecha_vencimiento" name="fecha_vencimiento" type="date"
                className={fieldClass('fecha_vencimiento')}
                value={form.fecha_vencimiento}
                onChange={(e) => setField('fecha_vencimiento', e.target.value)}
                onBlur={onBlur}
              />
              {errors.fecha_vencimiento && touched.fecha_vencimiento && <div className={errorText}>{errors.fecha_vencimiento}</div>}
            </div>

            <label htmlFor="laboratorio" className={labelCls}>Laboratorio</label>
            <div className="sm:col-span-2">
              <input
                id="laboratorio" name="laboratorio"
                className={fieldClass('laboratorio')}
                value={form.laboratorio}
                onChange={(e) => setField('laboratorio', e.target.value)}
                onBlur={onBlur}
              />
            </div>

            <label htmlFor="precio_unitario" className={labelCls}>Precio unitario (USD) <span className="text-red-600">*</span></label>
            <div className="sm:col-span-2">
              <input
                id="precio_unitario" name="precio_unitario" type="number" step="0.01" min={0}
                className={fieldClass('precio_unitario')}
                value={form.precio_unitario}
                onChange={(e) => setField('precio_unitario', e.target.value)}
                onBlur={onBlur}
              />
              {errors.precio_unitario && touched.precio_unitario && <div className={errorText}>{errors.precio_unitario}</div>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {editando && (
              <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={enviando}
              className={`px-4 py-2 rounded text-white ${enviando ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
              {enviando ? 'Guardando…' : (editando ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>

        {/* TABLA */}
        <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden">
          <table className="table-auto w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-600">
                <th className="p-3">Nombre</th>
                <th className="p-3">Forma</th>
                <th className="p-3">Unidad</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Vencimiento</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {medicamentos.map((med) => {
                const soon = med.fecha_vencimiento ? new Date(med.fecha_vencimiento) : null;
                const hoy = new Date(); hoy.setHours(0,0,0,0);
                const vencido = soon && soon < hoy;
                const lowStock = Number(med.stock) <= 10;

                return (
                  <tr key={med.id} className="border-t">
                    <td className="p-3">{med.nombre}</td>
                    <td className="p-3">{med.forma_farmaceutica}</td>
                    <td className="p-3">{med.unidad_presentacion}</td>
                    <td className={`p-3 ${lowStock ? 'text-yellow-700 font-medium' : ''}`}>{med.stock}</td>
                    <td className={`p-3 ${vencido ? 'text-red-600 font-semibold' : ''}`}>{med.fecha_vencimiento || '-'}</td>
                    <td className="p-3 space-x-2">
                      <button
                        className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                        onClick={() => handleEdit(med)}
                      >
                        Editar
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                        onClick={() => handleDelete(med.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {medicamentos.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">No hay medicamentos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MedicamentosPage;
