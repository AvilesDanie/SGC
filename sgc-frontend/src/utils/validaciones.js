export const validarCedulaEcuatoriana = (cedula) => {
  if (!/^\d{10}$/.test(cedula)) return false
  const provincia = parseInt(cedula.substring(0, 2))
  const tercerDigito = parseInt(cedula[2])
  if (provincia < 1 || provincia > 24 || tercerDigito >= 6) return false
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let val = parseInt(cedula[i]) * coef[i]
    if (val >= 10) val -= 9
    suma += val
  }
  const verificador = (10 - (suma % 10)) % 10
  return verificador === parseInt(cedula[9])
}

export const validarCampo = (name, value, role, touched = true) => {
  const hoy = new Date()
  const fechaActual = hoy.toISOString().split('T')[0]
  switch (name) {
    case 'cedula':
      if (!value) return 'La cédula es obligatoria.'
      if (!/^\d{10}$/.test(value)) return 'Debe tener 10 dígitos.'
      if (!validarCedulaEcuatoriana(value)) return 'Cédula no válida en Ecuador.'
      return ''
    case 'nombre':
    case 'apellido':
      if (!value) return `El ${name} es obligatorio.`
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras y espacios.'
      return ''
    case 'fecha_nacimiento':
      if (!value && touched) return 'La fecha es obligatoria.'
      if (value > fechaActual) return 'No puede ser futura.'
      const nacimiento = new Date(value)
      let edad = hoy.getFullYear() - nacimiento.getFullYear()
      const m = hoy.getMonth() - nacimiento.getMonth()
      const d = hoy.getDate() - nacimiento.getDate()
      if (m < 0 || (m === 0 && d < 0)) edad--
      if (edad > 120) return 'Edad no puede ser mayor a 120 años.'
      if (role !== 'paciente' && edad < 22) return 'Edad no puede ser menor a 22 años.'
      return ''
    case 'telefono':
      if (!value) return 'El teléfono es obligatorio.'
      if (!/^09\d{8}$/.test(value)) return 'Debe comenzar con 09 y tener 10 dígitos.'
      return ''
    case 'direccion':
      if (!value) return 'La dirección es obligatoria.'
      return ''
    case 'username':
      if (!value) return 'Usuario obligatorio.'
      if (/\s/.test(value)) return 'Sin espacios.'
      if (value.length < 4) return 'Debe tener al menos 4 caracteres.'
      return ''
    case 'password':
      if (value && value.length < 4) return 'Debe tener al menos 4 caracteres.'
      if (/\s/.test(value)) return 'Sin espacios.'
      return ''
    case 'especialidad':
      if (role === 'medico') {
        if (!value) return 'Especialidad obligatoria.'
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras.'
      }
      return ''
    default:
      return ''
  }
}



import axios from 'axios'

export const validarDuplicado = async (campo, valor, rol, usuarioId = null) => {
  const token = localStorage.getItem('token')
  if (!token || !['cedula', 'telefono', 'username'].includes(campo) || !valor) return ''

  try {
    const res = await axios.get('http://localhost:8000/usuarios', {
      headers: { Authorization: `Bearer ${token}` }
    })

    const duplicado = res.data.find(u =>
      u[campo] === valor &&
      (!usuarioId || u.id !== usuarioId) // Ignora el mismo usuario si está editando
    )

    if (duplicado) {
      const unoEsPaciente = rol === 'paciente' || duplicado.role === 'paciente'
      const ambosPacientes = rol === 'paciente' && duplicado.role === 'paciente'
      if (!unoEsPaciente || ambosPacientes) {
        return `${campo[0].toUpperCase() + campo.slice(1)} ya está registrado para otro usuario.`
      }
    }
  } catch (err) {
    console.warn('Error validando duplicado:', err)
  }

  return ''
}
