// ============================================================================
// geo-helper.js - Módulo reutilizable de geolocalización en Vanilla JS
// Restricción técnica: 100% Promesas nativas (new Promise, .then, .catch)
// ============================================================================

/**
 * Fragmento A: Traducción de códigos numéricos nativos (1, 2, 3) a mensajes claros
 * @param {GeolocationPositionError} error
 * @returns {string}
 */
function traducirErrorGeolocalizacion(error) {
  if (!error || typeof error.code !== 'number') {
    return 'Ocurrió un error inesperado al consultar la ubicación.';
  }

  switch (error.code) {
    case 1: // error.PERMISSION_DENIED
      return 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.';
    case 2: // error.POSITION_UNAVAILABLE
      return 'No fue posible determinar tu ubicación (señal GPS o Wi-Fi no disponible).';
    case 3: // error.TIMEOUT
      return 'Se agotó el tiempo de espera intentando obtener las coordenadas.';
    default:
      return 'Ocurrió un error inesperado al consultar la ubicación.';
  }
}

/**
 * Evalúa la calidad de la señal según el margen de error en metros (coords.accuracy)
 * Regla del desafío: < 30m = "Precisión GPS Alta", >= 30m = "Ubicación Aproximada (Wi-Fi / IP)"
 * @param {number} precisionMetros
 * @returns {{ etiqueta: string, esAltaPrecision: boolean }}
 */
function evaluarCalidadSenal(precisionMetros) {
  const esAlta = typeof precisionMetros === 'number' && precisionMetros < 30;
  return {
    etiqueta: esAlta ? 'Precisión GPS Alta' : 'Ubicación Aproximada (Wi-Fi / IP)',
    esAltaPrecision: esAlta
  };
}

/**
 * Fragmento A: Encapsulamiento promisificado de navigator.geolocation.getCurrentPosition
 * Incluye reintento adaptativo opcional si falla por TIMEOUT con alta precisión en equipos sin GPS.
 * @param {PositionOptions} opcionesPersonalizadas
 * @returns {Promise<{latitud: number, longitud: number, precisionMetros: number, timestamp: number, calidadSenal: string, esAltaPrecision: boolean}>}
 */
function obtenerUbicacionActual(opcionesPersonalizadas) {
  const opciones = Object.assign(
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000 // Acepta una lectura reciente de hasta 30 segundos
    },
    opcionesPersonalizadas
  );

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Este navegador no soporta la API de Geolocalización.'));
      return;
    }

    function procesarExito(posicion) {
      const precisionRedondeada = Math.round(posicion.coords.accuracy);
      const calidad = evaluarCalidadSenal(precisionRedondeada);

      resolve({
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        precisionMetros: precisionRedondeada,
        timestamp: posicion.timestamp,
        calidadSenal: calidad.etiqueta,
        esAltaPrecision: calidad.esAltaPrecision
      });
    }

    navigator.geolocation.getCurrentPosition(
      procesarExito,
      (error) => {
        // Si falló por TIMEOUT o POSITION_UNAVAILABLE teniendo enableHighAccuracy: true
        // (común en laptops sin chip GPS o interiores en iOS/Android), intentamos una
        // lectura rápida de respaldo con enableHighAccuracy: false antes de rendirnos.
        if (opciones.enableHighAccuracy && (error.code === 3 || error.code === 2)) {
          const opcionesRespaldo = {
            enableHighAccuracy: false,
            timeout: 6000,
            maximumAge: 60000
          };

          navigator.geolocation.getCurrentPosition(
            procesarExito,
            (errorFinal) => {
              const err = new Error(traducirErrorGeolocalizacion(errorFinal));
              err.code = errorFinal.code;
              reject(err);
            },
            opcionesRespaldo
          );
          return;
        }

        const err = new Error(traducirErrorGeolocalizacion(error));
        err.code = error.code;
        reject(err);
      },
      opciones
    );
  });
}

/**
 * Fragmento B: Inspección previa del estado del permiso mediante Permissions API
 * Protegido para navegadores como Safari en iOS o contextos que no soporten query('geolocation').
 * @returns {Promise<'granted' | 'denied' | 'prompt'>}
 */
function consultarEstadoPermisoGeo() {
  if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
    return Promise.resolve('prompt');
  }

  return navigator.permissions.query({ name: 'geolocation' })
    .then((resultado) => {
      if (resultado && resultado.state) {
        return resultado.state; // 'granted', 'denied' o 'prompt'
      }
      return 'prompt';
    })
    .catch(() => 'prompt');
}
