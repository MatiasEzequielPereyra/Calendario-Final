/* =========================================================
   QUINTA MEWEN - RESERVAS
   - Todos los días habilitados
   - Solo los sábados se elige horario (día/noche)
   - Sábados: dos puntos independientes
   - Resto de días: un solo punto
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

const DIAS_PERMITIDOS = [0, 1, 2, 3, 4, 5, 6];
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let supabaseClient = null;
let reservas = [];
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let editandoId = null;

function initSupabase() {
  const alerta = document.getElementById('alertaConfig');
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (error) {
    console.error(error);
    alerta.classList.remove('hidden');
    alerta.innerHTML = '⚠️ Error inicializando Supabase. Revisá la consola.';
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizarReserva(r) {
  return {
    ...r,
    fecha: normalizarFechaStr(r[DB_DATE_COLUMN] || r.fecha || ''),
    horario: r.horario || ''
  };
}

function escaparHTML(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  const partes = String(fechaStr).split('-');
  if (partes.length !== 3) return fechaStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearMoneda(numero) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(numero || 0);
}

function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function fechaLocalDesdeInput(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function esSabado(fechaStr) {
  return !!fechaStr && fechaLocalDesdeInput(fechaStr).getDay() === 6;
}

function diaPermitido(fechaStr) {
  return !!fechaStr && DIAS_PERMITIDOS.includes(fechaLocalDesdeInput(fechaStr).getDay());
}

function nombreDia(fechaStr) {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
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

function horariosDisponibles(fecha, ignorarId = null) {
  if (!diaPermitido(fecha)) return [];
  if (esSabado(fecha)) {
    return Object.keys(HORARIOS).filter(h => !horarioOcupado(fecha, h, ignorarId));
  }
  return horarioOcupado(fecha, HORARIO_FIJO, ignorarId) ? [] : [HORARIO_FIJO];
}

function hoyStr() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function parseFechaLocal(fechaStr) {
  if (!fechaStr) return null;
  const partes = String(fechaStr).split('-');
  if (partes.length !== 3) return null;
  const [y, m, d] = partes.map(Number);
  return new Date(y, m - 1, d);
}

async function cargarReservas() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('reservas')
    .select('*')
    .order(DB_DATE_COLUMN, { ascending: true });

  if (error) {
    console.error('Error cargando reservas:', error);
    document.getElementById('listaReservas').innerHTML = `
      <div class="empty-state">
        <strong>⚠️ Error cargando reservas</strong><br><br>
        ${escaparHTML(error.message)}
      </div>`;
    reservas = [];
    renderCalendario();
    renderLista();
    return;
  }

  reservas = (data || []).map(normalizarReserva);
  
  // Forzar actualización de ambas vistas
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
  const hoy = hoyStr();

  for (let i = 0; i < diaSemana; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const permitido = diaPermitido(fecha);
    const esSab = esSabado(fecha);
    const reservasDia = reservasDeFecha(fecha);

    const div = document.createElement('div');
    div.className = 'day';
    if (fecha === hoy) div.classList.add('today');
    if (!permitido) div.classList.add('day-disabled');

    // Número del día
    const numero = document.createElement('span');
    numero.className = 'day-number';
    numero.textContent = d;
    div.appendChild(numero);

    if (permitido) {
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'day-dots';

      if (esSab) {
        // ========== SÁBADO: dos puntos independientes ==========
        const reservaDia = reservasDia.find(r => r.horario === '10:00-17:00');
        const reservaNoche = reservasDia.find(r => r.horario === '22:00-05:00');

        // Punto del turno DÍA
        const puntoDia = document.createElement('span');
        puntoDia.className = `day-dot ${reservaDia ? 'ocupado' : 'disponible'}`;
        puntoDia.title = reservaDia ? 'Turno Día: Reservado (tocar para editar)' : 'Turno Día: Disponible';
        puntoDia.addEventListener('click', (e) => {
          e.stopPropagation();
          if (reservaDia) {
            abrirModalEditar(reservaDia.id);   // ← permite editar/borrar
          } else {
            abrirModalNueva(fecha, '10:00-17:00');
          }
        });
        dotsContainer.appendChild(puntoDia);

        // Punto del turno NOCHE
        const puntoNoche = document.createElement('span');
        puntoNoche.className = `day-dot ${reservaNoche ? 'ocupado' : 'disponible'}`;
        puntoNoche.title = reservaNoche ? 'Turno Noche: Reservado (tocar para editar)' : 'Turno Noche: Disponible';
        puntoNoche.addEventListener('click', (e) => {
          e.stopPropagation();
          if (reservaNoche) {
            abrirModalEditar(reservaNoche.id); // ← permite editar/borrar
          } else {
            abrirModalNueva(fecha, '22:00-05:00');
          }
        });
        dotsContainer.appendChild(puntoNoche);

        div.appendChild(dotsContainer);

        // Click general en el día (si no se tocó un punto)
        div.addEventListener('click', () => {
          if (reservaDia && reservaNoche) {
            // Ambos ocupados → abrir el primero
            abrirModalEditar(reservaDia.id);
          } else {
            abrirModalNueva(fecha);
          }
        });

      } else {
        // ========== RESTO DE DÍAS: un solo punto ==========
        const reserva = reservasDia.find(r => r.horario === HORARIO_FIJO);

        const punto = document.createElement('span');
        punto.className = `day-dot ${reserva ? 'ocupado' : 'disponible'}`;
        punto.title = reserva ? 'Reservado (tocar para editar)' : 'Disponible';
        
        punto.addEventListener('click', (e) => {
          e.stopPropagation();
          if (reserva) {
            abrirModalEditar(reserva.id);     // ← permite editar/borrar
          } else {
            abrirModalNueva(fecha, HORARIO_FIJO);
          }
        });

        dotsContainer.appendChild(punto);
        div.appendChild(dotsContainer);

        div.addEventListener('click', () => {
          if (reserva) {
            abrirModalEditar(reserva.id);
          } else {
            abrirModalNueva(fecha, HORARIO_FIJO);
          }
        });
      }
    } else {
      div.addEventListener('click', () => {
        mostrarToast('Este día no está habilitado.');
      });
    }

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
  if (!contenedor) return;

  const hoy = parseFechaLocal(hoyStr());

  const visibles = reservas
    .filter(r => {
      if (!r.fecha) return false;
      const fechaReserva = parseFechaLocal(r.fecha);
      if (!fechaReserva) return false;
      return fechaReserva >= hoy;
    })
    .sort((a, b) => {
      const cmpFecha = a.fecha.localeCompare(b.fecha);
      if (cmpFecha !== 0) return cmpFecha;
      return String(a.horario || '').localeCompare(String(b.horario || ''));
    });

  const contador = document.getElementById('contadorReservas');
  if (contador) contador.textContent = `(${visibles.length})`;

  if (!visibles.length) {
    contenedor.innerHTML = '<div class="empty-state">No hay reservas próximas.</div>';
    return;
  }

  contenedor.innerHTML = visibles.map(reserva => {
    const saldo = calcularSaldoReserva(reserva);
    let badge;
    if (reserva.sena_pagada || Number(reserva.sena) === 0) {
      badge = saldo <= 0
        ? '<span class="badge badge-ok">Pagado</span>'
        : `<span class="badge badge-pendiente">Falta ${formatearMoneda(saldo)}</span>`;
    } else {
      badge = '<span class="badge badge-parcial">Seña pendiente</span>';
    }

    const horarioTexto = HORARIOS[reserva.horario]
      ? HORARIOS[reserva.horario].replace(/^☀️ |^🌙 /, '')
      : (reserva.horario || 'No definido');

    const icono = reserva.horario === '22:00-05:00' ? '🌙' : '☀️';

    return `<button type="button" class="reserva-item" data-id="${escaparHTML(reserva.id)}">
      <div class="nombre">${escaparHTML(reserva.nombre || 'Sin nombre')}</div>
      <div class="fechas">${formatearFecha(reserva.fecha)} · <strong>${icono} ${escaparHTML(horarioTexto)}</strong></div>
      <div class="montos">
        <span>Total: ${formatearMoneda(reserva.total)}</span>
        ${badge}
      </div>
    </button>`;
  }).join('');

  // Volver a asignar los eventos de click
  contenedor.querySelectorAll('.reserva-item').forEach(el => {
    el.addEventListener('click', () => abrirModalEditar(el.dataset.id));
  });
}

function calcularSaldoReserva(reserva) {
  const total = Number(reserva.total) || 0;
  const sena = Number(reserva.sena) || 0;
  return reserva.sena_pagada ? Math.max(0, total - sena) : total;
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
    // Sábado → se puede elegir
    select.disabled = false;
    if (ayuda) {
      ayuda.textContent = editandoId
        ? 'Podés cambiar el horario o eliminar la reserva.'
        : 'Sábado: podés elegir turno día o noche.';
    }

    Object.entries(HORARIOS).forEach(([valor, texto]) => {
      // Solo se marca como ocupado si lo tiene OTRO reserva (no la que estamos editando)
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

      // Si es el horario de la reserva que estamos editando, lo seleccionamos sí o sí
      if (valor === horarioSeleccionado) {
        option.selected = true;
        option.disabled = false; // ← muy importante: nunca deshabilitar el actual
        option.textContent = texto; // sin la palabra OCUPADO
      }

      select.appendChild(option);
    });

  } else {
    // Días que no son sábado → turno fijo
    select.disabled = true;
    if (ayuda) {
      ayuda.textContent = editandoId
        ? 'Turno día. Podés modificar los datos o eliminar la reserva.'
        : 'Solo los sábados se elige horario. Este día es turno día (10:00-17:00).';
    }

    const option = document.createElement('option');
    option.value = HORARIO_FIJO;
    option.textContent = HORARIOS[HORARIO_FIJO];
    option.selected = true;
    select.appendChild(option);
  }
}

function abrirModalEditar(id) {
  const reserva = buscarReservaPorId(id);
  if (!reserva) {
    mostrarToast('No se encontró la reserva');
    return;
  }

  editandoId = id; // ← se setea ANTES de todo

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

  // Cargar horarios permitiendo el actual
  actualizarOpcionesHorario(reserva.fecha || '', reserva.horario || '');
  
  // Forzar el valor del select
  const selectHorario = document.getElementById('horario');
  if (selectHorario) {
    selectHorario.value = reserva.horario || HORARIO_FIJO;
  }

  calcularSaldo();
  document.getElementById('modal').classList.add('active');
}

function abrirModalEditar(id) {
  const reserva = buscarReservaPorId(id);
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
if (horarioOcupado(fecha, horario, editandoId)) {
  return alert('Ese turno ya está reservado por otra persona.');
}
  }

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const fecha = document.getElementById('fecha').value;
  let horario = document.getElementById('horario').value;

  if (!nombre) return alert('El nombre es obligatorio.');
  if (!fecha) return alert('La fecha es obligatoria.');
  if (!diaPermitido(fecha)) return alert(`No se pueden crear reservas los ${nombreDia(fecha)}.`);

  if (!esSabado(fecha)) {
    horario = HORARIO_FIJO;
  }

  if (!horario || !HORARIOS[horario]) return alert('Elegí un horario de reserva.');
  if (horarioOcupado(fecha, horario, editandoId)) {
    return alert('Ese turno ya está reservado.');
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
    console.error('Error guardando:', error);
    if (error.code === '23505') {
      alert('Ese turno ya está reservado para esa fecha.');
    } else {
      alert(`Error al guardar:\n\n${error.message}`);
    }
    return;
  }

  const eraEdicion = !!editandoId;
  cerrarModal();
  mostrarToast(eraEdicion ? 'Reserva actualizada' : 'Reserva creada correctamente');

  // Recarga forzada de todo
  await cargarReservas();
}

async function eliminarReserva() {
  if (!editandoId) {
    alert('No hay ninguna reserva seleccionada para eliminar.');
    return;
  }

  if (!supabaseClient) {
    alert('No hay conexión con la base de datos.');
    return;
  }

  const confirmar = confirm('¿Seguro que querés eliminar esta reserva?\n\nEl turno quedará nuevamente disponible.');
  if (!confirmar) return;

  try {
    const { error } = await supabaseClient
      .from('reservas')
      .delete()
      .eq('id', editandoId);

    if (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la reserva:\n\n' + error.message);
      return;
    }

    // Éxito
    mostrarToast('Reserva eliminada correctamente');
    cerrarModal();
    await cargarReservas(); // actualiza calendario + lista

  } catch (err) {
    console.error(err);
    alert('Ocurrió un error inesperado al eliminar.');
  }
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
  const reservaActual = editandoId ? buscarReservaPorId(editandoId) : null;
  actualizarOpcionesHorario(fecha, reservaActual && reservaActual.fecha === fecha ? reservaActual.horario : '');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarModal();
});

document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') cerrarModal();
});

document.addEventListener('DOMContentLoaded', async () => {
  renderCalendario();
  if (initSupabase()) await cargarReservas();
});

}
