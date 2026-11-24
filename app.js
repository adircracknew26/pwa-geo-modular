// ============================================================================
// app.js - Lógica de UI, Pre-Permiso Ético, Indicador de Señal y Reutilización
// Restricción técnica: 100% Vanilla JS con .then(), .catch() y .finally()
// ============================================================================

// Catálogo de zonas para el Plan B (Degradación Elegante)
const CATALOGO_ZONAS_MANUALES = {
  'cdmx-centro': {
    nombre: 'CDMX · Centro Histórico',
    latitud: 19.432608,
    longitud: -99.133209,
    precisionMetros: 2500
  },
  'cdmx-sur': {
    nombre: 'CDMX · Zona Sur / Coyoacán',
    latitud: 19.3467,
    longitud: -99.1617,
    precisionMetros: 3000
  },
  'gdl-centro': {
    nombre: 'Guadalajara · Zona Minerva',
    latitud: 20.6744,
    longitud: -103.3874,
    precisionMetros: 3500
  },
  'mty-centro': {
    nombre: 'Monterrey · San Pedro / Centro',
    latitud: 25.6866,
    longitud: -100.3161,
    precisionMetros: 3500
  },
  'puebla-centro': {
    nombre: 'Puebla · Angelópolis',
    latitud: 19.0414,
    longitud: -98.2063,
    precisionMetros: 3000
  },
  'qro-centro': {
    nombre: 'Querétaro · Zona Industrial',
    latitud: 20.5888,
    longitud: -100.3899,
    precisionMetros: 3000
  }
};

// Catálogo de sucursales de soporte técnico para el Caso de Uso B
const SUCURSALES_SOPORTE = [
  {
    id: 'suc-1',
    nombre: 'Centro Operativo CDMX Reforma',
    direccion: 'Paseo de la Reforma 222, Cuauhtémoc, CDMX',
    latitud: 19.4285,
    longitud: -99.1615
  },
  {
    id: 'suc-2',
    nombre: 'Base Técnica CDMX Sur Insurgentes',
    direccion: 'Av. Insurgentes Sur 1605, San José Insurgentes, CDMX',
    latitud: 19.3621,
    longitud: -99.1825
  },
  {
    id: 'suc-3',
    nombre: 'Hub Occidente Guadalajara',
    direccion: 'Av. Vallarta 2440, Arcos Vallarta, Guadalajara, Jal.',
    latitud: 20.6736,
    longitud: -103.3812
  },
  {
    id: 'suc-4',
    nombre: 'Centro Regional Monterrey Norte',
    direccion: 'Av. Constitución 1050, Centro, Monterrey, N.L.',
    latitud: 25.6692,
    longitud: -100.3099
  },
  {
    id: 'suc-5',
    nombre: 'Laboratorio Técnico Puebla',
    direccion: 'Vía Atlixcáyotl 1499, Reserva Territorial, Puebla, Pue.',
    latitud: 19.0205,
    longitud: -98.2401
  },
  {
    id: 'suc-6',
    nombre: 'Nodo Bajío Querétaro',
    direccion: 'Blvd. Bernardo Quintana 4100, Álamos, Querétaro, Qro.',
    latitud: 20.6122,
    longitud: -100.3845
  }
];

// Estado en memoria de la sesión
let eventoInstalacionDiferido = null;
let ubicacionActual = null;
let reportePendienteDatos = null;
const reportesEnviados = [];

// Referencias del DOM
const btnInstalar = document.getElementById('btn-instalar');
const badgePlataforma = document.getElementById('badge-plataforma');
const instruccionesIOS = document.getElementById('instrucciones-ios');
const badgeEstadoPermiso = document.getElementById('badge-estado-permiso');
const indicadorLed = document.getElementById('indicador-led');
const mensajeEstado = document.getElementById('mensaje-estado');

const btnAdjuntarUbicacion = document.getElementById('btn-adjuntar-ubicacion');
const btnAbrirPlanB = document.getElementById('btn-abrir-plan-b');

const tarjetaPrepermiso = document.getElementById('tarjeta-prepermiso');
const btnConfirmarUbicacion = document.getElementById('btn-confirmar-ubicacion');
const btnRechazarPrepermiso = document.getElementById('btn-rechazar-prepermiso');

const panelCoordenadas = document.getElementById('panel-coordenadas');
const badgeCalidadSenal = document.getElementById('badge-calidad-senal');
const valorLatitud = document.getElementById('valor-latitud');
const valorLongitud = document.getElementById('valor-longitud');
const valorPrecision = document.getElementById('valor-precision');
const valorTimestamp = document.getElementById('valor-timestamp');
const origenUbicacionNota = document.getElementById('origen-ubicacion-nota');

const panelPlanB = document.getElementById('panel-plan-b');
const mensajeMotivoFallback = document.getElementById('mensaje-motivo-fallback');
const selectZonaManual = document.getElementById('select-zona-manual');
const inputReferenciaManual = document.getElementById('input-referencia-manual');
const btnAplicarZonaManual = document.getElementById('btn-aplicar-zona-manual');

const formReporte = document.getElementById('form-reporte');
const tipoIncidencia = document.getElementById('tipo-incidencia');
const descripcionReporte = document.getElementById('descripcion-reporte');
const contenedorReportes = document.getElementById('contenedor-reportes');
const listaReportes = document.getElementById('lista-reportes');

const btnBuscarSucursales = document.getElementById('btn-buscar-sucursales');
const listaSucursales = document.getElementById('lista-sucursales');

// ============================================================================
// 1. Utilidades de UI y Estado
// ============================================================================

function actualizarEstadoUI(texto, tipoLed) {
  if (mensajeEstado) {
    mensajeEstado.textContent = texto;
  }
  if (indicadorLed) {
    indicadorLed.className = 'status-dot';
    if (tipoLed) {
      indicadorLed.classList.add(tipoLed);
    }
  }
}

function mostrarCargando(texto) {
  actualizarEstadoUI(texto, 'loading');
}

function mostrarMensajeError(texto) {
  actualizarEstadoUI(texto, 'error');
}

function actualizarBadgePermiso(estado) {
  if (!badgeEstadoPermiso) return;
  badgeEstadoPermiso.textContent = `Permiso: ${estado}`;
  badgeEstadoPermiso.className = 'perm-badge';

  if (estado === 'granted') {
    badgeEstadoPermiso.classList.add('perm-granted');
  } else if (estado === 'denied') {
    badgeEstadoPermiso.classList.add('perm-denied');
  } else {
    badgeEstadoPermiso.classList.add('perm-prompt');
  }
}

function formatearHora(timestamp) {
  try {
    return new Date(timestamp).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return String(timestamp);
  }
}

// ============================================================================
// 2. Renderizado de Ubicación e Indicador de Calidad de Señal (Desafío 3)
// ============================================================================

function renderizarResultadoUbicacion(ubicacion) {
  ubicacionActual = ubicacion;

  if (panelCoordenadas) {
    panelCoordenadas.hidden = false;
  }

  valorLatitud.textContent = Number(ubicacion.latitud).toFixed(6);
  valorLongitud.textContent = Number(ubicacion.longitud).toFixed(6);
  valorPrecision.textContent = `${ubicacion.precisionMetros} m`;
  valorTimestamp.textContent = formatearHora(ubicacion.timestamp);

  // Requisito 3: Indicador de Calidad de Señal (< 30 m vs >= 30 m)
  const esMenorA30 = ubicacion.precisionMetros < 30;
  const etiquetaCalidad = esMenorA30
    ? 'Precisión GPS Alta'
    : 'Ubicación Aproximada (Wi-Fi / IP)';

  badgeCalidadSenal.textContent = `${etiquetaCalidad} (±${ubicacion.precisionMetros} m)`;
  badgeCalidadSenal.className = 'signal-badge ' + (esMenorA30 ? 'signal-high' : 'signal-approx');

  if (ubicacion.esZonaManual) {
    origenUbicacionNota.textContent = `Origen: Plan B Manual (${ubicacion.nombreZona}${ubicacion.referencia ? ' · ' + ubicacion.referencia : ''}).`;
    actualizarEstadoUI(`Zona manual establecida: ${ubicacion.nombreZona}`, 'warning');
  } else {
    origenUbicacionNota.textContent = esMenorA30
      ? 'Origen: Sensor satelital GNSS/GPS de alta precisión (< 30 metros).'
      : 'Origen: Triangulación por red Wi-Fi, antena celular o dirección IP (>= 30 metros).';
    actualizarEstadoUI(`Coordenadas obtenidas correctamente (${etiquetaCalidad}).`, 'active');
  }
}

// ============================================================================
// 3. Plan B Obligatorio: Selector Manual de Zona (Degradación Elegante)
// ============================================================================

function habilitarSelectorManualZona(motivoPersonalizado) {
  if (tarjetaPrepermiso) {
    tarjetaPrepermiso.hidden = true;
  }
  if (panelPlanB) {
    panelPlanB.hidden = false;
  }
  if (motivoPersonalizado && mensajeMotivoFallback) {
    mensajeMotivoFallback.textContent = motivoPersonalizado;
  }
}

function aplicarZonaManualSeleccionada() {
  const claveZona = selectZonaManual.value;
  if (!claveZona || !CATALOGO_ZONAS_MANUALES[claveZona]) {
    mostrarMensajeError('Por favor selecciona una zona o ciudad de la lista para activar el Plan B.');
    selectZonaManual.focus();
    return;
  }

  const datosZona = CATALOGO_ZONAS_MANUALES[claveZona];
  const referencia = inputReferenciaManual.value.trim();

  const ubicacionManual = {
    latitud: datosZona.latitud,
    longitud: datosZona.longitud,
    precisionMetros: datosZona.precisionMetros,
    timestamp: Date.now(),
    esZonaManual: true,
    nombreZona: datosZona.nombre,
    referencia: referencia
  };

  renderizarResultadoUbicacion(ubicacionManual);

  // Si había un reporte pendiente esperando ubicación, lo completamos con el Plan B
  if (reportePendienteDatos) {
    registrarPaqueteReporte(reportePendienteDatos, ubicacionManual);
    reportePendienteDatos = null;
  }

  // Actualizamos también las sucursales cercanas con base en la zona elegida
  renderizarSucursalesOrdenadas(ubicacionManual);
}

// ============================================================================
// 4. Flujo de Pre-Permiso Ético (Desafío 2: granted / prompt / denied)
// ============================================================================

function ejecutarLecturaDirectaGPS(opciones) {
  mostrarCargando('Consultando coordenadas del dispositivo...');

  return obtenerUbicacionActual(opciones)
    .then((ubicacion) => {
      actualizarBadgePermiso('granted');
      if (panelPlanB) {
        panelPlanB.hidden = true;
      }
      renderizarResultadoUbicacion(ubicacion);
      return ubicacion;
    })
    .catch((error) => {
      console.warn('[Geo] Error al obtener ubicación:', error.message);
      if (error.code === 1) {
        actualizarBadgePermiso('denied');
      }
      mostrarMensajeError(error.message);
      habilitarSelectorManualZona(
        `${error.message} Selecciona tu zona manualmente a continuación o sigue la guía para reactivar el permiso.`
      );
      return Promise.reject(error);
    });
}

// Paso 1 del Desafío 2: Al pulsar "Adjuntar mi ubicación", consultar estado del permiso
btnAdjuntarUbicacion.addEventListener('click', () => {
  consultarEstadoPermisoGeo()
    .then((estado) => {
      actualizarBadgePermiso(estado);

      if (estado === 'granted') {
        // Si ya fue concedido, llamamos directamente a obtenerUbicacionActual()
        tarjetaPrepermiso.hidden = true;
        ejecutarLecturaDirectaGPS({ enableHighAccuracy: true, timeout: 8000 }).catch(() => {});
      } else if (estado === 'denied') {
        // Si está bloqueado, mostramos directamente el selector manual y la guía de reactivación
        tarjetaPrepermiso.hidden = true;
        mostrarMensajeError('Permiso de ubicación bloqueado en el navegador.');
        habilitarSelectorManualZona(
          'El permiso de ubicación está denegado en tu navegador. Usa el selector manual de zona o sigue las instrucciones para reactivarlo:'
        );
      } else {
        // estado === 'prompt': Desplegamos tarjeta informativa de Pre-Permiso
        panelPlanB.hidden = true;
        tarjetaPrepermiso.hidden = false;
        actualizarEstadoUI(
          'Revisa el aviso de consentimiento consciente y confirma para compartir tu ubicación.',
          'warning'
        );
      }
    });
});

// Paso 2 del Desafío 2: Confirmación desde la tarjeta de pre-permiso (gesto directo para iOS/Android)
btnConfirmarUbicacion.addEventListener('click', () => {
  tarjetaPrepermiso.hidden = true;
  ejecutarLecturaDirectaGPS({ enableHighAccuracy: true, timeout: 8000 }).catch(() => {});
});

btnRechazarPrepermiso.addEventListener('click', () => {
  tarjetaPrepermiso.hidden = true;
  actualizarEstadoUI('Has elegido ingresar tu ubicación de forma manual (Plan B).', 'warning');
  habilitarSelectorManualZona(
    'Elegiste no utilizar el GPS del dispositivo. Selecciona tu zona o ciudad manualmente:'
  );
});

btnAbrirPlanB.addEventListener('click', () => {
  habilitarSelectorManualZona(
    'Modo manual activado voluntariamente. Selecciona tu zona o ciudad de referencia:'
  );
});

btnAplicarZonaManual.addEventListener('click', () => {
  aplicarZonaManualSeleccionada();
});

// ============================================================================
// 5. Fragmento C: Reutilización desde Múltiples Funciones en app.js
// ============================================================================

function registrarPaqueteReporte(datosFormulario, ubicacion) {
  const paqueteCompleto = Object.assign({}, datosFormulario, {
    coordenadas: ubicacion,
    idReporte: 'REP-' + Math.floor(1000 + Math.random() * 9000)
  });

  console.log('Paquete listo para enviar o encolar en IndexedDB:', paqueteCompleto);
  reportesEnviados.unshift(paqueteCompleto);
  renderizarListaReportes();
}

function renderizarListaReportes() {
  if (!contenedorReportes || !listaReportes) return;
  contenedorReportes.hidden = reportesEnviados.length === 0;
  listaReportes.innerHTML = '';

  reportesEnviados.forEach((rep) => {
    const div = document.createElement('div');
    div.className = 'report-item';

    const calidad = rep.coordenadas.precisionMetros < 30
      ? 'Precisión GPS Alta'
      : 'Ubicación Aproximada (Wi-Fi / IP)';

    const etiquetaOrigen = rep.coordenadas.esZonaManual
      ? `Plan B Manual (${rep.coordenadas.nombreZona})`
      : `${calidad} (±${rep.coordenadas.precisionMetros} m)`;

    div.innerHTML = `
      <div class="report-item-header">
        <span>${rep.idReporte} · ${rep.tipo}</span>
        <span>${formatearHora(rep.coordenadas.timestamp)}</span>
      </div>
      <p>${rep.descripcion}</p>
      <div class="report-item-meta">
        Lat: ${Number(rep.coordenadas.latitud).toFixed(5)} | Lng: ${Number(rep.coordenadas.longitud).toFixed(5)} | ${etiquetaOrigen}
      </div>
    `;
    listaReportes.appendChild(div);
  });
}

// Ejemplo de uso 1 (Fragmento C): Adjuntar coordenadas al enviar un reporte técnico
function enviarReporteConUbicacion(datosFormulario) {
  mostrarCargando('Obteniendo coordenadas para el reporte técnico...');

  return obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 7000 })
    .then((ubicacion) => {
      actualizarBadgePermiso('granted');
      renderizarResultadoUbicacion(ubicacion);
      registrarPaqueteReporte(datosFormulario, ubicacion);
    })
    .catch((error) => {
      console.warn('[Geo] Fallback activado:', error.message);
      mostrarMensajeError(error.message);

      // Si el usuario ya había configurado una zona manual en Plan B, la usamos sin bloquear
      if (ubicacionActual && ubicacionActual.esZonaManual) {
        registrarPaqueteReporte(datosFormulario, ubicacionActual);
        actualizarEstadoUI(
          'Reporte enviado utilizando la zona manual del Plan B previamente seleccionada.',
          'warning'
        );
        return;
      }

      // Guardamos el reporte como pendiente y habilitamos el selector manual de zona
      reportePendienteDatos = datosFormulario;
      habilitarSelectorManualZona(
        `${error.message} Selecciona una zona manual para completar y guardar tu reporte técnico sin perder los datos.`
      );
    });
}

formReporte.addEventListener('submit', (event) => {
  event.preventDefault();

  const datosFormulario = {
    tipo: tipoIncidencia.value,
    descripcion: descripcionReporte.value.trim() || 'Sin observaciones adicionales',
    fechaCreacion: new Date().toISOString()
  };

  enviarReporteConUbicacion(datosFormulario);
});

// Cálculo de distancia en kilómetros (Fórmula de Haversine en Vanilla JS)
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function renderizarSucursalesOrdenadas(ubicacionReferencia) {
  if (!listaSucursales) return;

  const sucursalesConDistancia = SUCURSALES_SOPORTE.map((suc) => {
    const distanciaKm = calcularDistanciaKm(
      ubicacionReferencia.latitud,
      ubicacionReferencia.longitud,
      suc.latitud,
      suc.longitud
    );
    return Object.assign({}, suc, { distanciaKm: distanciaKm });
  }).sort((a, b) => a.distanciaKm - b.distanciaKm);

  listaSucursales.innerHTML = '';

  sucursalesConDistancia.forEach((suc, idx) => {
    const item = document.createElement('div');
    item.className = 'branch-item';
    item.innerHTML = `
      <div class="branch-info">
        <h4>${idx === 0 ? '★ ' : ''}${suc.nombre}</h4>
        <p>${suc.direccion}</p>
      </div>
      <span class="branch-distance">${suc.distanciaKm.toFixed(1)} km</span>
    `;
    listaSucursales.appendChild(item);
  });
}

// Ejemplo de uso 2 (Fragmento C): Lectura rápida de baja precisión para filtrar sucursales cercanas
function buscarSucursalesCercanas() {
  mostrarCargando('Buscando sucursales cercanas (lectura rápida)...');

  return obtenerUbicacionActual({ enableHighAccuracy: false, maximumAge: 60000 })
    .then((ubicacion) => {
      console.log(`Filtrando sucursales cerca de ${ubicacion.latitud}, ${ubicacion.longitud}`);
      actualizarBadgePermiso('granted');
      renderizarResultadoUbicacion(ubicacion);
      renderizarSucursalesOrdenadas(ubicacion);
    })
    .catch((error) => {
      console.warn('[Geo] No se pudo obtener ubicación rápida para sucursales:', error.message);
      mostrarMensajeError(error.message);

      if (ubicacionActual) {
        renderizarSucursalesOrdenadas(ubicacionActual);
        actualizarEstadoUI('Sucursales ordenadas usando tu última ubicación/zona manual.', 'warning');
      } else {
        habilitarSelectorManualZona(
          `${error.message} Elige una zona manual para ordenar las sucursales más cercanas.`
        );
      }
    });
}

btnBuscarSucursales.addEventListener('click', () => {
  buscarSucursalesCercanas();
});

// ============================================================================
// 6. Instalabilidad PWA, Detección iOS / Android y Service Worker
// ============================================================================

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  eventoInstalacionDiferido = event;
  if (btnInstalar) {
    btnInstalar.hidden = false;
  }
});

if (btnInstalar) {
  btnInstalar.addEventListener('click', () => {
    if (!eventoInstalacionDiferido) return;

    eventoInstalacionDiferido.prompt();
    eventoInstalacionDiferido.userChoice
      .then((resultado) => {
        console.log('[PWA] Respuesta a instalación:', resultado.outcome);
        if (resultado.outcome === 'accepted') {
          btnInstalar.hidden = true;
        }
      })
      .catch((error) => {
        console.error('[PWA] Error en instalación:', error);
      })
      .finally(() => {
        eventoInstalacionDiferido = null;
      });
  });
}

window.addEventListener('appinstalled', () => {
  if (btnInstalar) {
    btnInstalar.hidden = true;
  }
  eventoInstalacionDiferido = null;
  console.log('[PWA] Aplicación instalada correctamente.');
});

function detectarPlataformaYEntorno() {
  const ua = navigator.userAgent || '';
  const esIOS =
    (/iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !window.MSStream;
  const esAndroid = /Android/i.test(ua);
  const estaInstalada =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (badgePlataforma) {
    if (esIOS) {
      badgePlataforma.textContent = estaInstalada ? 'iOS · PWA Instalada' : 'iOS · Safari / WebKit';
    } else if (esAndroid) {
      badgePlataforma.textContent = estaInstalada ? 'Android · PWA Instalada' : 'Android · Navegador';
    } else {
      badgePlataforma.textContent = 'Escritorio (Sin GPS dedicado)';
    }
  }

  if (esIOS && !estaInstalada && instruccionesIOS) {
    instruccionesIOS.hidden = false;
  }
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Este navegador no soporta Service Workers.');
    return;
  }

  navigator.serviceWorker
    .register('./sw.js')
    .then((registro) => {
      console.log('[PWA] Service Worker registrado con ámbito:', registro.scope);
    })
    .catch((error) => {
      console.error('[PWA] Error al registrar el Service Worker:', error);
    })
    .finally(() => {
      console.log('[PWA] Verificación de Service Worker completada.');
    });
}

// Regla crítica de iOS: NUNCA llamar a getCurrentPosition() dentro de DOMContentLoaded.
// Solo inspeccionamos pasivamente el estado del permiso y registramos el Service Worker.
document.addEventListener('DOMContentLoaded', () => {
  detectarPlataformaYEntorno();
  registrarServiceWorker();

  consultarEstadoPermisoGeo().then((estado) => {
    actualizarBadgePermiso(estado);
  });
});
