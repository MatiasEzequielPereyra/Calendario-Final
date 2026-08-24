/* =========================================================
   QUINTA MEWEN - app.js (versión final)
========================================================= */

const SUPABASE_URL = 'https://vebqlbcfjxnpryjdgfvq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xN-Z3i_sUAyB15QmoM67iw_y3Xisvqv';
const DB_DATE_COLUMN = 'Fecha';

const HORARIOS = {
  '10:00-17:00': '☀️ Día — 10:00 a 17:00',
  '22:00-05:00': '🌙 Noche — 22:00 a 05:00'
};
const HORARIO_FIJO = '10:00-17:00';
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let supabaseClient = null;
let reservas = [];
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let editandoId = null;

// ---------- UTILIDADES ----------
function normalizarFechaStr(valor) {
  if (!valor) return '';
  const str = String(valor).trim();
  if (str.includes('T')) return str.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatearFecha(f) {
  if (!f) return '';
  const p = String(f).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : f;
}

function formatearMoneda(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(n || 0);
}

function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function fechaLocal(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function esSabado(fechaStr) {
  return fechaStr && fechaLocal(fechaStr).getDay() === 6;
}

function hoyStr() {
  const h = new Date();
  return h.getFullYear() + '-' + String(h.getMonth()+1).padStart(2,'0') + '-' + String(h.getDate()).padStart(2,'0');
}

function parseFecha(fechaStr) {
  if (!fechaStr) return null;
  const p = String(fechaStr).split('-');
  if (p.length !== 3) return null;
  return new Date(+p[0], +p[1]-1, +p[2]);
}

// ---------- SUPABASE ----------
function initSupabase() {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (e) {
    console.error('Error Supabase:', e);
    return false;
  }
}

async function cargarReservas() {
  if (!supabaseClient) {
    renderCalendario();
    renderLista();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('reservas')
      .select('*')
      .order(DB_DATE_COLUMN, { ascending: true });

    if (error) {
      console.error('Error cargando:', error);
      reservas = [];
    } else {
      reservas = (data || []).map(normalizarReserva);
    }
  } catch (e) {
    console.error(e);
    reservas = [];
  }

  renderCalendario();
  renderLista();
}

// ---------- CALENDARIO ----------
function renderCalendario() {
  const titulo = document.getElementById('mesAnio');
  const grid = document.getElementById('diasGrid');
  if (!titulo || !grid) return;

  titulo.textContent = meses[mesActual] + ' ' + anioActual;
  grid.innerHTML = '';

  const primerDia = new Date(anioActual, mesActual, 1);
  let inicio = primerDia.getDay();
  inicio = inicio === 0 ? 6 : inicio - 1;
  const totalDias = new Date(anioActual, mesActual + 1, 0).getDate();
  const hoy = hoyStr();

  for (let i = 0; i < inicio; i++) {
    const vacio = document.createElement('div');
    vacio.className = 'day empty';
    grid.appendChild(vacio);
  }

  for (let d = 1; d <= totalDias; d++) {
    const fecha = anioActual + '-' + String(mesActual+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const esSab = esSabado(fecha);
    const reservasDia = reservas.filter(r => r.fecha === fecha);

    const div = document.createElement('div');
    div.className = 'day';
    if (fecha === hoy) div.classList.add('today');

    const num = document.createElement('span');
    num.className = 'day-number';
    num.textContent = d;
    div.appendChild(num);

    const dots = document.createElement('div');
    dots.className = 'day-dots';

    if (esSab) {
      const resDia = reservasDia.find(r => r.horario === '10:00-17:00');
      const resNoche = reservasDia.find(r => r.horario === '22:00-05:00');

      const p1 = document.createElement('span');
      p1.className = 'day-dot ' + (resDia ? 'ocupado' : 'disponible');
      p1.title = resDia ? 'Turno Día' : 'Día disponible';
      p1.addEventListener('click', function(e) {
        e.stopPropagation();
        if (resDia) abrirModalEditar(resDia.id);
        else abrirModalNueva(fecha, '10:00-17:00');
      });
      dots.appendChild(p1);

      const p2 = document.createElement('span');
      p2.className = 'day-dot ' + (resNoche ? 'ocupado' : 'disponible');
      p2.title = resNoche ? 'Turno Noche' : 'Noche disponible';
      p2.addEventListener('click', function(e) {
        e.stopPropagation();
        if (resNoche) abrirModalEditar(resNoche.id);
        else abrirModalNueva(fecha, '22:00-05:00');
      });
      dots.appendChild(p2);

      div.addEventListener('click', function() {
        if (resDia) abrirModalEditar(resDia.id);
        else if (resNoche) abrirModalEditar(resNoche.id);
        else abrirModalNueva(fecha, '10:00-17:00');
      });
    } else {
      const res = reservasDia.find(r => r.horario === HORARIO_FIJO || !r.horario);

      const p = document.createElement('span');
      p.className = 'day-dot ' + (res ? 'ocupado' : 'disponible');
      p.addEventListener('click', function(e) {
        e.stopPropagation();
        if (res) abrirModalEditar(res.id);
        else abrirModalNueva(fecha, HORARIO_FIJO);
      });
      dots.appendChild(p);

      div.addEventListener('click', function() {
        if (res) abrirModalEditar(res.id);
        else abrirModalNueva(fecha, HORARIO_FIJO);
      });
    }

    div.appendChild(dots);
    grid.appendChild(div);
  }
}

function cambiarMes(dir) {
  mesActual += dir;
  if (mesActual > 11) { mesActual = 0; anioActual++; }
  if (mesActual < 0) { mesActual = 11; anioActual--; }
  renderCalendario();
}

// ---------- LISTA DE PRÓXIMAS RESERVAS ----------
function renderLista() {
  const cont = document.getElementById('listaReservas');
  const contador = document.getElementById('contadorReservas');
  if (!cont) return;

  const hoy = parseFecha(hoyStr());

  const visibles = reservas
    .filter(function(r) {
      const f = parseFecha(r.fecha);
      return f && hoy && f >= hoy;
    })
    .sort(function(a, b) {
      return (a.fecha || '').localeCompare(b.fecha || '') ||
             String(a.horario || '').localeCompare(String(b.horario || ''));
    });

  if (contador) contador.textContent = '(' + visibles.length + ')';

  if (visibles.length === 0) {
    cont.innerHTML = '<div class="empty-state">No hay reservas próximas.</div>';
    return;
  }

  let html = '';
  visibles.forEach(function(r) {
    const total = Number(r.total) || 0;
    const sena = Number(r.sena) || 0;
    const saldo = r.sena_pagada ? Math.max(0, total - sena) : total;

    let badge = '';
    if (r.sena_pagada || sena === 0) {
      badge = saldo <= 0
        ? '<span class="badge badge-ok">Pagado</span>'
        : '<span class="badge badge-pendiente">Falta ' + formatearMoneda(saldo) + '</span>';
    } else {
      badge = '<span class="badge badge-parcial">Seña pendiente</span>';
    }

    const textoH = HORARIOS[r.horario]
      ? HORARIOS[r.horario].replace(/^☀️ |^🌙 /, '')
      : (r.horario || 'Sin horario');

    const icono = r.horario === '22:00-05:00' ? '🌙' : '☀️';

    const notaHtml = r.notas
      ? '<div class="nota-reserva">📝 ' + escaparHTML(r.notas) + '</div>'
      : '';

    html += `
      <button type="button" class="reserva-item" data-id="${escaparHTML(r.id)}">
        <div class="nombre">${escaparHTML(r.nombre || 'Sin nombre')}</div>
        <div class="fechas">
          ${formatearFecha(r.fecha)} · <strong>${icono} ${escaparHTML(textoH)}</strong>
        </div>
        <div class="montos">
          <span>Total: ${formatearMoneda(total)}</span>
          ${badge}
        </div>
        ${notaHtml}
      </button>
    `;
  });

  cont.innerHTML = html;

  cont.querySelectorAll('.reserva-item').forEach(function(el) {
    el.addEventListener('click', function() {
      abrirModalEditar(el.getAttribute('data-id'));
    });
  });
}

// ---------- MODAL ----------
function actualizarOpcionesHorario(fecha, seleccionado) {
  const select = document.getElementById('horario');
  const ayuda = document.getElementById('horarioAyuda');
  if (!select) return;

  select.innerHTML = '';

  if (!fecha) {
    select.disabled = true;
    if (ayuda) ayuda.textContent = '';
    return;
  }

  if (esSabado(fecha)) {
    select.disabled = false;
    if (ayuda) ayuda.textContent = 'Sábado: podés tener reserva de día y de noche por separado.';

    for (const valor in HORARIOS) {
      const opt = document.createElement('option');
      opt.value = valor;
      opt.textContent = HORARIOS[valor];
      if (valor === seleccionado) opt.selected = true;
      select.appendChild(opt);
    }
    if (!seleccionado) select.value = '10:00-17:00';
  } else {
    select.disabled = true;
    if (ayuda) ayuda.textContent = 'Turno día (solo sábados se elige horario)';
    const opt = document.createElement('option');
    opt.value = HORARIO_FIJO;
    opt.textContent = HORARIOS[HORARIO_FIJO];
    opt.selected = true;
    select.appendChild(opt);
  }
}

function abrirModalNueva(fecha, horario) {
  editandoId = null;

  document.getElementById('modalTitulo').textContent = 'Nueva reserva';
  document.getElementById('btnEliminar').style.display = 'none';
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('email').value = '';
  document.getElementById('fecha').value = fecha || '';
  document.getElementById('total').value = '';
  document.getElementById('sena').value = '';
  document.getElementById('senaPagada').checked = false;
  document.getElementById('notas').value = '';

  const h = esSabado(fecha) ? (horario || '10:00-17:00') : HORARIO_FIJO;
  actualizarOpcionesHorario(fecha, h);
  calcularSaldo();
  document.getElementById('modal').classList.add('active');
}

function abrirModalEditar(id) {
  const r = reservas.find(function(x) { return String(x.id) === String(id); });
  if (!r) {
    mostrarToast('Reserva no encontrada');
    return;
  }

  editandoId = id;

  document.getElementById('modalTitulo').textContent = 'Editar reserva';
  document.getElementById('btnEliminar').style.display = 'inline-block';
  document.getElementById('nombre').value = r.nombre || '';
  document.getElementById('telefono').value = r.telefono || '';
  document.getElementById('email').value = r.email || '';
  document.getElementById('fecha').value = r.fecha || '';
  document.getElementById('total').value = r.total || '';
  document.getElementById('sena').value = r.sena || '';
  document.getElementById('senaPagada').checked = !!r.sena_pagada;
  document.getElementById('notas').value = r.notas || '';

  actualizarOpcionesHorario(r.fecha, r.horario || HORARIO_FIJO);
  document.getElementById('horario').value = r.horario || HORARIO_FIJO;

  calcularSaldo();
  document.getElementById('modal').classList.add('active');
}

function cambiarTurnoEnModal() {
  const fecha = document.getElementById('fecha').value;
  const nuevoHorario = document.getElementById('horario').value;
  if (!fecha || !nuevoHorario) return;

  const existente = reservas.find(function(r) {
    return r.fecha === fecha && r.horario === nuevoHorario;
  });

  if (existente) {
    abrirModalEditar(existente.id);
  } else {
    editandoId = null;
    document.getElementById('modalTitulo').textContent = 'Nueva reserva';
    document.getElementById('btnEliminar').style.display = 'none';

    document.getElementById('nombre').value = '';
    document.getElementById('telefono').value = '';
    document.getElementById('email').value = '';
    document.getElementById('total').value = '';
    document.getElementById('sena').value = '';
    document.getElementById('senaPagada').checked = false;
    document.getElementById('notas').value = '';

    document.getElementById('fecha').value = fecha;
    actualizarOpcionesHorario(fecha, nuevoHorario);
    document.getElementById('horario').value = nuevoHorario;
    calcularSaldo();
  }
}

function cerrarModal() {
  document.getElementById('modal').classList.remove('active');
  editandoId = null;
}

function calcularSaldo() {
  const total = Number(document.getElementById('total').value) || 0;
  const sena = Number(document.getElementById('sena').value) || 0;
  const pagada = document.getElementById('senaPagada').checked;
  const txt = pagada ? formatearMoneda(Math.max(0, total - sena)) : formatearMoneda(total);
  document.getElementById('saldoTexto').textContent = txt;
}

async function guardarReserva() {
  if (!supabaseClient) {
    alert('Sin conexión a Supabase');
    return;
  }

  const nombre = document.getElementById('nombre').value.trim();
  const fecha = document.getElementById('fecha').value;
  let horario = document.getElementById('horario').value;

  if (!nombre) return alert('El nombre es obligatorio');
  if (!fecha) return alert('La fecha es obligatoria');

  if (!esSabado(fecha)) horario = HORARIO_FIJO;

  const data = {
    nombre: nombre,
    telefono: document.getElementById('telefono').value.trim() || null,
    email: document.getElementById('email').value.trim() || null,
    Fecha: fecha,
    horario: horario,
    total: Number(document.getElementById('total').value) || 0,
    sena: Number(document.getElementById('sena').value) || 0,
    sena_pagada: document.getElementById('senaPagada').checked,
    notas: document.getElementById('notas').value.trim() || null
  };

  let error;
  if (editandoId) {
    const res = await supabaseClient.from('reservas').update(data).eq('id', editandoId);
    error = res.error;
  } else {
    const res = await supabaseClient.from('reservas').insert([data]);
    error = res.error;
  }

  if (error) {
    console.error(error);
    alert('Error al guardar: ' + error.message);
    return;
  }

  const eraEdicion = !!editandoId;
  cerrarModal();
  mostrarToast(eraEdicion ? 'Reserva actualizada' : 'Reserva creada');
  await cargarReservas();
}

async function eliminarReserva() {
  if (!editandoId) return;
  if (!confirm('¿Eliminar esta reserva?')) return;

  const { error } = await supabaseClient
    .from('reservas')
    .delete()
    .eq('id', editandoId);

  if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
  }

  cerrarModal();
  mostrarToast('Reserva eliminada');
  await cargarReservas();
}

// ---------- INICIO ----------
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btnNuevaReserva').addEventListener('click', function() {
    abrirModalNueva();
  });
  document.getElementById('btnMesAnterior').addEventListener('click', function() {
    cambiarMes(-1);
  });
  document.getElementById('btnMesSiguiente').addEventListener('click', function() {
    cambiarMes(1);
  });
  document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
  document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
  document.getElementById('btnEliminar').addEventListener('click', eliminarReserva);
  document.getElementById('btnGuardar').addEventListener('click', guardarReserva);

  document.getElementById('total').addEventListener('input', calcularSaldo);
  document.getElementById('sena').addEventListener('input', calcularSaldo);
  document.getElementById('senaPagada').addEventListener('change', calcularSaldo);

  document.getElementById('fecha').addEventListener('change', function(e) {
    const fecha = e.target.value;
    actualizarOpcionesHorario(fecha, esSabado(fecha) ? '10:00-17:00' : HORARIO_FIJO);
  });

  document.getElementById('horario').addEventListener('change', function() {
    cambiarTurnoEnModal();
  });

  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target.id === 'modal') cerrarModal();
  });

  renderCalendario();
  if (initSupabase()) {
    cargarReservas();
  } else {
    renderLista();
  }
});
