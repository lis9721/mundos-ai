# PROMPT.md — Bitácora de Desarrollo con Inteligencia Artificial

## A. Declaración

Usé IA: sí.

---

## B. Herramienta y modelo

- **Herramienta:** Asistente de programación Antigravity (Google DeepMind).
- **Modelo:** Gemini 3.8 Flash (High).
- **Seguridad:** En ningún momento se enviaron, imprimieron ni almacenaron claves API reales dentro de los prompts, código versionado ni capturas.

---

## C. Prompt inicial completo (copiado literal)

```text
Actúa como un instructor de Node.js para principiantes del SENA.
Quiero construir un programa de consola llamado "mundos-ia".

CONTEXTO: solo conozco estos temas: process.argv, módulos con require,
el módulo nativo fs (writeFileSync, readFileSync, existsSync, mkdirSync),
path, npm (init, install, scripts), el paquete object-hash, variables de
entorno con .env y process.loadEnvFile, async/await con try/catch y el fetch
nativo de Node.

OBJETIVO:
1. Recibir por parámetros una situación, un mundo y 5 colores, y guardarlos
   en un objeto JSON en data/mundo_<id>.json.
2. Leer ese JSON y enviarlo con fetch a la API de un modelo de lenguaje para
   que genere la descripción de una imagen. Guardarla en
   descripciones/mundo_<id>.txt.
3. Enviar esa descripción con fetch a la API de un modelo de imágenes y
   guardar la imagen en imagenes/mundo_<id>.jpg.

RESTRICCIONES:
- No uses dotenv, axios, SDK de proveedores, readline, commander ni frameworks.
- Código simple, con comentarios en español numerados ("paso 1", "paso 2"...).
- Las API keys se leen del archivo .env y nunca se escriben en el código.
- Si el .txt o la imagen ya existen, no vuelvas a llamar a las APIs.
- Divide el código en src/index.js, src/mundo.js, src/texto.js y src/imagen.js.

SERVICIOS: texto con Groq (modelo openai/gpt-oss-20b), imagen con NVIDIA FLUX.1-schnell (https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell).

FORMA DE RESPONDER: dame un archivo a la vez, explica cada bloque en 2 líneas
y no uses nada que no esté en el CONTEXTO.
```

---

## D. Prompts siguientes e iteraciones principales

### 1. Iteración 1: Verificación de dependencias y variables de entorno nativas
- **Prompt:** *"Revisa que el proyecto no use ninguna librería prohibida, que solo instale object-hash y que use process.loadEnvFile nativo de Node 20 para leer el .env."*
- **Respuesta de la IA:** Confirmó el uso exclusivo de `object-hash` en `package.json`, configuró `process.loadEnvFile(path.join(RAIZ, '.env'))` dentro de `src/index.js` y dejó el script `start` como `node src/index.js`.
- **Qué hice con la respuesta:** Verifiqué que `package.json` tuviera únicamente `object-hash` en las dependencias y creé el archivo `.env.example` con los nombres de variables sin valores reales.

### 2. Iteración 2: Solución de fallo en el Paso 3 con NVIDIA FLUX.1-schnell
- **Prompt:** *"Al ejecutar el comando de ejemplo con los colores rojo azul verde dorado violeta, el paso 1 y 2 se guardan, pero el paso 3 falla diciendo que finishReason es CONTENT_FILTERED. ¿Por qué ocurre y cómo lo solucionamos?"*
- **Respuesta de la IA:** Explicó que el filtro de moderación de contenido de NVIDIA tiene una heurística estricta que confunde la palabra en inglés 'violet' con raíces de términos violentos ('violent/violation'). Propuso actualizar el prompt de sistema en `texto.js` para pedirle al LLM que traduzca 'violeta' como 'purple' o 'deep violet-purple', y añadir un reemplazo defensivo en `imagen.js`.
- **Qué hice con la respuesta:** Implementé la instrucción en el `SISTEMA` de `src/texto.js` y el `.replace(/\bviolet\b/gi, 'purple')` en `src/imagen.js`. Al reintentar, la API de NVIDIA devolvió `HTTP 200`, `finishReason: SUCCESS` y entregó la imagen completa.

### 3. Iteración 3: Organización modular estricta de la rúbrica (4 módulos)
- **Prompt:** *"La rúbrica califica con 8 puntos 'Cuatro módulos con responsabilidades separadas (index orquesta, mundo, texto, imagen)'. Anteriormente se había pensado crear un archivo adicional errores.js. ¿Cómo organizamos el código para que sean exactamente los cuatro archivos solicitados?"*
- **Respuesta de la IA:** Propuso integrar la función `explicarError` directamente dentro de `src/index.js`, ya que el orquestador es quien captura las excepciones en su bloque `try/catch` y decide cómo reportarlas al usuario.
- **Qué hice con la respuesta:** Eliminé `src/errores.js`, trasladé la lógica de traducción de errores a `src/index.js` y comprobé que la carpeta `src/` tuviera exactamente los 4 archivos requeridos.

---

## E. Cambios propios realizados sobre lo entregado por la IA

1. **Sanitización del término 'violet' en `src/imagen.js` y prompt de `src/texto.js`:**
   Detecté que la traducción literal del color del taller ("violeta" -> "violet") provocaba que el filtro de seguridad de NVIDIA marcara la solicitud como `CONTENT_FILTERED`. Ajusté el sistema para sustituir dicho término por "purple", logrando una generación de imagen 100% exitosa sin alterar el diseño visual.
2. **Consolidación de `explicarError` en `src/index.js`:**
   Rechacé la idea de mantener un quinto módulo `src/errores.js` para apegarme fielmente a la rúbrica que exige exactamente 4 módulos (`index.js`, `mundo.js`, `texto.js` e `imagen.js`).
3. **Normalización de colores a minúsculas en `src/mundo.js`:**
   La versión inicial solo verificaba si los colores eran distintos usando `new Set` sin transformar el caso del texto en el objeto resultante. Modifiqué la función `crearMundo` para mapear los colores con `.toLowerCase().trim()`. Así se garantiza que colores como "Rojo" y "rojo" sean detectados como duplicados y que el cálculo del hash sea determinista e inmune a cambios de mayúsculas/minúsculas.

---

## F. Línea de código explicada

```javascript
const bytes = Buffer.from(resultado.base64, 'base64');
```

**Explicación con mis palabras:**
Las APIs web basadas en JSON (como NVIDIA NIM o Cloudflare) no pueden transmitir archivos binarios directamente dentro del cuerpo JSON, porque JSON solo admite texto. Para resolverlo, el servidor convierte los datos binarios de la imagen JPG en una cadena de texto imprimible mediante el algoritmo Base64.
La función `Buffer.from(resultado.base64, 'base64')` toma esa secuencia de caracteres de texto y la decodifica de vuelta a su estructura binaria pura en memoria (`Buffer`). Al escribir este buffer con `fs.writeFileSync(rutaImg, bytes)` sin pasar `'utf-8'`, el sistema operativo guarda los bytes originales del archivo JPG intactos, permitiendo que cualquier visor de imágenes pueda abrirlo sin errores de archivo dañado.

---

## G. Un error encontrado y su resolución

- **Mensaje de error observado:**
  `Error: El modelo de imágenes no pudo generar la imagen (finishReason: CONTENT_FILTERED).`
- **Causa técnica:**
  En la consulta inicial con los parámetros sugeridos en la guía del taller (`rojo azul verde dorado violeta`), el modelo de texto redactó una escena que incluía la frase *"bruised violet sky"*. La API de NVIDIA FLUX.1-schnell posee un filtro de seguridad que bloquea la palabra *"violet"* por falso positivo fonético/morfológico con términos de violencia. Al recibir ese prompt, la API respondía `HTTP 200` pero con `finishReason: "CONTENT_FILTERED"` y un buffer de imagen borrosa o vacía.
- **Solución aplicada:**
  Se modificó la plantilla de sistema en `src/texto.js` instruyendo explícitamente al modelo a emplear *"purple"* o *"deep violet-purple"*, y se agregó una salvaguarda en `src/imagen.js` ejecutando `descripcion.replace(/\bviolet\b/gi, 'purple')` antes de estructurar el payload JSON para la API. Al ejecutar nuevamente, NVIDIA devolvió `finishReason: "SUCCESS"` y la imagen se generó y guardó correctamente.
