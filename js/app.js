/* ==========================================================================
   De ARPANET al feed · RED-1011-N-25
   LÓGICA DEL RECURSO — navegación, preguntas, actividad, producto final,
   nota, envío automático del resultado, reporte, panel docente y progreso.
   Requiere js/data.js (HITOS, TRANSFORMACIONES_POOL, BLOQUES_*, CONSIGNAS).
   ========================================================================== */
"use strict";

function elegirParAleatorio(evitar) {
  if (TRANSFORMACIONES_POOL.length <= 1) return 0;
  let indice;
  do {
    indice = Math.floor(Math.random() * TRANSFORMACIONES_POOL.length);
  } while (indice === evitar);
  return indice;
}

function transformacionesActuales() {
  return TRANSFORMACIONES_POOL[estado.parIndex];
}

// ============================================================
// ESTADO
// ============================================================
// ============================================================
// PRODUCTO FINAL — "Diseña tu recomendación"
// Constructor de argumento por bloques: Estrategia + Justificación
// + Evidencia, arrastrados (o seleccionados y colocados) desde una
// banda mezclada. Coherente solo si los tres bloques pertenecen al
// mismo argumento; el resto son distractores.
// ============================================================

const estado = {
  explorados: new Set(),
  hitoActual: null,
  preguntaActual: null,
  intentosPregunta: {},
  // Opciones incorrectas ya contadas por hito (clave "variante:texto"), para
  // no sumar dos veces el mismo error.
  opcionesFallidas: {},
  // Variante de pregunta con la que se resolvió cada hito.
  varianteResuelta: {},
  intentosTransformacion: { 1: 0, 2: 0 },
  actividadPoblada: false,
  parIndex: elegirParAleatorio(),
  resultadoFinal: [],
  propuestaEstrategia: null,
  // Errores del producto final, separados por criterio de la rúbrica:
  // Aplicación (estrategia + justificación) y Argumentación (evidencia).
  intentosPropuesta: 0,
  erroresAplicacion: 0,
  erroresArgumentacion: 0,
  propuestaValidada: null,
  propuestaOmitida: false,
  nombreEstudiante: "",
  grado: "",
  // Explicaciones escritas del estudiante (no cambian la nota automática).
  explicaciones: { hito: {}, actividad: "", propuesta: "" },
  // Resultado del PRIMER recorrido completo (se fija y se envía a la docente al
  // llegar al cierre por primera vez); "Recorrer de nuevo" no lo borra.
  primerResultado: null,
  recorridoRepetido: false,
  pantalla: "screen-bienvenida",
};

function anunciar(mensaje) {
  document.getElementById("anuncio").textContent = mensaje;
}

// Escapa texto antes de interpolarlo en innerHTML o en el reporte HTML.
function escaparHTML(valor) {
  return String(valor == null ? "" : valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================
// GUARDADO DEL PROGRESO (localStorage). Si el navegador no permite
// guardar, el recurso sigue funcionando sin persistencia.
// ============================================================
// v2: añade grado y explicaciones escritas (por eso cambia la clave).
const PROGRESO_KEY = "red1011n25_progreso_v2";

function guardarProgreso() {
  if (typeof restaurandoProgreso !== "undefined" && restaurandoProgreso) return;
  try {
    const datos = {
      v: 2,
      nombre: estado.nombreEstudiante,
      grado: estado.grado,
      explicaciones: estado.explicaciones,
      explorados: Array.from(estado.explorados),
      intentosPregunta: estado.intentosPregunta,
      opcionesFallidas: estado.opcionesFallidas,
      varianteResuelta: estado.varianteResuelta,
      intentosTransformacion: estado.intentosTransformacion,
      parIndex: estado.parIndex,
      seleccionesActividad: leerSeleccionesActividad(),
      resultadoFinal: estado.resultadoFinal,
      intentosPropuesta: estado.intentosPropuesta,
      erroresAplicacion: estado.erroresAplicacion,
      erroresArgumentacion: estado.erroresArgumentacion,
      propuestaValidada: estado.propuestaValidada,
      propuestaOmitida: estado.propuestaOmitida,
      primerResultado: estado.primerResultado,
      recorridoRepetido: estado.recorridoRepetido,
      pantalla: estado.pantalla,
    };
    localStorage.setItem(PROGRESO_KEY, JSON.stringify(datos));
  } catch (e) { /* sin almacenamiento: se continúa sin guardar */ }
}

function borrarProgreso() {
  try { localStorage.removeItem(PROGRESO_KEY); } catch (e) { /* nada */ }
}

function leerProgreso() {
  try {
    const datos = JSON.parse(localStorage.getItem(PROGRESO_KEY) || "null");
    return datos && typeof datos === "object" ? datos : null;
  } catch (e) {
    return null;
  }
}

function leerSeleccionesActividad() {
  const sel = {};
  document.querySelectorAll("#match-board .match-select").forEach((s) => { sel[s.dataset.transformacion] = s.value; });
  return sel;
}

// ============================================================
// NOMBRE DEL ESTUDIANTE
// Acepta letras, espacios, guion y apóstrofo (María-José, D'Angelo) e
// iniciales de una letra con o sin punto (Juan D. Pérez). Exige al menos
// 2 palabras de 2 o más letras.
// ============================================================
const LETRA = "A-Za-zÀ-ÖØ-öø-ÿ";
const RE_PALABRA_NOMBRE = new RegExp(`^[${LETRA}]+(?:['’\\-][${LETRA}]+)*$`);
const RE_INICIAL = new RegExp(`^[${LETRA}]\\.?$`);

function evaluarNombre(crudo) {
  const texto = crudo.trim();
  if (!texto) return { valido: false, motivo: "" };
  if (!new RegExp(`^[${LETRA}\\s'’.\\-]*$`).test(texto)) {
    return { valido: false, motivo: "Usa solo letras, espacios, guion (-) o apóstrofo ('), sin números ni otros signos." };
  }
  const palabras = texto.split(/\s+/).filter(Boolean);
  const malFormada = palabras.find((p) => !RE_INICIAL.test(p) && !RE_PALABRA_NOMBRE.test(p));
  if (malFormada) {
    return { valido: false, motivo: `Revisa "${malFormada}": el guion y el apóstrofo van entre letras, y el punto solo después de una inicial (ej.: Juan D. Pérez).` };
  }
  const largas = palabras.filter((p) => p.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "").length >= 2);
  if (largas.length < 2) {
    return { valido: false, motivo: "Escribe nombre y apellido (al menos 2 palabras de 2 letras o más)." };
  }
  return { valido: true, motivo: "", nombre: palabras.join(" ") };
}

function aplicarNombre(crudo) {
  const r = evaluarNombre(crudo);
  const ayuda = document.getElementById("nombre-ayuda");
  if (!r.valido && r.motivo) {
    ayuda.textContent = r.motivo;
    ayuda.hidden = false;
  } else {
    ayuda.hidden = true;
  }
  actualizarBotonInicio();
  if (r.valido) {
    estado.nombreEstudiante = r.nombre;
    const chip = document.getElementById("chip-estudiante");
    chip.textContent = estado.nombreEstudiante;
    chip.hidden = false;
    guardarProgreso();
  }
  return r.valido;
}

document.getElementById("input-nombre").addEventListener("input", (e) => aplicarNombre(e.target.value));

// ============================================================
// NAVEGACIÓN — mueve el foco al título de la pantalla destino
// ============================================================
function mostrarPantalla(id, mensaje) {
  // Cualquier cambio de pantalla detiene el audio del hito si estaba sonando,
  // para que nunca siga en segundo plano ni se superponga con otro clip.
  const audioHito = document.getElementById("hito-audio");
  if (audioHito && !audioHito.paused) {
    audioHito.pause();
  }
  document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
  document.body.dataset.screen = id;
  const pagina = document.querySelector(`#${id} .page`);
  if (pagina) {
    pagina.classList.remove("anim-in");
    void pagina.offsetWidth; // reinicia la animación de entrada
    pagina.classList.add("anim-in");
  }
  const titulo = document.querySelector(`#${id} h1[tabindex="-1"]`);
  if (titulo) window.setTimeout(() => titulo.focus(), 30);
  if (mensaje) anunciar(mensaje);
  document.getElementById("main").scrollIntoView({ block: "start" });
  if (id !== "screen-docente") {
    estado.pantalla = id;
    guardarProgreso();
  }
  actualizarRail();
}

// ============================================================
// MAPA
// ============================================================
function actualizarMapa() {
  const n = estado.explorados.size;
  document.getElementById("progreso-texto").textContent = `${String(n).padStart(2, "0")} / 04 explorados`;
  document.getElementById("progreso-barra").style.transform = `scaleX(${n / 4})`;
  const titulo = document.getElementById("mapa-mensaje-titulo");
  titulo.textContent = n === 4 ? "Mapa completo." : `Faltan ${4 - n} hito${4 - n === 1 ? "" : "s"} por explorar.`;
  document.querySelector('[data-action="go-actividad"]').disabled = n < 4;
  const ayuda = document.getElementById("actividad-ayuda");
  if (ayuda) ayuda.hidden = n === 4;
  actualizarRail();
}

function barajar(array) {
  const copia = array.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function abrirHito(numero) {
  const h = HITOS[numero];
  estado.hitoActual = numero;
  estado.intentosPregunta[numero] = estado.intentosPregunta[numero] || 0;

  document.getElementById("hito-paso").textContent = `HITO ${String(numero).padStart(2, "0")} / 04`;
  document.getElementById("hito-anio").textContent = h.anio;
  document.getElementById("titulo-hito").textContent = h.titulo;
  document.getElementById("hito-resumen").textContent = h.resumen;
  document.getElementById("hito-causa").textContent = h.causa;

  const notaEjemplo = document.getElementById("hito-ejemplo-nota");
  notaEjemplo.hidden = numero !== 1;

  const img = document.getElementById("hito-imagen");
  img.src = h.imagen; img.alt = h.imagenAlt;
  img.closest("figure").dataset.hito = String(numero);
  document.getElementById("hito-credito").textContent = h.credito;

  const audio = document.getElementById("hito-audio");
  audio.src = h.audio; audio.currentTime = 0;
  document.getElementById("audio-progress-fill").style.transform = "scaleX(0)";
  document.getElementById("audio-estado").textContent = "Narración corta";
  document.getElementById("audio-detalle").textContent = "también puedes leer la transcripción";
  document.querySelector('[data-action="play-audio"]').setAttribute("aria-pressed", "false");
  document.querySelector('[data-action="replay-audio"]').hidden = true;
  document.getElementById("hito-transcripcion").textContent = h.transcripcion;

  // Cada hito tiene un pequeño banco de preguntas: se elige una al azar en
  // cada apertura, para que no sea siempre la misma (evita memorizar/copiar).
  // Si el hito ya se resolvió, se muestra la misma pregunta ya resuelta (sin
  // posibilidad de sumar errores al reabrirlo).
  // "Respondido" = acertó la pregunta; "explorado" = además guardó su explicación.
  const yaResuelto = Number.isInteger(estado.varianteResuelta[numero]);
  let indiceVariante = yaResuelto && Number.isInteger(estado.varianteResuelta[numero])
    ? estado.varianteResuelta[numero]
    : Math.floor(Math.random() * h.preguntas.length);
  if (!h.preguntas[indiceVariante]) indiceVariante = 0;
  const variante = h.preguntas[indiceVariante];
  estado.preguntaActual = variante;
  estado.indiceVarianteActual = indiceVariante;

  document.getElementById("hito-pregunta-texto").textContent = variante.pregunta;
  const opcionesWrap = document.getElementById("hito-opciones");
  opcionesWrap.innerHTML = "";
  // Se baraja una copia en cada apertura: la posición de la respuesta correcta
  // no debe ser memorizable (ni siempre B, ni la misma tras reiniciar).
  const opcionesBarajadas = barajar(variante.opciones);
  estado.opcionesMostradas = opcionesBarajadas;
  opcionesBarajadas.forEach((op, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-option";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.dataset.index = i;
    btn.innerHTML = `<span class="answer-mark" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span>${escaparHTML(op.texto)}</span>`;
    btn.addEventListener("click", () => responderPregunta(numero, i));
    opcionesWrap.appendChild(btn);
  });
  document.getElementById("hito-feedback").innerHTML = "";

  if (yaResuelto) {
    opcionesBarajadas.forEach((op, i) => {
      if (op.correcta) {
        const b = opcionesWrap.querySelector(`[data-index="${i}"]`);
        b.classList.add("is-correcta");
        b.setAttribute("aria-checked", "true");
      }
    });
    bloquearOpcionesHito();
    document.getElementById("hito-feedback").innerHTML = `<p class="fb-correcta">Ya resolviste este hito. ${escaparHTML(variante.feedbackCorrecto)}</p>`;
  }
  prepararExplicacion("hito", yaResuelto, estado.explicaciones.hito[numero] || "");

  mostrarPantalla("screen-hito", `Hito ${numero}: ${h.titulo}.${yaResuelto ? " Ya resuelto." : ""}`);
}

function bloquearOpcionesHito() {
  document.querySelectorAll("#hito-opciones .answer-option").forEach((b) => {
    b.disabled = true;
    b.setAttribute("aria-disabled", "true");
  });
}

function responderPregunta(numero, indice) {
  const variante = estado.preguntaActual;
  const opcionesWrap = document.getElementById("hito-opciones");
  const elegido = opcionesWrap.querySelector(`[data-index="${indice}"]`);
  // Tras acertar (o en un hito ya resuelto) las opciones quedan bloqueadas.
  if (!elegido || elegido.disabled || Number.isInteger(estado.varianteResuelta[numero])) return;
  opcionesWrap.querySelectorAll(".answer-option").forEach((b) => {
    b.classList.remove("is-correcta", "is-incorrecta", "is-shake");
    b.setAttribute("aria-checked", "false");
  });
  const btn = opcionesWrap.querySelector(`[data-index="${indice}"]`);
  btn.setAttribute("aria-checked", "true");
  const feedback = document.getElementById("hito-feedback");

  if (estado.opcionesMostradas[indice].correcta) {
    btn.classList.add("is-correcta");
    feedback.innerHTML = `<p class="fb-correcta">Respuesta correcta. ${escaparHTML(variante.feedbackCorrecto)}</p>`;
    bloquearOpcionesHito();
    // El hito queda "explorado" cuando el estudiante guarda su explicación escrita.
    estado.varianteResuelta[numero] = estado.indiceVarianteActual;
    prepararExplicacion("hito", true, estado.explicaciones.hito[numero] || "", true);
    anunciar("Respuesta correcta. Ahora explica con tus palabras la causa y el efecto de este hito.");
  } else {
    btn.classList.add("is-incorrecta", "is-shake");
    btn.addEventListener("animationend", () => btn.classList.remove("is-shake"), { once: true });
    // La misma opción incorrecta solo se cuenta una vez.
    const clave = `${estado.indiceVarianteActual}:${estado.opcionesMostradas[indice].texto}`;
    const fallidas = estado.opcionesFallidas[numero] || (estado.opcionesFallidas[numero] = []);
    const nivel = Math.min(estado.intentosPregunta[numero], variante.pistas.length - 1);
    if (!fallidas.includes(clave)) {
      fallidas.push(clave);
      estado.intentosPregunta[numero] += 1;
    }
    feedback.innerHTML = `<p class="fb-incorrecta">Aún no. ${escaparHTML(variante.pistas[nivel])}</p>`;
  }
  guardarProgreso();
}

function marcarTarjetaExplorada(numero) {
  const card = document.querySelector(`.milestone-card[data-hito="${numero}"]`);
  if (!card) return;
  card.dataset.explorado = "true";
  card.querySelector(".node-state").textContent = "Explorado";
}

// ============================================================
// AUDIO REAL — progreso real por tiempo, pregunta no depende del audio
// (el estudiante puede leer la transcripción sin escuchar)
// ============================================================
function inicializarAudio() {
  const audio = document.getElementById("hito-audio");
  const btn = document.querySelector('[data-action="play-audio"]');
  const estadoTxt = document.getElementById("audio-estado");
  const detalle = document.getElementById("audio-detalle");
  const fill = document.getElementById("audio-progress-fill");
  const replay = document.querySelector('[data-action="replay-audio"]');

  btn.addEventListener("click", () => {
    if (!audio.src) return;
    if (audio.ended) { audio.currentTime = 0; }
    if (audio.paused) {
      audio.play().catch(() => anunciar("No se pudo reproducir el audio. Intenta de nuevo o recarga la página."));
    } else {
      audio.pause();
    }
  });
  replay.addEventListener("click", () => { audio.currentTime = 0; audio.play(); });

  audio.addEventListener("play", () => { btn.setAttribute("aria-pressed", "true"); estadoTxt.textContent = "Reproduciendo…"; });
  audio.addEventListener("pause", () => { if (!audio.ended) { btn.setAttribute("aria-pressed", "false"); estadoTxt.textContent = "Narración pausada"; } });
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    fill.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
  });
  audio.addEventListener("ended", () => {
    btn.setAttribute("aria-pressed", "false");
    estadoTxt.textContent = "Narración completa"; detalle.textContent = "puedes repetirla o leer la transcripción";
    fill.style.transform = "scaleX(1)"; replay.hidden = false;
  });
}

// ============================================================
// ACTIVIDAD FINAL
// ============================================================
function poblarActividad() {
  if (estado.actividadPoblada) return;
  const wrap = document.getElementById("match-board");
  wrap.innerHTML = "";
  Object.entries(transformacionesActuales()).forEach(([id, t], i) => {
    const row = document.createElement("div");
    row.className = "match-row";
    row.dataset.transformacion = id;
    row.innerHTML = `
      <span class="match-num">${String(i + 1).padStart(2, "0")}</span>
      <span class="match-milestone">${escaparHTML(t.texto)}</span>
      <div>
        <label class="sr-only" for="select-t${id}">Hito que explica esta transformación</label>
        <select class="match-select" id="select-t${id}" data-transformacion="${id}">
          <option value="">Elige un hito</option>
          ${Object.entries(HITOS).map(([n, h]) => `<option value="${n}">${escaparHTML(h.titulo)}</option>`).join("")}
        </select>
        <span class="match-status" id="status-t${id}"></span>
      </div>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll(".match-select").forEach((sel) => sel.addEventListener("change", () => { actualizarBotonComprobar(); guardarProgreso(); }));
  estado.actividadPoblada = true;
}

function actualizarBotonComprobar() {
  const todasElegidas = Object.keys(transformacionesActuales()).every((id) => document.getElementById(`select-t${id}`).value !== "");
  document.getElementById("btn-comprobar").disabled = !todasElegidas;
}

function validarActividad() {
  let todasCorrectas = true;
  const evidencia = [];
  const pistasErrores = [];
  Object.entries(transformacionesActuales()).forEach(([id, t]) => {
    const sel = document.getElementById(`select-t${id}`);
    const row = sel.closest(".match-row");
    const status = document.getElementById(`status-t${id}`);
    const correcta = Number(sel.value) === t.hitoCorrecto;
    row.classList.remove("row-correct", "row-wrong");
    if (correcta) {
      row.classList.add("row-correct");
      status.textContent = "Correcto";
      evidencia.push({ transformacion: t.texto, hito: HITOS[t.hitoCorrecto].titulo, causa: HITOS[t.hitoCorrecto].causa });
    } else {
      row.classList.add("row-wrong");
      const nivel = Math.min(estado.intentosTransformacion[id], t.pistas.length - 1);
      estado.intentosTransformacion[id] += 1;
      status.textContent = `Revisa esta relación. ${t.pistas[nivel]}`;
      pistasErrores.push({ num: Object.keys(transformacionesActuales()).indexOf(id) + 1, texto: t.texto, pista: t.pistas[nivel] });
      todasCorrectas = false;
    }
  });

  const resultado = document.getElementById("resultado-actividad");
  resultado.className = todasCorrectas ? "success" : "retry";
  resultado.innerHTML = todasCorrectas
    ? `<p>La cadena tiene sentido. De una red resistente a un feed veloz: cada avance abrió una manera distinta de hacer circular la información.</p>`
    : `<p>Hay una relación por revisar. La respuesta correcta distingue la tecnología que hizo posible el cambio del cambio social que vino después.</p>
       <ul class="retro-pistas">${pistasErrores.map((e) => `<li><strong>Relación ${String(e.num).padStart(2, "0")}: ${escaparHTML(e.texto)}</strong><br>Pista: ${escaparHTML(e.pista)}</li>`).join("")}</ul>`;

  prepararExplicacion("actividad", todasCorrectas, estado.explicaciones.actividad, todasCorrectas);
  document.getElementById("btn-resumen").disabled = !(todasCorrectas && explicacionValida("actividad"));
  if (todasCorrectas) estado.resultadoFinal = evidencia;
  guardarProgreso();

  mostrarPantalla("screen-retro", todasCorrectas ? "Actividad resuelta. Las dos relaciones son correctas." : "Hay relaciones por revisar. Cada fila muestra una pista.");
}

function reintentarActividad() {
  mostrarPantalla("screen-actividad", "De vuelta a la actividad. Ajusta la relación marcada en rojo.");
}

// ============================================================
// PRODUCTO FINAL — Constructor de argumento por bloques
// ============================================================
let propuestaPoblada = false;
let ranurasConEventos = false;
let bloqueSeleccionado = null; // referencia al <button> de la banda actualmente seleccionado (modo clic/teclado)

function crearBloque(tipo, datos) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `bloque bloque--${tipo}`;
  btn.draggable = true;
  btn.dataset.tipo = tipo;
  btn.dataset.id = datos.id;
  btn.dataset.triplet = tipo === "estrategia" ? datos.id : (datos.triplet || "");
  btn.textContent = datos.texto;
  btn.setAttribute("aria-label", `Bloque de ${tipo}: ${datos.texto}`);

  btn.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", datos.id);
    e.dataTransfer.effectAllowed = "move";
    btn.classList.add("is-dragging");
  });
  btn.addEventListener("dragend", () => btn.classList.remove("is-dragging"));

  btn.addEventListener("click", () => {
    // Si el bloque ya está colocado en una ranura, no se "selecciona" de nuevo —
    // se deja que el clic le llegue a la ranura, que lo devuelve a la banda.
    if (btn.closest(".ranura")) return;

    if (bloqueSeleccionado === btn) {
      btn.classList.remove("is-seleccionado");
      bloqueSeleccionado = null;
      anunciar("Bloque deseleccionado.");
      return;
    }
    if (bloqueSeleccionado) bloqueSeleccionado.classList.remove("is-seleccionado");
    bloqueSeleccionado = btn;
    btn.classList.add("is-seleccionado");
    anunciar(`Bloque de ${tipo} seleccionado. Ahora toca la ranura donde va.`);
  });

  return btn;
}

function poblarPropuesta() {
  if (propuestaPoblada) return;

  const banda = document.getElementById("banda-bloques");
  banda.innerHTML = "";
  const todos = [
    ...barajar(BLOQUES_ESTRATEGIA).map((d) => ["estrategia", d]),
    ...barajar(BLOQUES_JUSTIFICACION).map((d) => ["justificacion", d]),
    ...barajar(BLOQUES_EVIDENCIA).map((d) => ["evidencia", d]),
  ];
  barajar(todos).forEach(([tipo, datos]) => banda.appendChild(crearBloque(tipo, datos)));

  propuestaPoblada = true;
  // Los eventos de las ranuras se registran una sola vez: si se volvieran a
  // registrar tras "Recorrer de nuevo", cada clic colocaría y devolvería el bloque.
  if (ranurasConEventos) return;
  ranurasConEventos = true;
  document.querySelectorAll(".ranura").forEach((ranura) => {
    ranura.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      ranura.classList.add("drag-over");
    });
    ranura.addEventListener("dragleave", () => ranura.classList.remove("drag-over"));
    ranura.addEventListener("drop", (e) => {
      e.preventDefault();
      ranura.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const bloque = document.querySelector(`.bloque[data-id="${id}"]`);
      if (bloque) colocarBloque(bloque, ranura);
    });
    ranura.addEventListener("click", () => {
      const bloqueDentro = ranura.querySelector(".bloque");
      if (bloqueDentro) {
        devolverBloqueABanda(bloqueDentro);
        return;
      }
      if (bloqueSeleccionado) {
        colocarBloque(bloqueSeleccionado, ranura);
      }
    });
    ranura.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        ranura.click();
      }
    });
  });

  propuestaPoblada = true;
}

function colocarBloque(bloque, ranura) {
  if (bloque.dataset.tipo !== ranura.dataset.tipo) {
    anunciar(`Ese bloque no es de tipo ${ranura.dataset.tipo}.`);
    return;
  }
  // Si la ranura ya tenía otro bloque, lo devuelve a la banda primero.
  const yaHabia = ranura.querySelector(".bloque");
  if (yaHabia) devolverBloqueABanda(yaHabia);

  bloque.classList.remove("is-seleccionado", "es-correcta", "es-incorrecta");
  ranura.classList.add("tiene-bloque");
  ranura.querySelector(".ranura-contenido").textContent = "";
  ranura.appendChild(bloque);
  bloque.classList.remove("is-encajando");
  void bloque.offsetWidth;
  bloque.classList.add("is-encajando");
  bloque.addEventListener("animationend", () => bloque.classList.remove("is-encajando"), { once: true });
  ranura.setAttribute("aria-label", `Ranura de ${ranura.dataset.tipo}, con un bloque colocado`);
  bloqueSeleccionado = null;
  anunciar(`Bloque colocado en ${ranura.dataset.tipo}.`);
  actualizarBotonPropuesta();
}

function devolverBloqueABanda(bloque) {
  const ranura = bloque.closest(".ranura");
  if (ranura) {
    ranura.classList.remove("tiene-bloque", "es-correcta", "es-incorrecta");
    ranura.querySelector(".ranura-contenido").textContent = `Arrastra o toca un bloque ${ranura.dataset.tipo === "estrategia" ? "rosa" : ranura.dataset.tipo === "justificacion" ? "azul" : "lila"}`;
    ranura.setAttribute("aria-label", `Ranura de ${ranura.dataset.tipo}, vacía`);
  }
  bloque.classList.remove("es-correcta", "es-incorrecta", "is-seleccionado");
  if (bloqueSeleccionado === bloque) bloqueSeleccionado = null;
  document.getElementById("banda-bloques").appendChild(bloque);
  actualizarBotonPropuesta();
}

function actualizarBotonPropuesta() {
  const llenas = document.querySelectorAll(".ranura.tiene-bloque").length;
  document.getElementById("btn-comprobar-propuesta").disabled = llenas < 3;
}

function validarPropuesta() {
  const rEstrategia = document.getElementById("ranura-estrategia").querySelector(".bloque");
  const rJustificacion = document.getElementById("ranura-justificacion").querySelector(".bloque");
  const rEvidencia = document.getElementById("ranura-evidencia").querySelector(".bloque");
  if (!rEstrategia || !rJustificacion || !rEvidencia) return;

  const bloques = [
    { el: rEstrategia, id: rEstrategia.dataset.triplet, nombre: "la estrategia" },
    { el: rJustificacion, id: rJustificacion.dataset.triplet, nombre: "la justificación" },
    { el: rEvidencia, id: rEvidencia.dataset.triplet, nombre: "la evidencia" },
  ];

  const idEstrategia = rEstrategia.dataset.triplet;
  const esCorrecta = idEstrategia && rJustificacion.dataset.triplet === idEstrategia && rEvidencia.dataset.triplet === idEstrategia;

  const resultado = document.getElementById("propuesta-resultado");

  if (esCorrecta) {
    bloques.forEach((b) => { b.el.classList.remove("es-correcta", "es-incorrecta"); b.el.classList.add("es-correcta"); });
    document.querySelectorAll(".ranura").forEach((r) => {
      r.classList.remove("es-correcta", "es-incorrecta");
      if (r.querySelector(".bloque")) r.classList.add("es-correcta");
    });
    resultado.innerHTML = `<p class="fb-correcta">Los tres bloques encajan: la estrategia, el porqué y la evidencia se respaldan entre sí.</p>`;
    estado.propuestaValidada = {
      estrategia: rEstrategia.textContent, justificacion: rJustificacion.textContent, evidencia: rEvidencia.textContent,
      ids: { estrategia: rEstrategia.dataset.id, justificacion: rJustificacion.dataset.id, evidencia: rEvidencia.dataset.id },
    };
    estado.propuestaOmitida = false;
  } else {
    estado.intentosPropuesta += 1;
    // Rúbrica: Aplicación = elegir una estrategia viable y justificarla
    // (estrategia + justificación coherentes); Argumentación = respaldarla
    // con la evidencia correcta.
    const estrategiaViable = BLOQUES_JUSTIFICACION.some((j) => j.triplet === idEstrategia);
    if (!estrategiaViable || rJustificacion.dataset.triplet !== idEstrategia) estado.erroresAplicacion += 1;
    if (!estrategiaViable || rEvidencia.dataset.triplet !== idEstrategia) estado.erroresArgumentacion += 1;

    // En vez de marcar los tres bloques en rojo por igual, se busca si dos
    // de ellos sí comparten el mismo argumento (triplet): esos se marcan en
    // verde y el que sobra se marca en rojo, para que sea claro cuál de los
    // tres bloques es el que no corresponde. Si ninguno coincide entre sí,
    // los tres quedan en rojo.
    const conteo = {};
    bloques.forEach((b) => { if (b.id) conteo[b.id] = (conteo[b.id] || 0) + 1; });
    let idMayoria = null;
    Object.entries(conteo).forEach(([id, n]) => { if (n >= 2) idMayoria = id; });

    bloques.forEach((b) => {
      b.el.classList.remove("es-correcta", "es-incorrecta");
      b.el.classList.add(idMayoria && b.id === idMayoria ? "es-correcta" : "es-incorrecta");
    });
    document.querySelectorAll(".ranura").forEach((r) => {
      r.classList.remove("es-correcta", "es-incorrecta");
      const bloqueDentro = r.querySelector(".bloque");
      if (bloqueDentro) r.classList.add(bloqueDentro.classList.contains("es-correcta") ? "es-correcta" : "es-incorrecta");
    });

    let mensaje;
    if (idMayoria) {
      const enGrupo = bloques.filter((b) => b.id === idMayoria).map((b) => b.nombre);
      const fueraGrupo = bloques.filter((b) => b.id !== idMayoria).map((b) => b.nombre);
      const enGrupoTexto = enGrupo.join(" y ");
      const fueraGrupoTexto = fueraGrupo.join(" y ");
      const verbo = fueraGrupo.length > 1 ? "no corresponden" : "no corresponde";
      mensaje = `${enGrupoTexto.charAt(0).toUpperCase() + enGrupoTexto.slice(1)} sí coinciden entre sí (marcadas en verde), pero ${fueraGrupoTexto} ${verbo} a esa misma idea (marcada en rojo). Cambia solo ese bloque por otro que hable exactamente de lo mismo.`;
    } else {
      mensaje = `Ninguno de los tres bloques corresponde entre sí (los tres quedan en rojo). Elige primero una estrategia y luego busca la justificación y la evidencia que hablen exactamente de esa misma idea.`;
    }
    resultado.innerHTML = `<p class="fb-incorrecta">${mensaje}</p>`;
  }

  document.getElementById("btn-comprobar-propuesta").hidden = esCorrecta;
  document.getElementById("btn-reintentar-propuesta").hidden = esCorrecta;
  document.getElementById("btn-ir-cierre").hidden = !esCorrecta;
  prepararExplicacion("propuesta", esCorrecta, estado.explicaciones.propuesta, esCorrecta && !restaurandoProgreso);
  document.getElementById("btn-ir-cierre").disabled = !explicacionValida("propuesta");
  document.getElementById("saltar-ayuda").hidden = esCorrecta;
  anunciar(esCorrecta ? "Recomendación validada." : "La combinación necesita ajuste.");
  guardarProgreso();
}

function reintentarPropuesta() {
  document.querySelectorAll(".ranura .bloque").forEach((b) => devolverBloqueABanda(b));
  document.getElementById("propuesta-resultado").innerHTML = "";
  document.getElementById("btn-comprobar-propuesta").hidden = false;
  document.getElementById("btn-comprobar-propuesta").disabled = true;
  document.getElementById("btn-reintentar-propuesta").hidden = true;
  document.getElementById("saltar-ayuda").hidden = false;
  anunciar("Bloques devueltos a la banda. Vuelve a construir tu argumento.");
}


// ============================================================
// EVALUACIÓN — desempeño y reporte descargable
// ============================================================
function conteosActuales() {
  return {
    pregunta: Object.values(estado.intentosPregunta).reduce((a, b) => a + b, 0),
    transformacion: estado.intentosTransformacion[1] + estado.intentosTransformacion[2],
    aplicacion: estado.erroresAplicacion,
    argumentacion: estado.erroresArgumentacion,
    omitida: !!estado.propuestaOmitida,
  };
}

// La nota usa el resultado del PRIMER recorrido completo, si existe.
function conteosParaNota() {
  return estado.primerResultado ? estado.primerResultado.conteos : conteosActuales();
}

// Escalas de 1.0 a 5.0 por criterio (índice = errores/intentos adicionales).
const ESCALA_COMPRENSION = [5.0, 4.6, 4.3, 4.0, 3.7, 3.4, 3.1, 2.8, 2.5, 2.2, 1.9, 1.5, 1.0];
const ESCALA_ANALISIS = [5.0, 4.3, 3.6, 3.0, 2.3, 1.6, 1.0];
const ESCALA_APLICACION = [5.0, 4.0, 3.0, 2.0, 1.5, 1.0];
const ESCALA_ARGUMENTACION = [5.0, 4.0, 3.0, 2.0, 1.5, 1.0];

function notaEnEscala(escala, errores) {
  return escala[Math.max(0, Math.min(Number(errores) || 0, escala.length - 1))];
}

function calcularNotaDesde(c) {
  const notaComprension = notaEnEscala(ESCALA_COMPRENSION, c.pregunta);
  const notaAnalisis = notaEnEscala(ESCALA_ANALISIS, c.transformacion);
  // Si el estudiante continuó sin completar la recomendación, Aplicación y
  // Argumentación reciben la nota mínima.
  const notaAplicacion = c.omitida ? 1.0 : notaEnEscala(ESCALA_APLICACION, c.aplicacion);
  const notaArgumentacion = c.omitida ? 1.0 : notaEnEscala(ESCALA_ARGUMENTACION, c.argumentacion);

  const promedio = (notaComprension + notaAnalisis + notaAplicacion + notaArgumentacion) / 4;

  return {
    comprension: notaComprension,
    analisis: notaAnalisis,
    aplicacion: notaAplicacion,
    argumentacion: notaArgumentacion,
    promedio: Math.round(promedio * 10) / 10,
  };
}

function calcularNota() {
  return calcularNotaDesde(conteosParaNota());
}

function calcularDesempenoDesde(c) {
  // El nivel se deriva del mismo promedio (escala 1 a 5) de los 4 criterios
  // de la rúbrica, con 6 franjas.
  const nota = calcularNotaDesde(c);
  const promedio = nota.promedio;

  let nivel, mensaje, siguientePaso;
  if (promedio >= 5.0) {
    nivel = "Sobresaliente";
    mensaje = "Conectaste los cuatro hitos, relacionaste las transformaciones y justificaste tu recomendación sin necesitar ninguna pista.";
    siguientePaso = "Podrías ampliar tu recomendación a otro escenario, como el uso de IA en trabajos escolares.";
  } else if (promedio >= 4.5) {
    nivel = "Sobresaliente con apoyo puntual";
    mensaje = "Resolviste casi todo el recorrido de forma autónoma; solo necesitaste una pista puntual para completarlo.";
    siguientePaso = "Revisa el punto exacto donde usaste la pista y explica en voz alta por qué esa es la respuesta correcta.";
  } else if (promedio >= 4.0) {
    nivel = "Logrado alto";
    mensaje = "Completaste correctamente los cuatro hitos, la actividad y tu recomendación, aunque tuviste que corregir algunas respuestas en el camino.";
    siguientePaso = "Vuelve a los puntos donde corregiste una respuesta y explica qué información te ayudó a llegar a la correcta.";
  } else if (promedio >= 3.5) {
    nivel = "Logrado";
    mensaje = "Lograste completar el recorrido, pero usaste varias pistas o intentos adicionales para conectar los hitos con la actividad y tu recomendación.";
    siguientePaso = "Repasa las relaciones causa-efecto donde más pistas usaste antes de continuar con la actividad.";
  } else if (promedio >= 3.0) {
    nivel = "Básico / en proceso";
    mensaje = "Completaste el recorrido, aunque necesitaste apoyo frecuente para avanzar en varias de las etapas.";
    siguientePaso = "Vuelve a leer cada hito antes de responder y apóyate en las pistas para identificar la relación causa-efecto.";
  } else {
    nivel = "Inicial — requiere refuerzo";
    mensaje = "Lograste completar el recorrido, aunque necesitaste varias pistas para conectar las causas con sus efectos.";
    siguientePaso = "Repite el recorrido (las preguntas rotan) prestando atención a la relación causa-efecto de cada hito antes de responder.";
  }

  return {
    nivel, mensaje, siguientePaso,
    detalle: [
      `Comprensión (preguntas de hitos): ${c.pregunta === 0 ? "sin pistas usadas" : `${c.pregunta} pista(s) usada(s)`}.`,
      `Análisis (actividad causa-efecto): ${c.transformacion === 0 ? "sin errores" : `${c.transformacion} intento(s) adicional(es)`}.`,
      `Aplicación (estrategia y justificación): ${c.omitida ? "continuaste sin completarla" : c.aplicacion === 0 ? "coherente al primer intento" : `${c.aplicacion} ajuste(s) necesario(s)`}.`,
      `Argumentación (evidencia que la respalda): ${c.omitida ? "continuaste sin completarla" : c.argumentacion === 0 ? "evidencia correcta al primer intento" : `${c.argumentacion} ajuste(s) necesario(s)`}.`,
    ],
  };
}

function calcularDesempeno() {
  return calcularDesempenoDesde(conteosParaNota());
}

function construirReporteHTML() {
  const d = calcularDesempeno();
  const nota = calcularNota();
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const barra = (valor) => `${Math.max(0, Math.min(100, (valor / 5) * 100))}%`;
  const criterio = (nombre, valor) => `
    <div class="barra-fila">
      <div class="etiqueta"><span>${nombre}</span><strong>${valor.toFixed(1)}</strong></div>
      <div class="barra-track"><div class="barra-fill" style="width:${barra(valor)}"></div></div>
    </div>`;

  const evidenciaHTML = estado.resultadoFinal.length
    ? estado.resultadoFinal.map((p) => `<div class="fila"><strong>${escaparHTML(p.transformacion)}</strong><span>Causada por ${escaparHTML(p.hito)}. ${escaparHTML(p.causa)}</span></div>`).join("")
    : `<div class="fila"><span>No se completó la actividad de relación causa-efecto.</span></div>`;

  const respuestas = construirRespuestasEscritas();
  const escritasHTML = respuestas.length
    ? respuestas.map((r) => `<div class="fila"><strong>${escaparHTML(r.parte)}</strong><span><em>${escaparHTML(r.pregunta)}</em><br>${escaparHTML(r.respuesta)}</span></div>`).join("")
    : `<div class="fila"><span>No hay respuestas escritas guardadas.</span></div>`;

  const propuestaHTML = estado.propuestaValidada
    ? `<div class="fila"><strong>${escaparHTML(estado.propuestaValidada.estrategia)}</strong><span><em>Porque:</em> ${escaparHTML(estado.propuestaValidada.justificacion)}<br><em>Evidencia:</em> ${escaparHTML(estado.propuestaValidada.evidencia)}</span></div>`
    : `<div class="fila"><span>No se completó el producto final (recomendación).</span></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte de desempeño — ${escaparHTML(estado.nombreEstudiante || "Estudiante")}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Mono:wght@600&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&display=swap">
<style>
  :root { --paper:#EEF1FA; --sheet:#FBFCFF; --band:#DFE6F7; --ink:#1D2347; --ink-2:#454D78; --rule:#CAD1E8; --red:#99563F; --green:#2B6A57; --green-bg:#D7ECE5; --rose-gold:#C99A84; --on-dark:#EEF1FA; --on-dark-2:#D3D9F2; --grad-box:linear-gradient(170deg, #232B5E 0%, #2F3B7C 45%, #3E4F96 100%);
    --serif:"Fraunces", Georgia, "Times New Roman", serif; --sans:"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif; --mono:"IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace; }
  * { box-sizing: border-box; }
  body { font-family: var(--sans); background: var(--paper); color: var(--ink); margin: 0; padding: 32px 16px; line-height: 1.55; }
  .reporte { max-width: 760px; margin: 0 auto; background: var(--sheet); border: 1px solid var(--rule); border-radius: 22px; overflow: hidden; position: relative; padding: 0 32px 28px; box-shadow: 0 22px 44px -22px rgba(29,35,71,.45); }
  header { position: relative; z-index: 1; margin: 0 -32px; padding: 30px 32px 24px; background: var(--grad-box); color: var(--on-dark); border-bottom: 2px solid var(--rose-gold); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .kicker { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--on-dark-2); display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 14px; }
  h1 { font-family: var(--serif); font-weight: 300; font-size: 2.4rem; line-height: 1; margin: 0; letter-spacing: -0.02em; }
  h1 em { color: var(--rose-gold); font-style: italic; font-weight: 300; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0; margin: 18px 0 0; border: 1px solid rgba(201,154,132,.6); }
  .meta div { padding: 10px 12px; border-right: 1px solid rgba(201,154,132,.6); }
  .meta div:last-child { border-right: 0; }
  .meta span { display: block; font-size: 0.75rem; font-weight: 700; color: var(--on-dark-2); text-transform: uppercase; letter-spacing: 0.06em; }
  .meta strong { font-size: 0.98rem; overflow-wrap: anywhere; }
  section { padding: 20px 0; border-bottom: 1px solid var(--rule); }
  section:nth-of-type(even) { background: linear-gradient(160deg, #F4F6FD, #E4EAFA); margin: 0 -32px; padding: 20px 32px; }
  h2 { font-family: var(--serif); font-weight: 600; font-size: 1.15rem; margin: 0 0 12px; }
  .nota-hero { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
  .nota-numero { font-family: var(--serif); font-weight: 300; font-size: 3.8rem; line-height: 1; font-variant-numeric: tabular-nums; }
  .nota-numero small { font-size: 0.9rem; color: var(--ink-2); margin-left: 4px; }
  .nota-nivel { display: inline-block; background: var(--grad-box); border: 1px solid var(--rose-gold); color: var(--on-dark); font-weight: 700; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem; }
  .nota-texto { flex: 1 1 260px; }
  .nota-texto p { margin: 8px 0 0; font-size: 0.94rem; }
  .barra-fila { margin: 12px 0; }
  .barra-fila .etiqueta { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px; }
  .barra-fila .etiqueta strong { font-variant-numeric: tabular-nums; }
  .barra-track { background: var(--band); border-radius: 999px; height: 10px; overflow: hidden; }
  .barra-fill { background: linear-gradient(90deg, #2F3B7C, #6C7EC8); height: 100%; border-radius: 999px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  ul { margin: 12px 0 0; padding-left: 1.2em; font-size: 0.9rem; color: var(--ink-2); }
  .fila { border-top: 1px dashed var(--rule); padding: 12px 0; }
  .fila:first-of-type { border-top: none; padding-top: 0; }
  .fila strong { display: block; }
  .fila span { color: var(--ink-2); font-size: 0.94rem; }
  .aviso { font-size: 0.8rem; color: var(--ink-2); text-align: center; margin: 22px 0 0; }
  @media (max-width: 560px) { .reporte { padding: 0 18px 24px; } header { margin: 0 -18px; padding: 24px 18px 20px; } section:nth-of-type(even) { margin: 0 -18px; padding: 20px 18px; } h1 { font-size: 1.7rem; } }
  @media print { body { padding: 0; background: #fff; } .reporte { border: 0; } section:nth-of-type(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<main class="reporte">

  <header>
    <p class="kicker"><span>De ARPANET al feed · RED-1011-N-25</span><span>Universidad de Córdoba</span></p>
    <h1>Reporte de <em>desempeño</em></h1>
    <div class="meta">
      <div><span>Estudiante</span><strong>${escaparHTML(estado.nombreEstudiante || "(sin nombre registrado)")}</strong></div>
      <div><span>Grado</span><strong>${escaparHTML(estado.grado || "—")}</strong></div>
      <div><span>Fecha</span><strong>${escaparHTML(fecha)}</strong></div>
    </div>
  </header>

  <section>
    <h2>Resultado general</h2>
    <div class="nota-hero">
      <div class="nota-numero">${nota.promedio.toFixed(1)}<small>/ 5.0</small></div>
      <div class="nota-texto">
        <span class="nota-nivel">${escaparHTML(d.nivel)}</span>
        <p>${escaparHTML(d.mensaje)}</p>${estado.recorridoRepetido && estado.primerResultado ? `
        <p><strong>Nota del primer recorrido.</strong> La ruta se repitió para practicar; se conserva el resultado del primer intento.</p>` : ""}
      </div>
    </div>
  </section>

  <section>
    <h2>Desglose por criterio (sobre 5.0)</h2>
    ${criterio("Comprensión", nota.comprension)}
    ${criterio("Análisis", nota.analisis)}
    ${criterio("Aplicación", nota.aplicacion)}
    ${criterio("Argumentación", nota.argumentacion)}
    <ul>${d.detalle.map((l) => `<li>${escaparHTML(l)}</li>`).join("")}</ul>
  </section>

  <section>
    <h2>Evidencia de aprendizaje (actividad causa-efecto)</h2>
    ${evidenciaHTML}
  </section>

  <section>
    <h2>Producto final (recomendación)</h2>
    ${propuestaHTML}
  </section>

  <section>
    <h2>Respuestas escritas</h2>
    ${escritasHTML}
  </section>

  <section>
    <h2>Retroalimentación y siguiente paso</h2>
    <p>${escaparHTML(d.siguientePaso)}</p>
  </section>

  <p class="aviso">Nota referencial generada automáticamente por el RED según pistas usadas durante el recorrido. No reemplaza el criterio de evaluación docente.</p>

</main>
</body>
</html>`;
}

function descargarReporte() {
  const nombreArchivo = (estado.nombreEstudiante || "estudiante").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const blob = new Blob([construirReporteHTML()], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-${nombreArchivo || "estudiante"}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// CIERRE
// ============================================================
// Guarda el resultado del primer recorrido la primera vez que se llega al cierre
// y lo deja en la cola de envío a la docente.
function fijarPrimerResultado() {
  if (estado.primerResultado) return;
  estado.primerResultado = {
    nombre: estado.nombreEstudiante,
    conteos: conteosActuales(),
    fecha: new Date().toISOString(),
    attemptId: nuevoIdIntento(),
  };
  encolarResultado(estado.primerResultado);
}

function generarResumen() {
  fijarPrimerResultado();
  document.getElementById("resumen-intro").textContent =
    `${estado.nombreEstudiante ? "Recorrido de " + estado.nombreEstudiante + ". " : ""}Exploraste los 4 hitos y comprobaste que una tecnología no cambia la circulación por sí sola: abre posibilidades que las personas convierten en prácticas.`;

  const propuestaWrap = document.getElementById("resumen-propuesta");
  propuestaWrap.innerHTML = "";
  if (estado.propuestaValidada) {
    const p = document.createElement("div");
    p.className = "evidence-pair";
    p.innerHTML = `<strong>${escaparHTML(estado.propuestaValidada.estrategia)}</strong><span>${escaparHTML(estado.propuestaValidada.justificacion)} ${escaparHTML(estado.propuestaValidada.evidencia)}</span>`;
    propuestaWrap.appendChild(p);
  } else if (estado.propuestaOmitida) {
    const p = document.createElement("div");
    p.className = "evidence-pair";
    p.innerHTML = `<span>Continuaste sin completar esta parte del recorrido.</span>`;
    propuestaWrap.appendChild(p);
  }

  const repetido = estado.recorridoRepetido && !!estado.primerResultado;
  document.getElementById("desempeno-nivel-tag").textContent = repetido ? "Nota del primer recorrido" : "Tu nivel de desempeño";
  const d = calcularDesempeno();
  document.getElementById("desempeno-nivel").textContent = d.nivel;
  const nota = calcularNota();
  animarNota(document.getElementById("desempeno-numero"), nota.promedio);
  const detalleWrap = document.getElementById("desempeno-detalle");
  const avisoRepetido = repetido
    ? `<p>Repetiste la ruta para practicar: la nota es la de tu primer recorrido.</p>`
    : "";
  detalleWrap.innerHTML = `${avisoRepetido}<p>${escaparHTML(d.mensaje)}</p><ul>${d.detalle.map((l) => `<li>${escaparHTML(l)}</li>`).join("")}</ul><p><strong>Siguiente paso:</strong> ${escaparHTML(d.siguientePaso)}</p>`;

  const evidenciaWrap = document.getElementById("resumen-evidencia");
  evidenciaWrap.innerHTML = "";
  estado.resultadoFinal.forEach((par) => {
    const item = document.createElement("div");
    item.className = "evidence-pair";
    item.innerHTML = `<strong>${escaparHTML(par.transformacion)}</strong><span>La causa fue ${escaparHTML(par.hito)}. ${escaparHTML(par.causa)}</span>`;
    evidenciaWrap.appendChild(item);
  });

  const cadena = document.getElementById("resumen-cadena");
  cadena.innerHTML = "";
  Object.values(HITOS).forEach((h) => {
    const item = document.createElement("li");
    item.className = "chain-item";
    item.innerHTML = `<span class="chain-year">${escaparHTML(h.anio)}</span><strong>${escaparHTML(h.titulo)}</strong><span>${escaparHTML(h.causa)}</span>`;
    cadena.appendChild(item);
  });
  renderRespuestasEstudiante(document.getElementById("resumen-escritas"), construirRespuestasEscritas());
  guardarProgreso();
  mostrarEstadoEnvio();
  enviarPendientes();
}

// ============================================================
// MAPA — las tarjetas se generan a partir de HITOS (js/data.js)
// ============================================================
function renderTimeline() {
  const lista = document.getElementById("timeline");
  lista.innerHTML = Object.entries(HITOS).map(([n, h], i) => `
    <li class="milestone" style="--i:${i}">
      <span class="milestone-node" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="node-check" d="M6.5 12.5l3.8 3.8 7.2-8"/></svg></span>
      <button class="milestone-card" data-hito="${n}">
        <span class="node-top">
          <span class="node-number">${String(n).padStart(2, "0")} · ${escaparHTML(h.anio)}</span>
          <span class="node-state" data-state="${n}">Por explorar</span>
        </span>
        ${Number(n) === 1 ? '<span class="ejemplo-badge">Ejemplo resuelto</span>' : ""}
        <span class="milestone-card-title">${escaparHTML(h.titulo)}</span>
        <span class="milestone-card-summary">${escaparHTML(h.resumenMapa || h.resumen)}</span>
        <span class="card-open">Abrir hito <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span>
      </button>
    </li>`).join("");
}

// ============================================================
// RIEL DE AVANCE (cabecera) — perforaciones que se marcan al avanzar
// ============================================================
function actualizarRail() {
  const rail = document.querySelector(".feed-rail");
  if (!rail || typeof estado === "undefined") return;
  const hechos = {
    actividad: estado.resultadoFinal.length > 0,
    propuesta: !!(estado.propuestaValidada || estado.propuestaOmitida),
    cierre: !!estado.primerResultado,
  };
  const pantalla = document.body.dataset.screen;
  const actual = {
    "screen-hito": String(estado.hitoActual),
    "screen-actividad": "actividad",
    "screen-retro": "actividad",
    "screen-propuesta": "propuesta",
    "screen-cierre": "cierre",
  }[pantalla];
  let hechosTotal = 0;
  rail.querySelectorAll("li").forEach((li) => {
    const paso = li.dataset.paso;
    const hecho = /^\d$/.test(paso) ? estado.explorados.has(Number(paso)) : !!hechos[paso];
    li.classList.toggle("is-done", hecho);
    if (hecho) hechosTotal += 1;
    li.classList.toggle("is-current", paso === actual);
  });
  const relleno = document.querySelector(".rail-fill");
  if (relleno) relleno.style.transform = `scaleX(${hechosTotal / 7})`;
}

// ============================================================
// NOTA ANIMADA — cuenta de 0 a la nota (sin movimiento si se pidió reducirlo)
// ============================================================
const MOVIMIENTO_REDUCIDO = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animarNota(el, valor) {
  const final = valor.toFixed(1);
  el.setAttribute("aria-label", `${final} sobre 5.0`);
  if (MOVIMIENTO_REDUCIDO || document.hidden) { el.textContent = final; return; }
  // Respaldo: si el navegador pausa los cuadros, el valor final llega igual.
  window.setTimeout(() => { el.textContent = final; }, 700);
  const inicio = performance.now();
  const duracion = 600;
  const paso = (t) => {
    const p = Math.min(1, (t - inicio) / duracion);
    const suav = 1 - Math.pow(1 - p, 3);
    el.textContent = p < 1 ? (valor * suav).toFixed(1) : final;
    if (p < 1) requestAnimationFrame(paso);
  };
  el.textContent = "0.0";
  requestAnimationFrame(paso);
}

// ============================================================
// RESPUESTAS ESCRITAS — explicaciones con palabras propias
// (se escapan al mostrarse; no cambian la nota automática)
// ============================================================
function actualizarBotonInicio() {
  const nombreOk = evaluarNombre(document.getElementById("input-nombre").value).valido;
  document.getElementById("btn-iniciar").disabled = !(nombreOk && estado.grado);
}

function contarPalabras(texto) {
  return String(texto || "").trim().split(/\s+/).filter((p) => /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(p)).length;
}

function explicacionValida(parte) {
  const texto = parte === "hito" ? estado.explicaciones.hito[estado.hitoActual] : estado.explicaciones[parte];
  return contarPalabras(texto) >= MIN_PALABRAS[parte];
}

function actualizarContador(parte) {
  const ta = document.getElementById(`texto-${parte}`);
  const contador = document.getElementById(`contador-${parte}`);
  const n = contarPalabras(ta.value);
  const minimo = MIN_PALABRAS[parte];
  contador.textContent = n >= minimo ? `${n} palabras · listo para guardar` : `${n} / ${minimo} palabras`;
  contador.classList.toggle("is-ok", n >= minimo);
}

function prepararExplicacion(parte, visible, texto, animar) {
  const seccion = document.getElementById(`explica-${parte}`);
  const ta = document.getElementById(`texto-${parte}`);
  const estadoEl = document.getElementById(`estado-${parte}`);
  seccion.hidden = !visible;
  ta.value = texto || "";
  estadoEl.className = "explica-estado";
  estadoEl.textContent = texto ? "Explicación guardada. Puedes editarla y volver a guardarla." : "";
  if (texto) estadoEl.classList.add("is-ok");
  actualizarContador(parte);
  if (visible && animar) {
    seccion.classList.remove("explica--entra");
    void seccion.offsetWidth;
    seccion.classList.add("explica--entra");
  }
}

function guardarExplicacion(parte) {
  const ta = document.getElementById(`texto-${parte}`);
  const estadoEl = document.getElementById(`estado-${parte}`);
  const texto = ta.value.trim().slice(0, 2000);
  const n = contarPalabras(texto);
  const minimo = MIN_PALABRAS[parte];
  estadoEl.className = "explica-estado";
  if (n < minimo) {
    const faltan = minimo - n;
    estadoEl.textContent = `Te ${faltan === 1 ? "falta 1 palabra" : `faltan ${faltan} palabras`}. Escribe al menos ${minimo}: di qué pasó primero (la causa) y qué cambió después (el efecto).`;
    estadoEl.classList.add("is-error");
    ta.focus();
    return;
  }
  let mensaje = "Explicación guardada.";
  if (parte === "hito") {
    const numero = estado.hitoActual;
    estado.explicaciones.hito[numero] = texto;
    if (!estado.explorados.has(numero)) {
      estado.explorados.add(numero);
      marcarTarjetaExplorada(numero);
      actualizarMapa();
      mensaje = "Explicación guardada. El hito quedó explorado.";
    }
  } else if (parte === "actividad") {
    estado.explicaciones.actividad = texto;
    document.getElementById("btn-resumen").disabled = !estado.resultadoFinal.length;
    mensaje = "Explicación guardada. Ya puedes diseñar tu recomendación.";
  } else if (parte === "propuesta") {
    estado.explicaciones.propuesta = texto;
    document.getElementById("btn-ir-cierre").disabled = false;
    mensaje = "Explicación guardada. Ya puedes ver el cierre.";
  }
  estadoEl.textContent = mensaje;
  estadoEl.classList.add("is-ok");
  guardarProgreso();
}

function inicializarExplicaciones() {
  document.querySelectorAll(".explica-texto[data-parte]").forEach((ta) => {
    ta.addEventListener("input", () => actualizarContador(ta.dataset.parte));
  });
  document.querySelectorAll('input[name="grado"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) estado.grado = radio.value;
      actualizarBotonInicio();
      guardarProgreso();
    });
  });
}

// ------------------------------------------------------------
// Respuestas escritas: lista que se envía a la docente y bloques
// para la skill Tutor Feed (una línea por campo)
// ------------------------------------------------------------
function construirRespuestasEscritas() {
  const respuestas = [];
  Object.keys(HITOS).forEach((n) => {
    const texto = estado.explicaciones.hito[n];
    if (texto) respuestas.push({ parte: `Hito ${String(n).padStart(2, "0")} · ${HITOS[n].titulo} (${HITOS[n].anio})`, pregunta: CONSIGNAS.hito, respuesta: texto });
  });
  if (estado.explicaciones.actividad) respuestas.push({ parte: "Actividad de relaciones", pregunta: CONSIGNAS.actividad, respuesta: estado.explicaciones.actividad });
  if (estado.explicaciones.propuesta && estado.propuestaValidada) respuestas.push({ parte: "Recomendación final", pregunta: CONSIGNAS.propuesta, respuesta: estado.explicaciones.propuesta });
  return respuestas;
}

function formatearBloqueSkill(respuesta, grado) {
  const limpia = String(respuesta.respuesta).replace(/\s+/g, " ").trim();
  return {
    titulo: respuesta.parte,
    texto: [
      `Hito o parte: ${respuesta.parte}`,
      `Pregunta: ${respuesta.pregunta}`,
      `Respuesta del estudiante: "${limpia}"`,
      "Criterios: por defecto",
      `Grado: ${grado || "(sin grado)"}`,
    ].join("\n"),
  };
}

// Cierre del estudiante: sus respuestas, en texto simple.
function renderRespuestasEstudiante(lista, respuestas) {
  lista.innerHTML = "";
  if (!respuestas.length) {
    const li = document.createElement("li");
    li.className = "bloques-vacio";
    li.textContent = "Aún no hay respuestas escritas guardadas.";
    lista.appendChild(li);
    return;
  }
  respuestas.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "respuesta-item";
    li.style.setProperty("--i", i);
    const titulo = document.createElement("strong");
    titulo.textContent = r.parte;
    const pregunta = document.createElement("span");
    pregunta.className = "respuesta-pregunta";
    pregunta.textContent = r.pregunta;
    const texto = document.createElement("p");
    texto.textContent = r.respuesta;
    li.append(titulo, pregunta, texto);
    lista.appendChild(li);
  });
}

// Panel docente: un bloque por respuesta, con su botón para copiarlo.
function renderBloquesSkill(lista, bloques, textoVacio) {
  lista.innerHTML = "";
  if (!bloques.length) {
    const li = document.createElement("li");
    li.className = "bloques-vacio";
    li.textContent = textoVacio;
    lista.appendChild(li);
    return;
  }
  bloques.forEach((b, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", i);
    const art = document.createElement("article");
    art.className = "bloque-skill";
    const head = document.createElement("div");
    head.className = "bloque-skill-head";
    const titulo = document.createElement("strong");
    titulo.textContent = b.titulo;
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "button button-secondary";
    boton.dataset.action = "copiar-bloque";
    boton.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg> Copiar para Tutor Feed';
    boton.setAttribute("aria-label", `Copiar para Tutor Feed: ${b.titulo}`);
    head.append(titulo, boton);
    const pre = document.createElement("pre");
    pre.className = "bloque-texto";
    pre.textContent = b.texto;
    art.append(head, pre);
    li.appendChild(art);
    lista.appendChild(li);
  });
}

function seleccionarContenido(el) {
  try {
    const rango = document.createRange();
    rango.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rango);
  } catch (e) { /* nada */ }
}

function copiarTexto(texto, elemento, boton) {
  const listo = () => {
    anunciar("Bloque copiado.");
    if (boton) {
      if (!boton.dataset.original) boton.dataset.original = boton.innerHTML;
      boton.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg> Copiado';
      boton.classList.add("is-copiado");
      window.setTimeout(() => { boton.innerHTML = boton.dataset.original; boton.classList.remove("is-copiado"); }, 1800);
    }
  };
  const respaldo = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) { listo(); return; }
    } catch (e) { /* sigue al plan B */ }
    seleccionarContenido(elemento);
    anunciar("No se pudo copiar automáticamente. El texto quedó seleccionado: cópialo con Ctrl+C.");
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(listo, respaldo);
  else respaldo();
}

// ============================================================
// CONEXIÓN CON SUPABASE
// Las tablas red_* no se pueden leer ni escribir directamente: todo pasa
// por funciones RPC que validan los datos o el token de la docente (ver
// supabase/schema.sql). La clave "publishable" es pública por diseño.
// Si SUPABASE_URL queda vacía, el RED funciona sin envío ni panel.
// ============================================================
const SUPABASE_URL = "https://qlqpfpirdscqhsxkafio.supabase.co";
const SUPABASE_KEY = "sb_publishable_zzffObHTO_5G7vvRo7ciKQ_FXZLqx-c";

async function rpc(funcion, parametros) {
  if (!SUPABASE_URL) throw Object.assign(new Error("Sin servidor configurado."), { red: true });
  let respuesta;
  try {
    respuesta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(parametros || {}),
    });
  } catch (e) {
    throw Object.assign(new Error("No hay conexión con el servidor."), { red: true });
  }
  const texto = await respuesta.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch (e) { /* respuesta no JSON */ }
  if (!respuesta.ok) {
    const error = new Error((datos && datos.message) || `Error del servidor (${respuesta.status}).`);
    error.codigo = datos && datos.code;
    error.red = respuesta.status >= 500;
    throw error;
  }
  return datos;
}

// ------------------------------------------------------------
// ENVÍO AUTOMÁTICO DEL PRIMER RECORRIDO
// Cola en localStorage con un id de intento generado aquí: si se recarga
// o falla la red, se reintenta al volver a abrir (o al recuperar la
// conexión) y el servidor no duplica ni sobrescribe el resultado.
// ------------------------------------------------------------
const ENVIOS_KEY = "red1011n25_envios_v1";

function nuevoIdIntento() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function leerEnvios() {
  try {
    const lista = JSON.parse(localStorage.getItem(ENVIOS_KEY) || "[]");
    return Array.isArray(lista) ? lista.filter((p) => p && typeof p.p_attempt_id === "string") : [];
  } catch (e) {
    return [];
  }
}

function guardarEnvios(lista) {
  try { localStorage.setItem(ENVIOS_KEY, JSON.stringify(lista)); } catch (e) { /* sin almacenamiento */ }
}

function encolarResultado(primer) {
  const nota = calcularNotaDesde(primer.conteos);
  const payload = {
    p_attempt_id: primer.attemptId,
    p_name: primer.nombre,
    p_grade: estado.grado,
    p_level: calcularDesempenoDesde(primer.conteos).nivel,
    p_score: nota.promedio,
    p_criteria: { comprension: nota.comprension, analisis: nota.analisis, aplicacion: nota.aplicacion, argumentacion: nota.argumentacion },
    p_counts: primer.conteos,
    p_answers: construirRespuestasEscritas(),
    p_completed_at: primer.fecha,
  };
  const lista = leerEnvios().filter((p) => p.p_attempt_id !== payload.p_attempt_id);
  lista.push(payload);
  guardarEnvios(lista);
}

function envioPendiente() {
  const id = estado.primerResultado && estado.primerResultado.attemptId;
  return !!id && leerEnvios().some((p) => p.p_attempt_id === id);
}

function mostrarEstadoEnvio(fallo) {
  const el = document.getElementById("envio-estado");
  if (!el || !estado.primerResultado || !SUPABASE_URL) return;
  const pendiente = envioPendiente();
  el.hidden = false;
  el.classList.toggle("is-pendiente", pendiente);
  if (!pendiente) el.textContent = "Tu resultado ya le llegó a tu docente.";
  else el.textContent = fallo ? "Tu resultado se enviará cuando haya conexión." : "Enviando tu resultado…";
}

let enviando = false;
async function enviarPendientes() {
  if (enviando || !SUPABASE_URL) return;
  const lista = leerEnvios();
  if (!lista.length) return;
  enviando = true;
  let fallo = false;
  for (const payload of lista) {
    try {
      await rpc("red_submit_result", payload);
      guardarEnvios(leerEnvios().filter((p) => p.p_attempt_id !== payload.p_attempt_id));
    } catch (e) {
      // Se conserva en la cola y se reintenta al volver a abrir o al reconectar.
      fallo = true;
    }
  }
  enviando = false;
  // Si mientras se enviaba se encoló otro resultado, se envía también.
  if (!fallo && leerEnvios().length) { enviarPendientes(); return; }
  mostrarEstadoEnvio(fallo);
  if (document.body.dataset.screen === "screen-cierre") anunciar(document.getElementById("envio-estado").textContent);
}

window.addEventListener("online", enviarPendientes);

// ============================================================
// EVENTOS GLOBALES
// ============================================================
document.addEventListener("click", (e) => {
  const hitoBtn = e.target.closest("[data-hito]");
  if (hitoBtn) { abrirHito(Number(hitoBtn.dataset.hito)); return; }

  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  switch (btn.dataset.action) {
    case "start":
      mostrarPantalla("screen-mapa", "Mapa abierto. Explora los cuatro hitos en orden o elige uno.");
      break;
    case "toggle-how": {
      const panel = document.getElementById("how-it-works");
      const expandido = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expandido));
      panel.hidden = expandido;
      break;
    }
    case "toggle-rubrica": {
      const panel = document.getElementById("rubrica-panel");
      const expandido = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expandido));
      panel.hidden = expandido;
      break;
    }
    case "go-welcome":
      mostrarPantalla("screen-bienvenida", "Regresaste a la bienvenida.");
      break;
    case "go-mapa":
      mostrarPantalla("screen-mapa", "Mapa abierto.");
      break;
    case "go-actividad":
      poblarActividad();
      mostrarPantalla("screen-actividad", "Actividad final abierta.");
      break;
    case "go-actividad-directo":
      mostrarPantalla("screen-actividad");
      break;
    case "check-activity":
      validarActividad();
      break;
    case "retry-activity":
      reintentarActividad();
      break;
    case "go-propuesta":
      poblarPropuesta();
      mostrarPantalla("screen-propuesta", "Producto final abierto. Diseña tu recomendación.");
      break;
    case "check-propuesta":
      validarPropuesta();
      break;
    case "retry-propuesta":
      reintentarPropuesta();
      break;
    case "skip-propuesta":
      estado.propuestaOmitida = true;
      estado.propuestaValidada = null;
      generarResumen();
      mostrarPantalla("screen-cierre", "Continuaste sin completar la recomendación. Esto se reflejó en tu nivel de desempeño.");
      break;
    case "descargar-reporte":
      descargarReporte();
      break;
    case "go-cierre":
      generarResumen();
      mostrarPantalla("screen-cierre", "Resumen causal abierto.");
      break;
    case "go-creditos":
      mostrarPantalla("screen-creditos", "Créditos abiertos.");
      break;
    case "restart":
      reiniciarRecorrido(false);
      break;
    case "restart-total":
      reiniciarRecorrido(true);
      break;
    case "go-docente":
      abrirPantallaDocente();
      break;
    case "entrar-docente":
      verificarClaveDocente();
      break;
    case "salir-docente":
      cerrarSesionDocente();
      break;
    case "exportar-docente":
      exportarCSVDocente();
      break;
    case "actualizar-docente":
      cargarResultadosDocente(true);
      break;
    case "ver-detalle":
      mostrarDetalleDocente(btn.dataset.id);
      break;
    case "cerrar-detalle":
      cerrarDetalleDocente();
      break;
    case "borrar-resultado":
      borrarResultadoDocente(btn.dataset.id);
      break;
    case "guardar-explicacion":
      guardarExplicacion(btn.dataset.parte);
      break;
    case "copiar-bloque": {
      const pre = btn.closest(".bloque-skill").querySelector(".bloque-texto");
      copiarTexto(pre.textContent, pre, btn);
      break;
    }
  }
});

// Reinicia todo el recorrido (mapa, hitos, actividad y recomendación).
// Si limpiarNombre es true, además borra el nombre del estudiante
// registrado; si es false, el nombre se conserva para el nuevo intento.
function reiniciarRecorrido(limpiarNombre) {
  if (limpiarNombre) {
    // Reinicio total: se borra también el resultado del primer recorrido
    // y el progreso guardado en este equipo.
    estado.primerResultado = null;
    estado.recorridoRepetido = false;
    borrarProgreso();
  } else if (estado.primerResultado) {
    estado.recorridoRepetido = true;
  }
  estado.explorados.clear();
  estado.intentosPregunta = {};
  estado.opcionesFallidas = {};
  estado.varianteResuelta = {};
  estado.intentosTransformacion = { 1: 0, 2: 0 };
  estado.actividadPoblada = false;
  estado.resultadoFinal = [];
  estado.propuestaEstrategia = null;
  estado.intentosPropuesta = 0;
  estado.erroresAplicacion = 0;
  estado.erroresArgumentacion = 0;
  estado.propuestaValidada = null;
  estado.propuestaOmitida = false;
  estado.explicaciones = { hito: {}, actividad: "", propuesta: "" };
  ["hito", "actividad", "propuesta"].forEach((parte) => prepararExplicacion(parte, false, ""));
  estado.parIndex = elegirParAleatorio(estado.parIndex);
  document.getElementById("match-board").innerHTML = "";
  propuestaPoblada = false;
  bloqueSeleccionado = null;
  document.querySelectorAll(".ranura").forEach((r) => {
    // Quita los bloques del recorrido anterior que quedaron en la ranura.
    r.querySelectorAll(".bloque").forEach((bl) => bl.remove());
    r.setAttribute("aria-label", `Ranura de ${r.dataset.tipo}, vacía`);
    r.classList.remove("tiene-bloque", "es-correcta", "es-incorrecta");
    r.querySelector(".ranura-contenido").textContent = `Arrastra o toca un bloque ${r.dataset.tipo === "estrategia" ? "rosa" : r.dataset.tipo === "justificacion" ? "azul" : "lila"}`;
  });
  document.getElementById("banda-bloques").innerHTML = "";
  document.getElementById("propuesta-resultado").innerHTML = "";
  document.getElementById("btn-comprobar-propuesta").hidden = false;
  document.getElementById("btn-comprobar-propuesta").disabled = true;
  document.getElementById("btn-reintentar-propuesta").hidden = true;
  document.getElementById("btn-ir-cierre").hidden = true;
  document.getElementById("saltar-ayuda").hidden = false;
  document.getElementById("btn-resumen").disabled = true;
  document.getElementById("resultado-actividad").innerHTML = "";
  document.getElementById("resultado-actividad").className = "";
  document.querySelectorAll(".milestone-card").forEach((c) => {
    delete c.dataset.explorado;
    const numero = c.dataset.hito;
    c.querySelector(".node-state").textContent = "Por explorar";
  });
  actualizarMapa();

  if (limpiarNombre) {
    estado.nombreEstudiante = "";
    const inputNombre = document.getElementById("input-nombre");
    inputNombre.value = "";
    const ayuda = document.getElementById("nombre-ayuda");
    ayuda.hidden = true;
    const chip = document.getElementById("chip-estudiante");
    chip.textContent = "";
    chip.hidden = true;
    estado.grado = "";
    document.querySelectorAll('input[name="grado"]').forEach((r) => { r.checked = false; });
    document.getElementById("btn-iniciar").disabled = true;
  }

  mostrarPantalla("screen-bienvenida", "Ruta reiniciada. Bienvenida a De ARPANET al feed.");
  if (limpiarNombre) borrarProgreso();
}

// ============================================================
// PANEL DOCENTE — acceso con código y dashboard de resultados
// El código se valida en el servidor (red_teacher_login), que responde con
// un token de sesión que expira en 8 h. En este navegador solo se guarda
// ese token; el código no se guarda en ninguna parte.
// ============================================================
const DOCENTE_TOKEN_KEY = "red1011n25_docente_token";
const NIVELES = ["Sobresaliente", "Sobresaliente con apoyo puntual", "Logrado alto", "Logrado", "Básico / en proceso", "Inicial — requiere refuerzo"];
const NIVEL_TONO = {
  "Sobresaliente": "alto", "Sobresaliente con apoyo puntual": "alto",
  "Logrado alto": "medio", "Logrado": "medio",
  "Básico / en proceso": "bajo", "Inicial — requiere refuerzo": "critico",
};
const CRITERIOS = [["comprension", "Comprensión"], ["analisis", "Análisis"], ["aplicacion", "Aplicación"], ["argumentacion", "Argumentación"]];
const docente = { registros: [], detalleId: null };

function leerTokenDocente() {
  try { return localStorage.getItem(DOCENTE_TOKEN_KEY) || ""; } catch (e) { return ""; }
}

function guardarTokenDocente(token) {
  try {
    if (token) localStorage.setItem(DOCENTE_TOKEN_KEY, token);
    else localStorage.removeItem(DOCENTE_TOKEN_KEY);
  } catch (e) { /* sin almacenamiento: la sesión dura lo que la pestaña */ }
}

function mostrarPuertaDocente(mensaje) {
  document.getElementById("docente-bloqueado").hidden = false;
  document.getElementById("docente-dashboard").hidden = true;
  document.getElementById("docente-error").textContent = mensaje || "";
  const input = document.getElementById("input-clave-docente");
  input.value = "";
  window.setTimeout(() => input.focus(), 40);
}

function mostrarDashboardDocente() {
  document.getElementById("docente-bloqueado").hidden = true;
  document.getElementById("docente-dashboard").hidden = false;
}

async function abrirPantallaDocente() {
  mostrarPantalla("screen-docente", "Panel docente.");
  const token = leerTokenDocente();
  if (!token) { mostrarPuertaDocente(); return; }
  try {
    const sesion = await rpc("red_teacher_session", { p_token: token });
    if (sesion && sesion.authenticated) {
      mostrarDashboardDocente();
      cargarResultadosDocente();
      return;
    }
    guardarTokenDocente("");
    mostrarPuertaDocente("Tu sesión expiró. Vuelve a ingresar el código.");
  } catch (e) {
    mostrarPuertaDocente(e.red ? "No hay conexión con el servidor. Intenta de nuevo." : "");
  }
}

async function verificarClaveDocente() {
  const input = document.getElementById("input-clave-docente");
  const error = document.getElementById("docente-error");
  const boton = document.getElementById("btn-entrar-docente");
  const codigo = input.value.trim();
  if (!codigo) { error.textContent = "Escribe el código de acceso."; input.focus(); return; }
  boton.disabled = true;
  error.textContent = "";
  try {
    const sesion = await rpc("red_teacher_login", { p_code: codigo });
    guardarTokenDocente(sesion.token);
    input.value = "";
    mostrarDashboardDocente();
    document.getElementById("titulo-dashboard").focus();
    anunciar("Acceso docente concedido.");
    cargarResultadosDocente();
  } catch (e) {
    error.textContent = e.red ? "No hay conexión con el servidor. Intenta de nuevo." : "Código incorrecto.";
    input.value = "";
    input.focus();
  } finally {
    boton.disabled = false;
  }
}

async function cerrarSesionDocente() {
  const token = leerTokenDocente();
  guardarTokenDocente("");
  docente.registros = [];
  if (token) rpc("red_teacher_logout", { p_token: token }).catch(() => { /* expira sola en el servidor */ });
  mostrarPantalla("screen-bienvenida", "Sesión docente cerrada.");
}

function fijarEstadoDashboard(texto, esError) {
  const el = document.getElementById("dash-estado");
  el.textContent = texto;
  el.classList.toggle("is-error", !!esError);
}

async function cargarResultadosDocente(avisar) {
  fijarEstadoDashboard("Cargando resultados…");
  try {
    const datos = await rpc("red_teacher_list_results", { p_token: leerTokenDocente() });
    docente.registros = Array.isArray(datos) ? datos : [];
    fijarEstadoDashboard("");
    renderDashboardDocente();
    if (docente.detalleId) mostrarDetalleDocente(docente.detalleId, true);
    if (avisar) anunciar(`Resultados actualizados: ${docente.registros.length}.`);
  } catch (e) {
    if (e.codigo === "28000") {
      guardarTokenDocente("");
      mostrarPuertaDocente("Tu sesión expiró. Vuelve a ingresar el código.");
      return;
    }
    fijarEstadoDashboard(e.red ? "No hay conexión con el servidor. Pulsa Actualizar para reintentar." : e.message, true);
  }
}

function normalizarBusqueda(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function registrosFiltrados() {
  const grado = document.getElementById("filtro-grado").value;
  const busca = normalizarBusqueda(document.getElementById("filtro-nombre").value);
  return docente.registros.filter((r) => (!grado || r.grade === grado) && (!busca || normalizarBusqueda(r.name).includes(busca)));
}

function formatearFecha(iso, conHora) {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return "—";
  const opciones = { year: "numeric", month: "short", day: "numeric" };
  if (conHora) Object.assign(opciones, { hour: "2-digit", minute: "2-digit" });
  return f.toLocaleDateString("es-CO", opciones);
}

function chipNivel(nivel) {
  return `<span class="docente-nivel-chip" data-tono="${NIVEL_TONO[nivel] || "medio"}">${escaparHTML(nivel)}</span>`;
}

function renderDashboardDocente() {
  const lista = registrosFiltrados();
  const total = docente.registros.length;
  const ficticios = lista.filter((r) => r.is_demo).length;

  document.getElementById("dash-total").textContent = String(lista.length);
  document.getElementById("dash-total-sub").textContent = lista.length === total
    ? (ficticios ? `${ficticios} ficticio${ficticios === 1 ? "" : "s"}` : "")
    : `de ${total} · filtrados${ficticios ? ` · ${ficticios} ficticio${ficticios === 1 ? "" : "s"}` : ""}`;
  const promedio = lista.length ? lista.reduce((s, r) => s + Number(r.score), 0) / lista.length : null;
  document.getElementById("dash-promedio").textContent = promedio === null ? "—" : promedio.toFixed(1);

  const niveles = document.getElementById("dash-niveles");
  niveles.innerHTML = NIVELES.map((n) => {
    const cuantos = lista.filter((r) => r.level === n).length;
    const ancho = lista.length ? (cuantos / lista.length) * 100 : 0;
    return `<li data-tono="${NIVEL_TONO[n]}"><span class="dash-nivel-nombre">${escaparHTML(n)}</span><span class="dash-nivel-barra" aria-hidden="true"><i style="transform:scaleX(${ancho / 100})"></i></span><strong>${cuantos}</strong></li>`;
  }).join("");

  const cuerpo = document.getElementById("docente-tabla-cuerpo");
  const vacio = document.getElementById("docente-vacio");
  cuerpo.innerHTML = lista.map((r) => `
      <tr>
        <td><span>${escaparHTML(r.name)}${r.is_demo ? ' <span class="chip-ficticio">Ficticio</span>' : ""}</span></td>
        <td>${escaparHTML(r.grade)}</td>
        <td>${chipNivel(r.level)}</td>
        <td>${escaparHTML(Number(r.score).toFixed(1))}</td>
        <td>${escaparHTML(formatearFecha(r.completed_at))}</td>
        <td class="docente-acciones">
          <button class="text-button" data-action="ver-detalle" data-id="${escaparHTML(r.attempt_id)}" aria-label="Ver detalle de ${escaparHTML(r.name)}">Ver detalle</button>
          <button class="docente-borrar" data-action="borrar-resultado" data-id="${escaparHTML(r.attempt_id)}" aria-label="Borrar el resultado de ${escaparHTML(r.name)}">Borrar</button>
        </td>
      </tr>`).join("");
  vacio.hidden = lista.length > 0;
  vacio.textContent = total ? "Ningún estudiante coincide con el filtro." : "Todavía no llegan resultados. Aparecerán aquí cuando un estudiante termine su primer recorrido.";
}

function mostrarDetalleDocente(id, silencioso) {
  const r = docente.registros.find((x) => x.attempt_id === id);
  const seccion = document.getElementById("docente-detalle");
  if (!r) { cerrarDetalleDocente(true); return; }
  docente.detalleId = id;
  document.getElementById("detalle-meta").textContent = `${r.grade} · ${formatearFecha(r.completed_at, true)}${r.is_demo ? " · Ficticio" : ""}`;
  document.getElementById("detalle-nombre").textContent = r.name;
  document.getElementById("detalle-nota").textContent = Number(r.score).toFixed(1);
  const chip = document.getElementById("detalle-nivel");
  chip.textContent = r.level;
  chip.dataset.tono = NIVEL_TONO[r.level] || "medio";

  const crit = r.criteria || {};
  document.getElementById("detalle-criterios").innerHTML = CRITERIOS.map(([clave, nombre]) => {
    const valor = Number(crit[clave]) || 0;
    return `<div class="dash-criterio"><div class="dash-criterio-fila"><span>${nombre}</span><strong>${valor.toFixed(1)}</strong></div><span class="dash-criterio-barra" aria-hidden="true"><i style="transform:scaleX(${Math.max(0, Math.min(1, valor / 5))})"></i></span></div>`;
  }).join("");

  const c = r.counts || {};
  document.getElementById("detalle-conteos").innerHTML = [
    `Pistas usadas en los hitos: ${Number(c.pregunta) || 0}`,
    `Intentos adicionales al relacionar: ${Number(c.transformacion) || 0}`,
    c.omitida ? "Recomendación: continuó sin completarla" : `Ajustes en la recomendación: ${(Number(c.aplicacion) || 0) + (Number(c.argumentacion) || 0)}`,
  ].map((t) => `<li>${escaparHTML(t)}</li>`).join("");

  const respuestas = Array.isArray(r.answers) ? r.answers : [];
  renderBloquesSkill(document.getElementById("detalle-respuestas"), respuestas.map((a) => formatearBloqueSkill(a, r.grade)), "Este estudiante no guardó respuestas escritas.");

  seccion.hidden = false;
  if (!silencioso) {
    seccion.scrollIntoView({ block: "start", behavior: MOVIMIENTO_REDUCIDO ? "auto" : "smooth" });
    document.getElementById("detalle-nombre").focus({ preventScroll: true });
  }
}

function cerrarDetalleDocente(silencioso) {
  const id = docente.detalleId;
  docente.detalleId = null;
  document.getElementById("docente-detalle").hidden = true;
  if (silencioso) return;
  const boton = id && document.querySelector(`#docente-tabla-cuerpo [data-action="ver-detalle"][data-id="${id}"]`);
  if (boton) boton.focus();
}

async function borrarResultadoDocente(id) {
  const r = docente.registros.find((x) => x.attempt_id === id);
  if (!r) return;
  if (!window.confirm(`¿Borrar el resultado de ${r.name}? Esta acción no se puede deshacer.`)) return;
  try {
    await rpc("red_teacher_delete_result", { p_token: leerTokenDocente(), p_attempt_id: id });
    if (docente.detalleId === id) cerrarDetalleDocente(true);
    anunciar(`Resultado de ${r.name} borrado.`);
    await cargarResultadosDocente();
  } catch (e) {
    if (e.codigo === "28000") { guardarTokenDocente(""); mostrarPuertaDocente("Tu sesión expiró. Vuelve a ingresar el código."); return; }
    fijarEstadoDashboard(e.red ? "No hay conexión con el servidor. No se borró nada." : e.message, true);
  }
}

function exportarCSVDocente() {
  const registros = registrosFiltrados();
  if (!registros.length) {
    fijarEstadoDashboard("No hay resultados para exportar con este filtro.", true);
    return;
  }
  const encabezado = ["Estudiante", "Grado", "Nivel", "Nota", "Comprensión", "Análisis", "Aplicación", "Argumentación", "Fecha", "Tipo", "Respuestas escritas"];
  const num = (v) => (Number(v) || 0).toFixed(1);
  const filas = registros.map((r) => [
    r.name, r.grade, r.level, num(r.score),
    num(r.criteria && r.criteria.comprension), num(r.criteria && r.criteria.analisis),
    num(r.criteria && r.criteria.aplicacion), num(r.criteria && r.criteria.argumentacion),
    formatearFecha(r.completed_at, true), r.is_demo ? "Ficticio" : "Real",
    (Array.isArray(r.answers) ? r.answers : []).map((a) => `${a.parte}: ${a.respuesta}`).join(" | "),
  ]);
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resultados-RED-1011-N-25.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  fijarEstadoDashboard(`CSV descargado con ${registros.length} resultado${registros.length === 1 ? "" : "s"}.`);
}

document.getElementById("input-clave-docente").addEventListener("keydown", (e) => {
  if (e.key === "Enter") verificarClaveDocente();
});
document.getElementById("filtro-grado").addEventListener("change", renderDashboardDocente);
document.getElementById("filtro-nombre").addEventListener("input", renderDashboardDocente);

// ============================================================
// RESTAURAR PROGRESO GUARDADO (si existe)
// ============================================================
var restaurandoProgreso = false;

function restaurarProgreso() {
  const d = leerProgreso();
  if (!d || d.v !== 2) return;
  restaurandoProgreso = true;
  let primerSinEnviar = false;
  try {
    const nombre = typeof d.nombre === "string" ? d.nombre : "";
    if (nombre && evaluarNombre(nombre).valido) {
      document.getElementById("input-nombre").value = nombre;
      aplicarNombre(nombre);
    }
    const obj = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
    if (d.grado === "10.º" || d.grado === "11.º") {
      estado.grado = d.grado;
      const radio = document.querySelector(`input[name="grado"][value="${d.grado}"]`);
      if (radio) radio.checked = true;
    }
    const ex = obj(d.explicaciones);
    const txt = (x) => (typeof x === "string" ? x.slice(0, 2000) : "");
    Object.entries(obj(ex.hito)).forEach(([k, v]) => { if (HITOS[k]) estado.explicaciones.hito[k] = txt(v); });
    estado.explicaciones.actividad = txt(ex.actividad);
    estado.explicaciones.propuesta = txt(ex.propuesta);
    actualizarBotonInicio();
    const num = (x) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Math.floor(Number(x)) : 0);
    if (Number.isInteger(d.parIndex) && TRANSFORMACIONES_POOL[d.parIndex]) estado.parIndex = d.parIndex;
    (Array.isArray(d.explorados) ? d.explorados : []).map(Number).filter((n) => HITOS[n]).forEach((n) => {
      estado.explorados.add(n);
      marcarTarjetaExplorada(n);
    });
    Object.entries(obj(d.intentosPregunta)).forEach(([k, v]) => { if (HITOS[k]) estado.intentosPregunta[k] = num(v); });
    Object.entries(obj(d.opcionesFallidas)).forEach(([k, v]) => { if (HITOS[k] && Array.isArray(v)) estado.opcionesFallidas[k] = v.map(String); });
    Object.entries(obj(d.varianteResuelta)).forEach(([k, v]) => { if (HITOS[k] && Number.isInteger(v)) estado.varianteResuelta[k] = v; });
    const it = obj(d.intentosTransformacion);
    estado.intentosTransformacion = { 1: num(it[1]), 2: num(it[2]) };
    estado.resultadoFinal = Array.isArray(d.resultadoFinal) ? d.resultadoFinal : [];
    estado.intentosPropuesta = num(d.intentosPropuesta);
    estado.erroresAplicacion = num(d.erroresAplicacion);
    estado.erroresArgumentacion = num(d.erroresArgumentacion);
    estado.propuestaOmitida = !!d.propuestaOmitida;
    estado.recorridoRepetido = !!d.recorridoRepetido;
    if (d.primerResultado && d.primerResultado.conteos) {
      const c = d.primerResultado.conteos;
      estado.primerResultado = {
        nombre: String(d.primerResultado.nombre || nombre),
        conteos: { pregunta: num(c.pregunta), transformacion: num(c.transformacion), aplicacion: num(c.aplicacion), argumentacion: num(c.argumentacion), omitida: !!c.omitida },
        fecha: d.primerResultado.fecha,
        attemptId: typeof d.primerResultado.attemptId === "string" ? d.primerResultado.attemptId : "",
      };
      // Recorridos terminados antes del envío automático: se les asigna un id
      // y se envían una sola vez (al final, con las respuestas ya restauradas).
      if (!estado.primerResultado.attemptId) {
        estado.primerResultado.attemptId = nuevoIdIntento();
        primerSinEnviar = !!estado.grado;
      }
    }
    actualizarMapa();

    // Actividad: se vuelven a poner las relaciones elegidas.
    const selecciones = obj(d.seleccionesActividad);
    if (Object.keys(selecciones).length || estado.resultadoFinal.length) {
      poblarActividad();
      Object.entries(selecciones).forEach(([id, v]) => {
        const sel = document.getElementById(`select-t${id}`);
        if (sel && HITOS[v]) sel.value = String(v);
      });
      actualizarBotonComprobar();
      if (estado.resultadoFinal.length) {
        prepararExplicacion("actividad", true, estado.explicaciones.actividad);
        document.getElementById("btn-resumen").disabled = !explicacionValida("actividad");
      }
    }

    // Producto final ya validado: se reconstruye en su estado resuelto.
    const pv = d.propuestaValidada;
    if (pv && pv.ids) {
      poblarPropuesta();
      ["estrategia", "justificacion", "evidencia"].forEach((tipo) => {
        const bloque = document.querySelector(`#banda-bloques .bloque[data-id="${window.CSS && CSS.escape ? CSS.escape(String(pv.ids[tipo])) : String(pv.ids[tipo])}"]`);
        if (bloque) colocarBloque(bloque, document.getElementById(`ranura-${tipo}`));
      });
      if (document.querySelectorAll(".ranura.tiene-bloque").length === 3) validarPropuesta();
    }

    if (nombre && evaluarNombre(nombre).valido && estado.grado) {
      const puedeCierre = d.pantalla === "screen-cierre" && (estado.propuestaValidada || estado.propuestaOmitida);
      if (puedeCierre) {
        generarResumen();
        mostrarPantalla("screen-cierre", "Progreso recuperado. Resumen causal abierto.");
      } else {
        mostrarPantalla("screen-mapa", "Progreso recuperado. Mapa abierto.");
      }
    }
  } catch (e) {
    // Datos dañados: se empieza de cero sin romper la página.
    borrarProgreso();
  }
  restaurandoProgreso = false;
  if (primerSinEnviar && estado.primerResultado) encolarResultado(estado.primerResultado);
  guardarProgreso();
}

window.addEventListener("pagehide", guardarProgreso);

renderTimeline();
inicializarExplicaciones();
inicializarAudio();
actualizarMapa();
restaurarProgreso();
enviarPendientes();

