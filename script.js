// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    cargarDatos();
    inicializarNavegacion();
    mostrarSeccion('inicio');
    inicializarNoticias(); // Nueva inicialización de noticias
});

// =============================================
// CONFIGURACIÓN NEWSData.io API
// =============================================

// REEMPLAZA CON TU API KEY DE NEWSDATA.IO
const NEWSDATA_API_KEY = 'pub_14b0d908d67740fda95020e8a4dae784'; // ← Obtén en https://newsdata.io/

// Configuración de la API
const NEWSDATA_CONFIG = {
    baseUrl: 'https://newsdata.io/api/1/news',
    country: 'cl', // Chile
    language: 'es', // Español
    category: 'politics', // Categoría política
    maxResults: 10 // Máximo de resultados
};

// Variables globales
let candidatos = [];
let noticiasReales = [];
let graficoActual = null;
let ultimaActualizacion = 0;

// =============================================
// CARGA DE DATOS PRINCIPAL
// =============================================

// Carga de datos desde archivos JSON
async function cargarDatos() {
    try {
        // Cargar candidatos
        const responseCandidatos = await fetch('candidatos.json');
        const dataCandidatos = await responseCandidatos.json();
        candidatos = dataCandidatos.candidatos;

        // Renderizar contenido inicial
        renderizarCandidatos();
        inicializarSelectores();

        // Cargar noticias en tiempo real
        await cargarNoticiasReales();

        console.log('✅ Datos cargados exitosamente');

    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        // Datos de fallback si no se pueden cargar los archivos
        cargarDatosFallback();
        
        // Intentar cargar noticias en tiempo real de todas formas
        cargarNoticiasReales().catch(error => {
            console.warn('No se pudieron cargar noticias en tiempo real:', error);
        });
    }
}

// =============================================
// FUNCIONES PRINCIPALES NEWSData.io
// =============================================

// Función principal para cargar noticias en tiempo real
async function cargarNoticiasReales() {
    try {
        mostrarEstadoCargaNoticias();
        
        // Construir URL para NewsData.io
        const url = construirUrlNewsData();
        console.log('📡 Solicitando noticias a:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.results && data.results.length > 0) {
            noticiasReales = data.results;
            ultimaActualizacion = Date.now();
            console.log('✅ Noticias cargadas:', noticiasReales.length);
            renderizarNoticiasReales();
            actualizarEstadisticasNoticias();
        } else {
            throw new Error('No se encontraron noticias o error en la API');
        }
        
    } catch (error) {
        console.error('❌ Error al cargar noticias reales:', error);
        mostrarErrorNoticias('Error: ' + error.message);
    }
}

// Función para construir URL de NewsData.io
function construirUrlNewsData(parametrosExtra = {}) {
    const params = new URLSearchParams({
        apikey: NEWSDATA_API_KEY,
        country: NEWSDATA_CONFIG.country,
        language: NEWSDATA_CONFIG.language,
        category: NEWSDATA_CONFIG.category,
        size: NEWSDATA_CONFIG.maxResults.toString(),
        ...parametrosExtra
    });
    
    return `${NEWSDATA_CONFIG.baseUrl}?${params.toString()}`;
}

// Función para renderizar noticias de NewsData.io
function renderizarNoticiasReales() {
    const container = document.getElementById('noticias-grid');
    
    if (!noticiasReales || noticiasReales.length === 0) {
        mostrarEstadoSinNoticias();
        return;
    }

    container.innerHTML = noticiasReales.map(noticia => `
        <div class="noticia-card">
            <div class="noticia-imagen">
                ${noticia.image_url ? 
                    `<img src="${noticia.image_url}" alt="${noticia.title}" loading="lazy" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                    ''
                }
                <div class="noticia-icono" style="${noticia.image_url ? 'display: none;' : ''}">
                    <i class="fas fa-newspaper"></i>
                </div>
            </div>
            <div class="noticia-contenido">
                <div class="noticia-header">
                    <span class="noticia-fuente">${noticia.source_id || 'Medio Chileno'}</span>
                    <span class="noticia-fecha">${formatearFechaNewsData(noticia.pubDate)}</span>
                </div>
                <h3 class="noticia-titulo">${noticia.title || 'Título no disponible'}</h3>
                <p class="noticia-descripcion">${noticia.description || 'Sin descripción disponible.'}</p>
                <div class="noticia-acciones">
                    <a href="${noticia.link}" target="_blank" rel="noopener noreferrer" class="btn-noticia">
                        <i class="fas fa-external-link-alt"></i> Leer más
                    </a>
                    <button class="btn-noticia btn-compartir" 
                            onclick="compartirNoticia('${noticia.link?.replace(/'/g, "\\'") || ''}', '${noticia.title?.replace(/'/g, "\\'") || ''}')">
                        <i class="fas fa-share"></i> Compartir
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Añadir indicador de fuente en tiempo real
    agregarIndicadorFuente('NewsData.io');
}

// Función para formatear fecha de NewsData.io
function formatearFechaNewsData(fechaStr) {
    if (!fechaStr) return 'Fecha no disponible';
    
    try {
        const fecha = new Date(fechaStr);
        const ahora = new Date();
        const diferencia = ahora - fecha;
        const minutos = Math.floor(diferencia / (1000 * 60));
        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        
        if (minutos < 60) {
            return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
        } else if (horas < 24) {
            return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
        } else if (dias < 7) {
            return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
        } else {
            return fecha.toLocaleDateString('es-CL', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    } catch (error) {
        return 'Fecha no disponible';
    }
}

// =============================================
// FUNCIONES AUXILIARES MEJORADAS
// =============================================

// Función para mostrar estado de carga de noticias
function mostrarEstadoCargaNoticias() {
    const container = document.getElementById('noticias-grid');
    container.innerHTML = `
        <div class="cargando-noticias">
            <i class="fas fa-sync-alt fa-spin"></i>
            <p>Cargando noticias en tiempo real...</p>
        </div>
    `;
}

// Función para mostrar estado sin noticias
function mostrarEstadoSinNoticias() {
    const container = document.getElementById('noticias-grid');
    container.innerHTML = `
        <div class="sin-noticias">
            <i class="fas fa-newspaper"></i>
            <h3>No hay noticias disponibles</h3>
            <p>Intenta actualizar la página o verificar tu conexión</p>
        </div>
    `;
}

// Función para agregar indicador de fuente
function agregarIndicadorFuente(fuente) {
    const container = document.getElementById('noticias-grid');
    let indicador = container.parentNode.querySelector('.fuente-datos');
    
    if (!indicador) {
        indicador = document.createElement('div');
        indicador.className = 'fuente-datos';
        container.parentNode.insertBefore(indicador, container.nextSibling);
    }
    
    indicador.innerHTML = `<i class="fas fa-wifi"></i> ${fuente}`;
}

// Función para actualizar estadísticas
function actualizarEstadisticasNoticias() {
    const contador = document.getElementById('contador-noticias');
    const actualizacion = document.getElementById('actualizacion-noticias');
    
    if (contador) {
        contador.textContent = noticiasReales.length;
    }
    
    if (actualizacion) {
        const ahora = new Date();
        actualizacion.textContent = ahora.toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Función para actualizar noticias manualmente
function actualizarNoticias() {
    const btnActualizar = document.querySelector('.btn-actualizar');
    if (btnActualizar) {
        btnActualizar.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
        btnActualizar.disabled = true;
    }
    
    cargarNoticiasReales().finally(() => {
        if (btnActualizar) {
            btnActualizar.innerHTML = '<i class="fas fa-sync-alt"></i>';
            btnActualizar.disabled = false;
        }
    });
}

// Función para manejo de errores mejorado
function mostrarErrorNoticias(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion notificacion-error';
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>Error al cargar noticias</strong>
                <div style="font-size: 0.9rem; margin-top: 5px;">${mensaje}</div>
            </div>
        </div>
    `;

    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-acento);
        color: white;
        padding: 15px 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--sombra-hover);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 350px;
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 5000);
}

// =============================================
// BÚSQUEDA AVANZADA Y TEMAS POLÍTICOS
// =============================================

// Función para buscar noticias específicas con NewsData.io
async function buscarNoticiasEspecificas(termino) {
    try {
        const url = construirUrlNewsData({ q: termino });
        console.log('🔍 Buscando:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.results && data.results.length > 0) {
            mostrarResultadosBusqueda(data.results, termino);
        } else {
            mostrarNotificacion('info', `No se encontraron noticias sobre "${termino}"`);
        }
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        mostrarNotificacion('error', 'Error al buscar noticias. Verifica tu API key.');
    }
}

// Función para búsqueda avanzada por temas políticos
async function buscarNoticiasPoliticas(termino) {
    const terminosPoliticos = {
        'elecciones': 'elecciones presidenciales Chile 2025',
        'candidatos': 'candidatos presidenciales Chile',
        'debates': 'debates presidenciales Chile',
        'encuestas': 'encuestas electorales Chile',
        'servel': 'SERVEL elecciones',
        'votacion': 'votación elecciones Chile',
        'campana': 'campaña electoral Chile',
        'primarias': 'primarias presidenciales Chile'
    };
    
    const query = terminosPoliticos[termino] || termino;
    await buscarNoticiasEspecificas(query);
}

// Función para mostrar resultados de búsqueda
function mostrarResultadosBusqueda(articulos, termino) {
    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-busqueda" onclick="event.stopPropagation()">
                <h3>📰 Resultados: ${termino}</h3>
                <div class="resultados-busqueda">
                    ${articulos.map(articulo => `
                        <div class="resultado-item">
                            <div class="resultado-header">
                                <span class="resultado-fuente">${articulo.source_id || 'Fuente desconocida'}</span>
                                <span class="resultado-fecha">${formatearFechaNewsData(articulo.pubDate)}</span>
                            </div>
                            <h4>${articulo.title || 'Sin título'}</h4>
                            <p>${articulo.description || 'Sin descripción disponible.'}</p>
                            <div class="resultado-acciones">
                                <a href="${articulo.link}" target="_blank" class="btn-noticia">
                                    <i class="fas fa-external-link-alt"></i> Leer noticia completa
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-cerrar" onclick="cerrarModal()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =============================================
// INICIALIZACIÓN Y CONFIGURACIÓN
// =============================================

// Inicialización mejorada de noticias
function inicializarNoticias() {
    // Cargar noticias inmediatamente
    cargarNoticiasReales();
    
    // Actualizar cada 5 minutos (300,000 ms)
    setInterval(() => {
        if (document.getElementById('noticias').classList.contains('active')) {
            cargarNoticiasReales();
        }
    }, 300000);
    
    // Actualizar estadísticas iniciales
    setTimeout(actualizarEstadisticasNoticias, 1000);
}

// Modificar la función mostrarSeccion para noticias
function mostrarSeccion(seccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Mostrar la sección solicitada
    document.getElementById(seccion).classList.add('active');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="mostrarSeccion('${seccion}')"]`)?.classList.add('active');
    
    // Scroll al inicio
    window.scrollTo(0, 0);

    // Inicializar secciones específicas
    if (seccion === 'simulador') {
        inicializarSimulador();
    } else if (seccion === 'calendario') {
        inicializarCalendario();
    } else if (seccion === 'medios') {
        mostrarMediosChilenos();
        inicializarFiltrosMedios();
    } else if (seccion === 'noticias') {
        // Forzar actualización si no hay noticias recientes
        if (noticiasReales.length === 0 || Date.now() - ultimaActualizacion > 300000) {
            cargarNoticiasReales();
        }
        actualizarEstadisticasNoticias();
    }
}

// =============================================
// FUNCIONES DE FALLBACK (SIN NOTICIAS LOCALES)
// =============================================

// Datos de fallback solo para candidatos
function cargarDatosFallback() {
    console.log('📂 Cargando datos de fallback...');
    
    // Solo cargamos candidatos de fallback
    candidatos = [
        {
            id: 'jara',
            nombre: 'Jeannette Alejandra Jara Román',
            partido: 'Partido Comunista / Unidad por Chile',
            edad: 51,
            profesion: 'Abogada y Administradora Pública',
            foto: 'images/jara.jpg',
            lema: 'Un Chile que cumple',
            aprobacion: 26,
            propuestas: [
                'Aumento del salario mínimo de $529.000 a $750.000',
                'Eliminación de las AFP y reforma del sistema previsional',
                'Sala cuna universal para aumentar participación laboral femenina'
            ]
        },
        {
            id: 'kast',
            nombre: 'José Antonio Kast Rist',
            partido: 'Partido Republicano / Cambio por Chile',
            edad: 59,
            profesion: 'Abogado',
            foto: 'images/kast.jpg',
            lema: 'Chile Orden y Libertad',
            aprobacion: 24,
            propuestas: [
                'Fortalecimiento del orden público y seguridad ciudadana',
                'Defensa de la propiedad privada y libre mercado',
                'Control fronterizo y políticas anti-inmigración irregular'
            ]
        }
        // ... agregar más candidatos si es necesario
    ];

    renderizarCandidatos();
    inicializarSelectores();
}

// =============================================
// FUNCIONES COMPARTIR Y MODALES
// =============================================

// Función para compartir noticias
function compartirNoticia(url, titulo) {
    if (!url || !titulo) {
        mostrarNotificacion('error', 'No se puede compartir esta noticia');
        return;
    }

    const texto = `Mira esta noticia: ${titulo}`;
    
    const opciones = [
        {
            nombre: 'WhatsApp',
            url: `https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`,
            icono: 'fab fa-whatsapp',
            color: '#25D366'
        },
        {
            nombre: 'Facebook',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(texto)}`,
            icono: 'fab fa-facebook',
            color: '#1877F2'
        },
        {
            nombre: 'Twitter/X',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
            icono: 'fab fa-twitter',
            color: '#1DA1F2'
        }
    ];

    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-compartir" onclick="event.stopPropagation()">
                <h3>Compartir Noticia</h3>
                <div class="opciones-compartir">
                    ${opciones.map(opcion => `
                        <a href="${opcion.url}" target="_blank" class="opcion-compartir" style="border-left-color: ${opcion.color}">
                            <i class="${opcion.icono}" style="color: ${opcion.color}"></i>
                            <span>${opcion.nombre}</span>
                        </a>
                    `).join('')}
                </div>
                <button class="btn-cerrar" onclick="cerrarModal()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Función para cerrar modales
function cerrarModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Función de notificación
function mostrarNotificacion(tipo, mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;

    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? 'var(--color-exito)' : 'var(--color-acento)'};
        color: white;
        padding: 15px 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--sombra-hover);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 4000);
}

console.log('🚀 Aplicación Voto Informado Chile 2025 inicializada con NewsData.io');




// Modificar la función mostrarSeccion para cargar noticias reales cuando se active la sección
function mostrarSeccion(seccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Mostrar la sección solicitada
    document.getElementById(seccion).classList.add('active');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="mostrarSeccion('${seccion}')"]`)?.classList.add('active');
    
    // Scroll al inicio
    window.scrollTo(0, 0);

    // Cargar noticias reales si es la sección de noticias y no se han cargado aún
    if (seccion === 'noticias' && noticiasReales.length === 0) {
        cargarNoticiasReales().catch(error => {
            console.warn('No se pudieron cargar noticias en tiempo real al cambiar de sección:', error);
        });
    }
    
    // Inicializar otras secciones específicas
    if (seccion === 'simulador') {
        inicializarSimulador();
    } else if (seccion === 'calendario') {
        inicializarCalendario();
    }
}

// Función de notificación mejorada
function mostrarNotificacion(tipo, mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;

    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? 'var(--color-exito)' : 'var(--color-acento)'};
        color: white;
        padding: 15px 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--sombra-hover);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 4000);
}

// Datos de fallback
function cargarDatosFallback() {
    candidatos = [
        {
            id: 'jara',
            nombre: 'Jeannette Alejandra Jara Román',
            partido: 'Partido Comunista / Unidad por Chile',
            edad: 51,
            profesion: 'Abogada y Administradora Pública',
            region: 'Región Metropolitana',
            religion: 'No especificada',
            estado_civil: 'No especificado',
            foto: 'images/jara.jpg',
            lema: 'Un Chile que cumple',
            biografia: 'Abogada y administradora pública, ejerció como ministra del Trabajo y Previsión Social bajo el gobierno de Gabriel Boric (2022-2025). Previamente fue subsecretaria de Previsión Social en el gobierno de Michelle Bachelet (2016-2018). Ganadora de las primarias del oficialismo con el 60,3% de los votos.',
            experiencia_politica: '8 años en cargos públicos de alto nivel',
            cargos_previos: [
                'Ministra del Trabajo y Previsión Social (2022-2025)',
                'Subsecretaria de Previsión Social (2016-2018)'
            ],
            propuestas: [
                'Aumento del salario mínimo de $529.000 a $750.000',
                'Eliminación de las AFP y reforma del sistema previsional',
                'Sala cuna universal para aumentar participación laboral femenina',
                'Fortalecimiento del Estado social en salud, educación y vivienda',
                'Reducción de jornada laboral y modernización del trabajo'
            ],
            aprobacion: 26,
             "posiciones": [4, 3, 4, 4, 4, 4, 4, 3, 4, 4],
                   "financiamiento": {
        "total": 2850000000,
        "tipo": {
          "publico": 45,
          "privado": 55
        },
        "fuentes_principales": [
          {
            "nombre": "Fondos públicos SERVEL",
            "monto": 1282500000,
            "tipo": "publico"
          },
          {
            "nombre": "Aportes militancia PC",
            "monto": 856500000,
            "tipo": "privado"
          },
          {
            "nombre": "Sindicatos adherentes",
            "monto": 427500000,
            "tipo": "privado"
          },
          {
            "nombre": "Colectas ciudadanas",
            "monto": 285000000,
            "tipo": "privado"
          }
        ],
        "reportes_servel": [
          {
            "fecha": "2025-08-15",
            "tipo": "Declaración de ingresos",
            "estado": "Aprobado"
          },
          {
            "fecha": "2025-09-20",
            "tipo": "Gastos campaña primaria",
            "estado": "En revisión"
          },
          {
            "fecha": "2025-10-05",
            "tipo": "Declaración patrimonio",
            "estado": "Pendiente"
          }
        ],
        "alertas": [
          {
            "tipo": "info",
            "descripcion": "Cumple límite aportes individuales",
            "estado": "Verificado"
          },
          {
            "tipo": "advertencia",
            "descripcion": "Falta declarar gastos propaganda online",
            "estado": "En observación"
          }
        ],
        "transparencia": 85
      },
            noticias: [
                {
                    titulo: 'Jara presenta programa "Un Chile que cumple" con 380 medidas',
                    fecha: '2025-10-05',
                    fuente: 'La Tercera'
                },
                {
                    titulo: 'Candidata oficialista lidera encuestas tras primarias',
                    fecha: '2025-09-28',
                    fuente: 'Cadem'
                }
            ]
        },
        {
            id: 'kast',
            nombre: 'José Antonio Kast Rist',
            partido: 'Partido Republicano / Cambio por Chile',
            edad: 59,
            profesion: 'Abogado',
            region: 'Región Metropolitana',
            religion: 'Católica',
            estado_civil: 'Casado',
            foto: 'images/kast.jpg',
            lema: 'Chile Orden y Libertad',
            biografia: 'Abogado egresado de la Pontificia Universidad Católica de Chile. Fundador y líder del Partido Republicano. Fue diputado durante cuatro períodos consecutivos (2002-2018) y candidato presidencial en 2017 y 2021, llegando a segunda vuelta en 2021.',
            experiencia_politica: '25 años en política',
            cargos_previos: [
                'Diputado de la República (2002-2018)',
                'Concejal de Buin (1996-2000)',
                'Candidato presidencial 2017 y 2021'
            ],
            propuestas: [
                'Fortalecimiento del orden público y seguridad ciudadana',
                'Defensa de la propiedad privada y libre mercado',
                'Control fronterizo y políticas anti-inmigración irregular',
                'Reducción del tamaño del Estado',
                'Promoción de valores familiares tradicionales'
            ],
            aprobacion: 24,
                "posiciones": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                 "financiamiento": {
        "total": 3200000000,
        "tipo": {
          "publico": 40,
          "privado": 60
        },
        "fuentes_principales": [
          {
            "nombre": "Fondos públicos SERVEL",
            "monto": 1280000000,
            "tipo": "publico"
          },
          {
            "nombre": "Empresarios adherentes",
            "monto": 960000000,
            "tipo": "privado"
          },
          {
            "nombre": "Aportes partido Republicano",
            "monto": 640000000,
            "tipo": "privado"
          },
          {
            "nombre": "Colectas simpatizantes",
            "monto": 320000000,
            "tipo": "privado"
          }
        ],
        "reportes_servel": [
          {
            "fecha": "2025-08-10",
            "tipo": "Declaración de ingresos",
            "estado": "Aprobado"
          },
          {
            "fecha": "2025-09-25",
            "tipo": "Gastos campaña",
            "estado": "Con observaciones"
          },
          {
            "fecha": "2025-10-08",
            "tipo": "Aportes privados",
            "estado": "En revisión"
          }
        ],
        "alertas": [
          {
            "tipo": "advertencia",
            "descripcion": "Observación por gastos no declarados",
            "estado": "En proceso"
          },
          {
            "tipo": "info",
            "descripcion": "Cumple plazo declaraciones",
            "estado": "Verificado"
          }
        ],
        "transparencia": 75
      },
            noticias: [
                {
                    titulo: 'Kast se consolida como líder de la derecha republicana',
                    fecha: '2025-09-15',
                    fuente: 'Emol'
                },
                {
                    titulo: 'Partido Republicano define estrategia para primera vuelta',
                    fecha: '2025-10-01',
                    fuente: 'El Mercurio'
                }
            ]
        },
        {
            id: 'matthei',
            nombre: 'Evelyn Matthei Fornet',
            partido: 'Unión Demócrata Independiente / Chile Vamos',
            edad: 71,
            profesion: 'Economista',
            region: 'Región Metropolitana',
            religion: 'Católica',
            estado_civil: 'Viuda',
            foto: 'images/matthei.jpg',
            lema: 'Orden, Progreso y Esperanza',
            biografia: 'Economista y política con amplia trayectoria. Fue alcaldesa de Providencia (2016-2024), ministra del Trabajo (2011-2013), senadora (1998-2011) y diputada (1990-1998). Candidata única de Chile Vamos tras exitosa gestión municipal.',
            experiencia_politica: '35 años en política',
            cargos_previos: [
                'Alcaldesa de Providencia (2016-2024)',
                'Ministra del Trabajo y Previsión Social (2011-2013)',
                'Senadora de la República (1998-2011)',
                'Diputada de la República (1990-1998)'
            ],
            propuestas: [
                'Recuperación del orden y control territorial',
                'Modernización de las policías y lucha contra el narcotráfico',
                'Destrabar la inversión y simplificación tributaria',
                'Revolución en infraestructura y desarrollo tecnológico',
                'Fortalecimiento de industrias estratégicas (minería, energía, turismo)'
            ],
            aprobacion: 17,
                "posiciones": [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
                "financiamiento": {
        "total": 2750000000,
        "tipo": {
          "publico": 50,
          "privado": 50
        },
        "fuentes_principales": [
          {
            "nombre": "Fondos públicos SERVEL",
            "monto": 1375000000,
            "tipo": "publico"
          },
          {
            "nombre": "Aportes UDI",
            "monto": 687500000,
            "tipo": "privado"
          },
          {
            "nombre": "Empresarios Chile Vamos",
            "monto": 412500000,
            "tipo": "privado"
          },
          {
            "nombre": "Colectas territoriales",
            "monto": 275000000,
            "tipo": "privado"
          }
        ],
        "reportes_servel": [
          {
            "fecha": "2025-08-20",
            "tipo": "Declaración de ingresos",
            "estado": "Aprobado"
          },
          {
            "fecha": "2025-09-28",
            "tipo": "Gastos campaña",
            "estado": "Aprobado"
          },
          {
            "fecha": "2025-10-06",
            "tipo": "Aportes privados",
            "estado": "En revisión"
          }
        ],
        "alertas": [
          {
            "tipo": "info",
            "descripcion": "Todos los reportes al día",
            "estado": "Verificado"
          },
          {
            "tipo": "advertencia",
            "descripcion": "Falta detalle gastos publicidad",
            "estado": "Por corregir"
          }
        ],
        "transparencia": 90
      },
            noticias: [
                {
                    titulo: 'Matthei presenta equipos programáticos con más de 400 personas',
                    fecha: '2025-07-25',
                    fuente: 'Evópoli'
                },
                {
                    titulo: 'Candidata de Chile Vamos define ejes de campaña',
                    fecha: '2025-09-20',
                    fuente: 'La Tercera'
                }
            ]
        },
        {
            id: 'parisi',
            nombre: 'Franco Aldo Parisi Fernández',
            partido: 'Partido de la Gente',
            edad: 58,
            profesion: 'Economista e Ingeniero Comercial',
            region: 'Región Metropolitana',
            religion: 'No especificada',
            estado_civil: 'No especificado',
            foto: 'images/parisi.jpg',
            lema: 'La Gente al Poder',
            biografia: 'Economista e ingeniero comercial. Candidato presidencial en 2013 (4° lugar) y 2021 (3° lugar). Fundador del Partido de la Gente. Se presenta como alternativa al establishment político tradicional, rechazando la polarización "facho-comunacho".',
            experiencia_politica: '12 años en política',
            cargos_previos: [
                'Candidato presidencial 2013 y 2021',
                'Fundador del Partido de la Gente (2019)'
            ],
            propuestas: [
                'Reducción del gasto fiscal y alivio tributario a clase media',
                'Eliminación del clientelismo político',
                'Vuelta a la meritocracia en el sector público',
                'Reforma del sistema político para mayor representatividad',
                'Políticas económicas pragmáticas sin ideología'
            ],
            aprobacion: 8,
                "posiciones": [2, 2, 2, 2, 2, 3, 2, 2, 2, 3],
                 "financiamiento": {
        "total": 1200000000,
        "tipo": {
          "publico": 35,
          "privado": 65
        },
        "fuentes_principales": [
          {
            "nombre": "Fondos públicos SERVEL",
            "monto": 420000000,
            "tipo": "publico"
          },
          {
            "nombre": "Aportes Partido de la Gente",
            "monto": 360000000,
            "tipo": "privado"
          },
          {
            "nombre": "Financiamiento colectivo",
            "monto": 240000000,
            "tipo": "privado"
          },
          {
            "nombre": "Aportes simpatizantes",
            "monto": 180000000,
            "tipo": "privado"
          }
        ],
        "reportes_servel": [
          {
            "fecha": "2025-08-25",
            "tipo": "Declaración de ingresos",
            "estado": "Con observaciones"
          },
          {
            "fecha": "2025-09-30",
            "tipo": "Gastos campaña",
            "estado": "Pendiente"
          },
          {
            "fecha": "2025-10-07",
            "tipo": "Aportes privados",
            "estado": "En revisión"
          }
        ],
        "alertas": [
          {
            "tipo": "alerta",
            "descripcion": "Retraso en declaración de gastos",
            "estado": "Crítico"
          },
          {
            "tipo": "advertencia",
            "descripcion": "Falta documentación aportes",
            "estado": "En proceso"
          }
        ],
        "transparencia": 60
      },
            noticias: [
                {
                    titulo: 'Parisi se posiciona como tercera vía entre extremos',
                    fecha: '2025-10-04',
                    fuente: 'La Tercera'
                },
                {
                    titulo: 'PDG apuesta por capturar voto independiente',
                    fecha: '2025-09-12',
                    fuente: 'El Mostrador'
                }
            ]
        },
        {
            id: 'kaiser',
            nombre: 'Johannes Kaiser Barents',
            partido: 'Partido Nacional Libertario',
            edad: 49,
            profesion: 'YouTuber y Político',
            region: 'Región Metropolitana',
            religion: 'Cristiana',
            estado_civil: 'No especificado',
            foto: 'images/kaiser.jpg',
            lema: 'Nueva Derecha Libertaria',
            biografia: 'YouTuber convertido en político. Diputado desde 2022, inicialmente por el Partido Republicano, fundó el Partido Nacional Libertario en 2024. Se autodefine como "reaccionario" y representa la extrema derecha libertaria con posturas controversiales.',
            experiencia_politica: '3 años como diputado',
            cargos_previos: [
                'Diputado de la República (2022-presente)',
                'Fundador Partido Nacional Libertario (2024)'
            ],
            propuestas: [
                'Estado mínimo y reducción drástica del aparato público',
                'Políticas anti-inmigración y control fronterizo estricto',
                'Defensa de valores tradicionales y conservadores',
                'Crítica al sistema político establecido',
                'Promoción de libertades individuales y tenencia de armas'
            ],
            aprobacion: 11,
                "posiciones": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                "financiamiento": {
        "total": 800000000,
        "tipo": {
          "publico": 30,
          "privado": 70
        },
        "fuentes_principales": [
          {
            "nombre": "Fondos públicos SERVEL",
            "monto": 240000000,
            "tipo": "publico"
          },
          {
            "nombre": "Aportes Partido Nacional Libertario",
            "monto": 280000000,
            "tipo": "privado"
          },
          {
            "nombre": "Donaciones plataforma online",
            "monto": 160000000,
            "tipo": "privado"
          },
          {
            "nombre": "Aportes adherentes",
            "monto": 120000000,
            "tipo": "privado"
          }
        ],
        "reportes_servel": [
          {
            "fecha": "2025-08-30",
            "tipo": "Declaración de ingresos",
            "estado": "Con observaciones"
          },
          {
            "fecha": "2025-09-22",
            "tipo": "Gastos campaña",
            "estado": "Rechazado"
          },
          {
            "fecha": "2025-10-04",
            "tipo": "Aportes privados",
            "estado": "En revisión"
          }
        ],
        "alertas": [
          {
            "tipo": "alerta",
            "descripcion": "Reporte de gastos rechazado por SERVEL",
            "estado": "Crítico"
          },
          {
            "tipo": "advertencia",
            "descripcion": "Aportes no identificados",
            "estado": "En investigación"
          }
        ],
        "transparencia": 45
      },
            noticias: [
                {
                    titulo: 'Kaiser genera polémica al defender golpe de Estado',
                    fecha: '2025-07-03',
                    fuente: 'El País'
                },
                {
                    titulo: 'PNL busca consolidar espacio en extrema derecha',
                    fecha: '2025-08-15',
                    fuente: 'BBC'
                }
            ]
        },
        {
  "id": "mayne-nicholls",
  "nombre": "Harold Alfred Mayne-Nicholls Sécul",
  "partido": "Independiente",
  "edad": 64,
  "profesion": "Periodista y Dirigente Deportivo",
  "region": "Región de Antofagasta",
  "religion": "Cristiana",
  "estado_civil": "Casado",
  "foto": "images/harold.jpg",
  "lema": "Devolverle el alma a Chile",
  "biografia": "Periodista titulado de la Pontificia Universidad Católica de Chile y dirigente deportivo. Fue presidente de la ANFP (2007-2011), donde contrató a Marcelo Bielsa y clasificó a Chile al Mundial de Sudáfrica 2010. Trabajó en la FIFA durante casi dos décadas. Director ejecutivo de los Juegos Panamericanos Santiago 2023. Se presenta como candidato independiente centrado en la unidad nacional.",
  "experiencia_politica": "3 años como precandidato presidencial",
  "cargos_previos": [
    "Presidente de la ANFP (2007-2011)",
    "Funcionario FIFA (1994-2012)",
    "Director ejecutivo Juegos Panamericanos Santiago 2023",
    "Fundador Fundación Ganamos Todos (2011)"
  ],
  "propuestas": [
    "Plan integral de seguridad y control fronterizo",
    "Creación de 500 mil nuevos empleos",
    "Reducción de listas de espera en salud",
    "Combate al ausentismo escolar y mejora educativa",
    "Construcción acelerada de viviendas y erradicación de campamentos"
  ],
  "aprobacion": 4,
  "posiciones": [2, 3, 2, 2, 2, 3, 2, 3, 2, 2],
  "financiamiento": {
    "total": 1500000000,
    "tipo": {
      "publico": 40,
      "privado": 60
    },
    "fuentes_principales": [
      {
        "nombre": "Fondos públicos SERVEL",
        "monto": 600000000,
        "tipo": "publico"
      },
      {
        "nombre": "Aportes simpatizantes independientes",
        "monto": 450000000,
        "tipo": "privado"
      },
      {
        "nombre": "Colectas ciudadanas",
        "monto": 300000000,
        "tipo": "privado"
      },
      {
        "nombre": "Financiamiento colectivo online",
        "monto": 150000000,
        "tipo": "privado"
      }
    ],
    "reportes_servel": [
      {
        "fecha": "2025-08-18",
        "tipo": "Inscripción candidatura",
        "estado": "Aprobado"
      },
      {
        "fecha": "2025-09-15",
        "tipo": "Declaración de ingresos",
        "estado": "En revisión"
      },
      {
        "fecha": "2025-10-08",
        "tipo": "Gastos campaña",
        "estado": "Pendiente"
      }
    ],
    "alertas": [
      {
        "tipo": "info",
        "descripcion": "Candidatura independiente inscrita correctamente",
        "estado": "Verificado"
      },
      {
        "tipo": "advertencia",
        "descripcion": "Propaganda electoral anticipada en redes sociales",
        "estado": "En observación"
      }
    ],
    "transparencia": 80
  },
  "noticias": [
    {
      "titulo": "Mayne-Nicholls inscribe candidatura presidencial independiente",
      "fecha": "2025-08-18",
      "fuente": "24 Horas TVN"
    },
    {
      "titulo": "Harold Mayne-Nicholls sorprende en primer debate presidencial",
      "fecha": "2025-09-11",
      "fuente": "Diario Antofagasta"
    }
  ]
}  
    ];

    // También cargamos noticias de fallback
    noticias = [
        {
            titulo: 'Encuestas muestran carrera presidencial reñida entre los principales candidatos',
            fecha: '2025-10-06',
            fuente: 'Cadem',
            descripcion: 'Las últimas mediciones revelan una competencia estrecha entre los candidatos presidenciales.'
        },
        {
            titulo: 'Candidatos presentan sus propuestas programáticas para el período 2026-2030',
            fecha: '2025-10-05',
            fuente: 'El Mercurio',
            descripcion: 'Los postulantes a La Moneda detallan sus planes de gobierno en diversos foros.'
        },
        {
            titulo: 'Servel confirma fecha de primera vuelta presidencial para noviembre',
            fecha: '2025-08-19',
            fuente: 'Servicio Electoral',
            descripcion: 'El organismo electoral ratifica el calendario y procedimientos para las elecciones.'
        },
        {
            titulo: 'Jara mantiene liderazgo en encuestas mientras Kast recupera terreno',
            fecha: '2025-10-07',
            fuente: 'Cadem',
            descripcion: 'Nueva encuesta muestra estabilidad en las preferencias de los principales candidatos.'
        },
        {
            titulo: 'Matthei anuncia plan de seguridad ciudadana con 10 medidas clave',
            fecha: '2025-10-04',
            fuente: 'La Tercera',
            descripcion: 'La candidata de Chile Vamos presenta su propuesta para combatir la delincuencia.'
        },
        {
            titulo: 'Parisi critica a "la clase política tradicional" en acto masivo',
            fecha: '2025-10-03',
            fuente: 'El Mostrador',
            descripcion: 'El candidato del PDG se presenta como alternativa al duopolio político.'
        }
    ];

    renderizarCandidatos();
    renderizarNoticias();
    inicializarSelectores();
    
    console.log('Datos de fallback cargados exitosamente');
}



// Navegación entre secciones
function mostrarSeccion(seccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    // Mostrar la sección solicitada
    document.getElementById(seccion).classList.add('active');

    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="mostrarSeccion('${seccion}')"]`)?.classList.add('active');

    // Scroll al inicio
    window.scrollTo(0, 0);
}

// Inicializar navegación
function inicializarNavegacion() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Renderizar lista de candidatos
function renderizarCandidatos() {
    const container = document.getElementById('candidatos-grid');

    container.innerHTML = candidatos.map(candidato => `
        <div class="candidato-card" onclick="mostrarPerfil('${candidato.id}')">
            <div class="candidato-header">
                <div class="candidato-foto">
                    <img src="${candidato.foto}" alt="${candidato.nombre}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="candidato-iniciales" style="display: none;">
                        ${obtenerIniciales(candidato.nombre)}
                    </div>
                </div>
                <h3 class="candidato-nombre">${candidato.nombre}</h3>
                <p class="candidato-partido">${candidato.partido}</p>
                <p class="candidato-lema">"${candidato.lema}"</p>
            </div>
            <div class="candidato-body">
                <div class="aprobacion-mini">
                    <strong>Aprobación: ${candidato.aprobacion}%</strong>
                    <div class="barra-progreso">
                        <div class="progreso" style="width: ${candidato.aprobacion}%"></div>
                    </div>
                </div>
                <button class="btn-perfil" onclick="event.stopPropagation(); mostrarPerfil('${candidato.id}')">
                    <i class="fas fa-user"></i> Ver Perfil Completo
                </button>
            </div>
        </div>
    `).join('');
}
// Obtener iniciales del nombre
function obtenerIniciales(nombre) {
    return nombre.split(' ')
        .map(palabra => palabra[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// Mostrar perfil del candidato
function mostrarPerfil(candidatoId) {
    const candidato = candidatos.find(c => c.id === candidatoId);
    if (!candidato) return;

    const container = document.getElementById('perfil-candidato');

    container.innerHTML = `
        <div class="perfil-header">
            <div class="perfil-foto">
                <img src="${candidato.foto}" alt="${candidato.nombre}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="perfil-iniciales" style="display: none;">
                    ${obtenerIniciales(candidato.nombre)}
                </div>
            </div>
            <div class="perfil-info">
                <h1>${candidato.nombre}</h1>
                <p class="partido">${candidato.partido}</p>
                <p class="lema">"${candidato.lema}"</p>
            </div>
        </div>

        <div class="perfil-content">
            <div class="datos-personales">
                <div class="dato-item">
                    <strong>Edad:</strong>
                    ${candidato.edad} años
                </div>
                <div class="dato-item">
                    <strong>Profesión:</strong>
                    ${candidato.profesion}
                </div>
                <div class="dato-item">
                    <strong>Región:</strong>
                    ${candidato.region || 'No especificada'}
                </div>
                <div class="dato-item">
                    <strong>Religión:</strong>
                    ${candidato.religion || 'No especificada'}
                </div>
                <div class="dato-item">
                    <strong>Estado Civil:</strong>
                    ${candidato.estado_civil || 'No especificado'}
                </div>
                <div class="dato-item">
                    <strong>Aprobación:</strong>
                    ${candidato.aprobacion}%
                </div>
                <div class="dato-item">
                    <strong>Experiencia Política:</strong>
                    ${candidato.experiencia_politica || 'Información no disponible'}
                </div>
            </div>

            <div class="seccion-perfil">
                <h3><i class="fas fa-user"></i> Biografía</h3>
                <p>${candidato.biografia}</p>
            </div>

            ${candidato.cargos_previos ? `
                <div class="seccion-perfil">
                    <h3><i class="fas fa-briefcase"></i> Trayectoria Política</h3>
                    <ul class="cargos-list">
                        ${candidato.cargos_previos.map(cargo => `<li>${cargo}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="seccion-perfil">
                <h3><i class="fas fa-lightbulb"></i> Propuestas Destacadas</h3>
                <ul class="propuestas-list">
                    ${candidato.propuestas.map(propuesta => `<li>${propuesta}</li>`).join('')}
                </ul>
            </div>

            ${candidato.noticias && candidato.noticias.length > 0 ? `
                <div class="seccion-perfil">
                    <h3><i class="fas fa-newspaper"></i> Noticias Recientes</h3>
                    <div class="noticias-candidato">
                        ${candidato.noticias.map(noticia => `
                            <div class="noticia-mini">
                                <strong>${noticia.titulo}</strong>
                                <p><small>${noticia.fecha} - ${noticia.fuente}</small></p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

${candidato.financiamiento ? `
    <div class="seccion-perfil">
        <h3><i class="fas fa-money-bill-wave"></i> Financiamiento de Campaña</h3>
        
        <div class="resumen-financiamiento">
            <div class="tarjeta-financiamiento">
                <h4>Total Recaudado</h4>
                <div class="monto-total">${formatearDineroChileno(candidato.financiamiento.total)}</div>
                <p>Pesos chilenos</p>
            </div>
            
            <div class="tarjeta-financiamiento">
                <h4>Distribución de Fondos</h4>
                <div class="distribucion-financiamiento">
                    <div class="financiamiento-publico" style="width: ${candidato.financiamiento.tipo.publico}%"></div>
                    <div class="financiamiento-privado" style="width: ${candidato.financiamiento.tipo.privado}%"></div>
                </div>
                <div class="leyenda-financiamiento">
                    <div class="item-leyenda">
                        <div class="color-leyenda financiamiento-publico"></div>
                        <span>Público ${candidato.financiamiento.tipo.publico}%</span>
                    </div>
                    <div class="item-leyenda">
                        <div class="color-leyenda financiamiento-privado"></div>
                        <span>Privado ${candidato.financiamiento.tipo.privado}%</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="fuentes-financiamiento">
            <h4>Fuentes Principales de Financiamiento</h4>
            <div class="lista-fuentes">
                ${candidato.financiamiento.fuentes_principales.map(fuente => `
                    <div class="fuente-item">
                        <div class="fuente-info">
                            <div class="fuente-nombre">${fuente.nombre}</div>
                            <div class="fuente-tipo">${fuente.tipo}</div>
                        </div>
                        <div class="fuente-monto">${formatearDineroChileno(fuente.monto)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="reportes-servel">
            <h4>Reportes al SERVEL</h4>
            <table class="tabla-reportes">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo de Reporte</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${candidato.financiamiento.reportes_servel.map(reporte => `
                        <tr>
                            <td>${formatearFecha(reporte.fecha)}</td>
                            <td>${reporte.tipo}</td>
                            <td>
                                <span class="estado-reporte estado-${obtenerClaseEstado(reporte.estado)}">
                                    ${reporte.estado}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${candidato.financiamiento.alertas && candidato.financiamiento.alertas.length > 0 ? `
            <div class="alertas-financiamiento">
                <h4>Alertas e Irregularidades</h4>
                <div class="lista-alertas">
                    ${candidato.financiamiento.alertas.map(alerta => `
                        <div class="alerta-item alerta-${alerta.tipo}">
                            <div class="alerta-icono">
                                ${obtenerIconoAlerta(alerta.tipo)}
                            </div>
                            <div class="alerta-info">
                                <div class="alerta-titulo">${alerta.descripcion}</div>
                                <div class="alerta-estado">Estado: ${alerta.estado}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <div class="indice-transparencia">
            <h4>Índice de Transparencia</h4>
            <div class="puntuacion-transparencia">${candidato.financiamiento.transparencia}%</div>
            <div class="barra-transparencia">
                <div class="barra-transparencia-progreso" style="width: ${candidato.financiamiento.transparencia}%"></div>
            </div>
            <div class="etiqueta-transparencia">Nivel de transparencia en el financiamiento</div>
        </div>
    </div>
` : ''}

            <div class="acciones-perfil">
                <button class="btn-secundario" onclick="mostrarSeccion('comparador')">
                    <i class="fas fa-balance-scale"></i> Comparar con otro
                </button>
                <button class="btn-secundario btn-compartir" onclick="compartirCandidato('${candidato.id}')">
                    <i class="fas fa-share"></i> Compartir
                </button>
                <button class="btn-secundario" onclick="mostrarSeccion('candidatos')">
                    <i class="fas fa-arrow-left"></i> Volver a candidatos
                </button>
            </div>
        </div>

        <div class="grafico-container">
            <h3>Evolución de Aprobación</h3>
            <canvas id="graficoAprobacion"></canvas>
        </div>
    `;

    // Crear gráfico de aprobación individual
    crearGraficoAprobacion(candidato);

    mostrarSeccion('perfil');
}

// Crear gráfico de aprobación individual
function crearGraficoAprobacion(candidato) {
    const ctx = document.getElementById('graficoAprobacion').getContext('2d');

    // Datos simulados de evolución
    const datos = {
        agosto: candidato.aprobacion + Math.floor(Math.random() * 4) - 2,
        septiembre: candidato.aprobacion + Math.floor(Math.random() * 3) - 1,
        octubre: candidato.aprobacion
    };

    if (graficoActual) {
        graficoActual.destroy();
    }

    graficoActual = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Agosto 2025', 'Septiembre 2025', 'Octubre 2025'],
            datasets: [{
                label: candidato.nombre.split(' ')[0] + ' ' + candidato.nombre.split(' ')[1],
                data: [datos.agosto, datos.septiembre, datos.octubre],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Evolución de Aprobación (%)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 35,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });
}

// Inicializar selectores del comparador
function inicializarSelectores() {
    const select1 = document.getElementById('candidato1');
    const select2 = document.getElementById('candidato2');

    [select1, select2].forEach(select => {
        select.innerHTML = '<option value="">Selecciona un candidato</option>' +
            candidatos.map(c => 
                `<option value="${c.id}">${c.nombre}</option>`
            ).join('');
    });
}

// Actualizar comparación
function actualizarComparacion() {
    const id1 = document.getElementById('candidato1').value;
    const id2 = document.getElementById('candidato2').value;
    const container = document.getElementById('comparacion-resultado');

    if (!id1 || !id2 || id1 === id2) {
        container.innerHTML = '<p class="mensaje-comparacion">Selecciona dos candidatos diferentes para compararlos.</p>';
        return;
    }

    const candidato1 = candidatos.find(c => c.id === id1);
    const candidato2 = candidatos.find(c => c.id === id2);

    container.innerHTML = `
        <table class="comparacion-table">
            <thead>
                <tr>
                    <th>Aspecto</th>
                    <th>${candidato1.nombre.split(' ')[0]} ${candidato1.nombre.split(' ')[1]}</th>
                    <th>${candidato2.nombre.split(' ')[0]} ${candidato2.nombre.split(' ')[1]}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Partido</strong></td>
                    <td>${candidato1.partido}</td>
                    <td>${candidato2.partido}</td>
                </tr>
                <tr>
                    <td><strong>Edad</strong></td>
                    <td>${candidato1.edad} años</td>
                    <td>${candidato2.edad} años</td>
                </tr>
                <tr>
                    <td><strong>Profesión</strong></td>
                    <td>${candidato1.profesion}</td>
                    <td>${candidato2.profesion}</td>
                </tr>
                <tr>
                    <td><strong>Lema de Campaña</strong></td>
                    <td>"${candidato1.lema}"</td>
                    <td>"${candidato2.lema}"</td>
                </tr>
                <tr>
                    <td><strong>Aprobación Actual</strong></td>
                    <td>${candidato1.aprobacion}%</td>
                    <td>${candidato2.aprobacion}%</td>
                </tr>
                <tr>
                    <td><strong>Propuestas Principales</strong></td>
                    <td>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${candidato1.propuestas.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </td>
                    <td>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${candidato2.propuestas.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    </td>
                </tr>
            </tbody>
        </table>
    `;

    crearGraficoComparacion(candidato1, candidato2);
}

// Crear gráfico de comparación
function crearGraficoComparacion(candidato1, candidato2) {
    const ctx = document.getElementById('graficoComparacion').getContext('2d');

    if (graficoActual) {
        graficoActual.destroy();
    }

    graficoActual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Aprobación Actual (%)'],
            datasets: [
                {
                    label: candidato1.nombre.split(' ')[0] + ' ' + candidato1.nombre.split(' ')[1],
                    data: [candidato1.aprobacion],
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3b82f6',
                    borderWidth: 2
                },
                {
                    label: candidato2.nombre.split(' ')[0] + ' ' + candidato2.nombre.split(' ')[1],
                    data: [candidato2.aprobacion],
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: '#ef4444',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Comparación de Aprobación',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 35,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Renderizar noticias
function renderizarNoticias() {
    const container = document.getElementById('noticias-grid');

    // Si no hay noticias cargadas, usar datos de ejemplo
    if (noticias.length === 0) {
        noticias = [
            {
                titulo: 'Encuestas muestran carrera presidencial reñida entre los principales candidatos',
                fecha: '2025-10-06',
                fuente: 'Cadem',
                descripcion: 'Las últimas mediciones revelan una competencia estrecha entre los candidatos presidenciales.'
            },
            {
                titulo: 'Candidatos presentan sus propuestas programáticas para el período 2026-2030',
                fecha: '2025-10-05',
                fuente: 'El Mercurio',
                descripcion: 'Los postulantes a La Moneda detallan sus planes de gobierno en diversos foros.'
            },
            {
                titulo: 'Servel confirma fecha de primera vuelta presidencial para noviembre',
                fecha: '2025-08-19',
                fuente: 'Servicio Electoral',
                descripcion: 'El organismo electoral ratifica el calendario y procedimientos para las elecciones.'
            }
        ];
    }

    
    container.innerHTML = noticias.map(noticia => `
        <div class="noticia-card">
            <div class="noticia-imagen">
                <i class="fas fa-newspaper"></i>
            </div>
            <div class="noticia-contenido">
                <p class="noticia-fecha">${formatearFecha(noticia.fecha)}</p>
                <h3 class="noticia-titulo">${noticia.titulo}</h3>
                <p class="noticia-descripcion">${noticia.descripcion}</p>
                <p class="noticia-fuente">Fuente: ${noticia.fuente}</p>
            </div>
        </div>
    `).join('');
}

// Formatear fecha
function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Compartir candidato en redes sociales
function compartirCandidato(candidatoId) {
    const candidato = candidatos.find(c => c.id === candidatoId);
    if (!candidato) return;

    const texto = `Conoce a ${candidato.nombre}, candidato presidencial 2025. ${candidato.lema} - Voto Informado Chile 2025 🇨🇱`;
    const url = window.location.href;

    const opciones = [
        {
            nombre: 'WhatsApp',
            url: `https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`,
            icono: 'fab fa-whatsapp',
            color: '#25D366'
        },
        {
            nombre: 'Facebook',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(texto)}`,
            icono: 'fab fa-facebook',
            color: '#1877F2'
        },
        {
            nombre: 'Twitter/X',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
            icono: 'fab fa-twitter',
            color: '#1DA1F2'
        }
    ];

    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-compartir" onclick="event.stopPropagation()">
                <h3>Compartir información de ${candidato.nombre.split(' ')[0]}</h3>
                <div class="opciones-compartir">
                    ${opciones.map(opcion => `
                        <a href="${opcion.url}" target="_blank" class="opcion-compartir" style="border-left-color: ${opcion.color}">
                            <i class="${opcion.icono}" style="color: ${opcion.color}"></i>
                            <span>${opcion.nombre}</span>
                        </a>
                    `).join('')}
                </div>
                <button class="btn-cerrar" onclick="cerrarModal()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Cerrar modal
function cerrarModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Simulador de Voto Programático
let preguntasSimulador = [];
let respuestasUsuario = [];
let preguntaActual = 0;

// Inicializar simulador
function inicializarSimulador() {
    preguntasSimulador = [
        {
            id: 1,
            tema: "Economía",
            pregunta: "¿Cuál debería ser el rol del Estado en la economía?",
            opciones: [
                {
                    valor: 1,
                    texto: "Estado mínimo",
                    descripcion: "Mercado libre con mínima intervención estatal, baja tributación"
                },
                {
                    valor: 2,
                    texto: "Estado regulador",
                    descripcion: "Regulación moderada para corregir fallas del mercado"
                },
                {
                    valor: 3,
                    texto: "Estado social",
                    descripcion: "Intervención activa para reducir desigualdades y proveer servicios"
                },
                {
                    valor: 4,
                    texto: "Estado empresario",
                    descripcion: "Estado como actor económico central en sectores estratégicos"
                }
            ]
        },
        {
            id: 2,
            tema: "Seguridad",
            pregunta: "¿Qué enfoque prefieres para la seguridad ciudadana?",
            opciones: [
                {
                    valor: 1,
                    texto: "Mano dura",
                    descripcion: "Tolerancia cero, penas más duras y mayor presencia policial"
                },
                {
                    valor: 2,
                    texto: "Prevención integral",
                    descripcion: "Combinar prevención social con control policial"
                },
                {
                    valor: 3,
                    texto: "Enfoque comunitario",
                    descripcion: "Policía de proximidad y programas de reinserción social"
                },
                {
                    valor: 4,
                    texto: "Reforma estructural",
                    descripcion: "Abordar causas sociales de la delincuencia y reformar instituciones"
                }
            ]
        },
        {
            id: 3,
            tema: "Salud",
            pregunta: "¿Cómo debería organizarse el sistema de salud?",
            opciones: [
                {
                    valor: 1,
                    texto: "Privado predominante",
                    descripcion: "Sistema basado en seguros privados con subsidios focalizados"
                },
                {
                    valor: 2,
                    texto: "Mixto equilibrado",
                    descripcion: "Sistema público y privado complementarios"
                },
                {
                    valor: 3,
                    texto: "Público fortalecido",
                    descripcion: "Sistema público universal con opción privada complementaria"
                },
                {
                    valor: 4,
                    texto: "Sistema único público",
                    descripcion: "Sistema nacional de salud universal y gratuito"
                }
            ]
        },
        {
            id: 4,
            tema: "Educación",
            pregunta: "¿Qué modelo educativo prefieres?",
            opciones: [
                {
                    valor: 1,
                    texto: "Libre elección",
                    descripcion: "Vouchers educativos y competencia entre establecimientos"
                },
                {
                    valor: 2,
                    texto: "Mejora gradual",
                    descripcion: "Fortalecer sistema mixto con estándares de calidad"
                },
                {
                    valor: 3,
                    texto: "Educación pública fuerte",
                    descripcion: "Fortalecer educación pública gratuita y de calidad"
                },
                {
                    valor: 4,
                    texto: "Sistema público integral",
                    descripcion: "Educación pública universal, gratuita y laica en todos los niveles"
                }
            ]
        },
        {
            id: 5,
            tema: "Pensiones",
            pregunta: "¿Cómo debería reformarse el sistema de pensiones?",
            opciones: [
                {
                    valor: 1,
                    texto: "Capitalización individual",
                    descripcion: "Mantener AFP con mejoras incrementales"
                },
                {
                    valor: 2,
                    texto: "Sistema mixto",
                    descripcion: "Combinar capitalización individual con pilar solidario"
                },
                {
                    valor: 3,
                    texto: "Sistema solidario",
                    descripcion: "Sistema de reparto con administración estatal"
                },
                {
                    valor: 4,
                    texto: "Sistema público universal",
                    descripcion: "Sistema estatal de reparto con cotizaciones patronales"
                }
            ]
        },
        {
            id: 6,
            tema: "Medio Ambiente",
            pregunta: "¿Qué prioridad debería tener la protección ambiental?",
            opciones: [
                {
                    valor: 1,
                    texto: "Crecimiento primero",
                    descripcion: "Desarrollo económico con regulación ambiental razonable"
                },
                {
                    valor: 2,
                    texto: "Desarrollo sostenible",
                    descripcion: "Equilibrio entre crecimiento económico y protección ambiental"
                },
                {
                    valor: 3,
                    texto: "Protección activa",
                    descripcion: "Protección ambiental como prioridad en políticas públicas"
                },
                {
                    valor: 4,
                    texto: "Transición ecológica",
                    descripcion: "Cambio radical hacia economía verde y sostenible"
                }
            ]
        },
        {
            id: 7,
            tema: "Derechos Sociales",
            pregunta: "¿Qué postura tienes sobre derechos sociales como matrimonio igualitario y aborto?",
            opciones: [
                {
                    valor: 1,
                    texto: "Conservadora",
                    descripcion: "Defensa de valores tradicionales y familia natural"
                },
                {
                    valor: 2,
                    texto: "Moderada",
                    descripcion: "Apertura cautelosa a algunos derechos progresistas"
                },
                {
                    valor: 3,
                    texto: "Progresista",
                    descripcion: "Ampliación de derechos civiles y sociales"
                },
                {
                    valor: 4,
                    texto: "Avanzada",
                    descripcion: "Agenda completa de derechos humanos y libertades individuales"
                }
            ]
        },
        {
            id: 8,
            tema: "Inmigración",
            pregunta: "¿Qué política migratoria prefieres?",
            opciones: [
                {
                    valor: 1,
                    texto: "Restrictiva",
                    descripcion: "Control estricto de fronteras y requisitos exigentes"
                },
                {
                    valor: 2,
                    texto: "Ordenada",
                    descripcion: "Migración regulada según necesidades del país"
                },
                {
                    valor: 3,
                    texto: "Integradora",
                    descripcion: "Políticas de integración y protección de derechos migrantes"
                },
                {
                    valor: 4,
                    texto: "Abierta",
                    descripcion: "Fronteras abiertas con enfoque en derechos humanos"
                }
            ]
        },
        {
            id: 9,
            tema: "Relaciones Internacionales",
            pregunta: "¿Cómo debería posicionarse Chile en el escenario internacional?",
            opciones: [
                {
                    valor: 1,
                    texto: "Alianza occidental",
                    descripcion: "Fuerte alineamiento con EE.UU. y países occidentales"
                },
                {
                    valor: 2,
                    texto: "Pragmatismo",
                    descripcion: "Relaciones comerciales con todos, sin alineamientos políticos"
                },
                {
                    valor: 3,
                    texto: "Latinoamericanismo",
                    descripcion: "Integración regional y alianzas Sur-Sur"
                },
                {
                    valor: 4,
                    texto: "Multilateralismo activo",
                    descripcion: "Liderazgo en organismos internacionales y agenda progresista"
                }
            ]
        },
        {
            id: 10,
            tema: "Modelo de Desarrollo",
            pregunta: "¿Qué modelo de desarrollo prefieres para Chile?",
            opciones: [
                {
                    valor: 1,
                    texto: "Extractivista",
                    descripcion: "Minería y recursos naturales como motor principal"
                },
                {
                    valor: 2,
                    texto: "Diversificación",
                    descripcion: "Transición gradual hacia economía del conocimiento"
                },
                {
                    valor: 3,
                    texto: "Industrialización",
                    descripcion: "Desarrollo industrial con valor agregado"
                },
                {
                    valor: 4,
                    texto: "Sostenibilidad",
                    descripcion: "Economía circular y desarrollo sustentable"
                }
            ]
        }
    ];

    // Posiciones de los candidatos en cada tema (1-4 escala)
    const posicionesCandidatos = {
        jara: [4, 3, 4, 4, 4, 4, 4, 3, 4, 4], // Jeannette Jara
        kast: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // José Antonio Kast
        matthei: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // Evelyn Matthei
        parisi: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // Franco Parisi
        kaiser: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Johannes Kaiser
    };

    // Guardar posiciones en cada candidato
    candidatos.forEach(candidato => {
        if (posicionesCandidatos[candidato.id]) {
            candidato.posiciones = posicionesCandidatos[candidato.id];
        }
    });

    // Inicializar respuestas
    respuestasUsuario = new Array(preguntasSimulador.length).fill(null);
    preguntaActual = 0;

    renderizarPreguntaActual();
    actualizarControlesSimulador();
}

// Renderizar pregunta actual
function renderizarPreguntaActual() {
    const cuestionario = document.getElementById('cuestionario-voto');
    const pregunta = preguntasSimulador[preguntaActual];

    cuestionario.innerHTML = `
        <div class="pregunta activa">
            <h3 class="pregunta-titulo">${pregunta.pregunta}</h3>
            <div class="opciones-respuesta">
                ${pregunta.opciones.map((opcion, index) => `
                    <label class="opcion ${respuestasUsuario[preguntaActual] === opcion.valor ? 'seleccionada' : ''}">
                        <input type="radio" name="pregunta-${pregunta.id}" value="${opcion.valor}" 
                               ${respuestasUsuario[preguntaActual] === opcion.valor ? 'checked' : ''}>
                        <div class="opcion-texto">${opcion.texto}</div>
                        <div class="opcion-descripcion">${opcion.descripcion}</div>
                    </label>
                `).join('')}
            </div>
        </div>
    `;

    // Agregar event listeners a las opciones
    document.querySelectorAll('.opcion input').forEach(input => {
        input.addEventListener('change', function() {
            const opcion = this.closest('.opcion');
            document.querySelectorAll('.opcion').forEach(op => op.classList.remove('seleccionada'));
            opcion.classList.add('seleccionada');
            respuestasUsuario[preguntaActual] = parseInt(this.value);
            actualizarControlesSimulador();
        });
    });

    actualizarProgreso();
}

// Actualizar progreso del cuestionario
function actualizarProgreso() {
    const progreso = document.getElementById('progreso-preguntas');
    const contador = document.getElementById('contador-preguntas');
    const porcentaje = ((preguntaActual + 1) / preguntasSimulador.length) * 100;

    progreso.style.width = `${porcentaje}%`;
    contador.textContent = `Pregunta ${preguntaActual + 1} de ${preguntasSimulador.length}`;
}

// Actualizar controles de navegación
function actualizarControlesSimulador() {
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSiguiente = document.getElementById('btn-siguiente');
    const btnFinalizar = document.getElementById('btn-finalizar');
    const btnReiniciar = document.getElementById('btn-reiniciar');

    // Mostrar/ocultar botón anterior
    btnAnterior.style.display = preguntaActual > 0 ? 'block' : 'none';

    // Mostrar/ocultar botones siguiente/finalizar
    if (preguntaActual < preguntasSimulador.length - 1) {
        btnSiguiente.style.display = 'block';
        btnFinalizar.style.display = 'none';
    } else {
        btnSiguiente.style.display = 'none';
        btnFinalizar.style.display = respuestasUsuario[preguntaActual] !== null ? 'block' : 'none';
    }

    // Mostrar botón reiniciar solo cuando hay resultado
    btnReiniciar.style.display = 'none';
}

// Navegación entre preguntas
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners para los botones del simulador
    document.getElementById('btn-siguiente')?.addEventListener('click', function() {
        if (respuestasUsuario[preguntaActual] !== null && preguntaActual < preguntasSimulador.length - 1) {
            preguntaActual++;
            renderizarPreguntaActual();
            actualizarControlesSimulador();
        }
    });

    document.getElementById('btn-anterior')?.addEventListener('click', function() {
        if (preguntaActual > 0) {
            preguntaActual--;
            renderizarPreguntaActual();
            actualizarControlesSimulador();
        }
    });

    document.getElementById('btn-finalizar')?.addEventListener('click', function() {
        if (respuestasUsuario.every(respuesta => respuesta !== null)) {
            calcularResultadoSimulador();
        }
    });

    document.getElementById('btn-reiniciar')?.addEventListener('click', function() {
        reiniciarSimulador();
    });
});

// Calcular resultado del simulador
function calcularResultadoSimulador() {
    const compatibilidades = [];

    candidatos.forEach(candidato => {
        if (candidato.posiciones) {
            let puntajeTotal = 0;
            let maxPuntaje = 0;

            respuestasUsuario.forEach((respuestaUsuario, index) => {
                const posicionCandidato = candidato.posiciones[index];
                // Puntaje: 100% si coinciden exactamente, disminuye con la diferencia
                const diferencia = Math.abs(respuestaUsuario - posicionCandidato);
                const puntajePregunta = Math.max(0, 100 - (diferencia * 25)); // 25% menos por cada punto de diferencia
                puntajeTotal += puntajePregunta;
                maxPuntaje += 100;
            });

            const compatibilidad = (puntajeTotal / maxPuntaje) * 100;
            compatibilidades.push({
                candidato: candidato,
                compatibilidad: Math.round(compatibilidad)
            });
        }
    });

    // Ordenar por compatibilidad descendente
    compatibilidades.sort((a, b) => b.compatibilidad - a.compatibilidad);

    mostrarResultadoSimulador(compatibilidades);
}

// Mostrar resultado del simulador
function mostrarResultadoSimulador(compatibilidades) {
    const resultado = document.getElementById('resultado-simulador');
    const cuestionario = document.getElementById('cuestionario-voto');
    const candidatoRecomendado = compatibilidades[0];
    const otrosCandidatos = compatibilidades.slice(1);

    resultado.innerHTML = `
        <div class="resultado-titulo">¡Tu candidato compatible!</div>
        <div class="resultado-subtitulo">Basado en tus respuestas, este candidato se alinea mejor con tus preferencias</div>
        
        <div class="candidato-recomendado">
            <div class="candidato-recomendado-header">
                <div class="candidato-recomendado-foto">
                    <img src="${candidatoRecomendado.candidato.foto}" alt="${candidatoRecomendado.candidato.nombre}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="candidato-iniciales" style="display: none;">
                        ${obtenerIniciales(candidatoRecomendado.candidato.nombre)}
                    </div>
                </div>
                <div class="candidato-recomendado-info">
                    <h3>${candidatoRecomendado.candidato.nombre}</h3>
                    <p class="candidato-recomendado-partido">${candidatoRecomendado.candidato.partido}</p>
                </div>
            </div>
            
            <div class="porcentaje-compatibilidad">${candidatoRecomendado.compatibilidad}%</div>
            <div class="barra-compatibilidad">
                <div class="barra-compatibilidad-progreso" style="width: ${candidatoRecomendado.compatibilidad}%"></div>
            </div>
            <div class="etiqueta-compatibilidad">Compatibilidad programática</div>
            
            <div class="acciones-perfil">
                <button class="btn-principal" onclick="mostrarPerfil('${candidatoRecomendado.candidato.id}')">
                    <i class="fas fa-user"></i> Ver Perfil Completo
                </button>
                <button class="btn-secundario" onclick="compartirResultado('${candidatoRecomendado.candidato.id}', ${candidatoRecomendado.compatibilidad})">
                    <i class="fas fa-share"></i> Compartir Resultado
                </button>
            </div>
        </div>

        <div class="comparativa-candidatos">
            <h4>Compatibilidad con otros candidatos</h4>
            <div class="lista-compatibilidad">
                ${otrosCandidatos.map(item => `
                    <div class="item-compatibilidad" onclick="mostrarPerfil('${item.candidato.id}')">
                        <span class="candidato-nombre">${item.candidato.nombre.split(' ')[0]} ${item.candidato.nombre.split(' ')[1]}</span>
                        <span class="candidato-porcentaje">${item.compatibilidad}%</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detalles-compatibilidad">
            <h4>Resumen de tus preferencias</h4>
            ${respuestasUsuario.map((respuesta, index) => {
                const pregunta = preguntasSimulador[index];
                const opcionSeleccionada = pregunta.opciones.find(op => op.valor === respuesta);
                return `
                    <div class="detalle-compatibilidad">
                        <div class="detalle-tema">${pregunta.tema}</div>
                        <div class="detalle-respuesta">${opcionSeleccionada.texto}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    cuestionario.style.display = 'none';
    resultado.style.display = 'block';
    document.getElementById('btn-reiniciar').style.display = 'block';
    document.getElementById('btn-finalizar').style.display = 'none';
}

// Reiniciar simulador
function reiniciarSimulador() {
    respuestasUsuario = new Array(preguntasSimulador.length).fill(null);
    preguntaActual = 0;

    const cuestionario = document.getElementById('cuestionario-voto');
    const resultado = document.getElementById('resultado-simulador');

    cuestionario.style.display = 'block';
    resultado.style.display = 'none';

    renderizarPreguntaActual();
    actualizarControlesSimulador();
}

// Compartir resultado
function compartirResultado(candidatoId, compatibilidad) {
    const candidato = candidatos.find(c => c.id === candidatoId);
    if (!candidato) return;

    const texto = `¡Según el simulador de Voto Informado Chile 2025, tengo ${compatibilidad}% de compatibilidad con ${candidato.nombre}! Descubre tu candidato compatible 🇨🇱`;
    const url = window.location.href;

    const opciones = [
        {
            nombre: 'WhatsApp',
            url: `https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`,
            icono: 'fab fa-whatsapp',
            color: '#25D366'
        },
        {
            nombre: 'Facebook',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(texto)}`,
            icono: 'fab fa-facebook',
            color: '#1877F2'
        },
        {
            nombre: 'Twitter/X',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
            icono: 'fab fa-twitter',
            color: '#1DA1F2'
        }
    ];

    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-compartir" onclick="event.stopPropagation()">
                <h3>Compartir mi resultado</h3>
                <div class="opciones-compartir">
                    ${opciones.map(opcion => `
                        <a href="${opcion.url}" target="_blank" class="opcion-compartir" style="border-left-color: ${opcion.color}">
                            <i class="${opcion.icono}" style="color: ${opcion.color}"></i>
                            <span>${opcion.nombre}</span>
                        </a>
                    `).join('')}
                </div>
                <button class="btn-cerrar" onclick="cerrarModal()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Inicializar simulador cuando se muestra la sección
function mostrarSeccion(seccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Mostrar la sección solicitada
    document.getElementById(seccion).classList.add('active');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="mostrarSeccion('${seccion}')"]`)?.classList.add('active');
    
    // Scroll al inicio
    window.scrollTo(0, 0);

    // Inicializar simulador si es la sección correspondiente
    if (seccion === 'simulador') {
        inicializarSimulador();
    }
}
// Funciones auxiliares para el financiamiento
function obtenerClaseEstado(estado) {
    const estados = {
        'Aprobado': 'aprobado',
        'En revisión': 'revision',
        'Pendiente': 'pendiente',
        'Con observaciones': 'observaciones',
        'Rechazado': 'rechazado'
    };
    return estados[estado] || 'pendiente';
}

function obtenerIconoAlerta(tipo) {
    const iconos = {
        'info': 'fas fa-info-circle',
        'advertencia': 'fas fa-exclamation-triangle',
        'alerta': 'fas fa-exclamation-circle'
    };
    return `<i class="${iconos[tipo]}"></i>`;
}
// Función para formatear montos en dinero chileno
function formatearDineroChileno(monto) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(monto);
}

// Calendario Electoral
let eventosCalendario = [];

// Inicializar calendario
function inicializarCalendario() {
    eventosCalendario = [
        {
            id: 1,
            tipo: "plazos",
            fecha: "2025-07-15",
            hora: "23:59",
            titulo: "Cierre de inscripción de candidaturas",
            descripcion: "Fecha límite para que los partidos políticos inscriban sus candidatos presidenciales ante el SERVEL.",
            ubicacion: "SERVEL - Nacional",
            importancia: "alta",
            recordatorio: "1 día antes"
        },
        {
            id: 2,
            tipo: "eventos",
            fecha: "2025-08-05",
            hora: "21:00",
            titulo: "Primer Debate Presidencial - TVN",
            descripcion: "Debate organizado por TVN con todos los candidatos presidenciales. Enfoque en programas de gobierno.",
            ubicacion: "TVN - Santiago",
            importancia: "media",
            recordatorio: "2 horas antes"
        },
        {
            id: 3,
            tipo: "debates",
            fecha: "2025-08-19",
            hora: "22:00",
            titulo: "Debate CHV - Meganoticias",
            descripcion: "Debate en CHV con los 5 candidatos principales. Temas: seguridad, economía y salud.",
            ubicacion: "CHV - Santiago",
            importancia: "media",
            recordatorio: "1 hora antes"
        },
        {
            id: 4,
            tipo: "plazos",
            fecha: "2025-09-01",
            hora: "23:59",
            titulo: "Cierre padrón electoral",
            descripcion: "Fecha límite para verificar y corregir datos en el padrón electoral.",
            ubicacion: "SERVEL - Nacional",
            importancia: "alta",
            recordatorio: "3 días antes"
        },
        {
            id: 5,
            tipo: "debates",
            fecha: "2025-09-15",
            hora: "21:30",
            titulo: "Debate CNN Chile - La Tercera",
            descripcion: "Debate con foco en propuestas económicas y sociales.",
            ubicacion: "CNN Chile - Santiago",
            importancia: "media",
            recordatorio: "1 hora antes"
        },
        {
            id: 6,
            tipo: "eventos",
            fecha: "2025-10-01",
            hora: "18:00",
            titulo: "Inicio campaña propaganda electoral",
            descripcion: "Comienzo oficial del período de propaganda electoral en medios y vía pública.",
            ubicacion: "Nacional",
            importancia: "baja",
            recordatorio: "1 día antes"
        },
        {
            id: 7,
            tipo: "debates",
            fecha: "2025-10-20",
            hora: "22:00",
            titulo: "Debate Anatel - Asociación de Televisiones",
            descripcion: "Último debate antes de primera vuelta con todos los candidatos.",
            ubicacion: "Anatel - Santiago",
            importancia: "alta",
            recordatorio: "2 horas antes"
        },
        {
            id: 8,
            tipo: "plazos",
            fecha: "2025-11-05",
            hora: "23:59",
            titulo: "Cierre propaganda electoral primera vuelta",
            descripcion: "Fin de la propaganda electoral antes de la primera vuelta presidencial.",
            ubicacion: "Nacional",
            importancia: "media",
            recordatorio: "1 día antes"
        },
        {
            id: 9,
            tipo: "elecciones",
            fecha: "2025-11-16",
            hora: "08:00-18:00",
            titulo: "Primera Vuelta Presidencial",
            descripcion: "Elecciones para Presidente de la República, diputados y senadores.",
            ubicacion: "Todo Chile",
            importancia: "muy alta",
            recordatorio: "1 semana antes y 1 día antes"
        },
        {
            id: 10,
            tipo: "eventos",
            fecha: "2025-11-25",
            hora: "20:00",
            titulo: "Debate segunda vuelta - Mega",
            descripcion: "Primer debate entre los dos candidatos que pasen a segunda vuelta.",
            ubicacion: "Mega - Santiago",
            importancia: "alta",
            recordatorio: "1 hora antes"
        },
        {
            id: 11,
            tipo: "eventos",
            fecha: "2025-12-02",
            hora: "21:00",
            titulo: "Debate final - Chilevisión",
            descripcion: "Último debate presidencial antes de la segunda vuelta.",
            ubicacion: "CHV - Santiago",
            importancia: "alta",
            recordatorio: "1 hora antes"
        },
        {
            id: 12,
            tipo: "plazos",
            fecha: "2025-12-10",
            hora: "23:59",
            titulo: "Cierre propaganda electoral segunda vuelta",
            descripcion: "Fin de la propaganda electoral antes de la segunda vuelta presidencial.",
            ubicacion: "Nacional",
            importancia: "media",
            recordatorio: "1 día antes"
        },
        {
            id: 13,
            tipo: "elecciones",
            fecha: "2025-12-14",
            hora: "08:00-18:00",
            titulo: "Segunda Vuelta Presidencial",
            descripcion: "Elección del próximo Presidente de Chile entre los dos candidatos más votados.",
            ubicacion: "Todo Chile",
            importancia: "muy alta",
            recordatorio: "1 semana antes y 1 día antes"
        },
        {
            id: 14,
            tipo: "eventos",
            fecha: "2026-03-11",
            hora: "12:00",
            titulo: "Toma de Posesión Presidencial",
            descripcion: "Ceremonia de cambio de mando y toma de posesión del nuevo Presidente de Chile.",
            ubicacion: "Congreso Nacional - Valparaíso",
            importancia: "alta",
            recordatorio: "1 día antes"
        }
    ];

    renderizarCalendario('todas');
    inicializarFiltrosCalendario();
}

// Renderizar calendario
function renderizarCalendario(filtro) {
    const container = document.getElementById('calendario-grid');
    const eventosFiltrados = filtro === 'todas' 
        ? eventosCalendario 
        : eventosCalendario.filter(evento => evento.tipo === filtro);

    container.innerHTML = eventosFiltrados.map(evento => `
        <div class="evento-calendario ${evento.tipo}">
            <span class="etiqueta-evento etiqueta-${evento.tipo}">
                ${obtenerEtiquetaTipo(evento.tipo)}
            </span>
            
            <div class="fecha-evento">
                <i class="fas fa-calendar"></i>
                ${formatearFecha(evento.fecha)} ${evento.hora ? `- ${evento.hora}` : ''}
            </div>
            
            <h3 class="titulo-evento">${evento.titulo}</h3>
            
            <p class="descripcion-evento">${evento.descripcion}</p>
            
            <div class="detalles-evento">
                <div class="detalle-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${evento.ubicacion}</span>
                </div>
                <div class="detalle-item">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Importancia: ${evento.importancia}</span>
                </div>
            </div>
            
            <div class="acciones-evento">
                <button class="btn-calendario btn-google" onclick="agregarAGoogleCalendar(${evento.id})">
                    <i class="fab fa-google"></i> Google Calendar
                </button>
                <button class="btn-calendario btn-recordatorio" onclick="mostrarOpcionesRecordatorio(${evento.id})">
                    <i class="fas fa-bell"></i> Recordatorio
                </button>
                <button class="btn-calendario" onclick="compartirEvento(${evento.id})">
                    <i class="fas fa-share"></i> Compartir
                </button>
            </div>
        </div>
    `).join('');
}

// Inicializar filtros del calendario
function inicializarFiltrosCalendario() {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tipo = this.getAttribute('data-tipo');
            renderizarCalendario(tipo);
        });
    });
}

// Obtener etiqueta para tipo de evento
function obtenerEtiquetaTipo(tipo) {
    const etiquetas = {
        'elecciones': 'Elección',
        'debates': 'Debate',
        'plazos': 'Plazo Legal',
        'eventos': 'Evento'
    };
    return etiquetas[tipo] || 'Evento';
}

// Agregar evento a Google Calendar
function agregarAGoogleCalendar(eventoId) {
    const evento = eventosCalendario.find(e => e.id === eventoId);
    if (!evento) return;

    const fechaInicio = new Date(evento.fecha + (evento.hora ? 'T' + evento.hora : 'T12:00'));
    const fechaFin = new Date(fechaInicio.getTime() + 2 * 60 * 60 * 1000); // +2 horas

    const parametros = new URLSearchParams({
        action: 'TEMPLATE',
        text: evento.titulo,
        dates: `${formatDateForGoogle(fechaInicio)}/${formatDateForGoogle(fechaFin)}`,
        details: evento.descripcion,
        location: evento.ubicacion,
        trp: false
    });

    window.open(`https://calendar.google.com/calendar/render?${parametros.toString()}`, '_blank');
}

// Formatear fecha para Google Calendar
function formatDateForGoogle(date) {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
}

// Mostrar opciones de recordatorio
function mostrarOpcionesRecordatorio(eventoId) {
    const evento = eventosCalendario.find(e => e.id === eventoId);
    if (!evento) return;

    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-calendario" onclick="event.stopPropagation()">
                <h3>Configurar Recordatorio</h3>
                
                <div class="detalles-agregar">
                    <div class="detalle-agregar">
                        <strong>Evento:</strong>
                        <span>${evento.titulo}</span>
                    </div>
                    <div class="detalle-agregar">
                        <strong>Fecha:</strong>
                        <span>${formatearFecha(evento.fecha)} ${evento.hora ? evento.hora : ''}</span>
                    </div>
                    <div class="detalle-agregar">
                        <strong>Ubicación:</strong>
                        <span>${evento.ubicacion}</span>
                    </div>
                </div>

                <div class="opciones-recordatorio">
                    <h4>Selecciona cuándo recibir el recordatorio:</h4>
                    <label class="opcion-recordatorio">
                        <input type="radio" name="recordatorio" value="15min" checked>
                        <span>15 minutos antes</span>
                    </label>
                    <label class="opcion-recordatorio">
                        <input type="radio" name="recordatorio" value="1hora">
                        <span>1 hora antes</span>
                    </label>
                    <label class="opcion-recordatorio">
                        <input type="radio" name="recordatorio" value="1dia">
                        <span>1 día antes</span>
                    </label>
                    <label class="opcion-recordatorio">
                        <input type="radio" name="recordatorio" value="personalizado">
                        <span>Personalizado</span>
                    </label>
                </div>

                <div class="acciones-perfil">
                    <button class="btn-principal" onclick="agregarRecordatorio(${eventoId})">
                        <i class="fas fa-bell"></i> Agregar Recordatorio
                    </button>
                    <button class="btn-secundario" onclick="cerrarModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Agregar recordatorio
function agregarRecordatorio(eventoId) {
    const evento = eventosCalendario.find(e => e.id === eventoId);
    if (!evento) return;

    const recordatorioSeleccionado = document.querySelector('input[name="recordatorio"]:checked').value;
    
    // En una aplicación real, aquí se integraría con la API de notificaciones del navegador
    // o se enviaría a un servicio de recordatorios
    
    mostrarNotificacion('success', `Recordatorio agregado para "${evento.titulo}" (${recordatorioSeleccionado})`);
    cerrarModal();
}

// Descargar calendario completo
function descargarCalendarioCompleto() {
    // Generar contenido .ics básico
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Voto Informado Chile 2025//Calendario Electoral//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    eventosCalendario.forEach(evento => {
        const fechaInicio = new Date(evento.fecha + (evento.hora ? 'T' + evento.hora : 'T12:00'));
        const fechaFin = new Date(fechaInicio.getTime() + 2 * 60 * 60 * 1000);

        icsContent.push(
            'BEGIN:VEVENT',
            `UID:${evento.id}@votoinformado2025.cl`,
            `DTSTAMP:${formatDateForICS(new Date())}`,
            `DTSTART:${formatDateForICS(fechaInicio)}`,
            `DTEND:${formatDateForICS(fechaFin)}`,
            `SUMMARY:${evento.titulo}`,
            `DESCRIPTION:${evento.descripcion}`,
            `LOCATION:${evento.ubicacion}`,
            `PRIORITY:${obtenerPrioridadICS(evento.importancia)}`,
            'END:VEVENT'
        );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calendario_electoral_2025.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    mostrarNotificacion('success', 'Calendario descargado correctamente');
}

// Formatear fecha para archivo .ics
function formatDateForICS(date) {
    return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
}

// Obtener prioridad para archivo .ics
function obtenerPrioridadICS(importancia) {
    const prioridades = {
        'muy alta': '1',
        'alta': '2',
        'media': '3',
        'baja': '4'
    };
    return prioridades[importancia] || '5';
}

// Sincronizar con Google Calendar
function syncConGoogleCalendar() {
    // En una aplicación real, aquí se implementaría OAuth2 para Google Calendar API
    // Por ahora, ofrecemos descargar el archivo .ics que se puede importar manualmente
    
    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-calendario" onclick="event.stopPropagation()">
                <h3>Sincronizar con Google Calendar</h3>
                <p>Para sincronizar automáticamente, descarga el archivo .ics y impórtalo en tu Google Calendar:</p>
                
                <ol style="text-align: left; margin: 20px 0;">
                    <li>Descarga el archivo .ics</li>
                    <li>Ve a <a href="https://calendar.google.com" target="_blank">calendar.google.com</a></li>
                    <li>En la izquierda, junto a "Otros calendarios", haz clic en "+" → "Crear calendario nuevo"</li>
                    <li>Ve a Configuración del calendario → Importar & exportar</li>
                    <li>Selecciona el archivo .ics descargado</li>
                    <li>¡Listo! Tu calendario electoral estará sincronizado</li>
                </ol>

                <div class="acciones-perfil">
                    <button class="btn-principal" onclick="descargarCalendarioCompleto(); cerrarModal();">
                        <i class="fas fa-download"></i> Descargar .ics
                    </button>
                    <button class="btn-secundario" onclick="cerrarModal()">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Compartir evento
function compartirEvento(eventoId) {
    const evento = eventosCalendario.find(e => e.id === eventoId);
    if (!evento) return;

    const texto = `🗳️ ${evento.titulo} - ${formatearFecha(evento.fecha)} ${evento.hora ? evento.hora : ''}\n${evento.descripcion}\n\nMás info en Voto Informado Chile 2025`;
    const url = window.location.href;

    const opciones = [
        {
            nombre: 'WhatsApp',
            url: `https://wa.me/?text=${encodeURIComponent(texto)}`,
            icono: 'fab fa-whatsapp',
            color: '#25D366'
        },
        {
            nombre: 'Twitter/X',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
            icono: 'fab fa-twitter',
            color: '#1DA1F2'
        },
        {
            nombre: 'Facebook',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(texto)}`,
            icono: 'fab fa-facebook',
            color: '#1877F2'
        },
        {
            nombre: 'Correo',
            url: `mailto:?subject=${encodeURIComponent(evento.titulo)}&body=${encodeURIComponent(texto + '\n' + url)}`,
            icono: 'fas fa-envelope',
            color: '#ea4335'
        }
    ];

    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-compartir" onclick="event.stopPropagation()">
                <h3>Compartir Evento</h3>
                <div class="opciones-compartir">
                    ${opciones.map(opcion => `
                        <a href="${opcion.url}" target="_blank" class="opcion-compartir" style="border-left-color: ${opcion.color}">
                            <i class="${opcion.icono}" style="color: ${opcion.color}"></i>
                            <span>${opcion.nombre}</span>
                        </a>
                    `).join('')}
                </div>
                <button class="btn-cerrar" onclick="cerrarModal()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Función de notificación
function mostrarNotificacion(tipo, mensaje) {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;

    // Estilos para la notificación
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? 'var(--color-exito)' : 'var(--color-acento)'};
        color: white;
        padding: 15px 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--sombra-hover);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notificacion);

    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 3000);
}

// Agregar estilos de animación para notificaciones
const estilosNotificaciones = `
<style>
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.notificacion-contenido {
    display: flex;
    align-items: center;
    gap: 10px;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', estilosNotificaciones);

// Inicializar calendario cuando se muestra la sección
function mostrarSeccion(seccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Mostrar la sección solicitada
    document.getElementById(seccion).classList.add('active');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="mostrarSeccion('${seccion}')"]`)?.classList.add('active');
    
    // Scroll al inicio
    window.scrollTo(0, 0);

    // Inicializar secciones específicas
    if (seccion === 'simulador') {
        inicializarSimulador();
    } else if (seccion === 'calendario') {
        inicializarCalendario();
    }
}

// Modales legales
function mostrarModalPrivacidad() {
    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-legal" onclick="event.stopPropagation()">
                <h2>Política de Privacidad</h2>
                
                <h3>1. Información que recopilamos</h3>
                <p>Voto Informado Chile 2025 es una plataforma informativa que respeta tu privacidad:</p>
                <ul>
                    <li><strong>Datos de navegación:</strong> Información anónima sobre el uso del sitio</li>
                    <li><strong>Preferencias del simulador:</strong> Tus respuestas se procesan localmente y no se almacenan</li>
                    <li><strong>Interacciones:</strong> Información sobre secciones visitadas y tiempo de uso</li>
                </ul>

                <h3>2. Uso de la información</h3>
                <p>Utilizamos la información para:</p>
                <ul>
                    <li>Mejorar la experiencia del usuario</li>
                    <li>Analizar el uso de las diferentes secciones</li>
                    <li>Proporcionar contenido relevante</li>
                    <li>Garantizar el funcionamiento técnico del sitio</li>
                </ul>

                <h3>3. Cookies y tecnologías similares</h3>
                <p>Utilizamos cookies técnicas necesarias para el funcionamiento del sitio. No utilizamos cookies de seguimiento de terceros.</p>

                <h3>4. Tus derechos</h3>
                <p>Tienes derecho a:</p>
                <ul>
                    <li>Acceder a la información que tenemos sobre ti</li>
                    <li>Solicitar la corrección de datos inexactos</li>
                    <li>Solicitar la eliminación de tus datos</li>
                    <li>Oponerte al procesamiento de tus datos</li>
                </ul>

                <h3>5. Seguridad</h3>
                <p>Implementamos medidas de seguridad para proteger tu información contra accesos no autorizados.</p>

                <h3>6. Contacto</h3>
                <p>Para ejercer tus derechos o hacer consultas sobre privacidad, contáctanos en: <strong>andespart.ar@gmail.com</strong></p>

                <div class="acciones-perfil">
                    <button class="btn-principal" onclick="cerrarModal()">
                        <i class="fas fa-check"></i> Entendido
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function mostrarModalTerminos() {
    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-legal" onclick="event.stopPropagation()">
                <h2>Términos de Uso</h2>
                
                <h3>1. Aceptación de términos</h3>
                <p>Al utilizar Voto Informado Chile 2025, aceptas estos términos de uso.</p>

                <h3>2. Propósito educativo</h3>
                <p>Esta plataforma tiene fines educativos e informativos. Los datos presentados son de carácter referencial y pueden contener aproximaciones.</p>

                <h3>3. Exactitud de la información</h3>
                <p>Nos esforzamos por mantener la información actualizada y precisa, pero:</p>
                <ul>
                    <li>Los datos de financiamiento son estimaciones basadas en información pública</li>
                    <li>Las posiciones programáticas son interpretaciones basadas en declaraciones públicas</li>
                    <li>Las encuestas y aprobaciones son datos simulados con fines demostrativos</li>
                </ul>
                <p><strong>Recomendamos verificar la información en fuentes oficiales.</strong></p>

                <h3>4. Uso permitido</h3>
                <p>Puedes usar esta plataforma para:</p>
                <ul>
                    <li>Consultar información sobre candidatos</li>
                    <li>Comparar propuestas programáticas</li>
                    <li>Utilizar el simulador de voto</li>
                    <li>Compartir información respetando los derechos de autor</li>
                </ul>

                <h3>5. Limitación de responsabilidad</h3>
                <p>No nos hacemos responsables por:</p>
                <ul>
                    <li>Decisiones tomadas basadas en la información aquí presentada</li>
                    <li>Errores u omisiones en los datos</li>
                    <li>Interrupciones en el servicio</li>
                </ul>

                <h3>6. Propiedad intelectual</h3>
                <p>El código y diseño de la plataforma son propiedad del desarrollador. Los contenidos sobre candidatos son de dominio público.</p>

                <h3>7. Modificaciones</h3>
                <p>Nos reservamos el derecho de modificar estos términos en cualquier momento.</p>

                <div class="acciones-perfil">
                    <button class="btn-principal" onclick="cerrarModal()">
                        <i class="fas fa-check"></i> Aceptar Términos
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
console.log('Aplicación Voto Informado Chile 2025 inicializada correctamente');


// Función para intercambiar candidatos en el comparador
function intercambiarCandidatos() {
    const select1 = document.getElementById('candidato1');
    const select2 = document.getElementById('candidato2');
    
    const tempValue = select1.value;
    select1.value = select2.value;
    select2.value = tempValue;
    
    if (select1.value && select2.value) {
        actualizarComparacion();
    }
}

// Función para limpiar la comparación
function limpiarComparacion() {
    document.getElementById('candidato1').value = '';
    document.getElementById('candidato2').value = '';
    document.getElementById('comparacion-resultado').innerHTML = 
        '<p class="mensaje-comparacion">Selecciona dos candidatos diferentes para compararlos</p>';
    
    // Limpiar gráfico
    if (graficoActual) {
        graficoActual.destroy();
        graficoActual = null;
    }
}

// Mejorar la función actualizarComparacion para móviles
function actualizarComparacion() {
    const id1 = document.getElementById('candidato1').value;
    const id2 = document.getElementById('candidato2').value;
    const container = document.getElementById('comparacion-resultado');

    // Mostrar estado de carga
    container.innerHTML = '<p class="mensaje-comparacion">Cargando comparación...</p>';
    container.classList.add('cargando');

    setTimeout(() => {
        container.classList.remove('cargando');
        
        if (!id1 || !id2 || id1 === id2) {
            container.innerHTML = '<p class="mensaje-comparacion">Selecciona dos candidatos diferentes para compararlos</p>';
            return;
        }

        const candidato1 = candidatos.find(c => c.id === id1);
        const candidato2 = candidatos.find(c => c.id === id2);

        // Resto del código de comparación...
        container.innerHTML = `
            <table class="comparacion-table">
                <thead>
                    <tr>
                        <th scope="col">Aspecto</th>
                        <th scope="col">${candidato1.nombre.split(' ')[0]} ${candidato1.nombre.split(' ')[1]}</th>
                        <th scope="col">${candidato2.nombre.split(' ')[0]} ${candidato2.nombre.split(' ')[1]}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row">Partido</th>
                        <td>${candidato1.partido}</td>
                        <td>${candidato2.partido}</td>
                    </tr>
                    <tr>
                        <th scope="row">Edad</th>
                        <td>${candidato1.edad} años</td>
                        <td>${candidato2.edad} años</td>
                    </tr>
                    <tr>
                        <th scope="row">Profesión</th>
                        <td>${candidato1.profesion}</td>
                        <td>${candidato2.profesion}</td>
                    </tr>
                    <tr>
                        <th scope="row">Lema</th>
                        <td>"${candidato1.lema}"</td>
                        <td>"${candidato2.lema}"</td>
                    </tr>
                    <tr>
                        <th scope="row">Aprobación</th>
                        <td>
                            <strong>${candidato1.aprobacion}%</strong>
                            <div class="barra-progreso">
                                <div class="progreso" style="width: ${candidato1.aprobacion}%"></div>
                            </div>
                        </td>
                        <td>
                            <strong>${candidato2.aprobacion}%</strong>
                            <div class="barra-progreso">
                                <div class="progreso" style="width: ${candidato2.aprobacion}%"></div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Propuestas Principales</th>
                        <td>
                            <ul>
                                ${candidato1.propuestas.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </td>
                        <td>
                            <ul>
                                ${candidato2.propuestas.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;

        crearGraficoComparacion(candidato1, candidato2);
    }, 500); // Pequeño delay para mejor UX
}