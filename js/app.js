/* ==========================================================================
   De ARPANET al feed · RED-1011-N-25
   LÓGICA DEL RECURSO — navegación, preguntas, actividad, producto final,
   nota, código de desempeño, reporte, panel docente y progreso guardado.
   Requiere js/data.js (HITOS, TRANSFORMACIONES_POOL, BLOQUES_*).
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
  // Explicaciones escritas del estudiante (nunca entran en el código RD).
  explicaciones: { hito: {}, actividad: "", propuesta: "" },
  codigoDesempeno: null,
  // Resultado del PRIMER recorrido completo (se fija al llegar al cierre por
  // primera vez); "Recorrer de nuevo" no lo borra.
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
  if (id !== "screen-docente" && id !== "screen-guia") {
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
// EVALUACIÓN DOCENTE — desempeño y reporte descargable
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

// La nota y el código usan el resultado del PRIMER recorrido completo, si existe.
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

// ============================================================
// CÓDIGO CORTO PARA EL PANEL DOCENTE
// ------------------------------------------------------------
// Formato RD-XXX-XXXX (11 caracteres, sin 0/O/1/I/L). Los 3 primeros
// caracteres guardan los conteos de errores desplazados por un hash del
// nombre normalizado; los 4 últimos son un checksum FNV-1a sobre
// nombre + núcleo + sal. Así el código solo es válido para el nombre con
// el que se generó y no se puede inventar a mano con facilidad.
// ============================================================
const CODIGO_ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODIGO_BASE = CODIGO_ALFABETO.length; // 31
const CODIGO_SAL = "ARPANET>feed|1011-N-25|cadena-causal";
const CODIGO_MAX = { pregunta: 12, transformacion: 6, aplicacion: 5, argumentacion: 5 };
const CODIGO_COMBINACIONES = 13 * 7 * 6 * 6 * 2; // 6552
const CODIGO_ESPACIO_NUCLEO = CODIGO_BASE * CODIGO_BASE * CODIGO_BASE; // 29791
const CODIGO_ESPACIO_CHECK = CODIGO_ESPACIO_NUCLEO * CODIGO_BASE; // 923521

function fnv1a(texto, semilla) {
  let h = (semilla === undefined ? 0x811c9dc5 : semilla) >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Mezcla final para repartir mejor los bits bajos.
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}

function normalizarNombre(nombre) {
  return String(nombre || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aAlfabeto(n, largo) {
  let s = "";
  for (let i = 0; i < largo; i++) { s = CODIGO_ALFABETO[n % CODIGO_BASE] + s; n = Math.floor(n / CODIGO_BASE); }
  return s;
}

function desdeAlfabeto(s) {
  let n = 0;
  for (const ch of s) {
    const v = CODIGO_ALFABETO.indexOf(ch);
    if (v < 0) return -1;
    n = n * CODIGO_BASE + v;
  }
  return n;
}

function empaquetarConteos(c) {
  const q = Math.min(c.pregunta, CODIGO_MAX.pregunta);
  const t = Math.min(c.transformacion, CODIGO_MAX.transformacion);
  const ap = Math.min(c.aplicacion, CODIGO_MAX.aplicacion);
  const ar = Math.min(c.argumentacion, CODIGO_MAX.argumentacion);
  const om = c.omitida ? 1 : 0;
  return q + 13 * (t + 7 * (ap + 6 * (ar + 6 * om)));
}

function desempaquetarConteos(n) {
  const pregunta = n % 13; n = Math.floor(n / 13);
  const transformacion = n % 7; n = Math.floor(n / 7);
  const aplicacion = n % 6; n = Math.floor(n / 6);
  const argumentacion = n % 6; n = Math.floor(n / 6);
  return { pregunta, transformacion, aplicacion, argumentacion, omitida: n === 1 };
}

function checksumCodigo(nombreNorm, nucleo) {
  const a = fnv1a(`${nombreNorm}|${nucleo}|${CODIGO_SAL}`);
  const b = fnv1a(`${CODIGO_SAL}#${nucleo}#${nombreNorm}`, a);
  return aAlfabeto(b % CODIGO_ESPACIO_CHECK, 4);
}

function generarCodigoDesde(nombre, c) {
  const nombreNorm = normalizarNombre(nombre);
  const desplazamiento = fnv1a(`${nombreNorm}|${CODIGO_SAL}`) % CODIGO_ESPACIO_NUCLEO;
  const nucleo = aAlfabeto((empaquetarConteos(c) + desplazamiento) % CODIGO_ESPACIO_NUCLEO, 3);
  return `RD-${nucleo}-${checksumCodigo(nombreNorm, nucleo)}`;
}

function generarCodigoDesempeno() {
  const nombre = estado.primerResultado ? estado.primerResultado.nombre : estado.nombreEstudiante;
  return generarCodigoDesde(nombre, conteosParaNota());
}

// Decodifica un código para un nombre concreto. Devuelve
// { ok: true, codigo, nota, desempeno } o { ok: false, motivo }.
function decodificarCodigoDesempeno(codigoOriginal, nombre) {
  const limpio = String(codigoOriginal || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^RD/, "");
  if (limpio.length !== 7 || desdeAlfabeto(limpio) < 0) return { ok: false, motivo: "formato" };
  const nucleo = limpio.slice(0, 3);
  const check = limpio.slice(3);
  const nombreNorm = normalizarNombre(nombre);
  if (checksumCodigo(nombreNorm, nucleo) !== check) return { ok: false, motivo: "nombre" };
  const desplazamiento = fnv1a(`${nombreNorm}|${CODIGO_SAL}`) % CODIGO_ESPACIO_NUCLEO;
  const empaquetado = (desdeAlfabeto(nucleo) - desplazamiento + CODIGO_ESPACIO_NUCLEO) % CODIGO_ESPACIO_NUCLEO;
  if (empaquetado >= CODIGO_COMBINACIONES) return { ok: false, motivo: "nombre" };

  const c = desempaquetarConteos(empaquetado);
  return { ok: true, codigo: `RD-${nucleo}-${check}`, nota: calcularNotaDesde(c), desempeno: calcularDesempenoDesde(c) };
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

  const bloquesSkill = construirBloquesSkill();
  const escritasHTML = bloquesSkill.length
    ? bloquesSkill.map((b) => `<div class="bloque"><div class="bloque-head"><strong>${escaparHTML(b.titulo)}</strong><button type="button" class="copiar">Copiar para Tutor Feed</button></div><pre>${escaparHTML(b.texto)}</pre></div>`).join("")
    : `<p>No hay respuestas escritas guardadas.</p>`;

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
  .meta .codigo strong { font-family: var(--mono); letter-spacing: 0.04em; }
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
  .skill-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .skill-ayuda { font-size: 0.88rem; color: var(--ink-2); margin: 0 0 12px; overflow-wrap: anywhere; }
  .bloque { border: 1px solid var(--rule); border-radius: 14px; background: #fff; padding: 12px 14px; margin: 0 0 12px; }
  .bloque-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
  pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-family: var(--mono); font-size: 0.82rem; line-height: 1.55; color: var(--ink); background: #F3F5FC; border-radius: 10px; padding: 10px 12px; }
  button.copiar { font: inherit; font-size: 0.85rem; font-weight: 700; color: var(--on-dark); background: var(--grad-box); border: 1px solid var(--rose-gold); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
  button.copiar:active { transform: scale(0.97); }
  button.copiar:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
  .copiar-estado { font-size: 0.85rem; color: var(--green); font-weight: 700; min-height: 1.2em; margin: 0; }
  @media print { button.copiar { display: none; } }
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
      <div><span>Fecha</span><strong>${escaparHTML(fecha)}</strong></div>
      <div class="codigo"><span>Código</span><strong>${escaparHTML(generarCodigoDesempeno())}</strong></div>
    </div>
  </header>

  <section>
    <h2>Resultado general</h2>
    <div class="nota-hero">
      <div class="nota-numero">${nota.promedio.toFixed(1)}<small>/ 5.0</small></div>
      <div class="nota-texto">
        <span class="nota-nivel">${escaparHTML(d.nivel)}</span>
        <p>${escaparHTML(d.mensaje)}</p>${estado.recorridoRepetido && estado.primerResultado ? `
        <p><strong>Nota del primer recorrido.</strong> El estudiante repitió la ruta; se conserva el resultado de su primer intento.</p>` : ""}
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

  <section class="skill">
    <div class="skill-head"><h2>Respuestas escritas para Tutor Feed</h2>${bloquesSkill.length ? '<button type="button" class="copiar" data-todo>Copiar todo</button>' : ""}</div>
    <p class="skill-ayuda">Para la docente: abre la skill Tutor Feed (${escaparHTML(TUTOR_FEED_URL)}) y pega un bloque por mensaje. La skill da retroalimentación y pistas; no pone notas.</p>
    ${escritasHTML}
    <p class="copiar-estado" role="status"></p>
  </section>

  <section>
    <h2>Retroalimentación y siguiente paso</h2>
    <p>${escaparHTML(d.siguientePaso)}</p>
  </section>

  <p class="aviso">Nota referencial generada automáticamente por el RED según pistas usadas durante el recorrido. No reemplaza el criterio de evaluación docente.</p>

</main>
<script>
(function () {
  function seleccionar(el) { try { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }
  function aviso(t) { var e = document.querySelector(".copiar-estado"); if (e) e.textContent = t; }
  function copiar(texto, el, btn) {
    function listo() { aviso("Copiado. Pégalo en Tutor Feed, un bloque por mensaje."); var o = btn.textContent; btn.textContent = "Copiado"; setTimeout(function () { btn.textContent = o; }, 1800); }
    function respaldo() {
      try { var t = document.createElement("textarea"); t.value = texto; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); var ok = document.execCommand("copy"); document.body.removeChild(t); if (ok) { listo(); return; } } catch (e) {}
      seleccionar(el); aviso("No se pudo copiar automáticamente. El texto quedó seleccionado: cópialo con Ctrl+C.");
    }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(texto).then(listo, respaldo); } else { respaldo(); }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("button.copiar") : null;
    if (!b) return;
    if (b.hasAttribute("data-todo")) {
      var pres = Array.prototype.slice.call(document.querySelectorAll(".skill pre"));
      copiar(pres.map(function (p) { return p.textContent; }).join("\\n\\n"), document.querySelector(".skill"), b);
    } else {
      var p = b.closest(".bloque").querySelector("pre");
      copiar(p.textContent, p, b);
    }
  });
})();
</script>
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
// Guarda el resultado del primer recorrido la primera vez que se llega al cierre.
function fijarPrimerResultado() {
  if (estado.primerResultado) return;
  estado.primerResultado = {
    nombre: estado.nombreEstudiante,
    conteos: conteosActuales(),
    fecha: new Date().toISOString(),
  };
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
    ? `<p><strong>Nota del primer recorrido:</strong> repetiste la ruta para practicar; la nota y el código corresponden a tu primer recorrido.</p>`
    : "";
  detalleWrap.innerHTML = `${avisoRepetido}<p>${escaparHTML(d.mensaje)}</p><ul>${d.detalle.map((l) => `<li>${escaparHTML(l)}</li>`).join("")}</ul><p><strong>Siguiente paso:</strong> ${escaparHTML(d.siguientePaso)}</p>`;

  estado.codigoDesempeno = generarCodigoDesempeno();
  document.getElementById("codigo-desempeno").textContent = estado.codigoDesempeno;
  document.getElementById("codigo-copiado-msg").hidden = true;

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
  renderBloquesSkill(document.getElementById("resumen-escritas"), construirBloquesSkill(), "Aún no hay respuestas escritas guardadas.");
  guardarProgreso();
  // Los créditos de imagen ya están fijos en el HTML de la pantalla de créditos
  // (no dependen de haber llegado hasta aquí para existir).
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
// (se escapan al mostrarse y nunca entran en el código RD)
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
// Bloques para la skill docente Tutor Feed (una línea por campo)
// ------------------------------------------------------------
function formatearBloqueSkill(parte, pregunta, respuesta) {
  const limpia = String(respuesta).replace(/\s+/g, " ").trim();
  return {
    titulo: parte,
    texto: [
      `Hito o parte: ${parte}`,
      `Pregunta: ${pregunta}`,
      `Respuesta del estudiante: "${limpia}"`,
      "Criterios: por defecto",
      `Grado: ${estado.grado || "(sin grado)"}`,
    ].join("\n"),
  };
}

function construirBloquesSkill() {
  const bloques = [];
  Object.keys(HITOS).forEach((n) => {
    const texto = estado.explicaciones.hito[n];
    if (texto) bloques.push(formatearBloqueSkill(`Hito ${String(n).padStart(2, "0")} · ${HITOS[n].titulo} (${HITOS[n].anio})`, CONSIGNAS.hito, texto));
  });
  if (estado.explicaciones.actividad) bloques.push(formatearBloqueSkill("Actividad de relaciones", CONSIGNAS.actividad, estado.explicaciones.actividad));
  if (estado.explicaciones.propuesta && estado.propuestaValidada) bloques.push(formatearBloqueSkill("Recomendación final", CONSIGNAS.propuesta, estado.explicaciones.propuesta));
  return bloques;
}

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
    anunciar("Copiado. Pégalo en Tutor Feed, un bloque por mensaje.");
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

// ------------------------------------------------------------
// Guía docente y separador de bloques pegados
// ------------------------------------------------------------
function montarGuias() {
  const plantilla = document.getElementById("tpl-guia");
  ["guia-publica", "guia-dashboard"].forEach((id) => {
    const destino = document.getElementById(id);
    if (destino && plantilla) destino.appendChild(plantilla.content.cloneNode(true));
  });
  document.querySelectorAll(".guia-casos-lista").forEach((lista) => renderCasosPrueba(lista));
}

// Casos de prueba documentados: mensaje exacto + qué se esperaba + qué pasó.
function renderCasosPrueba(lista) {
  lista.innerHTML = "";
  CASOS_PRUEBA.forEach((caso, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", i);
    const art = document.createElement("article");
    art.className = "bloque-skill caso-prueba";
    const head = document.createElement("div");
    head.className = "bloque-skill-head";
    const titulo = document.createElement("strong");
    titulo.textContent = caso.titulo;
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "button button-secondary";
    boton.dataset.action = "copiar-bloque";
    boton.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg> Copiar para Tutor Feed';
    boton.setAttribute("aria-label", `Copiar para Tutor Feed: ${caso.titulo}`);
    head.append(titulo, boton);
    const etiqueta = document.createElement("p");
    etiqueta.className = "caso-etiqueta";
    etiqueta.textContent = "Mensaje enviado a la skill";
    const pre = document.createElement("pre");
    pre.className = "bloque-texto";
    pre.textContent = caso.mensaje;
    const dl = document.createElement("dl");
    dl.className = "caso-detalle";
    const dt1 = document.createElement("dt"); dt1.textContent = "Qué se esperaba";
    const dd1 = document.createElement("dd"); dd1.textContent = caso.esperado;
    const dt2 = document.createElement("dt"); dt2.textContent = "Qué pasó y qué se ajustó";
    const dd2 = document.createElement("dd");
    const ul = document.createElement("ul");
    caso.resultado.forEach((linea) => { const item = document.createElement("li"); item.textContent = linea; ul.appendChild(item); });
    dd2.appendChild(ul);
    dl.append(dt1, dd1, dt2, dd2);
    art.append(head, etiqueta, pre, dl);
    li.appendChild(art);
    lista.appendChild(li);
  });
}

function parsearBloquesSkill(texto) {
  const campos = [
    ["parte", /^hito\s+o\s+parte\s*:\s*/i],
    ["pregunta", /^pregunta\s*:\s*/i],
    ["respuesta", /^respuesta\s+del\s+estudiante\s*:\s*/i],
    ["criterios", /^criterios\s*:\s*/i],
    ["grado", /^grado\s*:\s*/i],
  ];
  const lineas = String(texto || "").replace(/\r\n?/g, "\n").split("\n")
    .map((l) => l.replace(/^[\s>*•·\-–—]+/, "").replace(/\s+$/, ""));
  const encontrados = [];
  let actual = null;
  let campo = null;
  lineas.forEach((linea) => {
    const coincide = campos.find(([, re]) => re.test(linea));
    if (coincide) {
      if (coincide[0] === "parte") { actual = {}; encontrados.push(actual); }
      if (!actual) return;
      campo = coincide[0];
      actual[campo] = linea.replace(coincide[1], "").trim();
    } else if (!linea.trim()) {
      campo = null;
    } else if (actual && (campo === "respuesta" || campo === "pregunta")) {
      actual[campo] += ` ${linea.trim()}`;
    }
  });
  return encontrados
    .filter((b) => b.parte && b.respuesta)
    .map((b) => {
      const resp = `"${b.respuesta.trim().replace(/^["“]|["”]$/g, "")}"`;
      return {
        titulo: b.parte,
        texto: [
          `Hito o parte: ${b.parte}`,
          `Pregunta: ${b.pregunta || ""}`,
          `Respuesta del estudiante: ${resp}`,
          `Criterios: ${b.criterios || "por defecto"}`,
          `Grado: ${b.grado || ""}`,
        ].join("\n"),
      };
    });
}

function separarBloquesPegados() {
  const bloques = parsearBloquesSkill(document.getElementById("input-pegar").value);
  const estadoEl = document.getElementById("pegar-estado");
  renderBloquesSkill(document.getElementById("pegar-bloques"), bloques, "No encontré bloques. Revisa que el texto incluya líneas como \"Hito o parte:\" y \"Respuesta del estudiante:\".");
  estadoEl.className = "explica-estado";
  estadoEl.textContent = bloques.length
    ? `Encontré ${bloques.length} bloque${bloques.length === 1 ? "" : "s"}. Copia uno a la vez y pégalo en Tutor Feed.`
    : "No encontré bloques en el texto pegado.";
  estadoEl.classList.add(bloques.length ? "is-ok" : "is-error");
}

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
    case "copiar-codigo":
      copiarCodigoDesempeno();
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
    case "go-guia":
      mostrarPantalla("screen-guia", "Guía docente para retroalimentar con IA.");
      break;
    case "guardar-explicacion":
      guardarExplicacion(btn.dataset.parte);
      break;
    case "copiar-bloque": {
      const pre = btn.closest(".bloque-skill").querySelector(".bloque-texto");
      copiarTexto(pre.textContent, pre, btn);
      break;
    }
    case "copiar-todo": {
      const bloques = construirBloquesSkill();
      copiarTexto(bloques.map((b) => b.texto).join("\n\n"), document.getElementById("resumen-escritas"), btn);
      break;
    }
    case "cargar-prueba":
      cargarRegistrosPrueba();
      break;
    case "quitar-prueba":
      quitarRegistrosPrueba();
      break;
    case "separar-bloques":
      separarBloquesPegados();
      break;
    case "vaciar-docente":
      vaciarRegistrosDocente();
      break;
    case "eliminar-fila-docente":
      eliminarRegistroDocente(Number(btn.dataset.indice));
      break;
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
// PANEL DOCENTE — acceso restringido y dashboard de desempeño
// ============================================================
// Solo se guarda un hash de la clave docente (nunca la clave en texto plano).
// Se usa siempre el mismo hash JS propio para que funcione igual en file://.
const DOCENTE_CLAVE_HASH = "1d3393b986604b69";

function hashClaveDocente(clave) {
  const texto = String(clave || "").trim().toUpperCase();
  let a = fnv1a(`red1011n25|docente|${texto}`, 0x811c9dc5);
  let b = fnv1a(`${texto}|panel|n25red`, 0x9747b28c);
  for (let i = 0; i < 2000; i++) {
    a = fnv1a(`${a.toString(16)}:${b.toString(16)}:${texto}`, a ^ 0x5bd1e995);
    b = fnv1a(`${b.toString(16)};${a.toString(16)};${texto}`, b ^ 0x27d4eb2f);
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

function sesionDocenteActiva() {
  try { return sessionStorage.getItem(DOCENTE_SESION_KEY) === "1"; } catch (e) { return !!window.__docenteSesionMemoria; }
}

function fijarSesionDocente(activa) {
  window.__docenteSesionMemoria = activa;
  try {
    if (activa) sessionStorage.setItem(DOCENTE_SESION_KEY, "1");
    else sessionStorage.removeItem(DOCENTE_SESION_KEY);
  } catch (e) { /* sin sessionStorage: la sesión vive solo en memoria */ }
}
const DOCENTE_STORAGE_KEY = "red1011n25_panel_docente";
const DOCENTE_SESION_KEY = "red1011n25_docente_autenticada";

function copiarCodigoDesempeno() {
  const codigo = estado.codigoDesempeno || document.getElementById("codigo-desempeno").textContent;
  const mostrarConfirmacion = () => {
    const msg = document.getElementById("codigo-copiado-msg");
    msg.hidden = false;
    anunciar("Código copiado.");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(codigo).then(mostrarConfirmacion).catch(() => {
      window.prompt("Copia este código manualmente:", codigo);
    });
  } else {
    window.prompt("Copia este código manualmente:", codigo);
  }
}

function abrirPantallaDocente() {
  const autenticada = sesionDocenteActiva();
  document.getElementById("docente-bloqueado").hidden = autenticada;
  document.getElementById("docente-dashboard").hidden = !autenticada;
  document.getElementById("docente-error").textContent = "";
  const inputClave = document.getElementById("input-clave-docente");
  inputClave.value = "";
  if (autenticada) {
    renderTablaDocente();
  }
  mostrarPantalla("screen-docente", autenticada ? "Panel docente abierto." : "Ingresa el código de acceso docente.");
  if (!autenticada) inputClave.focus();
}

function verificarClaveDocente() {
  const inputClave = document.getElementById("input-clave-docente");
  const error = document.getElementById("docente-error");
  if (hashClaveDocente(inputClave.value) === DOCENTE_CLAVE_HASH) {
    fijarSesionDocente(true);
    error.textContent = "";
    document.getElementById("docente-bloqueado").hidden = true;
    document.getElementById("docente-dashboard").hidden = false;
    renderTablaDocente();
    anunciar("Acceso docente concedido. Dashboard de desempeño abierto.");
  } else {
    error.textContent = "Código incorrecto. Verifica con la coordinación del reto si no lo tienes.";
    inputClave.value = "";
    inputClave.focus();
  }
}

function cerrarSesionDocente() {
  fijarSesionDocente(false);
  mostrarPantalla("screen-bienvenida", "Sesión docente cerrada.");
}

function leerRegistrosDocente() {
  try {
    const datos = JSON.parse(localStorage.getItem(DOCENTE_STORAGE_KEY) || "[]");
    return Array.isArray(datos) ? datos : [];
  } catch (e) {
    return [];
  }
}

function guardarRegistrosDocente(registros) {
  try {
    localStorage.setItem(DOCENTE_STORAGE_KEY, JSON.stringify(registros));
  } catch (e) {
    anunciar("No se pudo guardar en este equipo (almacenamiento no disponible).");
  }
}

function renderTablaDocente() {
  const registros = leerRegistrosDocente();
  const cuerpo = document.getElementById("docente-tabla-cuerpo");
  const vacio = document.getElementById("docente-vacio");
  const contador = document.getElementById("docente-contador");

  contador.textContent = `${registros.length} estudiante${registros.length === 1 ? "" : "s"} registrado${registros.length === 1 ? "" : "s"}`;

  if (registros.length === 0) {
    cuerpo.innerHTML = "";
    vacio.hidden = false;
    return;
  }
  vacio.hidden = true;

  cuerpo.innerHTML = registros
    .map((r, i) => `
      <tr>
        <td>${escaparHTML(r.nombre)}${r.prueba ? ' <span class="chip-prueba">Prueba</span>' : ""}</td>
        <td>${escaparHTML(r.fecha)}</td>
        <td>${escaparHTML((Number(r.promedio) || 0).toFixed(1))}</td>
        <td><span class="docente-nivel-chip">${escaparHTML(r.nivel)}</span></td>
        <td>${escaparHTML(r.codigo)}</td>
        <td><button class="docente-borrar" data-action="eliminar-fila-docente" data-indice="${i}">Eliminar</button></td>
      </tr>`)
    .join("");
}

function agregarRegistroDocente(evento) {
  evento.preventDefault();
  const inputNombre = document.getElementById("input-nombre-docente");
  const inputCodigo = document.getElementById("input-codigo-docente");
  const errorWrap = document.getElementById("docente-form-error");

  const nombre = inputNombre.value.trim().replace(/\s+/g, " ");
  const decodificado = decodificarCodigoDesempeno(inputCodigo.value, nombre);

  if (!nombre) {
    errorWrap.textContent = "Escribe el nombre del estudiante.";
    inputNombre.focus();
    return;
  }
  if (!decodificado.ok && decodificado.motivo === "formato") {
    errorWrap.textContent = "Ese código no es válido. Revisa que esté completo y bien escrito (formato RD-XXX-XXXX).";
    inputCodigo.focus();
    return;
  }
  if (!decodificado.ok) {
    errorWrap.textContent = "El código no corresponde a ese nombre. Escribe el nombre tal como el estudiante lo registró en la ruta y revisa el código.";
    inputCodigo.focus();
    return;
  }

  errorWrap.textContent = "";
  const registros = leerRegistrosDocente();
  registros.unshift({
    nombre,
    codigo: decodificado.codigo,
    promedio: decodificado.nota.promedio,
    nivel: decodificado.desempeno.nivel,
    fecha: new Date().toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }),
  });
  guardarRegistrosDocente(registros);
  renderTablaDocente();

  inputNombre.value = "";
  inputCodigo.value = "";
  inputNombre.focus();
  anunciar(`${nombre} agregado al dashboard de desempeño.`);
}

// Registros de prueba: solo se agregan con su botón y solo se quitan esas filas.
function cargarRegistrosPrueba() {
  const reales = leerRegistrosDocente().filter((r) => !r.prueba);
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
  const pruebas = REGISTROS_PRUEBA.map((p) => {
    const codigo = generarCodigoDesde(p.nombre, p.conteos);
    const d = decodificarCodigoDesempeno(codigo, p.nombre);
    return { nombre: p.nombre, codigo: d.codigo, promedio: d.nota.promedio, nivel: d.desempeno.nivel, fecha, prueba: true };
  });
  guardarRegistrosDocente([...pruebas, ...reales]);
  renderTablaDocente();
  document.getElementById("input-pegar").value = REGISTROS_PRUEBA.map((p) => p.bloque).join("\n\n");
  separarBloquesPegados();
  anunciar("Se cargaron 2 registros de prueba y sus respuestas quedaron separadas en bloques.");
}

function quitarRegistrosPrueba() {
  const registros = leerRegistrosDocente();
  const reales = registros.filter((r) => !r.prueba);
  guardarRegistrosDocente(reales);
  renderTablaDocente();
  anunciar(`${registros.length - reales.length} registro(s) de prueba quitados. Los registros reales no cambiaron.`);
}

function eliminarRegistroDocente(indice) {
  const registros = leerRegistrosDocente();
  if (indice < 0 || indice >= registros.length) return;
  if (!window.confirm(`¿Eliminar el registro de ${registros[indice].nombre}?`)) return;
  registros.splice(indice, 1);
  guardarRegistrosDocente(registros);
  renderTablaDocente();
}

function vaciarRegistrosDocente() {
  if (!window.confirm("¿Vaciar todos los registros guardados en este equipo? Esta acción no se puede deshacer.")) return;
  guardarRegistrosDocente([]);
  renderTablaDocente();
}

function exportarCSVDocente() {
  const registros = leerRegistrosDocente();
  if (registros.length === 0) {
    window.alert("Aún no hay registros para exportar.");
    return;
  }
  const encabezado = ["Estudiante", "Fecha", "Nota", "Nivel", "Código", "Tipo de registro"];
  const filas = registros.map((r) => [r.nombre, r.fecha, (Number(r.promedio) || 0).toFixed(1), r.nivel, r.codigo, r.prueba ? "Prueba" : "Real"]);
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dashboard-desempeno-RED-1011-N-25.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById("form-docente").addEventListener("submit", agregarRegistroDocente);
document.getElementById("input-clave-docente").addEventListener("keydown", (e) => {
  if (e.key === "Enter") verificarClaveDocente();
});

// ============================================================
// RESTAURAR PROGRESO GUARDADO (si existe)
// ============================================================
var restaurandoProgreso = false;

function restaurarProgreso() {
  const d = leerProgreso();
  if (!d || d.v !== 2) return;
  restaurandoProgreso = true;
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
      };
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
  guardarProgreso();
}

window.addEventListener("pagehide", guardarProgreso);

renderTimeline();
montarGuias();
inicializarExplicaciones();
inicializarAudio();
actualizarMapa();
restaurarProgreso();

