const MAX_PROMPT_POLLINATIONS = 1000;

async function generarImagen(descripcion) {
  if (!process.env.IMAGEN_URL) {
    throw new Error('Falta IMAGEN_URL en el archivo .env.');
  }

  // Opción C: Pollinations (GET directo sin clave)
  if (process.env.IMAGEN_URL.includes('image.pollinations.ai/prompt')) {
    let promptUrl = descripcion;
    if (promptUrl.length > MAX_PROMPT_POLLINATIONS) {
      promptUrl = promptUrl.slice(0, MAX_PROMPT_POLLINATIONS);
      console.log(`Aviso: la descripción se recortó a ${MAX_PROMPT_POLLINATIONS} caracteres para la URL.`);
    }

    const baseUrl = process.env.IMAGEN_URL.endsWith('/')
      ? process.env.IMAGEN_URL
      : `${process.env.IMAGEN_URL}/`;
    const url = `${baseUrl}${encodeURIComponent(promptUrl)}?width=1024&height=1024&nologo=true`;

    const respuesta = await fetch(url, {
      signal: AbortSignal.timeout(60000),
    });

    if (!respuesta.ok) {
      const error = new Error(`HTTP ${respuesta.status}`);
      error.status = respuesta.status;
      error.retryAfter = respuesta.headers.get('retry-after');
      throw error;
    }

    const bytes = Buffer.from(await respuesta.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error('El modelo de imágenes devolvió una imagen vacía.');
    }
    return bytes;
  }

  // Opciones A y B: NVIDIA FLUX.1-schnell o Cloudflare Workers AI (POST con JSON y base64)
  // Sanitizamos la palabra "violet" por "purple" para evitar falsos positivos del filtro de contenido de NVIDIA
  const promptSanitizado = descripcion.replace(/\bviolet\b/gi, 'purple');

  const cabeceras = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.IMAGEN_API_KEY}`,
  };

  const esCloudflare = process.env.IMAGEN_URL.includes('api.cloudflare.com');
  const cuerpo = esCloudflare
    ? { prompt: promptSanitizado.slice(0, 2048), steps: 4 }
    : { prompt: promptSanitizado, width: 1024, height: 1024, steps: 4 };

  if (!esCloudflare) {
    cabeceras.Accept = 'application/json';
  }

  const respuesta = await fetch(process.env.IMAGEN_URL, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(60000),
  });

  if (!respuesta.ok) {
    const error = new Error(`HTTP ${respuesta.status}`);
    error.status = respuesta.status;
    error.retryAfter = respuesta.headers.get('retry-after');
    throw error;
  }

  const datos = await respuesta.json();

  // Opción A: NVIDIA (datos.artifacts[0].base64)
  if (datos.artifacts && datos.artifacts.length > 0) {
    const artifact = datos.artifacts[0];
    if (artifact.finishReason && artifact.finishReason !== 'SUCCESS') {
      throw new Error(`El modelo de imágenes no pudo generar la imagen (finishReason: ${artifact.finishReason}).`);
    }
    if (!artifact.base64) {
      throw new Error('El modelo de imágenes no devolvió los datos base64.');
    }
    const bytes = Buffer.from(artifact.base64, 'base64');
    if (bytes.length === 0) {
      throw new Error('El modelo de imágenes devolvió una imagen vacía.');
    }
    return bytes;
  }

  // Opción B: Cloudflare (datos.result.image)
  if (datos.result && datos.result.image) {
    const bytes = Buffer.from(datos.result.image, 'base64');
    if (bytes.length === 0) {
      throw new Error('El modelo de imágenes devolvió una imagen vacía.');
    }
    return bytes;
  }

  throw new Error('Formato de respuesta desconocido del servicio de imágenes.');
}

module.exports = { generarImagen };
