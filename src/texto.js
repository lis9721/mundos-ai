const SISTEMA = `You write detailed prompts for an AI image generator. The user provides a JSON object with a situation, an imaginary world, and five colors.
Write ONE single paragraph in English, strictly between 80 and 120 words, that describes a vivid image of that world: the visual scene, main elements, lighting, composition, and artistic style.
Describe an image, not a narrative story.
Mention all five colors specified in the "colores" array (you may translate them; translate "violeta" as "purple" or "deep violet-purple" to prevent content filter triggers).
Do not include titles, markdown formatting, lists, quotes, or any written text/lettering inside the image.
Reply ONLY with the paragraph.`;

const MAX_CARACTERES = 1500;

async function describirMundo(mundo) {
  if (!process.env.TEXTO_URL) {
    throw new Error('Falta TEXTO_URL en el archivo .env.');
  }

  const respuesta = await fetch(process.env.TEXTO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TEXTO_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.TEXTO_MODELO,
      messages: [
        { role: 'system', content: SISTEMA },
        { role: 'user', content: JSON.stringify(mundo) },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!respuesta.ok) {
    const error = new Error(`HTTP ${respuesta.status}`);
    error.status = respuesta.status;
    error.retryAfter = respuesta.headers.get('retry-after');
    throw error;
  }

  const datos = await respuesta.json();
  let texto = (datos.choices?.[0]?.message?.content || '').trim();

  if (texto === '') {
    throw new Error('El modelo de texto devolvió una respuesta vacía.');
  }

  if (texto.length > MAX_CARACTERES) {
    texto = texto.slice(0, MAX_CARACTERES);
    console.log(`Aviso: la descripción superaba ${MAX_CARACTERES} caracteres y fue recortada.`);
  }

  return texto;
}

module.exports = { describirMundo };
