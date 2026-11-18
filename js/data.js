/* ==========================================================================
   De ARPANET al feed · RED-1011-N-25
   DATOS DEL RECURSO — textos pedagógicos, preguntas, pistas y bloques.
   Edita aquí los contenidos; la lógica vive en js/app.js.
   ========================================================================== */
"use strict";

const HITOS = {
  1: {
    etiqueta: "ARPANET",
    corto: "red sin centro",
    anioRuta: "1969",
    // Resumen corto tal como aparece en la tarjeta del mapa.
    resumenMapa: "Una red sin centro conectó computadores lejanos para que la información pudiera viajar sin depender de una sola máquina.",
    anio: "1969",
    titulo: "Nacimiento de internet (ARPANET)",
    resumen: "Una red sin centro conectó computadores lejanos para que la información pudiera viajar sin depender de una sola máquina.",
    causa: "Ningún computador era indispensable, así que si uno fallaba la red podía seguir creciendo y buscando otras rutas.",
    imagen: "assets/img/hito-1.jpg",
    imagenAlt: "Boceto a mano de ARPANET en diciembre de 1969: cuatro nodos (UCLA, SRI, UCSB y Utah) unidos por líneas",
    credito: "Imagen \"A sketch of the ARPANET in December 1969\", de Wikimedia Commons, en dominio público (Public Domain Mark 1.0).",
    audio: "assets/audio/hito-1.mp3",
    transcripcion: "A finales de los años sesenta, científicos en Estados Unidos construyeron ARPANET, una red que conectaba solo cuatro computadores en universidades, pensada para que investigadores compartieran información sin depender de una sola máquina central. Esa decisión, que ningún computador fuera indispensable, hizo que la red pudiera crecer sin límite. Por eso hoy, cuando un servidor falla, internet sigue funcionando, porque la causa fue diseñar una red sin centro y el efecto fue una red que no se puede apagar de un solo golpe.",
    preguntas: [
      {
        pregunta: "¿Qué característica del diseño original de ARPANET explica por qué internet no depende de un solo lugar?",
        opciones: [
          { texto: "Que fuera gratuita para todos los usuarios.", correcta: false },
          { texto: "Que ningún nodo fuera indispensable para funcionar.", correcta: true },
          { texto: "Que solo las universidades pudieran acceder a ella.", correcta: false },
          { texto: "Que usara cables de fibra óptica avanzada.", correcta: false },
        ],
        feedbackCorrecto: "Exacto. ARPANET no dependía de un nodo indispensable, así que la red podía seguir funcionando.",
        pistas: [
          "Piensa en qué pasa si un servidor se apaga. ¿Deja de funcionar toda la red?",
          "La respuesta correcta no habla de dinero ni de quién la usaba, sino de cómo estaba construida la red por dentro.",
        ],
      },
      {
        pregunta: "¿Por qué se dice que ARPANET fue diseñada para resistir fallas?",
        opciones: [
          { texto: "Porque cada nodo se conectaba a varios otros nodos.", correcta: true },
          { texto: "Porque usaba computadores mucho más rápidos que los actuales.", correcta: false },
          { texto: "Porque estaba protegida con contraseñas muy difíciles de adivinar.", correcta: false },
          { texto: "Porque solo la usaban militares con acceso completamente restringido.", correcta: false },
        ],
        feedbackCorrecto: "Así es. Al conectar cada nodo con varios otros, la red podía seguir funcionando aunque uno fallara.",
        pistas: [
          "Piensa en cómo estaban conectados los computadores entre sí, no en su velocidad ni en su seguridad.",
          "La resistencia a fallas depende de tener varias rutas posibles entre los nodos, no de quién la usaba.",
        ],
      },
    ],
  },
  2: {
    etiqueta: "La Web",
    corto: "navegar con enlaces",
    anioRuta: "1989",
    // Resumen corto tal como aparece en la tarjeta del mapa.
    resumenMapa: "La Web volvió navegable internet, con páginas conectadas por enlaces que cualquiera podía leer con un clic.",
    anio: "1989",
    titulo: "La World Wide Web",
    resumen: "La Web volvió navegable internet, con páginas conectadas por enlaces que cualquier persona podía leer con un clic.",
    causa: "Una forma visual y sencilla de navegar hizo accesible la información a personas sin conocimientos técnicos.",
    imagen: "assets/img/hito-2.jpg",
    imagenAlt: "Computador NeXT exhibido en el CERN, el primer servidor web, con su teclado y documentos al lado",
    credito: "Imagen \"First Web Server.jpg\", foto de Coolcaesar, de Wikimedia Commons, con licencia CC BY-SA 3.0 Unported.",
    audio: "assets/audio/hito-2.mp3",
    transcripcion: "En 1989, Tim Berners-Lee creó la Web, un sistema de páginas conectadas por enlaces que cualquiera podía leer con un simple clic, sin saber programar. Antes de eso, internet ya existía, pero solo la usaban expertos que escribían comandos. La causa fue crear una forma visual y sencilla de navegar la información; el efecto fue que millones de personas comunes, no solo científicos, empezaran a acceder y publicar contenido por sí mismas.",
    preguntas: [
      {
        pregunta: "¿Qué cambió realmente la Web respecto al internet que ya existía?",
        opciones: [
          { texto: "Permitió navegar la información sin conocimientos técnicos previos.", correcta: true },
          { texto: "Creó por primera vez la conexión entre computadores.", correcta: false },
          { texto: "Eliminó por completo la necesidad de tener un computador.", correcta: false },
          { texto: "Aumentó la velocidad de conexión a internet existente.", correcta: false },
        ],
        feedbackCorrecto: "Correcto. La Web hizo que navegar la información fuera posible sin conocimientos técnicos.",
        pistas: [
          "No inventó internet. ¿Qué hizo más fácil para la gente común?",
          "Antes de la Web había que escribir comandos técnicos. ¿Qué cambió para que cualquiera pudiera navegar con un clic?",
        ],
      },
      {
        pregunta: "¿Por qué la Web hizo posible que cualquier persona publicara contenido?",
        opciones: [
          { texto: "Porque usaba enlaces y páginas fáciles de crear.", correcta: true },
          { texto: "Porque eliminó los costos de tener conexión a internet.", correcta: false },
          { texto: "Porque los gobiernos empezaron a exigir su uso.", correcta: false },
          { texto: "Porque los computadores se volvieron mucho más baratos.", correcta: false },
        ],
        feedbackCorrecto: "Exacto. Los enlaces y las páginas fáciles de crear permitieron que cualquiera publicara contenido.",
        pistas: [
          "Piensa en qué hizo la Web con la forma de navegar y crear páginas, no con el precio de internet.",
          "No es sobre costos ni sobre gobiernos. Es sobre lo sencillo que se volvió publicar y leer con enlaces.",
        ],
      },
    ],
  },
  3: {
    etiqueta: "Móvil",
    corto: "internet en el bolsillo",
    anioRuta: "2000s",
    // Resumen corto tal como aparece en la tarjeta del mapa.
    resumenMapa: "Los teléfonos inteligentes y las redes móviles llevaron la conexión a más lugares y al bolsillo.",
    anio: "2000s",
    titulo: "Masificación del internet móvil",
    resumen: "Los teléfonos inteligentes y las redes móviles llevaron la conexión a más lugares y al bolsillo.",
    causa: "La conexión dejó de estar atada a un lugar fijo, así que muchas personas entraron por primera vez a internet desde un celular.",
    imagen: "assets/img/hito-3.jpg",
    imagenAlt: "Mano sosteniendo un teléfono inteligente con aplicaciones abiertas en la pantalla",
    credito: "Imagen \"Smartphone Use.jpg\", de Wikimedia Commons, en dominio público (CC0).",
    audio: "assets/audio/hito-3.mp3",
    transcripcion: "Desde finales de los años dos mil, los teléfonos inteligentes se volvieron asequibles y las redes móviles llegaron a más lugares, incluso donde nunca hubo internet fijo. La causa fue tener internet en un dispositivo que la gente ya cargaba en el bolsillo todo el día; el efecto fue que millones de personas, incluidas muchas familias colombianas sin computador en casa, entraron a internet por primera vez desde un celular, no desde un escritorio.",
    preguntas: [
      {
        pregunta: "¿Por qué el celular masificó el acceso a internet más que el computador de escritorio?",
        opciones: [
          { texto: "Porque resultaba mucho más barato de fabricar en serie.", correcta: false },
          { texto: "Porque la gente ya lo llevaba siempre consigo.", correcta: true },
          { texto: "Porque solamente servía para hacer llamadas y mensajes.", correcta: false },
          { texto: "Porque los computadores dejaron de fabricarse por completo.", correcta: false },
        ],
        feedbackCorrecto: "Correcto. El celular acompañaba a las personas a todas partes y permitió entrar a internet sin computador en casa.",
        pistas: [
          "Piensa en qué tenía la gente ya en el bolsillo, incluso sin computador.",
          "No se trata del precio de fabricación ni de que solo sirva para llamar. Piensa en la disponibilidad constante del dispositivo.",
        ],
      },
      {
        pregunta: "¿Qué relación hay entre el internet móvil y la desigualdad de acceso a internet?",
        opciones: [
          { texto: "Redujo la brecha porque no requiere computador en casa.", correcta: true },
          { texto: "Aumentó la brecha porque los celulares son más caros.", correcta: false },
          { texto: "No tuvo ninguna relación con el acceso a internet.", correcta: false },
          { texto: "Eliminó por completo la necesidad de tener electricidad.", correcta: false },
        ],
        feedbackCorrecto: "Así es. Al no requerir un computador en casa, el celular redujo la brecha de acceso a internet.",
        pistas: [
          "Piensa en quién puede pagar un celular frente a quién puede pagar un computador de escritorio en casa.",
          "La clave es que el celular no depende de tener computador propio para conectarse a internet.",
        ],
      },
    ],
  },
  4: {
    etiqueta: "El feed",
    corto: "publicar y compartir",
    anioRuta: "hoy",
    // Resumen corto tal como aparece en la tarjeta del mapa.
    resumenMapa: "Las plataformas hicieron de cada persona una posible creadora y distribuidora de información.",
    anio: "2000s a hoy",
    titulo: "Auge de plataformas y redes sociales",
    resumen: "Las plataformas hicieron de cada persona una posible creadora y distribuidora de información.",
    causa: "Cualquier persona con celular pudo publicar sin pasar por un periódico o una radio, y la información empezó a circular de vecino a vecino.",
    imagen: "assets/img/hito-4.jpg",
    imagenAlt: "Grupo de personas en un taller comunitario, sentadas con celulares y portátiles, compartiendo información",
    credito: "Imagen \"ISPMESM,AurangabadWksp5.jpg\" (2017), de la categoría Marathi Wikipedia Workshops in Maharashtra en Wikimedia Commons, con licencia CC BY-SA 4.0.",
    audio: "assets/audio/hito-4.mp3",
    transcripcion: "Con el internet móvil ya masificado, aplicaciones como Facebook y WhatsApp se volvieron el canal principal para compartir noticias, avisos comunitarios y hasta ventas locales, en ciudades como Montería. La causa fue que cualquier persona con un celular podía publicar sin pasar por un periódico o una radio; el efecto fue que la información dejó de fluir solo de arriba hacia abajo, desde medios oficiales, y empezó a circular horizontalmente, de vecino a vecino.",
    preguntas: [
      {
        pregunta: "¿Qué cambió en la forma de circular la información con estas plataformas?",
        opciones: [
          { texto: "Solo los medios oficiales podían seguir publicando noticias.", correcta: false },
          { texto: "La información empezó a circular de persona a persona.", correcta: true },
          { texto: "La televisión dejó de existir por completo ese año.", correcta: false },
          { texto: "Los periódicos aumentaron su circulación en papel impreso.", correcta: false },
        ],
        feedbackCorrecto: "Así es. Las plataformas permitieron que la información circulara de persona a persona, además de los medios oficiales.",
        pistas: [
          "¿Quién puede publicar ahora que antes no podía?",
          "No es que dejaran de existir los medios oficiales. Piensa en qué nueva dirección empezó a fluir la información.",
        ],
      },
      {
        pregunta: "¿Por qué el ejemplo de WhatsApp y Facebook en Montería muestra un cambio real?",
        opciones: [
          { texto: "Porque cualquier persona puede compartir avisos sin medio oficial.", correcta: true },
          { texto: "Porque el gobierno empezó a regular esas aplicaciones.", correcta: false },
          { texto: "Porque dejaron de existir los periódicos en la ciudad.", correcta: false },
          { texto: "Porque solo las empresas grandes pueden usar esas aplicaciones.", correcta: false },
        ],
        feedbackCorrecto: "Correcto. Cualquier persona común puede compartir avisos sin depender de un medio oficial.",
        pistas: [
          "Piensa en quién puede publicar ahora un aviso, comparado con antes de estas plataformas.",
          "No es sobre regulación ni sobre empresas grandes. Es sobre que cualquier persona común puede compartir información.",
        ],
      },
    ],
  },
};

// Banco de 3 pares (6 transformaciones en total). Cada intento del recorrido
// usa SOLO un par —dos transformaciones—, como exige la evidencia del reto
// (RED-1011-N-25): "conecta cuatro hitos informáticos con dos transformaciones
// sociales". El par activo rota cada vez que se reinicia el recorrido, para
// que reintentar no sea memorizar las mismas dos respuestas.
const TRANSFORMACIONES_POOL = [
  {
    1: {
      texto: "La información dejó de depender de un único lugar o computador central.",
      hitoCorrecto: 1,
      pistas: [
        "Piensa en qué hito hizo que la red no dependiera de un único lugar.",
        "No es sobre WhatsApp ni sobre la Web. Es sobre el diseño original que evitó un punto único de fallo.",
      ],
    },
    2: {
      texto: "La información empezó a circular de persona a persona, no solo desde medios oficiales.",
      hitoCorrecto: 4,
      pistas: [
        "Piensa en qué hito le dio a cualquier persona común la posibilidad de publicar sin pasar por un medio oficial.",
        "No es la Web en sí ni el internet móvil por separado. Es el auge de las plataformas y redes sociales.",
      ],
    },
  },
  {
    1: {
      texto: "Cualquier persona pudo empezar a navegar y publicar información sin ser experta en programación.",
      hitoCorrecto: 2,
      pistas: [
        "Piensa en qué hito hizo posible navegar con un clic, sin escribir comandos técnicos.",
        "No es sobre redes móviles ni plataformas. Es sobre el invento que volvió visual y accesible la navegación.",
      ],
    },
    2: {
      texto: "El acceso a internet dejó de depender de tener un computador en casa.",
      hitoCorrecto: 3,
      pistas: [
        "Piensa en qué hito puso la conexión en un dispositivo que la gente ya llevaba consigo.",
        "No es la Web ni las plataformas. Es la masificación de un dispositivo portátil.",
      ],
    },
  },
  {
    1: {
      texto: "Estar conectado dejó de ser algo que pasaba solo frente a un escritorio, en un lugar fijo.",
      hitoCorrecto: 3,
      pistas: [
        "Piensa en qué hito quitó la necesidad de un lugar fijo para conectarse.",
        "No es sobre quién publica, sino sobre dónde y cuándo se puede estar conectado.",
      ],
    },
    2: {
      texto: "Compartir una noticia o un aviso dejó de requerir pasar por un medio de comunicación oficial.",
      hitoCorrecto: 4,
      pistas: [
        "Piensa en qué hito le dio a cualquier persona un canal propio para publicar.",
        "No es la Web en general. Es el auge específico de las plataformas y redes sociales.",
      ],
    },
  },
];


const BLOQUES_ESTRATEGIA = [
  { id: "prohibir", texto: "Prohibir totalmente el uso del celular durante la jornada escolar" },
  { id: "acuerdos", texto: "Permitir el uso educativo del celular con acuerdos claros de convivencia digital" },
  { id: "bloquear-redes", texto: "Bloquear solo las redes sociales, permitir mensajería para emergencias" },
  { id: "libre", texto: "Permitir el uso libre del celular, sin ninguna regla" },
];

const BLOQUES_JUSTIFICACION = [
  { id: "j-prohibir", triplet: "prohibir", texto: "Reduce al máximo el riesgo de que circule contenido dañino o sin verificar durante la jornada." },
  { id: "j-acuerdos", triplet: "acuerdos", texto: "Reconoce que los estudiantes ya usan estas herramientas y prepara para un uso responsable en vez de solo restringirlo." },
  { id: "j-bloquear", triplet: "bloquear-redes", texto: "Distingue entre comunicación necesaria y el consumo de contenido de plataformas, que es donde está el mayor riesgo." },
  { id: "j-d1", triplet: null, texto: "Elimina cualquier posibilidad de que ocurra un problema, sin importar el costo." },
  { id: "j-d2", triplet: null, texto: "Da libertad total, sin ningún acompañamiento, porque los estudiantes ya saben usar la tecnología." },
];

const BLOQUES_EVIDENCIA = [
  { id: "e-prohibir", triplet: "prohibir", texto: "Las plataformas permiten que cualquier persona publique sin pasar por un medio oficial, sin verificación previa." },
  { id: "e-acuerdos", triplet: "acuerdos", texto: "El internet móvil masificó el acceso incluso para quienes no tienen computador en casa, así que acompañar su uso llega a más estudiantes que prohibirlo." },
  { id: "e-bloquear", triplet: "bloquear-redes", texto: "El internet móvil hizo posible la comunicación inmediata, algo distinto de la circulación de contenido que trajo el auge de las plataformas." },
  { id: "e-d1", triplet: null, texto: "ARPANET fue diseñada en 1969 para que ningún nodo fuera indispensable." },
  { id: "e-d2", triplet: null, texto: "La Web permitió que cualquier persona publicara sin saber programar, desde 1989." },
];


