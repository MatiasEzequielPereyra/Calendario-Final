if (!Auth.estaAutenticado()) { window.location.replace('login.html'); } else {

const SUPABASE_URL = 'https://vebqlbcfjxnpryjdgfvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xN-Z3i_sUAyB15QmoM67iw_y3Xisvqv';

let supabaseClient = null;
let reservas = [];
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let editandoId = null;

const HORARIOS = {
  '10:00-17:00': '10:00 a 17:00',
  '22:00-05:00': '22:00 a 05:00'
};

const DIAS_PERMITIDOS = [5, 6, 0]; // viernes, sábado, domingo (JS: dom=0)

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function initSupabase() {
  const alerta = document.getElementById('alertaConfig');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alerta.classList.remove('hidden');
    alerta.innerHTML = '⚠️ Falta configurar Supabase.';
    return false;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (error) {
    console.error('Error inicializando Supabase:', error);
    alerta.classList.remove('hidden');
    alerta.innerHTML = '⚠️ Error inicializando Supabase. Revisá la consola.';
    return false;
  }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return fechaStr;
  const [y,m,d] = partes;
  return `${d}/${m}/${y}`;
}

function formatearMoneda(numero) {
  return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(numero || 0);
}

function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function fechaLocalDesdeInput(fechaStr) {
  const [y,m,d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function diaPermitido(fechaStr) {
  if (!fechaStr) return false;
  return DIAS_PERMITIDOS.includes(fechaLocalDesdeInput(fechaStr).getDay());
}

function nombreDia(fechaStr) {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  return dias[fechaLocalDesdeInput(fechaStr).getDay()];
}

function reservasDeFecha(fecha) {
  return reservas.filter(r => r.fecha === fecha);
}

function horarioOcupado(fecha, horario, ignorarId = null) {
  return reservas.some(r => r.fecha === fecha && r.horario === horario && String(r.id) !== String(ignorarId));
}

function horariosDisponibles(fecha, ignorarId = null) {
  if (!diaPermitido(fecha)) return [];
  return Object.keys(HORARIOS).filter(h => !horarioOcupado(fecha, h, ignorarId));
}

async function cargarReservas() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('reservas').select('*').order('fecha', { ascending:true });
  if (error) {
    console.error('Error cargando reservas:', error);
    document.getElementById('listaReservas').innerHTML = `<div class="empty-state"><strong>Error cargando reservas</strong><br><br>${escaparHTML(error.message)}</div>`;
    reservas = [];
    renderCalendario();
    return;
  }
  reservas = data || [];
  renderCalendario();
  renderLista();
}

function renderCalendario() {
  document.getElementById('mesAnio').textContent = `${meses[mesActual]} ${anioActual}`;
  const grid = document.getElementById('diasGrid');
  grid.innerHTML = '';

  const primerDia = new Date(anioActual, mesActual, 1);
  let diaSemana = primerDia.getDay();
  diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  for (let i=0; i<diaSemana; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    grid.appendChild(empty);
  }

  for (let d=1; d<=diasEnMes; d++) {
    const fecha = `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const div = document.createElement('div');
    div.className = 'day';
    const numero = document.createElement('span');
    numero.textContent = d;
    div.appendChild(numero);

    if (fecha === hoyStr) div.classList.add('today');

    const fechaObj = fechaLocalDesdeInput(fecha);
    const permitido = DIAS_PERMITIDOS.includes(fechaObj.getDay());
    if (!permitido) div.classList.add('day-disabled');

    const reservasDia = reservasDeFecha(fecha);
    const turnoDia = reservasDia.find(r => r.horario === '10:00-17:00');
    const turnoNoche = reservasDia.find(r => r.horario === '22:00-05:00');

    if (turnoDia || turnoNoche) {
      const slots = document.createElement('div');
      slots.className = 'day-slots';
      if (turnoDia) slots.innerHTML += `<span class="day-slot ocupado">☀️ 10-17</span>`;
      else if (permitido) slots.innerHTML += `<span class="day-slot libre">☀️ 10-17</span>`;
      if (turnoNoche) slots.innerHTML += `<span class="day-slot ocupado">🌙 22-05</span>`;
      else if (permitido) slots.innerHTML += `<span class="day-slot libre">🌙 22-05</span>`;
      div.appendChild(slots);
    } else if (permitido) {
      const slots = document.createElement('div');
      slots.className = 'day-slots';
      slots.innerHTML = `<span class="day-slot libre">☀️ 10-17</span><span class="day-slot libre">🌙 22-05</span>`;
      div.appendChild(slots);
    }

    div.addEventListener('click', () => {
      if (!permitido) {
        mostrarToast(`Solo se puede reservar viernes, sábado y domingo.`);
        return;
      }
      const disponibles = horariosDisponibles(fecha);
      if (disponibles.length === 0) {
        if (reservasDia.length) abrirModalEditar(reservasDia[0].id);
        else mostrarToast('Los dos horarios de este día ya están ocupados.');
        return;
      }
      abrirModalNueva(fecha);
    });

    grid.appendChild(div);
  }
}

function cambiarMes(direccion) {
  mesActual += direccion;
  if (mesActual > 11) { mesActual = 0; anioActual++; }
  if (mesActual < 0) { mesActual = 11; anioActual--; }
  renderCalendario();
}

function renderLista() {
  const contenedor = document.getElementById('listaReservas');
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  const visibles = reservas.filter(r => r.fecha >= hoyStr).sort((a,b) => a.fecha.localeCompare(b.fecha) || String(a.horario || '').localeCompare(String(b.horario || '')));
  document.getElementById('contadorReservas').textContent = `(${visibles.length})`;
  if (!visibles.length) {
    contenedor.innerHTML = '<div class="empty-state">No hay reservas próximas.</div>';
    return;
  }
  contenedor.innerHTML = visibles.map(reserva => {
    const saldo = calcularSaldoReserva(reserva);
    let badge = '';
    if (reserva.sena_pagada || Number(reserva.sena) === 0) {
      badge = saldo <= 0 ? '<span class="badge badge-ok">Pagado</span>' : `<span class="badge badge-pendiente">Falta ${formatearMoneda(saldo)}</span>`;
    } else {
      badge = '<span class="badge badge-parcial">Seña pendiente</span>';
    }
    const horario = HORARIOS[reserva.horario] || 'Horario no definido';
    return `<div class="reserva-item" data-id="${reserva.id}">
      <div class="nombre">${escaparHTML(reserva.nombre)}</div>
      <div class="fechas">${formatearFecha(reserva.fecha)} · <strong>${escaparHTML(horario)}</strong></div>
      <div class="montos"><span>Total: ${formatearMoneda(reserva.total)}</span>${badge}</div>
    </div>`;
  }).join('');
  contenedor.querySelectorAll('.reserva-item').forEach(el => el.addEventListener('click', () => abrirModalEditar(el.dataset.id)));
}

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function calcularSaldoReserva(reserva) {
  const total = Number(reserva.total) || 0;
  const sena = Number(reserva.sena) || 0;
  return reserva.sena_pagada ? Math.max(0, total - sena) : total;
}

function actualizarOpcionesHorario(fecha, horarioSeleccionado = '') {
  const select = document.getElementById('horario');
  if (!select) return;
  select.innerHTML = '<option value="">Seleccioná un horario</option>';
  if (!diaPermitido(fecha)) {
    select.disabled = true;
    return;
  }
  select.disabled = false;
  Object.entries(HORARIOS).forEach(([valor, texto]) => {
    const ocupado = horarioOcupado(fecha, valor, editandoId);
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = ocupado ? `${texto} — OCUPADO` : texto;
    option.disabled = ocupado;
    if (valor === horarioSeleccionado) option.selected = true;
    select.appendChild(option);
  });
}

function abrirModalNueva(fecha = null) {
  editandoId = null;
  document.getElementById('modalTitulo').textContent = 'Nueva reserva';
  document.getElementById('btnEliminar').style.display = 'none';
  document.getElementById('reservaId').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('email').value = '';
  document.getElementById('fecha').value = fecha || '';
  document.getElementById('total').value = '';
  document.getElementById('sena').value = '';
  document.getElementById('senaPagada').checked = false;
  document.getElementById('notas').value = '';
  actualizarOpcionesHorario(fecha || '');
  document.getElementById('horario').value = horariosDisponibles(fecha || '')[0] || '';
  calcularSaldo();
  document.getElementById('modal').classList.add('active');
  document.getElementById('nombre').focus();
}

function abrirModalEditar(id) {
  const reserva = reservas.find(item => String(item.id) === String(id));
  if (!reserva) return;
  editandoId = id;
  document.getElementById('modalTitulo').textContent = 'Editar reserva';
  document.getElementById('btnEliminar').style.display = 'inline-block';
  document.getElementById('reservaId').value = reserva.id;
  document.getElementById('nombre').value = reserva.nombre || '';
  document.getElementById('telefono').value = reserva.telefono || '';
  document.getElementById('email').value = reserva.email || '';
  document.getElementById('fecha').value = reserva.fecha || '';
  document.getElementById('total').value = reserva.total || '';
  document.getElementById('sena').value = reserva.sena || '';
  document.getElementById('senaPagada').checked = !!reserva.sena_pagada;
  document.getElementById('notas').value = reserva.notas || '';
  actualizarOpcionesHorario(reserva.fecha || '', reserva.horario || '');
  calcularSaldo();
  document.getElementById('modal').classList.add('active');
}

function cerrarModal() { document.getElementById('modal').classList.remove('active'); }

function calcularSaldo() {
  const total = Number(document.getElementById('total').value) || 0;
  const sena = Number(document.getElementById('sena').value) || 0;
  const pagada = document.getElementById('senaPagada').checked;
  let texto = pagada ? formatearMoneda(Math.max(0,total-sena)) : formatearMoneda(total);
  if (pagada && Math.max(0,total-sena) === 0 && total > 0) texto += ' (¡todo pago!)';
  else if (!pagada && sena > 0) texto += ` (incluye seña de ${formatearMoneda(sena)})`;
  document.getElementById('saldoTexto').textContent = texto;
}

async function guardarReserva() {
  if (!supabaseClient) { alert('Supabase no está conectado.'); return; }
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const fecha = document.getElementById('fecha').value;
  const horario = document.getElementById('horario').value;
  if (!nombre) { alert('El nombre es obligatorio.'); return; }
  if (!fecha) { alert('La fecha es obligatoria.'); return; }
  if (!diaPermitido(fecha)) { alert(`No se pueden crear reservas los ${nombreDia(fecha)}. Solo viernes, sábado y domingo.`); return; }
  if (!horario || !HORARIOS[horario]) { alert('Elegí un horario de reserva.'); return; }
  if (horarioOcupado(fecha, horario, editandoId)) { alert('Ese horario ya está reservado para esa fecha. Elegí el otro turno.'); return; }

  const total = Number(document.getElementById('total').value) || 0;
  const sena = Number(document.getElementById('sena').value) || 0;
  if (sena > total) { alert('La seña no puede ser mayor que el total.'); return; }

  const data = {
    nombre,
    telefono,
    email: document.getElementById('email').value.trim() || null,
    fecha,
    horario,
    total,
    sena,
    sena_pagada: document.getElementById('senaPagada').checked,
    notas: document.getElementById('notas').value.trim() || null
  };

  let error;
  if (editandoId) {
    const resultado = await supabaseClient.from('reservas').update(data).eq('id', editandoId);
    error = resultado.error;
  } else {
    const resultado = await supabaseClient.from('reservas').insert([data]);
    error = resultado.error;
  }
  if (error) {
    console.error('Error guardando:', error);
    if (error.code === '23505') alert('Ese turno ya fue reservado para esa fecha. Elegí el otro horario.');
    else alert('Error al guardar:\n\n' + error.message);
    return;
  }
  await cargarReservas();
  cerrarModal();
  mostrarToast(editandoId ? 'Reserva actualizada' : 'Reserva creada');
}

async function eliminarReserva() {
  if (!editandoId || !supabaseClient) return;
  if (!confirm('¿Seguro que querés eliminar esta reserva?')) return;
  const { error } = await supabaseClient.from('reservas').delete().eq('id', editandoId);
  if (error) { alert('Error al eliminar:\n\n' + error.message); return; }
  await cargarReservas();
  cerrarModal();
  mostrarToast('Reserva eliminada');
}

document.getElementById('btnNuevaReserva').addEventListener('click', () => abrirModalNueva());
document.getElementById('btnMesAnterior').addEventListener('click', () => cambiarMes(-1));
document.getElementById('btnMesSiguiente').addEventListener('click', () => cambiarMes(1));
document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
document.getElementById('btnEliminar').addEventListener('click', eliminarReserva);
document.getElementById('btnGuardar').addEventListener('click', guardarReserva);
document.getElementById('total').addEventListener('input', calcularSaldo);
document.getElementById('sena').addEventListener('input', calcularSaldo);
document.getElementById('senaPagada').addEventListener('change', calcularSaldo);
document.getElementById('fecha').addEventListener('change', e => {
  const fecha = e.target.value;
  if (fecha && !diaPermitido(fecha)) {
    alert(`La fecha seleccionada es ${nombreDia(fecha)}. Solo se permiten viernes, sábado y domingo.`);
    e.target.value = '';
    actualizarOpcionesHorario('');
    return;
  }
  actualizarOpcionesHorario(fecha);
  const disponibles = horariosDisponibles(fecha, editandoId);
  document.getElementById('horario').value = disponibles[0] || (editandoId ? (reservas.find(r => String(r.id)===String(editandoId))?.horario || '') : '');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') cerrarModal(); });

document.addEventListener('DOMContentLoaded', async () => {
  renderCalendario();
  if (initSupabase()) await cargarReservas();
});
}
