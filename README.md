# De ARPANET al feed

**Ver el RED en línea:** https://juansebastianparranoriega3-hub.github.io/de-arpanet-al-feed/

Recurso Educativo Digital (RED) web sobre cómo internet cambió la forma en que circula la información. Sigue cuatro giros tecnológicos y los convierte en una cadena de causas y efectos que termina en una pregunta: ¿qué revisas antes de compartir algo en tu feed?

| | |
|---|---|
| **Reto** | RED-1011-N-25 · "Internet y cambio social: una explicación sistémica" |
| **Área** | Tecnología e Informática (referentes del MEN, Colombia) |
| **Grados** | 10.º y 11.º (15 a 17 años) |
| **Duración** | Una sesión de clase |
| **Funciona en** | Computador o celular (desde 360 px), con teclado y lector de pantalla |

## Objetivo de aprendizaje

Que el estudiante explique, como una cadena de causas y efectos, cómo cuatro hitos informáticos (ARPANET, la World Wide Web, el internet móvil y las plataformas sociales) transformaron la circulación de la información, y que use esa explicación para argumentar una recomendación y pensar críticamente antes de compartir contenido.

## Ruta pedagógica

1. **Bienvenida.** El estudiante escribe su nombre completo (nombre y apellido), puede leer cómo funciona el recorrido y consultar la rúbrica.
2. **Mapa de la ruta.** Cuatro hitos que se abren en cualquier orden. El hito 01 trae un ejemplo resuelto de cómo se razona una causa y su efecto.
   - 1969 · Nacimiento de internet (ARPANET)
   - 1989 · La World Wide Web
   - 2000s · Masificación del internet móvil
   - 2000s a hoy · Auge de plataformas y redes sociales
3. **Cada hito.** Imagen, narración en audio con transcripción completa, la relación causa → efecto y una pregunta (elegida al azar de un pequeño banco) con dos pistas progresivas.
4. **Actividad final.** Relacionar dos transformaciones sociales con el hito que las causó (el par cambia en cada recorrido).
5. **Retroalimentación.** Si hay errores, cada relación muestra una pista.
6. **Producto final.** Diseñar una recomendación para un colegio de Montería sobre el uso del celular en la jornada escolar, armando tres bloques: estrategia, justificación y evidencia.
7. **Cierre.** Resumen de la cadena causal, nivel de desempeño, nota de 1.0 a 5.0, código para la docente y reporte descargable.
8. **Créditos.**

## Rúbrica

| Criterio | Inicial | En proceso | Logrado | Sobresaliente |
|---|---|---|---|---|
| Comprensión | Necesita las dos pistas en casi todas las preguntas | Acierta con una pista en varias preguntas | Acierta la mayoría sin pistas | Acierta las 4 preguntas sin usar pistas |
| Análisis | No logra relacionar hitos con transformaciones | Relaciona con varios intentos | Relaciona las dos transformaciones correctamente | Las relaciona al primer intento |
| Aplicación | No completa la recomendación | Elige una estrategia pero sin justificarla bien | Elige una estrategia y la justifica correctamente | La justifica de forma clara, al primer intento |
| Argumentación | No conecta evidencia con su postura | Conecta evidencia parcialmente | Usa evidencia real de los hitos para defender su postura | Argumenta con precisión y sin contradicciones |

La nota es el promedio de los cuatro criterios (escala 1.0 a 5.0). Se calcula con el **primer recorrido completo**: repetir la ruta sirve para practicar, pero no cambia la nota ni el código.

## Cómo usarlo

### Estudiante

1. Abre el enlace del recurso.
2. Escribe tu nombre y apellido y pulsa **Abrir la ruta**.
3. Explora los cuatro hitos: escucha o lee, y responde la pregunta de cada uno.
4. Haz la actividad final y diseña tu recomendación.
5. Al terminar, copia el **código para tu docente** (formato `RD-XXX-XXXX`) o descarga el reporte y entrégaselo a tu profesora.

Tu avance se guarda en el navegador del equipo que estés usando: si recargas o cierras la pestaña, puedes continuar donde ibas.

### Docente

1. En la bienvenida, pulsa **Acceso docente** e ingresa el código de acceso. La docente ya lo tiene; no se publica aquí ni aparece en el código fuente (solo se guarda una huella o *hash*).
2. Escribe el nombre del estudiante tal como lo registró y el código que te muestra. El panel calcula la nota y el nivel. El código solo es válido para ese nombre.
3. Exporta los registros en CSV cuando quieras. Los registros se guardan solo en el navegador de ese equipo.

## Publicar en GitHub Pages

El sitio es estático y usa rutas relativas, así que funciona en https://juansebastianparranoriega3-hub.github.io/de-arpanet-al-feed/.

1. Sube el contenido de esta carpeta a la raíz de un repositorio.
2. En **Settings → Pages**, elige la rama `main` y la carpeta `/ (root)`.
3. El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll.

También se puede abrir `index.html` directamente desde el computador.

## Estructura del proyecto

```
.
├── index.html            Estructura de todas las pantallas
├── favicon.svg
├── .nojekyll
├── css/
│   └── styles.css        Tokens de diseño y estilos, por secciones
├── js/
│   ├── data.js           Hitos, preguntas, pistas, transformaciones y bloques
│   └── app.js            Navegación, nota, código, reporte, panel docente y progreso
└── assets/
    ├── audio/            hito-1.mp3 … hito-4.mp3 (narraciones)
    ├── img/              hito-1.jpg … hito-4.jpg
    └── fonts/            Newsreader, Atkinson Hyperlegible e IBM Plex Mono (woff2)
```

Para editar textos pedagógicos, preguntas o pistas, modifica `js/data.js`.

## Diseño y accesibilidad

El diseño toma como hilo el papel continuo de las impresoras de computador (perforaciones laterales y bandas verdes), que en la bienvenida se imprime línea por línea y termina convertido en una publicación del feed. Incluye transcripciones completas, foco visible, navegación por teclado, mensajes para lector de pantalla, estados que no dependen solo del color y respeto por la preferencia de movimiento reducido.

## Créditos

**Autores:** Juan Sebastián Parra Noriega y Ana Vega, estudiantes de la Licenciatura en Informática y Medios Audiovisuales, Universidad de Córdoba (Montería, Colombia).

**Contenido:** Historia general de ARPANET, la World Wide Web, el internet móvil y las plataformas sociales, adaptada para uso educativo.

**Imágenes**

- "A sketch of the ARPANET in December 1969", de Wikimedia Commons, en dominio público (Public Domain Mark 1.0).
- "First Web Server.jpg", foto de Coolcaesar, de Wikimedia Commons, con licencia CC BY-SA 3.0 Unported.
- "Smartphone Use.jpg", de Wikimedia Commons, en dominio público (CC0).
- "ISPMESM,AurangabadWksp5.jpg" (2017), de la categoría Marathi Wikipedia Workshops in Maharashtra en Wikimedia Commons, con licencia CC BY-SA 4.0.

**Tipografías:** Newsreader, Atkinson Hyperlegible e IBM Plex Mono, de Google Fonts, con licencia SIL Open Font License 1.1.

**Licencia del recurso:** Creative Commons BY-SA.
