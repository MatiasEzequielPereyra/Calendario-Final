/* =========================================================
   QUINTA MEWEN - RESERVAS (versión final)
========================================================= */

if (!Auth.estaAutenticado()) {
  window.location.replace('login.html');
} else {

const SUPABASE_URL = 'https://vebqlbcfjxnpryjdgfvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xN-Z3i_sUAyB15QmoM67iw_y3Xisvqv';
const DB_DATE_COLUMN = 'Fecha';

const HORARIOS = {
  '10:00-17:00': '☀️ Día — 10:00 a 17:00',
  '22:00-05:00': '🌙 Noche — 22:00 a 05:00'
};
const HORARIO_FIJO = '10:00-17:00';
const DIAS_PERMITIDOS = [0,1,2,3,4,5,6];
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let supabaseClient = null;
let reservas = [];
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let editandoId = null;

function initSupabase() {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (e) {
    console.error(e);
    const alerta = document.getElementById('alertaConfig');
    if (alerta) {
      alerta.classList.remove('hidden');
      alerta.innerHTML = '⚠️ Error inicializando Supabase.';
    }
    return false;
  }
}

function normalizarFechaStr(valor) {
  if (!valor) return '';
  const str = String(valor).trim();
  if (str.includes('T')) return str.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function normalizarReserva(r) {
  return {
    ...r,
    fecha: normalizarFechaStr(r[DB_DATE_COLUMN] || r.fecha || ''),
    horario: r.horario || ''
  };
}

function escaparHTML(t) {
  if (t == null) return '';
  return String(t)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function formatearFecha(f) {
  if (!f) return '';
  const p = String(f).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : f;
}

function formatearMoneda(n) {
  return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n || 0);
}

function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function fechaLocalDesdeInput(fechaStr) {
  const [y,m,d] = fechaStr.split('-').map(Number);
  return new Date(y, m-1, d);
}

function esSabado(fechaStr) {
  return !!fechaStr && fechaLocalDesdeInput(fechaStr).getDay() === 6;
}

function diaPermitido(fechaStr) {
  return !!fechaStr && DIAS_PERMITIDOS.includes(fechaLocalDesdeInput(fechaStr).getDay());
}

function nombreDia(fechaStr) {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  return dias[fechaLocalDesdeInput(fechaStr).getDay()];
}

function reservasDeFecha(fecha) {
  return reservas.filter(r => r.fecha === fecha);
}

function buscarReservaPorId(id) {
  return reservas.find(r => String(r.id) === String(id));
}

function horarioOcupado(fecha, horario, ignorarId = null) {
  return reservas.some(r =>
    r.fecha === fecha &&
    r.horario === horario &&
    String(r.id) !== String(ignorarId)
  );
}

function hoyStr() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
}

function parseFechaLocal(fechaStr) {
  if (!fechaStr) return null;
  const p = String(fechaStr).split('-');
  if (p.length !== 3) return null;
  return new Date(+p[0], +p[1]-1, +p[2]);
}

async function cargarReservas() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('reservas')
    .select('*')
    .order(DB_DATE_COLUMN, { ascending: true });

  if (error) {
    console.error(error);
    document.getElementById('listaReservas').innerHTML = `
      <div class="empty-state">⚠️ Error cargando reservas<br>${escaparHTML(error.message)}</div>`;
    reservas = [];
  } else {
    reservas = (data || []).map(normalizarReserva);
  }

  renderCalendario();
  renderLista();
}

function renderCalendario() {
  document.getElementById('mesAnio').textContent = `${meses[mesActual]} ${anioActual}`;
  const grid = document.getElementById('diasGrid');
  grid.innerHTML = '';

  const primerDia = new Date(anioActual, mesActual, 1);
  let inicio = primerDia.getDay();
  inicio = inicio === 0 ? 6 : inicio - 1;
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  const hoy = hoyStr();

  for (let i = 0; i < inicio; i++) {
    const e = document.createElement('div');
    e.className = 'day empty';
    grid.appendChild(e);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const permitido = diaPermitido(fecha);
    const esSab = esSabado(fecha);
    const reservasDia = reservasDeFecha(fecha);

    const div = document.createElement('div');
    div.className = 'day';
    if (fecha === hoy) div.classList.add('today');
    if (!permitido) div.classList.add('day-disabled');

    const num = document.createElement('span');
    num.className = 'day-number';
    num.textContent = d;
    div.appendChild(num);

    if (permitido) {
      const dots = document.createElement('div');
      dots.className = 'day-dots';

      if (esSab) {
        // Dos puntos
        const resDia = reservasDia.find(r => r.horario === '10:00-17:00');
        const resNoche = reservasDia.find(r => r.horario === '22:00-05:00');

        const p1 = document.createElement('span');
        p1.className = `day-dot ${resDia ? 'ocupado' : 'disponible'}`;
        p1.title = resDia ? 'Día ocupado - tocar para editar' : 'Día disponible';
        p1.addEventListener('click', e => {
          e.stopPropagation();
          if (resDia) abrirModalEditar(resDia.id);
          else abrirModalNueva(fecha, '10:00-17:00');
        });
        dots.appendChild(p1);

        const p2 = document.createElement('span');
        p2.className = `day-dot ${resNoche ? 'ocupado' : 'disponible'}`;
        p2.title = resNoche ? 'Noche ocupada - tocar para editar' : 'Noche disponible';
        p2.addEventListener('click', e => {
          e.stopPropagation();
          if (resNoche) abrirModalEditar(resNoche.id);
          else abrirModalNueva(fecha, '22:00-05:00');
        });
        dots.appendChild(p2);

        div.addEventListener('click', () => {
          if (resDia && resNoche) abrirModalEditar(resDia.id);
          else abrirModalNueva(fecha);
        });
      } else {
        // Un punto
        const res = reservasDia.find(r => r.horario === HORARIO_FIJO);
        const p = document.createElement('span');
        p.className = `day-dot ${res ? 'ocupado' : 'disponible'}`;
        p.title = res ? 'Ocupado - tocar para editar' : 'Disponible';
        p.addEventListener('click', e => {
          e.stopPropagation();
          if (res) abrirModalEditar(res.id);
          else abrirModalNueva(fecha, HORARIO_FIJO);
        });
        dots.appendChild(p);

        div.addEventListener('click', () => {
          if (res) abrirModalEditar(res.id);
          else abrirModalNueva(fecha, HORARIO_FIJO);
        });
      }
      div.appendChild(dots);
    } else {
      div.addEventListener('click', () => mostrarToast('Día no habilitado'));
    }

    grid.appendChild(div);
  }
}

function cambiarMes(dir) {
  mesActual += dir;
  if (mesActual > 11) { mesActual = 0; anioActual++; }
  if (mesActual < 0) { mesActual = 11; anioActual--; }
  renderCalendario();
}

function renderLista() {
  const cont = document.getElementById('listaReservas');
  const hoy = parseFechaLocal(hoyStr());

  const visibles = reservas
    .filter(r => {
      const f = parseFechaLocal(r.fecha);
      return f && f >= hoy;
    })
    .sort((a,b) => a.fecha.localeCompare(b.fecha) || String(a.horario).localeCompare(String(b.horario)));

  document.getElementById('contadorReservas').textContent = `(${visibles.length})`;

  if (!visibles.length) {
    cont.innerHTML = '<div class="empty-state">No hay reservas próximas.</div>';
    return;
  }

  cont.innerHTML = visibles.map(r => {
    const saldo = calcularSaldoReserva(r);
    let badge = '';
    if (r.sena_pagada || Number(r.sena) === 0) {
      badge = saldo <= 0
        ? '<span class="badge badge-ok">Pagado</span>'
        : `<span class="badge badge-pendiente">Falta ${formatearMoneda(saldo)}</span>`;
    } else {
      badge = '<span class="badge badge-parcial">Seña pendiente</span>';
    }

    const textoHorario = HORARIOS[r.horario]
      ? HORARIOS[r.horario].replace(/^☀️ |^🌙 /, '')
      : (r.horario || 'No definido');
    const icono = r.horario === '22:00-05:00' ? '🌙' : '☀️';

    return `<button type="button" class="reserva-item" data-id="${escaparHTML(r.id)}">
      <div class="nombre">${escaparHTML(r.nombre || 'Sin nombre')}</div>
      <div class="fechas">${formatearFecha(r.fecha)} · <strong>${icono} ${escaparHTML(textoHorario)}</strong></div>
      <div class="montos"><span>Total: ${formatearMoneda(r.total)}</span>${badge}</div>
    </button>`;
  }).join('');

  cont.querySelectorAll('.reserva-item').forEach(el => {
    el.addEventListener('click', () => abrirModalEditar(el.dataset.id));
  });
}

function calcularSaldoReserva(r) {
  const total = Number(r.total) || 0;
  const sena = Number(r.sena) || 0;
  return r.sena_pagada ? Math.max(0, total - sena) : total;
}

function actualizarOpcionesHorario(fecha, horarioSeleccionado = '') {
  const select = document.getElementById('horario');
  const ayuda = document.getElementById('horarioAyuda');
  if (!select) return;

  select.innerHTML = '<option value="">Seleccioná un horario</option>';

  if (!fecha || !diaPermitido(fecha)) {
    select.disabled = true;
    if (ayuda) ayuda.textContent = 'Seleccioná una fecha válida.';
    return;
  }

  if (esSabado(fecha)) {
    select.disabled = false;
    if (ayuda) {
      ayuda.textContent = editandoId
        ? 'Podés cambiar el horario o eliminar la reserva.'
        : 'Sábado: elegí turno día o noche.';
    }

    Object.entries(HORARIOS).forEach(([valor, texto]) => {
      const ocupadoPorOtro = horarioOcupado(fecha, valor, editandoId);
      const option = document.createElement('option');
      option.value = valor;

      if (ocupadoPorOtro) {
        option.textContent = `${texto} — OCUPADO`;
        option.disabled = true;
      } else {
        option.textContent = texto;
        option.disabled = false;
      }

      // El horario actual de la reserva que editamos NUNCA se deshabilita
      if (valor === horarioSeleccionado) {
        option.selected = true;
        option.disabled = false;
        option.textContent = texto;
      }
      select.appendChild(option);
    });
  } else {
    select.disabled = true;
    if (ayuda) {
      ayuda.textContent = editandoId
        ? 'Turno día. Podés modificar o eliminar la reserva.'
        : 'Solo los sábados se elige horario. Turno día (10:00-17:00).';
    }
    const option = document.createElement('option');
    option.value = HORARIO_FIJO;
    option.textContent = HORARIOS[HORARIO_FIJO];
    option.selected = true;
    select.appendChild(option);
  }
}

function abrirModalNueva(fecha = '', horario = '') {
  editandoId = null;
  document.getElementById('modalTitulo').textContent = 'Nueva reserva';
  document.getElementById('btnEliminar').style.display = 'none';
  document.getElementById('reservaId').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('email').value = '';
  document.getElementById('fecha').value = fecha;
  document.getElementById('total').value = '';
  document.getElementById('sena').value = '';
  document.getElementById('senaPagada').checked = false;
  document.getElementById('notas').value = '';

  const horarioFinal = esSabado(fecha) ? (horario || '10:00-17:00') : HORARIO_FIJO;
  actualizarOpcionesHorario(fecha, horarioFinal);
  calcularSaldo();
  document.getElementById('modal').classList.add('active');
  document.getElementById('nombre').focus();
}

function abrirModalEditar(id) {
  const reserva = buscarReservaPorId(id);
  if (!reserva) {
    mostrarToast('No se encontró la reserva');
    return;
  }

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
  document.getElementById('horario').value = reserva.horario || HORARIO_FIJO;

  calcularSaldo();
  document.getElementById('modal').classList.add('active');
}

function cerrarModal() {
  document.getElementById('modal').classList.remove('active');
  editandoId = null;
}

function calcularSaldo() {
  const total = Number(document.getElementById('total').value) || 0;
  const sena = Number(document.getElementById('sena').value) || 0;
  const pagada = document.getElementById('senaPagada').checked;
  let texto = pagada ? formatearMoneda(Math.max(0, total - sena)) : formatearMoneda(total);
  if (pagada && Math.max(0, total - sena) === 0 && total > 0) texto += ' (¡todo pago!)';
  else if (!pagada && sena > 0) texto += ` (incluye seña de ${formatearMoneda(sena)})`;
  document.getElementById('saldoTexto').textContent = texto;
}

async function guardarReserva() {
  if (!supabaseClient) return alert('Sin conexión a Supabase');

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const fecha = document.getElementById('fecha').value;
  let horario = document.getElementById('horario').value;

  if (!nombre) return alert('El nombre es obligatorio.');
  if (!fecha) return alert('La fecha es obligatoria.');
  if (!diaPermitido(fecha)) return alert('Día no permitido.');

  if (!esSabado(fecha)) horario = HORARIO_FIJO;

  if (!horario || !HORARIOS[horario]) return alert('Elegí un horario.');
  if (horarioOcupado(fecha, horario, editandoId)) {
    return alert('Ese turno ya está reservado por otra persona.');
  }

  const total = Number(document.getElementById('total').value) || 0;
  const sena = Number(document.getElementById('sena').value) || 0;
  if (sena > total) return alert('La seña no puede ser mayor que el total.');

  const data = {
    nombre,
    telefono,
    email: document.getElementById('email').value.trim() || null,
    [DB_DATE_COLUMN]: fecha,
    horario,
    total,
    sena,
    sena_pagada: document.getElementById('senaPagada').checked,
    notas: document.getElementById('notas').value.trim() || null
  };

  let error;
  if (editandoId) {
    ({ error } = await supabaseClient.from('reservas').update(data).eq('id', editandoId));
  } else {
    ({ error } = await supabaseClient.from('reservas').insert([data]));
  }

  if (error) {
    console.error(error);
    alert(error.code === '23505' ? 'Ese turno ya está reservado.' : 'Error: ' + error.message);
    return;
  }

  const eraEdicion = !!editandoId;
  cerrarModal();
  mostrarToast(eraEdicion ? 'Reserva actualizada' : 'Reserva creada');
  await cargarReservas();
}

async function eliminarReserva() {
  if (!editandoId) return alert('No hay reserva seleccionada.');
  if (!supabaseClient) return alert('Sin conexión.');

  if (!confirm('¿Seguro que querés eliminar esta reserva?\nEl turno quedará disponible.')) return;

  const { error } = await supabaseClient
    .from('reservas')
    .delete()
    .eq('id', editandoId);

  if (error) {
    console.error(error);
    alert('Error al eliminar: ' + error.message);
    return;
  }

  mostrarToast('Reserva eliminada');
  cerrarModal();
  await cargarReservas();
}

// Eventos
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
  const actual = editandoId ? buscarReservaPorId(editandoId) : null;
  actualizarOpcionesHorario(fecha, actual && actual.fecha === fecha ? actual.horario : '');
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') cerrarModal();
});

document.addEventListener('DOMContentLoaded', async () => {
  renderCalendario();
  if (initSupabase()) await cargarReservas();
});

}
