async function cargarReservas() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('reservas')
      .select('*')
      .order(DB_DATE_COLUMN, { ascending: true });

    if (error) {
      console.error('Error cargando reservas:', error);
      document.getElementById('listaReservas').innerHTML = `
        <div class="empty-state">
          ⚠️ Error cargando reservas<br><br>
          ${escaparHTML(error.message)}
        </div>`;
      reservas = [];
    } else {
      reservas = (data || []).map(normalizarReserva);
    }

    // Siempre actualizar las dos vistas
    renderCalendario();
    renderLista();

  } catch (err) {
    console.error(err);
    document.getElementById('listaReservas').innerHTML = `
      <div class="empty-state">Error inesperado al cargar las reservas.</div>`;
  }
}
