const fs = require('fs');
const path = require('path');
const { crearMundo, guardarMundo, leerMundo, ErrorUso } = require('./mundo');
const { describirMundo } = require('./texto');
const { generarImagen } = require('./imagen');

const RAIZ = path.join(__dirname, '..');

// Función para transformar errores técnicos de red y APIs en mensajes claros en español
function explicarError(error) {
  if (error.name === 'TimeoutError') {
    return 'El servicio tardó demasiado en responder.';
  }
  if (error instanceof TypeError) {
    return 'No se pudo conectar. Revisa tu internet o la URL.';
  }
  if (error.status === 401 || error.status === 403) {
    return 'La API key no es válida. Revisa tu archivo .env.';
  }
  if (error.status === 402 || error.status === 429) {
    const espera = error.retryAfter ? ` Reintenta en ${error.retryAfter} segundos.` : '';
    return `Superaste el límite gratuito. Espera un momento.${espera}`;
  }
  if (error.status === 404 || error.status === 410) {
    return 'El modelo o la URL no existen. Revisa tu configuración.';
  }
  if (error.status) {
    return `El servicio respondió con un error (estado ${error.status}).`;
  }
  return error.message;
}

async function main() {
  try {
    // Paso 0: Cargar variables de entorno desde .env usando el método nativo de Node.js
    try {
      process.loadEnvFile(path.join(RAIZ, '.env'));
    } catch {
      throw new Error('No se encontró el archivo .env. Copia .env.example a .env y configura tus claves.');
    }

    // Paso 1: Validar argumentos, crear el objeto de mundo y guardarlo en data/mundo_<id>.json
    const mundo = crearMundo(process.argv.slice(2));
    const rutaJson = guardarMundo(mundo);
    console.log(`Paso 1: mundo guardado en data/mundo_${mundo.id}.json`);

    // Paso 2: Leer el JSON guardado desde disco y consultar el modelo de texto si no existe la descripción
    const guardado = leerMundo(rutaJson);
    const rutaTxt = path.join(RAIZ, 'descripciones', `mundo_${guardado.id}.txt`);

    if (fs.existsSync(rutaTxt)) {
      console.log('Paso 2: la descripción ya existía, no se llamó al modelo de texto.');
    } else {
      const descripcionGenerada = await describirMundo(guardado);
      fs.mkdirSync(path.dirname(rutaTxt), { recursive: true });
      fs.writeFileSync(rutaTxt, descripcionGenerada, 'utf-8');
      console.log(`Paso 2: descripción guardada en descripciones/mundo_${guardado.id}.txt`);
    }

    // Paso 3: Leer la descripción del archivo .txt y generar la imagen si no existe
    const rutaImg = path.join(RAIZ, 'imagenes', `mundo_${guardado.id}.jpg`);

    if (fs.existsSync(rutaImg)) {
      console.log('Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.');
    } else {
      const descripcionParaImagen = fs.readFileSync(rutaTxt, 'utf-8');
      const bytesImagen = await generarImagen(descripcionParaImagen);
      fs.mkdirSync(path.dirname(rutaImg), { recursive: true });
      fs.writeFileSync(rutaImg, bytesImagen);
      console.log(`Paso 3: imagen guardada en imagenes/mundo_${guardado.id}.jpg`);
    }

    console.log('Listo. Revisa la carpeta imagenes/');
  } catch (error) {
    if (error instanceof ErrorUso) {
      console.error(error.message);
    } else {
      console.error(`Error: ${explicarError(error)}`);
    }
    process.exitCode = 1;
  }
}

main();
