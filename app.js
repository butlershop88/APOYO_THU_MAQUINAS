// EJECUTAR INMEDIATAMENTE
console.log('=== APP INICIANDO ===');

// CONFIGURACION
const CONFIG = {
  ordenTareas: ['Flejar+Paquete', 'Paquete', 'Bobina', 'Cuna', 'Tacos'],
  abrev: { 'Flejar+Paquete': 'F-P', Paquete: 'P', Bobina: 'B', Cuna: 'C', Tacos: 'T' },
  tiempos: { 'Flejar+Paquete': 6, Paquete: 3, Bobina: 8, Cuna: 2, Tacos: 4 },
  coloresTareas: {
    'Flejar+Paquete': 'rgba(25, 135, 84, 0.8)',
    'Paquete': 'rgba(255, 165, 0, 0.8)',
    'Bobina': 'rgba(128, 128, 128, 0.8)',
    'Cuna': 'rgba(165, 42, 42, 0.8)',
    'Tacos': '#a2785b',
  },
  coloresFijosPuestos: {
    '23': '#FF4D4D',
    '24': '#4DB3FF',
    '11': '#FFF04D',
    '15': '#6CFF6C',
  },
  paletaSecundaria: ['#FFA500', '#FF69B4', '#FFFFFF', '#9370DB', '#87CEEB', '#7FFFD4', '#FFB366'],
  JORNADA_MINUTOS: parseInt(localStorage.getItem('jornadaMinutos') || '465'),
};

// ESTADO
const STATE = {
  puestos: JSON.parse(localStorage.getItem('puestos') || '[]'),
  log: JSON.parse(localStorage.getItem('registroTareas') || '[]'),
  colorPuestos: JSON.parse(localStorage.getItem('colorPuestos') || '{}'),
  chartInstance: null,
  jornadaActual: localStorage.getItem('jornadaActual') || getJornadaLogica(),
  vistaActual: 'actual',
};

function getJornadaLogica() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
}

// GUARDADO
function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando', key, e);
  }
}

// UTILIDADES
function showPopup(msg) {
  const popup = document.getElementById('popup');
  popup.textContent = msg;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 2000);
}

function getColorPuesto(puesto) {
  if (STATE.colorPuestos[puesto]) return STATE.colorPuestos[puesto];
  
  if (CONFIG.coloresFijosPuestos[puesto]) {
    STATE.colorPuestos[puesto] = CONFIG.coloresFijosPuestos[puesto];
    save('colorPuestos', STATE.colorPuestos);
    return STATE.colorPuestos[puesto];
  }
  
  const puestosNoFijos = STATE.puestos.filter(p => !CONFIG.coloresFijosPuestos[p]);
  const index = puestosNoFijos.indexOf(puesto);
  
  if (index >= 0) {
    let color = CONFIG.paletaSecundaria[index % CONFIG.paletaSecundaria.length];
    if (color === '#FFFFFF' && !document.body.classList.contains('dark-mode')) {
      color = '#000000';
    }
    STATE.colorPuestos[puesto] = color;
    save('colorPuestos', STATE.colorPuestos);
    return color;
  }
  
  STATE.colorPuestos[puesto] = '#CCCCCC';
  save('colorPuestos', STATE.colorPuestos);
  return '#CCCCCC';
}

// RENDER
function renderPuestos() {
  const container = document.getElementById('puestos-container');
  container.innerHTML = STATE.puestos.map(p => `
    <div class="puesto" style="border-left: 5px solid ${getColorPuesto(p)}">
      <div class="puesto-header">
        <span>Puesto ${p}</span>
        <button class="quitar-puesto-btn" data-puesto="${p}">X</button>
      </div>
      <div class="tarea-buttons">
        ${CONFIG.ordenTareas.map(t => 
          `<button class="add-tarea-btn ${CONFIG.abrev[t]}" data-puesto="${p}" data-tarea="${t}">${CONFIG.abrev[t]}</button>`
        ).join('')}
      </div>
    </div>
  `).join('');
}

function renderDashboard() {
  const logHoy = STATE.log.filter(l => l.fecha === STATE.jornadaActual);
  const contador = logHoy.reduce((acc, l) => {
    acc[l.puesto] = acc[l.puesto] || { total: 0, ...CONFIG.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}) };
    acc[l.puesto][l.tarea]++;
    acc[l.puesto].total++;
    return acc;
  }, {});

  const puestos = Object.keys(contador).sort((a, b) => contador[b].total - contador[a].total);
  if (puestos.length === 0) {
    document.getElementById('dashboard-container').innerHTML = '<p>No hay registros para hoy.</p>';
    return;
  }
  
  let html = '<table class="tabla-resumen"><thead><tr><th>Puesto</th>' +
    CONFIG.ordenTareas.map(t => `<th>${CONFIG.abrev[t]}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
  
  puestos.forEach(p => {
    html += `<tr><td><span style="color:${getColorPuesto(p)}; font-weight:bold;">Puesto ${p}</span></td>` +
      CONFIG.ordenTareas.map(t => `<td>${contador[p][t] || 0}</td>`).join('') +
      `<td>${contador[p].total}</td></tr>`;
  });
  
  document.getElementById('dashboard-container').innerHTML = html + '</tbody></table>';
}

function renderLog() {
  const logHoy = STATE.log.filter(l => l.fecha === STATE.jornadaActual).slice(0, 50);
  document.getElementById('log-container').innerHTML = logHoy.map(l => `
    <div class="log-entry">
      <span><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> | ${l.hora} | ${CONFIG.abrev[l.tarea]}</span>
      <button class="eliminar-log-btn" data-id="${l.id}"></button>
    </div>
  `).join('');
}

function renderAll() {
  renderPuestos();
  renderDashboard();
  renderLog();
}

// HANDLERS
function addPuesto() {
  console.log('addPuesto called');
  const input = document.getElementById('nuevo-puesto-input');
  const num = input.value.trim();
  if (num && !STATE.puestos.includes(num)) {
    STATE.puestos.push(num);
    STATE.puestos.sort((a, b) => parseInt(a) - parseInt(b));
    save('puestos', STATE.puestos);
    renderAll();
    showPopup('Puesto añadido');
  }
  input.value = '';
}

function addTarea(puesto, tarea) {
  console.log('addTarea called', puesto, tarea);
  const now = new Date();
  STATE.log.unshift({
    id: Date.now(),
    puesto,
    tarea,
    fecha: STATE.jornadaActual,
    hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  });
  save('registroTareas', STATE.log);
  renderDashboard();
  renderLog();
  showPopup('Registro añadido');
}

function quitarPuesto(puesto) {
  if (confirm(`¿Seguro que quieres quitar el puesto ${puesto}?`)) {
    STATE.puestos = STATE.puestos.filter(p => p !== puesto);
    save('puestos', STATE.puestos);
    renderAll();
  }
}

function eliminarLog(id) {
  const logId = parseInt(id);
  
  // Eliminar de STATE.log (registro de hoy)
  const logHoyInicial = STATE.log.length;
  STATE.log = STATE.log.filter(l => l.id !== logId);
  if (logHoyInicial > STATE.log.length) {
    save('registroTareas', STATE.log);
    renderDashboard();
    renderLog();
    return;
  }

  // Si no se encontró en el log de hoy, buscar en el historial completo
  let historial = JSON.parse(localStorage.getItem('historialCompleto') || '[]');
  const historialInicial = historial.length;
  historial = historial.filter(l => l.id !== logId);

  if (historialInicial > historial.length) {
    save('historialCompleto', historial);
    // Re-renderizar la vista de historial si es la activa
    if (STATE.vistaActual === 'historial') {
      renderHistorialCompleto();
    }
  }
}

function clearToday() {
  if (confirm('¿Seguro que quieres borrar todos los registros de hoy?')) {
    STATE.log = STATE.log.filter(l => l.fecha !== STATE.jornadaActual);
    save('registroTareas', STATE.log);
    renderAll();
  }
}

function resetColors() {
  if (confirm('¿Resetear todos los colores?')) {
    STATE.colorPuestos = {};
    save('colorPuestos', STATE.colorPuestos);
    renderAll();
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark-mode' : '');
}

function cambiarVista(vista) {
  console.log('Cambiando a vista:', vista);
  STATE.vistaActual = vista;
  
  // Ocultar todas las vistas
  document.querySelectorAll('.vista-container').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.modo-toggle button').forEach(b => b.classList.remove('active'));
  
  // Mostrar vista seleccionada
  const vistaEl = document.getElementById(`vista-${vista}`);
  if (vistaEl) vistaEl.classList.add('active');
  
  const boton = document.querySelector(`[data-vista="${vista}"]`);
  if (boton) boton.classList.add('active');
  
  // Renderizar contenido según vista
  if (vista === 'historial') {
    // Por defecto, mostrar la primera sub-pestaña ('completo')
    cambiarSubVistaHistorial('completo');
  }
  if (vista === 'graficas') renderGraficas('daily');
}

function cambiarSubVistaHistorial(subVista) {
  // Ocultar todos los contenidos de las sub-pestañas de historial
  document.getElementById('hist-completo').style.display = 'none';
  document.getElementById('hist-compact').style.display = 'none';

  // Quitar clase 'active' de todos los botones de sub-pestañas
  document.querySelectorAll('.hist-tabs button').forEach(b => b.classList.remove('active'));

  // Mostrar el contenido y activar el botón de la sub-pestaña seleccionada
  const subVistaEl = document.getElementById(`hist-${subVista}`);
  if (subVistaEl) {
    subVistaEl.style.display = 'block';
  }
  
  const botonSubVista = document.querySelector(`.hist-tabs button[data-sub="${subVista}"]`);
  if (botonSubVista) {
    botonSubVista.classList.add('active');
  }

  // Renderizar el contenido específico de la sub-pestaña
  if (subVista === 'completo') {
    renderHistorialCompleto();
  } else if (subVista === 'compact') {
    // Activar el filtro 'hoy' por defecto
    document.querySelectorAll('.horas-filtros button').forEach(b => b.classList.remove('active'));
    const hoyButton = document.querySelector('.horas-filtros button[data-rango="hoy"]');
    if (hoyButton) {
      hoyButton.classList.add('active');
    }
    // Por defecto, renderizar con el rango 'hoy'
    renderDistribucionHoras('hoy');
  }
}

function renderHistorialCompleto() {
  const cont = document.getElementById('hist-completo');
  const historial = JSON.parse(localStorage.getItem('historialCompleto') || '[]');
  const porFecha = historial.reduce((acc, l) => {
    if (!acc[l.fecha]) acc[l.fecha] = [];
    acc[l.fecha].push(l);
    return acc;
  }, {});
  
  const fechas = Object.keys(porFecha).sort((a, b) => parseDdMmYyyy(b).getTime() - parseDdMmYyyy(a).getTime());
  
  if (fechas.length === 0) {
    cont.innerHTML = '<p>No hay historial.</p>';
    return;
  }
  
  cont.innerHTML = fechas.map(f => {
    const fecha = parseDdMmYyyy(f);
    const titulo = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
      <div class="puesto">
        <div class="puesto-header">
          <h3 style="margin:0;">${titulo}</h3>
        </div>
        ${porFecha[f].map(l => `
          <div class="log-entry">
            <span><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> - ${l.hora} - ${CONFIG.abrev[l.tarea]}</span>
            <button class="eliminar-log-btn" data-id="${l.id}"></button>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function yyyyMmDd(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseDdMmYyyy(dateString) {
  const [day, month, year] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function renderDistribucionHoras(rango) {
  const cont = document.getElementById('horas-container');
  const hoy = new Date();
  let start, end;

  if (rango === 'hoy') {
    start = end = STATE.jornadaActual;
  } else {
    let startDate = new Date();
    let endDate = new Date();
    if (rango === 'ayer') {
      startDate.setDate(hoy.getDate() - 1);
      endDate.setDate(hoy.getDate() - 1);
    } else if (rango === '7dias') {
      startDate.setDate(hoy.getDate() - 6);
    } else if (rango === 'mes') {
      startDate.setDate(1);
    }
    start = yyyyMmDd(startDate);
    end = yyyyMmDd(endDate);
  }

  const historial = JSON.parse(localStorage.getItem('historialCompleto') || '[]');
  const logCompleto = [...historial, ...STATE.log];
  const logFiltrado = logCompleto.filter(l => {
    const logDate = parseDdMmYyyy(l.fecha);
    const startDate = parseDdMmYyyy(start);
    const endDate = parseDdMmYyyy(end);
    return logDate >= startDate && logDate <= endDate;
  });

  if (logFiltrado.length === 0) {
    cont.innerHTML = '<p>No hay datos para este rango.</p>';
    return;
  }

  const esfuerzo = logFiltrado.reduce((acc, l) => {
    acc[l.puesto] = (acc[l.puesto] || 0) + (CONFIG.tiempos[l.tarea] || 0);
    return acc;
  }, {});

  const totalEsfuerzo = Object.values(esfuerzo).reduce((s, v) => s + v, 0);

  if (totalEsfuerzo === 0) {
    cont.innerHTML = '<p>No hay tareas con tiempo.</p>';
    return;
  }

  const asignacion = {};
  Object.keys(esfuerzo).forEach(p => {
    const minutos = (esfuerzo[p] / totalEsfuerzo) * CONFIG.JORNADA_MINUTOS;
    asignacion[p] = { minutos, horas: minutos / 60 };
  });

  let html = `<h3>Distribución de Horas - ${rango}</h3><table class="tabla-resumen"><thead><tr><th>Puesto</th><th>Tiempo</th><th>Decimal</th></tr></thead><tbody>`;
  Object.keys(asignacion)
    .sort((a, b) => asignacion[b].minutos - asignacion[a].minutos)
    .forEach(p => {
      const h = Math.floor(asignacion[p].minutos / 60);
      const m = Math.round(asignacion[p].minutos % 60);
      html += `<tr><td><strong style="color:${getColorPuesto(p)};">P${p}</strong></td><td>${h}h ${m}min</td><td>${asignacion[p].horas.toFixed(2)}</td></tr>`;
    });
  html += '</tbody></table>';

  cont.innerHTML = html;
}


function renderGraficas(periodo) {
  if (STATE.chartInstance) {
    STATE.chartInstance.destroy();
    STATE.chartInstance = null;
  }
  
  let fechaInicio = new Date();
  if (periodo === 'weekly') fechaInicio.setDate(fechaInicio.getDate() - 6);
  if (periodo === 'biweekly') fechaInicio.setDate(fechaInicio.getDate() - 14);
  if (periodo === 'monthly') fechaInicio.setDate(fechaInicio.getDate() - 29);
  
  const fechaInicioStr = yyyyMmDd(fechaInicio);
  const hoyStr = yyyyMmDd(new Date());
  
  const historial = JSON.parse(localStorage.getItem('historialCompleto') || '[]');
  const logCompleto = [...historial, ...STATE.log];
  
  const logParaGraficar = periodo === 'daily' 
    ? STATE.log.filter(l => l.fecha === STATE.jornadaActual)
    : logCompleto.filter(l => {
        const logDate = parseDdMmYyyy(l.fecha);
        const startDate = parseDdMmYyyy(fechaInicioStr);
        const endDate = parseDdMmYyyy(hoyStr);
        return logDate >= startDate && logDate <= endDate;
      });
  
  const contador = logParaGraficar.reduce((acc, l) => {
    acc[l.puesto] = acc[l.puesto] || { ...CONFIG.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}), total: 0 };
    acc[l.puesto][l.tarea]++;
    acc[l.puesto].total++;
    return acc;
  }, {});
  
  const puestos = Object.keys(contador).sort((a, b) => contador[b].total - contador[a].total);
  
  const datasets = CONFIG.ordenTareas.map(t => ({
    label: CONFIG.abrev[t],
    data: puestos.map(p => contador[p][t]),
    backgroundColor: CONFIG.coloresTareas[t],
  }));
  
  const ctx = document.getElementById('grafico-puestos').getContext('2d');
  STATE.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: puestos.map(p => `Puesto ${p}`), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    },
  });
}

function finalizarJornada() {
  if (!confirm('¿Finalizar jornada y guardar en historial?')) return;
  
  const logHoy = STATE.log.filter(l => l.fecha === STATE.jornadaActual);
  if (logHoy.length === 0) {
    alert('No hay registros.');
    return;
  }
  
  let historial = JSON.parse(localStorage.getItem('historialCompleto') || '[]');
  historial.push(...logHoy);
  save('historialCompleto', historial);
  
  STATE.log = STATE.log.filter(l => l.fecha !== STATE.jornadaActual);
  save('registroTareas', STATE.log);
  
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = today.getFullYear();
  STATE.jornadaActual = `${day}-${month}-${year}`;
  localStorage.setItem('jornadaActual', STATE.jornadaActual);
  
  renderAll();
  alert('Jornada finalizada y guardada.');
}

// SETUP LISTENERS
function setupListeners() {
  console.log('Setting up listeners using event delegation...');

  document.body.addEventListener('click', (e) => {
    const target = e.target;

    // Theme toggle
    if (target.matches('#theme-toggle')) {
      toggleTheme();
      return;
    }
    
    // Add puesto
    if (target.matches('#add-puesto-btn')) {
      addPuesto();
      return;
    }

    // Clear today
    if (target.matches('#clear-today-btn')) {
      clearToday();
      return;
    }

    // Reset colors
    if (target.matches('#reset-colors-btn')) {
      resetColors();
      return;
    }

    // Finalizar jornada
    if (target.matches('#finalizar-jornada-btn')) {
      finalizarJornada();
      return;
    }

    // Cambio de vista
    const vistaBtn = target.closest('[data-vista]');
    if (vistaBtn && target.closest('.modo-toggle')) {
      cambiarVista(vistaBtn.dataset.vista);
      return;
    }

    // Sub-pestañas de Historial
    const subVistaBtn = target.closest('[data-sub]');
    if (subVistaBtn && target.closest('.hist-tabs')) {
      cambiarSubVistaHistorial(subVistaBtn.dataset.sub);
      return;
    }

    // Filtros de horas
    const rangoBtn = target.closest('[data-rango]');
    if (rangoBtn && target.closest('.horas-filtros')) {
      document.querySelectorAll('.horas-filtros button').forEach(b => b.classList.remove('active'));
      rangoBtn.classList.add('active');
      renderDistribucionHoras(rangoBtn.dataset.rango);
      return;
    }

    // Filtros de gráficas
    const periodoBtn = target.closest('[data-periodo]');
    if (periodoBtn && target.closest('.filtros-graficas')) {
      document.querySelectorAll('.filtros-graficas button').forEach(b => b.classList.remove('active'));
      periodoBtn.classList.add('active');
      renderGraficas(periodoBtn.dataset.periodo);
      return;
    }

    // Tareas dinámicas
    if (target.classList.contains('add-tarea-btn')) {
      addTarea(target.dataset.puesto, target.dataset.tarea);
      return;
    }
    
    if (target.classList.contains('quitar-puesto-btn')) {
      quitarPuesto(target.dataset.puesto);
      return;
    }
    
    if (target.classList.contains('eliminar-log-btn')) {
      eliminarLog(target.dataset.id);
      return;
    }
  });

  // Listener para la tecla Enter en el input
  const input = document.getElementById('nuevo-puesto-input');
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addPuesto();
      }
    });
  }

  console.log('All listeners setup complete');
}

// INIT
function init() {
  console.log('Initializing app...');
  
  // Theme
  if (localStorage.getItem('theme') === 'dark-mode') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').textContent = '☀️';
  }
  
  // Jornada input
  const jornadaInput = document.getElementById('jornada-minutos-input');
  if (jornadaInput) {
    jornadaInput.value = CONFIG.JORNADA_MINUTOS;
    const display = document.getElementById('jornada-horas-display');
    if (display) {
      const h = Math.floor(CONFIG.JORNADA_MINUTOS / 60);
      const m = CONFIG.JORNADA_MINUTOS % 60;
      display.textContent = `(${h}h ${m}m)`;
    }
  }
  
  renderAll();
  setupListeners();
  
  // Ocultar la pantalla de carga
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }

  console.log('=== APP INITIALIZED ===');
}

// EJECUTAR
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
