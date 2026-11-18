const fs = require('fs');
const path = require('path');
const hash = require('object-hash');

const DIR_DATA = path.join(__dirname, '..', 'data');

const USO = `Uso: npm start -- "<situación>" "<mundo>" <color1> <color2> <color3> <color4> <color5>
Ejemplo: npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta`;

class ErrorUso extends Error {}

function crearMundo(args) {
  // Validación 1: exactamente 7 argumentos
  if (args.length !== 7) {
    throw new ErrorUso(`Se esperaban 7 argumentos y llegaron ${args.length}. Recuerda usar comillas para la situación y el mundo.\n${USO}`);
  }

  // Validación 2: ningún argumento vacío o solo con espacios
  if (args.some((a) => !a || a.trim() === '')) {
    throw new ErrorUso(`Ningún argumento puede estar vacío ni contener solo espacios.\n${USO}`);
  }

  const situacion = args[0].trim();
  const mundo = args[1].trim();
  const colores = args.slice(2).map((c) => c.trim().toLowerCase());

  // Validación 3: 5 colores distintos sin distinguir mayúsculas de minúsculas
  if (new Set(colores).size !== 5) {
    throw new ErrorUso(`Los 5 colores deben ser distintos (sin distinguir mayúsculas de minúsculas).\n${USO}`);
  }

  // Cálculo del ID: primeros 8 caracteres del hash sobre situación, mundo y colores (sin fecha)
  const id = hash({ situacion, mundo, colores }).slice(0, 8);
  const creadoEn = new Date().toISOString();

  return { id, situacion, mundo, colores, creadoEn };
}

function guardarMundo(mundo) {
  // Asegurar que la carpeta data exista
  fs.mkdirSync(DIR_DATA, { recursive: true });
  const ruta = path.join(DIR_DATA, `mundo_${mundo.id}.json`);

  // Conservar el archivo si ya existe para preservar la fecha original
  if (!fs.existsSync(ruta)) {
    fs.writeFileSync(ruta, JSON.stringify(mundo, null, 2), 'utf-8');
  }
  return ruta;
}

function leerMundo(ruta) {
  return JSON.parse(fs.readFileSync(ruta, 'utf-8'));
}

module.exports = { crearMundo, guardarMundo, leerMundo, ErrorUso };
