// JSON schemas for Claude structured outputs. Every object lists all its
// properties in `required` and sets additionalProperties: false.

const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const str = { type: "string" };
const num = { type: "number" };
const int = { type: "integer" };

const goalScore = obj({ score: int, razon: str, tip: str });

export const SCORE_PROPS = {
  nutricion: obj({ kcal: num, proteina_g: num, carbohidratos_g: num, grasa_g: num, fibra_g: num }),
  calificaciones: obj({ rico: goalScore, bajar: goalScore, subir: goalScore }),
};

export const SCORE_SCHEMA = obj(SCORE_PROPS);

export const RECIPE_SCHEMA = obj({
  titulo: str,
  descripcion: str,
  porciones: int,
  tiempo_min: int,
  dificultad: { type: "string", enum: ["fácil", "media", "difícil"] },
  inferida: { type: "boolean" },
  ingredientes: {
    type: "array",
    items: obj({
      nombre: str,
      cantidad: num,
      unidad: str,
      categoria: str,
      nota: str,
    }),
  },
  pasos: { type: "array", items: str },
  etiquetas: { type: "array", items: str },
  emoji: str,
  secretos: { type: "array", items: str },
  ...SCORE_PROPS,
});

export const ALTERNATIVES_SCHEMA = obj({
  nombres_locales: { type: "array", items: str },
  que_dice_la_etiqueta: str,
  pasillo: str,
  alternativas: {
    type: "array",
    items: obj({ nombre: str, proporcion: str, nota: str, mejor_para_objetivo: { type: "boolean" } }),
  },
});
