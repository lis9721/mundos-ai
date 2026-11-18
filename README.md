# mundos-ia

Programa de consola en Node.js que genera mundos imaginarios a partir de parámetros. Recibe una situación, un mundo y 5 colores, los valida y los guarda en un archivo JSON estructurado; posteriormente consulta un modelo de lenguaje gratuito para redactar la descripción artística de una escena en inglés, y finalmente envía dicha descripción a un modelo de generación de imágenes para obtener y almacenar la imagen en formato JPG de alta resolución.

El programa implementa un sistema inteligente de ahorro de cuota: si detecta que la descripción o la imagen ya fueron generadas previamente para ese mismo mundo, omite las llamadas a las APIs correspondientes.

---

## Servicios elegidos

- **Modelo de lenguaje (Texto):** [Groq Cloud](https://console.groq.com/) consumiendo el modelo `openai/gpt-oss-20b` a través del endpoint compatible con OpenAI (`https://api.groq.com/openai/v1/chat/completions`). Ofrece alta velocidad y 30 peticiones por minuto en su capa gratuita.
- **Modelo de generación de imágenes:** [NVIDIA NIM · FLUX.1-schnell](https://build.nvidia.com/black-forest-labs/flux_1-schnell) a través de la API REST (`https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell`). Devuelve imágenes codificadas en Base64 con 4 pasos de inferencia y resolución 1024x1024.

---

## Requisitos previos e instalación

- **Node.js:** Versión 20.12 o superior (requerido para el uso nativo de `process.loadEnvFile` y `fetch`).
- **npm y Git:** Instalados en el sistema.
- **Cuentas y claves API:** Una API key de Groq y una API key de NVIDIA NIM.

### Pasos de instalación

1. Clonar el repositorio o ingresar al directorio del proyecto:
   ```bash
   cd mundos-ia
   ```

2. Instalar la única dependencia externa permitida (`object-hash`):
   ```bash
   npm install
   ```

3. Crear el archivo `.env` a partir de la plantilla:
   ```bash
   # En Windows PowerShell:
   Copy-Item .env.example .env

   # En Linux / macOS / Bash:
   cp .env.example .env
   ```

4. Abrir `.env` y configurar las claves de acceso:
   ```env
   TEXTO_API_KEY=gsk_tu_clave_de_groq_aqui
   TEXTO_URL=https://api.groq.com/openai/v1/chat/completions
   TEXTO_MODELO=openai/gpt-oss-20b
   IMAGEN_API_KEY=nvapi-tu_clave_de_nvidia_aqui
   IMAGEN_URL=https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell
   ```
   > **Nota de seguridad:** Nunca compartas ni subas tu archivo `.env`. El archivo está explícitamente ignorado en `.gitignore`.

---

## Estructura del proyecto

```text
mundos-ia/
├── data/                    # Archivos JSON con la información de los mundos (ignorado en Git)
├── descripciones/           # Descripciones en texto generadas por el LLM (ignorado en Git)
├── imagenes/                # Imágenes JPG generadas por el modelo de difusión (ignorado en Git)
├── evidencias/              # Registros y capturas solicitadas para la entrega del taller
│   ├── mundo_cba86145.jpg   # Copia de la imagen del Mundo 1
│   ├── mundo_a97b6924.jpg   # Copia de la imagen del Mundo 2
│   └── README.md            # Índice de evidencias documentadas
├── src/
│   ├── index.js             # Orquesta los 3 pasos, maneja errores y controla el flujo
│   ├── mundo.js             # Valida argumentos, genera ID determinista con hash y gestiona el JSON
│   ├── texto.js             # Consulta la API del modelo de lenguaje mediante fetch nativo
│   └── imagen.js            # Consulta la API de imágenes y convierte Base64 a Buffer binario
├── .env                     # Claves secretas de las APIs (NO se sube al repositorio)
├── .env.example             # Plantilla de variables de entorno sin valores reales
├── .gitignore               # Excluye node_modules/, .env, data/, descripciones/ e imagenes/
├── package.json             # Metadatos del paquete, scripts y dependencias mínimas
├── PROMPT.md                # Bitácora obligatoria sobre el uso y corrección de IA
└── README.md                # Documentación técnica completa y reflexiones
```

---

## Modo de uso

El programa se ejecuta a través de `npm start --` seguido de 7 argumentos obligatorios:
1. Situación (entre comillas)
2. Nombre y descripción del mundo (entre comillas)
3. Color 1
4. Color 2
5. Color 3
6. Color 4
7. Color 5

### Ejemplo de ejecución 1:

```bash
npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta
```

**Salida en consola (primera vez):**
```text
Paso 1: mundo guardado en data/mundo_cba86145.json
Paso 2: descripción guardada en descripciones/mundo_cba86145.txt
Paso 3: imagen guardada en imagenes/mundo_cba86145.jpg
Listo. Revisa la carpeta imagenes/
```

### Ejemplo de ejecución 2 (Mundo alternativo):

```bash
npm start -- "Una erupción de magma cristalino despierta a los guardianes mecánicos" "Obsidiana, un reino subterráneo de cavernas de basalto y ríos de lava fría" negro naranja turquesa cobrizo blanco
```

**Salida en consola:**
```text
Paso 1: mundo guardado en data/mundo_a97b6924.json
Paso 2: descripción guardada en descripciones/mundo_a97b6924.txt
Paso 3: imagen guardada en imagenes/mundo_a97b6924.jpg
Listo. Revisa la carpeta imagenes/
```

### Reutilización de archivos (Ahorro de cuota):

Si ejecutas de nuevo el comando de un mundo ya existente, el programa detecta los archivos generados y no consume saldo de las APIs:

```bash
npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta
```

**Salida en consola:**
```text
Paso 1: mundo guardado en data/mundo_cba86145.json
Paso 2: la descripción ya existía, no se llamó al modelo de texto.
Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.
Listo. Revisa la carpeta imagenes/
```

---

## Manejo de errores

El programa valida rigurosamente los datos de entrada y captura los errores de red y HTTP sin generar trazas técnicas confusas ni filtrar claves secretas:

| Situación | Causa / Estado | Mensaje emitido al usuario |
|---|---|---|
| Argumentos incompletos o sobrantes | Cantidad ≠ 7 | `Se esperaban 7 argumentos y llegaron N. Recuerda usar comillas...` |
| Argumentos vacíos | Cadena vacía o espacios | `Ningún argumento puede estar vacío ni contener solo espacios.` |
| Colores repetidos | Menos de 5 colores únicos | `Los 5 colores deben ser distintos (sin distinguir mayúsculas de minúsculas).` |
| Clave inválida | HTTP 401 o 403 | `Error: La API key no es válida. Revisa tu archivo .env.` |
| Límite de cuota | HTTP 402 o 429 | `Error: Superaste el límite gratuito. Espera un momento.` |
| Ruta o modelo incorrecto | HTTP 404 o 410 | `Error: El modelo o la URL no existen. Revisa tu configuración.` |
| Falla de red / DNS | `TypeError: fetch failed` | `Error: No se pudo conectar. Revisa tu internet o la URL.` |
| Tiempo excedido | `TimeoutError` | `Error: El servicio tardó demasiado en responder.` |

---

## Publicación segura y experimento con npm publish

El proyecto fue auditado con el comando `npm publish --dry-run`:

### Con `.gitignore` activo:
El empaquetador de npm utiliza automáticamente `.gitignore` (al no existir un `.npmignore`) para excluir carpetas y archivos privados. La simulación confirma que se incluyen únicamente archivos esenciales de código fuente y documentación:
```text
npm notice Tarball Contents
npm notice 200B .env.example
npm notice 2.6kB PROMPT.md
npm notice 4.1kB README.md
...
npm notice 489B package.json
npm notice 3.5kB src/imagen.js
npm notice 3.4kB src/index.js
npm notice 2.1kB src/mundo.js
npm notice 2.0kB src/texto.js
```
Los archivos `.env`, `data/`, `descripciones/` e `imagenes/` quedan completamente fuera del paquete.

### Experimento obligatorio: Renombrando a `.gitignore.off`:
Al desactivar el archivo `.gitignore` y reejecutar `npm publish --dry-run`, npm empaquetó de inmediato:
```text
npm notice 326B .env
npm notice 338B data/mundo_a97b6924.json
npm notice 297B data/mundo_cba86145.json
npm notice 705B descripciones/mundo_a97b6924.txt
npm notice 656B descripciones/mundo_cba86145.txt
npm notice 306.0kB imagenes/mundo_a97b6924.jpg
npm notice 155.9kB imagenes/mundo_cba86145.jpg
```
**¿Por qué es peligroso?**
Es extremadamente peligroso porque publicaría en el registro público de npm el archivo `.env` con las claves API privadas de Groq y NVIDIA, exponiéndolas a bots que rastrean credenciales para robar cuotas y generar cobros no autorizados. Además, subiría imágenes y datos temporales innecesarios, inflando el peso del paquete. Tras el experimento, `.gitignore` fue restaurado de inmediato.

---

## Preguntas de reflexión

### 1. ¿Por qué el id se calcula sin la fecha? ¿Qué pasaría si la incluyeras?
El identificador debe ser determinista para que un mismo mundo siempre produzca el mismo ID. Si se incluyera la fecha (`creadoEn`), el hash cambiaría en cada milisegundo de ejecución, haciendo imposible comprobar si el mundo ya existía y provocando que el programa llamara a las APIs cada vez sin poder ahorrar cuota.

### 2. ¿Por qué se le pide al modelo de texto la descripción en inglés? Si puedes, prueba con una en español y compara las imágenes.
Los modelos de difusión de imágenes (como FLUX.1 y Stable Diffusion) fueron entrenados mayoritariamente con conjuntos masivos de imágenes etiquetadas en inglés. Al describir la escena en inglés, el modelo interpreta con mayor fidelidad matices de iluminación, textura, ángulos de cámara y colores que cuando recibe prompts en español.

### 3. ¿Qué diferencia hay entre una respuesta JSON de texto y una respuesta con los bytes de una imagen? ¿Qué es base64?
Una respuesta JSON es una cadena de texto estructurada con pares clave-valor que transporta datos alfanuméricos legibles. Una imagen, en cambio, es un archivo binario puro compuesto por secuencias de bytes que definen píxeles y canales de color. Base64 es un sistema de codificación que transforma secuencias binarias en caracteres ASCII imprimibles, permitiendo incrustar una imagen binaria dentro de un objeto JSON sin corromper el protocolo de texto.

### 4. ¿Qué pasaría si guardas la imagen con 'utf-8'? ¿Por qué?
Si se especifica `'utf-8'` al guardar la imagen, Node.js intentará decodificar los bytes binarios como si fueran caracteres de texto; al encontrar bytes binarios que no corresponden a secuencias válidas de UTF-8, los reemplazará con el carácter de sustitución (`\uFFFD`) o alterará los valores numéricos. Esto corrompe la cabecera y el contenido binario del archivo JPG, haciendo que ningún visor pueda abrirlo.

### 5. ¿Qué pasos consumen cuota gratuita y cómo evitaste repetirlos?
Consumen cuota el Paso 2 (llamada al LLM de Groq para obtener el texto) y el Paso 3 (llamada a la API de NVIDIA para generar la imagen). Para evitar repetirlos, el programa verifica primero con `fs.existsSync` si ya existen `descripciones/mundo_<id>.txt` e `imagenes/mundo_<id>.jpg`; si ya existen, reutiliza su contenido directamente desde el disco local.

### 6. Si usaste IA: ¿qué fue lo más difícil de pedirle y qué parte tuviste que corregir tú?
Lo más difícil fue evitar que la IA utilizara librerías no permitidas (como `dotenv` o SDKs de OpenAI) y lograr que el modelo de imágenes no activara falsos positivos en su filtro de moderación. Tuve que corregir manualmente la integración de la función de errores dentro de `src/index.js` (para respetar el límite exacto de 4 módulos) y agregar el reemplazo del término "violet" por "purple", ya que la API de NVIDIA bloqueaba esa palabra por falso positivo de contenido violento.
