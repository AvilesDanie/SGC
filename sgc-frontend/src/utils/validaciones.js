export const validarCedulaEcuatoriana = (cedula) => {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = parseInt(cedula.substring(0, 2));
  const tercerDigito = parseInt(cedula[2]);
  if (provincia < 1 || provincia > 24 || tercerDigito >= 6) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(cedula[i]) * coef[i];
    if (val >= 10) val -= 9;
    suma += val;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === parseInt(cedula[9]);
};

const validarCedula = (value) => {
  if (!value) return 'La cédula es obligatoria.';
  if (!/^\d{10}$/.test(value)) return 'Debe tener 10 dígitos.';
  if (!validarCedulaEcuatoriana(value)) return 'Cédula no válida en Ecuador.';
  return '';
};

const validarNombreApellido = (value, campo) => {
  if (!value) return `El ${campo} es obligatorio.`;
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras y espacios.';
  return '';
};

const validarFechaNacimiento = (value, role, touched) => {
  if (!value && touched) return 'La fecha es obligatoria.';

  const hoy = new Date();
  const fechaActual = hoy.toISOString().split('T')[0];

  if (value > fechaActual) return 'No puede ser futura.';

  const nacimiento = new Date(value);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  const d = hoy.getDate() - nacimiento.getDate();
  if (m < 0 || (m === 0 && d < 0)) edad--;

  if (edad > 120) return 'Edad no puede ser mayor a 120 años.';
  if (role !== 'paciente' && edad < 22) return 'Edad no puede ser menor a 22 años.';
  return '';
};

const validarTelefono = (value) => {
  if (!value) return 'El teléfono es obligatorio.';
  if (!/^09\d{8}$/.test(value)) return 'Debe comenzar con 09 y tener 10 dígitos.';
  return '';
};

const validarDireccion = (value) => {
  if (!value) return 'La dirección es obligatoria.';
  return '';
};

const validarUsername = (value) => {
  if (!value) return 'Usuario obligatorio.';
  if (/\s/.test(value)) return 'Sin espacios.';
  if (value.length < 4) return 'Debe tener al menos 4 caracteres.';
  return '';
};

const validarPassword = (value) => {
  if (value && value.length < 4) return 'Debe tener al menos 4 caracteres.';
  if (/\s/.test(value)) return 'Sin espacios.';
  return '';
};

const validarEspecialidad = (value, role) => {
  if (role === 'medico') {
    if (!value) return 'Especialidad obligatoria.';
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras.';
  }
  return '';
};

export const validarCampo = (name, value, role, touched = true) => {
  switch (name) {
    case 'cedula':
      return validarCedula(value);
    case 'nombre':
      return validarNombreApellido(value, 'nombre');
    case 'apellido':
      return validarNombreApellido(value, 'apellido');
    case 'fecha_nacimiento':
      return validarFechaNacimiento(value, role, touched);
    case 'telefono':
      return validarTelefono(value);
    case 'direccion':
      return validarDireccion(value);
    case 'username':
      return validarUsername(value);
    case 'password':
      return validarPassword(value);
    case 'especialidad':
      return validarEspecialidad(value, role);
    default:
      return '';
  }
};
