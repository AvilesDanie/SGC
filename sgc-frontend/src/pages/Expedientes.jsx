import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../api/axiosConfig'

function Expedientes() {
    const [role, setRole] = useState(null)
    const [medicoId, setMedicoId] = useState(null)
    const [citas, setCitas] = useState([])
    const [pacientes, setPacientes] = useState({})
    const navigate = useNavigate()
    const [filtros, setFiltros] = useState({
        cedula: '',
        nombre: ''
    })
    const [modalMedico, setModalMedico] = useState({ open: false, citaId: null })
    const [modalAsistencia, setModalAsistencia] = useState({ open: false, citaId: null })
    const [modalVerMedico, setModalVerMedico] = useState({ open: false, data: null })
    const [modalVerAsistencia, setModalVerAsistencia] = useState({ open: false, data: null })
    const [modalReceta, setModalReceta] = useState({ open: false, citaId: null })
    const [modalVerReceta, setModalVerReceta] = useState({ open: false, receta: null })

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return navigate('/login', { replace: true })

        api.get('/me')
            .then(res => {
                setRole(res.data.role)
                setMedicoId(res.data.id)
                cargarCitas(res.data.id)
            })
            .catch(() => {
                localStorage.clear()
                navigate('/login', { replace: true })
            })
    }, [navigate])

    useEffect(() => {
        if (!medicoId) return

        const ws = new WebSocket("ws://localhost:8000/ws/estado-citas")

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.evento === "actualizacion_citas") {
                cargarCitas(medicoId)
            }
        }

        ws.onerror = (err) => console.error("WebSocket error", err)
        ws.onclose = () => console.log("WebSocket cerrado")

        return () => ws.close()
    }, [medicoId])

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8000/ws/medicamentos")

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (["crear", "actualizar", "eliminar"].includes(data.evento)) {
                if (medicoId) cargarCitas(medicoId)
            }
        }

        return () => ws.close()
    }, [medicoId])


    const filtrar = (cita) => {
        const paciente = pacientes[cita.paciente_id]
        if (!paciente) return false

        const matchCedula = paciente.cedula.includes(filtros.cedula)
        const matchNombre = (`${paciente.nombre} ${paciente.apellido}`).toLowerCase().includes(filtros.nombre.toLowerCase())

        return matchCedula && matchNombre
    }

    const handleRecetaGuardada = async (citaId, nuevaReceta) => {
        setCitas(prev =>
            prev.map(cita =>
                cita.id === citaId ? { ...cita, receta: nuevaReceta } : cita
            )
        );
    };


    const cargarCitas = async (medicoId) => {
        try {
            const res = await api.get('/citas/hoy')

            const citasFiltradas = []

            for (const cita of res.data) {
                if (cita.medico_id !== medicoId) continue
                try {
                    const signosRes = await api.get(`/signos-vitales/cita/${cita.id}`)

                    const [certMedico, certAsistencia] = await Promise.all([
                        api.get(`/certificados/medico/${cita.id}`).then(r => r.data).catch(() => null),
                        api.get(`/certificados/asistencia/${cita.id}`).then(r => r.data).catch(() => null)
                    ])

                    const receta = await api.get(`/recetas/cita/${cita.id}`).then(r => r.data).catch(() => null)

                    citasFiltradas.push({
                        ...cita,
                        signos_vitales: signosRes.data.signos_vitales,
                        certificado_medico: certMedico,
                        certificado_asistencia: certAsistencia,
                        receta: receta
                    })

                } catch {
                    continue
                }
            }


            const pacientesData = {}
            await Promise.all(citasFiltradas.map(async c => {
                if (!pacientesData[c.paciente_id]) {
                    const res = await api.get(`/pacientes/${c.paciente_id}`)
                    pacientesData[c.paciente_id] = res.data
                }
            }))

            setCitas(citasFiltradas)
            setPacientes(pacientesData)
        } catch (err) {
            console.error(err)
        }
    }

    function ModalCertificadoMedico({ open, onClose, citaId }) {
        const [diagnostico, setDiagnostico] = useState('');
        const [reposo, setReposo] = useState('1'); // como string para validar mejor
        const [observaciones, setObservaciones] = useState('');
        const [errors, setErrors] = useState({});
        const [intentadoGuardar, setIntentadoGuardar] = useState(false);
        const [guardando, setGuardando] = useState(false);

        const validar = () => {
            const e = {};
            if (!diagnostico.trim()) e.diagnostico = 'El diagnóstico es obligatorio.';
            if (String(reposo).trim() === '') {
                e.reposo = 'Los días de reposo son obligatorios.';
            } else if (!/^\d+$/.test(String(reposo))) {
                e.reposo = 'Debe ser un número entero.';
            } else if (Number(reposo) < 1 || Number(reposo) > 365) {
                e.reposo = 'Debe estar entre 1 y 365 días.';
            }
            if (observaciones.length > 500) {
                e.observaciones = 'Máximo 500 caracteres.';
            }
            return e;
        };

        // Revalida en caliente solo si ya se intentó guardar
        useEffect(() => {
            if (intentadoGuardar) setErrors(validar());
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [diagnostico, reposo, observaciones]);

        const guardar = async () => {
            setIntentadoGuardar(true);
            const e = validar();
            setErrors(e);
            if (Object.keys(e).length > 0) return;

            try {
                setGuardando(true);
                await api.post('/certificados/medico', {
                    cita_id: citaId,
                    diagnostico: diagnostico.trim(),
                    reposo_dias: Number(reposo),
                    observaciones: observaciones.trim(),
                });
                await cargarCitas(medicoId);
                onClose();
            } catch (err) {
                if (err.response?.status === 401) {
                    localStorage.clear();
                    navigate('/login');
                } else {
                    alert('Error al guardar certificado médico');
                }
            } finally {
                setGuardando(false);
            }
        };

        if (!open) return null;

        // helpers de estilo
        const labelCls = "text-sm font-medium text-gray-700 mt-2";
        const inputBase = "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-300";
        const errorText = "text-xs text-red-600 mt-1";

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-[520px] max-w-full space-y-4">
                    <h2 className="text-xl font-bold text-teal-800">Certificado Médico</h2>

                    {/* Diagnóstico */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                        <label htmlFor="diagnostico" className={labelCls}>Diagnóstico <span className="text-red-600">*</span></label>
                        <div className="col-span-2">
                            <input
                                id="diagnostico"
                                className={`${inputBase} ${errors.diagnostico ? 'border-red-500' : 'border-gray-300'}`}
                                value={diagnostico}
                                onChange={e => setDiagnostico(e.target.value)}
                                aria-invalid={!!errors.diagnostico}
                                aria-describedby={errors.diagnostico ? 'diag-error' : undefined}
                            />
                            {errors.diagnostico && <div id="diag-error" className={errorText}>{errors.diagnostico}</div>}
                        </div>
                    </div>

                    {/* Reposo (días) */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                        <label htmlFor="reposo" className={labelCls}>Días de reposo <span className="text-red-600">*</span></label>
                        <div className="col-span-2">
                            <input
                                id="reposo"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={365}
                                className={`${inputBase} ${errors.reposo ? 'border-red-500' : 'border-gray-300'}`}
                                value={reposo}
                                onChange={e => setReposo(e.target.value)}
                                aria-invalid={!!errors.reposo}
                                aria-describedby={errors.reposo ? 'reposo-error' : undefined}
                            />
                            {errors.reposo && <div id="reposo-error" className={errorText}>{errors.reposo}</div>}
                        </div>
                    </div>

                    {/* Observaciones (opcional) */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                        <label htmlFor="observaciones" className={labelCls}>Observaciones</label>
                        <div className="col-span-2">
                            <textarea
                                id="observaciones"
                                className={`${inputBase} ${errors.observaciones ? 'border-red-500' : 'border-gray-300'}`}
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                rows={3}
                                aria-invalid={!!errors.observaciones}
                                aria-describedby={errors.observaciones ? 'obs-error' : undefined}
                            />
                            <div className="flex justify-between">
                                {errors.observaciones && <div id="obs-error" className={errorText}>{errors.observaciones}</div>}
                                <span className="text-xs text-gray-500 ml-auto">{observaciones.length}/500</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-1 bg-gray-300 rounded"
                            disabled={guardando}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={guardar}
                            className={`px-4 py-1 text-white rounded ${guardando ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'}`}
                            disabled={guardando}
                        >
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    function ModalCertificadoAsistencia({ open, onClose, citaId }) {
        const [motivo, setMotivo] = useState('');
        const [horaEntrada, setHoraEntrada] = useState('');
        const [horaSalida, setHoraSalida] = useState('');
        const [errors, setErrors] = useState({});
        const [intentadoGuardar, setIntentadoGuardar] = useState(false);
        const [guardando, setGuardando] = useState(false);

        useEffect(() => {
            if (citaId) {
                api.get(`/citas/${citaId}`)
                    .then(res => {
                        const { hora_inicio, hora_fin } = res.data;
                        setHoraEntrada(hora_inicio?.slice(0, 5) || '');
                        setHoraSalida(hora_fin?.slice(0, 5) || '');
                    })
                    .catch(() => {
                        setHoraEntrada('');
                        setHoraSalida('');
                    });
            }
        }, [citaId]);

        const convertirHoraAMinutos = (hhmm) => {
            if (!/^\d{2}:\d{2}$/.test(hhmm)) return NaN;
            const [h, m] = hhmm.split(':').map(Number);
            return h * 60 + m;
        };

        const validar = () => {
            const e = {};
            if (!motivo.trim()) e.motivo = 'El motivo es obligatorio.';

            if (!horaEntrada) e.horaEntrada = 'La hora de entrada es obligatoria.';
            else if (!/^\d{2}:\d{2}$/.test(horaEntrada)) e.horaEntrada = 'Formato inválido (HH:MM).';

            if (!horaSalida) e.horaSalida = 'La hora de salida es obligatoria.';
            else if (!/^\d{2}:\d{2}$/.test(horaSalida)) e.horaSalida = 'Formato inválido (HH:MM).';

            // Validaciones relacionales solo si ambas horas son válidas
            const entradaMin = convertirHoraAMinutos(horaEntrada);
            const salidaMin = convertirHoraAMinutos(horaSalida);
            if (!e.horaEntrada && !e.horaSalida && !Number.isNaN(entradaMin) && !Number.isNaN(salidaMin)) {
                if (entradaMin > salidaMin) e.horas = 'La entrada no puede ser posterior a la salida.';
                else if (salidaMin - entradaMin > 60) e.horas = 'La diferencia no puede ser mayor a 60 minutos.';
            }

            // límite opcional de longitud (evita textos excesivos)
            if (motivo.length > 500) e.motivo = 'Máximo 500 caracteres.';
            return e;
        };

        useEffect(() => {
            if (intentadoGuardar) setErrors(validar());
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [motivo, horaEntrada, horaSalida]);

        const guardar = async () => {
            setIntentadoGuardar(true);
            const e = validar();
            setErrors(e);
            if (Object.keys(e).length > 0) return;

            try {
                setGuardando(true);
                await api.post('/certificados/asistencia', {
                    cita_id: citaId,
                    motivo: motivo.trim(),
                    hora_entrada: horaEntrada,
                    hora_salida: horaSalida
                });
                await cargarCitas(medicoId);
                onClose();
            } catch (err) {
                if (err.response?.status === 401) {
                    localStorage.clear();
                    navigate('/login');
                } else {
                    alert('Error al guardar certificado de asistencia');
                }
            } finally {
                setGuardando(false);
            }
        };

        if (!open) return null;

        const labelCls = "text-sm font-medium text-gray-700 mt-2";
        const inputBase = "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-300";
        const errorText = "text-xs text-red-600 mt-1";

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-[520px] max-w-full space-y-4">
                    <h2 className="text-xl font-bold text-teal-800">Certificado de Asistencia</h2>

                    {/* Motivo */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                        <label htmlFor="motivo" className={labelCls}>Motivo <span className="text-red-600">*</span></label>
                        <div className="col-span-2">
                            <textarea
                                id="motivo"
                                className={`${inputBase} ${errors.motivo ? 'border-red-500' : 'border-gray-300'}`}
                                rows={3}
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                aria-invalid={!!errors.motivo}
                                aria-describedby={errors.motivo ? 'motivo-error' : undefined}
                            />
                            <div className="flex justify-between">
                                {errors.motivo && <div id="motivo-error" className={errorText}>{errors.motivo}</div>}
                                <span className="text-xs text-gray-500 ml-auto">{motivo.length}/500</span>
                            </div>
                        </div>
                    </div>

                    {/* Hora entrada */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                        <label htmlFor="horaEntrada" className={labelCls}>Hora entrada <span className="text-red-600">*</span></label>
                        <div className="col-span-2">
                            <input
                                id="horaEntrada"
                                type="time"
                                className={`${inputBase} ${errors.horaEntrada ? 'border-red-500' : 'border-gray-300'}`}
                                value={horaEntrada}
                                onChange={e => setHoraEntrada(e.target.value)}
                                aria-invalid={!!errors.horaEntrada}
                                aria-describedby={errors.horaEntrada ? 'horaEntrada-error' : undefined}
                            />
                            {errors.horaEntrada && <div id="horaEntrada-error" className={errorText}>{errors.horaEntrada}</div>}
                        </div>
                    </div>

                    {/* Hora salida */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                        <label htmlFor="horaSalida" className={labelCls}>Hora salida <span className="text-red-600">*</span></label>
                        <div className="col-span-2">
                            <input
                                id="horaSalida"
                                type="time"
                                className={`${inputBase} ${errors.horaSalida ? 'border-red-500' : 'border-gray-300'}`}
                                value={horaSalida}
                                onChange={e => setHoraSalida(e.target.value)}
                                aria-invalid={!!errors.horaSalida}
                                aria-describedby={errors.horaSalida ? 'horaSalida-error' : undefined}
                            />
                            {errors.horaSalida && <div id="horaSalida-error" className={errorText}>{errors.horaSalida}</div>}
                        </div>
                    </div>

                    {/* Error relacional de horas */}
                    {errors.horas && <div className="text-center text-red-600 text-sm">{errors.horas}</div>}

                    <div className="flex justify-end space-x-2 pt-2">
                        <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded" disabled={guardando}>
                            Cancelar
                        </button>
                        <button
                            onClick={guardar}
                            className={`px-4 py-1 text-white rounded ${guardando ? 'bg-teal-400' : 'bg-teal-600 hover:bg-teal-700'}`}
                            disabled={guardando}
                        >
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }



    function ModalVerCertificado({ open, onClose, certificado, tipo }) {
        if (!open || !certificado) return null

        const formato = (str) => new Date(str).toLocaleDateString()

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded shadow-lg w-[500px] max-w-full space-y-4">
                    <h2 className="text-2xl font-bold text-teal-800 text-center">
                        {tipo === "medico" ? "Certificado Médico" : "Certificado de Asistencia"}
                    </h2>

                    <div className="text-gray-800 space-y-2 text-sm max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
                        <p><strong>Paciente:</strong> {certificado.paciente_nombre}</p>
                        <p><strong>Médico:</strong> {certificado.medico_nombre}</p>
                        <p><strong>Fecha de cita:</strong> {formato(certificado.fecha_cita)}</p>

                        {tipo === "medico" ? (
                            <>
                                <p><strong>Diagnóstico:</strong> {certificado.diagnostico}</p>
                                <p><strong>Días de reposo:</strong> {certificado.reposo_dias}</p>
                                {certificado.observaciones && (
                                    <p><strong>Observaciones:</strong> {certificado.observaciones}</p>
                                )}
                                {/*<p><strong>Emitido el:</strong> {formato(certificado.fecha_emision)}</p>*/}
                            </>
                        ) : (
                            <>
                                {/*<p><strong>Fecha:</strong> {formato(certificado.fecha)}</p>*/}
                                <p><strong>Hora de entrada:</strong> {certificado.hora_entrada}</p>
                                <p><strong>Hora de salida:</strong> {certificado.hora_salida}</p>
                                {certificado.motivo && (
                                    <p><strong>Motivo:</strong> {certificado.motivo}</p>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex justify-end mt-4">
                        <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded">Cerrar</button>
                    </div>
                </div>
            </div>
        )
    }




    function ModalReceta({ open, onClose, citaId, onRecetaGuardada }) {
  const [medicamentos, setMedicamentos] = useState([
    { medicamento_id: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' }
  ]);
  const [opcionesMedicamentos, setOpcionesMedicamentos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [intentadoGuardar, setIntentadoGuardar] = useState(false);
  const [formError, setFormError] = useState('');
  const [rowsErrors, setRowsErrors] = useState([]); // [{medicamento_id, dosis, ...}]

  const dosisOptions = [0.5, 1, 1.5, 2, 3, 4];
  const frecuenciaOptions = [
    'Cada 4 horas', 'Cada 6 horas', 'Cada 8 horas',
    'Cada 12 horas', 'Cada 24 horas', '2 veces al día', '1 vez al día'
  ];
  const duracionOptions = ['3 días', '5 días', '7 días', '10 días', '14 días', '30 días'];

  useEffect(() => {
    if (open) {
      api.get('/medicamentos')
        .then(res => setOpcionesMedicamentos(res.data))
        .catch(() => setOpcionesMedicamentos([]));
    }
  }, [open]);

  const agregarFila = () => {
    setMedicamentos(prev => [...prev, { medicamento_id: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' }]);
  };

  const eliminarFila = (index) => {
    setFormError('');
    setRowsErrors(prev => prev.filter((_, i) => i !== index));
    setMedicamentos(prev => {
      if (prev.length === 1) return prev; // no eliminar la última fila
      const copia = [...prev];
      copia.splice(index, 1);
      return copia;
    });
  };

  const handleChange = (index, field, value) => {
    setFormError('');
    const nuevos = [...medicamentos];
    nuevos[index][field] = value;
    setMedicamentos(nuevos);

    if (intentadoGuardar) {
      // revalida solo la fila modificada
      const errs = [...rowsErrors];
      errs[index] = validarFila(nuevos[index]);
      setRowsErrors(errs);
    }
  };

  const validarFila = (fila) => {
    const e = {};
    if (!String(fila.medicamento_id).trim()) e.medicamento_id = 'Obligatorio.';
    if (String(fila.dosis).trim() === '') e.dosis = 'Obligatorio.';
    if (!String(fila.frecuencia).trim()) e.frecuencia = 'Obligatorio.';
    if (!String(fila.duracion).trim()) e.duracion = 'Obligatorio.';
    // indicaciones opcional
    return e;
  };

  const validar = () => {
    const allErrors = medicamentos.map(validarFila);
    setRowsErrors(allErrors);

    // filas "completas" = sin errores y con medicamento_id definido
    const filasValidas = medicamentos.filter((fila, i) => Object.keys(allErrors[i]).length === 0);

    if (filasValidas.length < 1) {
      setFormError('Debes agregar al menos un medicamento con todos los campos obligatorios.');
      return { ok: false, filasValidas: [] };
    }

    setFormError('');
    return { ok: true, filasValidas };
  };

  const guardar = async () => {
    if (cargando) return;
    setIntentadoGuardar(true);

    const { ok, filasValidas } = validar();
    if (!ok) return;

    try {
      setCargando(true);
      const res = await api.post('/recetas', {
        cita_id: citaId,
        observaciones: '',
        medicamentos: filasValidas
      });
      if (onRecetaGuardada) onRecetaGuardada(citaId, res.data);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      } else {
        alert('Error al crear receta');
      }
    } finally {
      setCargando(false);
    }
  };

  if (!open) return null;

  // estilos utilitarios
  const labelCls = "text-sm font-medium text-gray-700 mt-1";
  const inputBase = "border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-teal-300";
  const errorText = "text-xs text-red-600 mt-1";

  // ayuda: obtén IDs seleccionados para evitar duplicados
  const idsSeleccionados = medicamentos.map(m => String(m.medicamento_id)).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-[820px] max-w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-teal-800">Generar Receta</h2>
          <p className="text-xs text-gray-500 mt-1">Los campos marcados con <span className="text-red-600">*</span> son obligatorios.</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {medicamentos.map((m, i) => {
            const e = rowsErrors[i] || {};
            return (
              <div key={i} className="border rounded p-3 bg-gray-50 relative">
                <button
                  onClick={() => eliminarFila(i)}
                  className="absolute top-2 right-2 text-red-500 text-sm"
                  title="Eliminar"
                >
                  ✕
                </button>

                {/* Medicamento */}
                <div className="grid grid-cols-3 gap-3 items-start">
                  <label className={labelCls} htmlFor={`med-${i}`}>Medicamento <span className="text-red-600">*</span></label>
                  <div className="col-span-2">
                    <select
                      id={`med-${i}`}
                      className={`${inputBase} ${e.medicamento_id ? 'border-red-500' : 'border-gray-300'}`}
                      value={m.medicamento_id}
                      onChange={ev => handleChange(i, 'medicamento_id', ev.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {opcionesMedicamentos
                        .filter(op => !idsSeleccionados.includes(String(op.id)) || String(op.id) === String(m.medicamento_id))
                        .map(op => (
                          <option key={op.id} value={op.id}>
                            {op.nombre} {op.concentracion ? `(${op.concentracion})` : ''} - {op.forma_farmaceutica}, {op.unidad_presentacion} · Stock: {op.stock}
                          </option>
                        ))}
                    </select>
                    {e.medicamento_id && <div className={errorText}>{e.medicamento_id}</div>}
                  </div>
                </div>

                {/* Dosis / Frecuencia */}
                <div className="grid grid-cols-3 gap-3 items-start mt-2">
                  <label className={labelCls} htmlFor={`dosis-${i}`}>Dosis <span className="text-red-600">*</span></label>
                  <div className="col-span-2">
                    <select
                      id={`dosis-${i}`}
                      className={`${inputBase} ${e.dosis ? 'border-red-500' : 'border-gray-300'}`}
                      value={m.dosis}
                      onChange={ev => handleChange(i, 'dosis', ev.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {dosisOptions.map(d => <option key={d} value={d}>{d} unidad(es)</option>)}
                    </select>
                    {e.dosis && <div className={errorText}>{e.dosis}</div>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-start mt-2">
                  <label className={labelCls} htmlFor={`freq-${i}`}>Frecuencia <span className="text-red-600">*</span></label>
                  <div className="col-span-2">
                    <select
                      id={`freq-${i}`}
                      className={`${inputBase} ${e.frecuencia ? 'border-red-500' : 'border-gray-300'}`}
                      value={m.frecuencia}
                      onChange={ev => handleChange(i, 'frecuencia', ev.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {frecuenciaOptions.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    {e.frecuencia && <div className={errorText}>{e.frecuencia}</div>}
                  </div>
                </div>

                {/* Duración */}
                <div className="grid grid-cols-3 gap-3 items-start mt-2">
                  <label className={labelCls} htmlFor={`dur-${i}`}>Duración <span className="text-red-600">*</span></label>
                  <div className="col-span-2">
                    <select
                      id={`dur-${i}`}
                      className={`${inputBase} ${e.duracion ? 'border-red-500' : 'border-gray-300'}`}
                      value={m.duracion}
                      onChange={ev => handleChange(i, 'duracion', ev.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {duracionOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {e.duracion && <div className={errorText}>{e.duracion}</div>}
                  </div>
                </div>

                {/* Indicaciones (opcional) */}
                <div className="grid grid-cols-3 gap-3 items-start mt-2">
                  <label className={labelCls} htmlFor={`ind-${i}`}>Indicaciones</label>
                  <div className="col-span-2">
                    <textarea
                      id={`ind-${i}`}
                      className={`${inputBase} border-gray-300`}
                      placeholder="Ej.: Tomar con alimentos"
                      value={m.indicaciones}
                      onChange={ev => handleChange(i, 'indicaciones', ev.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error del formulario (mínimo 1 medicamento válido) */}
        {formError && (
          <div className="px-6 -mt-2 text-red-600 text-sm">{formError}</div>
        )}

        <div className="p-4 border-t flex justify-between">
          <button onClick={agregarFila} className="px-3 py-1 bg-blue-300 rounded">+ Medicamento</button>
          <div className="space-x-2">
            <button onClick={onClose} className="px-4 py-1 bg-gray-300 rounded" disabled={cargando}>
              Cancelar
            </button>
            <button
              onClick={guardar}
              className={`px-4 py-1 text-white rounded ${cargando ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




    function ModalVerReceta({ open, onClose, recetaId }) {
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




    if (role !== 'medico') return null

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-white to-cyan-100">
            <Sidebar role={role} />
            <div className="flex-1 p-8 ml-64">
                <h1 className="text-3xl font-bold text-teal-800 mb-6">Expedientes</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Buscar por cédula"
                        value={filtros.cedula}
                        onChange={e => setFiltros({ ...filtros, cedula: e.target.value })}
                        className="input"
                    />
                    <input
                        type="text"
                        placeholder="Buscar por nombre"
                        value={filtros.nombre}
                        onChange={e => setFiltros({ ...filtros, nombre: e.target.value })}
                        className="input"
                    />
                </div>



                <div className="space-y-4">
                    {citas.filter(cita => cita.signos_vitales).filter(filtrar).length === 0 ? (
                        <div className="text-center mt-20 text-2xl text-gray-500 font-semibold">
                            🕐 No hay citas con signos vitales que coincidan con los filtros.
                        </div>
                    ) : (

                        citas
                            .filter(cita => cita.signos_vitales)
                            .filter(filtrar)
                            .map(cita => {

                                const paciente = pacientes[cita.paciente_id]

                                return (
                                    <div
                                        key={cita.id}
                                        className={`border-l-8 p-4 rounded shadow ${cita.estado === 'terminado'
                                            ? 'border-red-600 bg-red-100'
                                            : 'border-blue-500 bg-blue-100'
                                            }`}
                                    >
                                        <p><strong>Paciente:</strong> {paciente?.nombre} {paciente?.apellido}</p>
                                        <p><strong>Hora:</strong> {cita.hora_inicio} - {cita.hora_fin}</p>
                                        <p><strong>Presión arterial:</strong> {cita.signos_vitales?.presion_arterial}</p>
                                        <p><strong>Peso:</strong> {cita.signos_vitales?.peso} kg</p>
                                        <p><strong>Talla:</strong> {cita.signos_vitales?.talla} cm</p>
                                        <p><strong>Temperatura:</strong> {cita.signos_vitales?.temperatura} °C</p>
                                        <p><strong>Saturación de oxígeno:</strong> {cita.signos_vitales?.saturacion_oxigeno} %</p>

                                        {cita.estado === 'terminado' && (
                                            <div className="mt-2 space-x-2">
                                                {/* Botones existentes */}
                                                {cita.certificado_medico ? (
                                                    <button
                                                        className="bg-green-700 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalVerMedico({ open: true, data: cita.certificado_medico })}
                                                    >
                                                        Ver Cert. Médico
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalMedico({ open: true, citaId: cita.id })}
                                                    >
                                                        Cert. Médico
                                                    </button>
                                                )}

                                                {cita.certificado_asistencia ? (
                                                    <button
                                                        className="bg-purple-700 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalVerAsistencia({ open: true, data: cita.certificado_asistencia })}
                                                    >
                                                        Ver Cert. Asistencia
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalAsistencia({ open: true, citaId: cita.id })}
                                                    >
                                                        Cert. Asistencia
                                                    </button>
                                                )}

                                                {cita.receta ? (
                                                    <button
                                                        className="bg-cyan-700 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalVerReceta({ open: true, recetaId: cita.receta.id })}
                                                    >
                                                        Ver Receta
                                                    </button>

                                                ) : (
                                                    <button
                                                        className="bg-cyan-600 text-white px-3 py-1 rounded text-sm"
                                                        onClick={() => setModalReceta({ open: true, citaId: cita.id })}
                                                    >
                                                        Generar Receta
                                                    </button>
                                                )}

                                            </div>
                                        )}
                                        {cita.estado !== 'terminado' && (
                                            <button
                                                onClick={() => navigate(`/dashboard/expediente/${cita.id}`)}
                                                className="mt-2 bg-blue-600 text-white px-4 py-1 rounded text-sm"
                                            >
                                                Abrir expediente
                                            </button>
                                        )}

                                    </div>
                                )
                            })
                    )}
                </div>

            </div>

            <ModalCertificadoMedico
                open={modalMedico.open}
                citaId={modalMedico.citaId}
                onClose={() => setModalMedico({ open: false, citaId: null })}
            />
            <ModalCertificadoAsistencia
                open={modalAsistencia.open}
                citaId={modalAsistencia.citaId}
                onClose={() => setModalAsistencia({ open: false, citaId: null })}
            />
            <ModalVerCertificado
                open={modalVerMedico.open}
                certificado={modalVerMedico.data}
                tipo="medico"
                onClose={() => setModalVerMedico({ open: false, data: null })}
            />

            <ModalVerCertificado
                open={modalVerAsistencia.open}
                certificado={modalVerAsistencia.data}
                tipo="asistencia"
                onClose={() => setModalVerAsistencia({ open: false, data: null })}
            />
            <ModalReceta
                open={modalReceta.open}
                citaId={modalReceta.citaId}
                onClose={() => setModalReceta({ open: false, citaId: null })}
                onRecetaGuardada={handleRecetaGuardada}
            />

            <ModalVerReceta
                open={modalVerReceta.open}
                recetaId={modalVerReceta.recetaId} // ✅ pasamos el ID correctamente
                onClose={() => setModalVerReceta({ open: false, recetaId: null })}
            />



        </div>

    )
}

export default Expedientes
