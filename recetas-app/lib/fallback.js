// Offline answers for "no lo encuentro" when the AI is not configured:
// regional names per country plus a few common substitutes.

const PRODUCTS = [
  {
    keys: ["aguacate", "palta"],
    nombres: { México: "aguacate", Argentina: "palta", Chile: "palta", Perú: "palta", España: "aguacate", Colombia: "aguacate", "Estados Unidos": "avocado" },
    etiqueta: "Aguacate Hass / Palta Hass",
    pasillo: "Frutas y verduras",
    alternativas: [
      { nombre: "Guacamole refrigerado", proporcion: "1 aguacate ≈ 1/2 taza", nota: "Revisa que no tenga mayonesa.", mejor_para_objetivo: false },
      { nombre: "Hummus", proporcion: "1:1 en untables", nota: "Más proteína, menos grasa.", mejor_para_objetivo: true },
    ],
  },
  {
    keys: ["frijol", "frijoles", "poroto", "porotos", "judía", "alubia", "caraota"],
    nombres: { México: "frijol", Argentina: "poroto", Chile: "poroto", Venezuela: "caraota", España: "judía / alubia", Colombia: "fríjol", "Estados Unidos": "beans" },
    etiqueta: "Frijol negro / Poroto negro / Black beans",
    pasillo: "Granos y enlatados",
    alternativas: [
      { nombre: "Lentejas", proporcion: "1:1", nota: "Se cocinan más rápido.", mejor_para_objetivo: true },
      { nombre: "Garbanzos", proporcion: "1:1", nota: "Textura más firme.", mejor_para_objetivo: true },
    ],
  },
  {
    keys: ["elote", "choclo", "maíz", "maiz", "mazorca"],
    nombres: { México: "elote", Argentina: "choclo", Chile: "choclo", Perú: "choclo", España: "maíz / mazorca", Colombia: "mazorca", "Estados Unidos": "corn" },
    etiqueta: "Granos de elote / Choclo desgranado / Sweet corn",
    pasillo: "Frutas y verduras, enlatados o congelados",
    alternativas: [{ nombre: "Maíz enlatado", proporcion: "1 elote ≈ 3/4 taza", nota: "Escúrrelo bien.", mejor_para_objetivo: false }],
  },
  {
    keys: ["jitomate", "tomate"],
    nombres: { México: "jitomate (rojo) / tomate verde", Argentina: "tomate", España: "tomate", Chile: "tomate", "Estados Unidos": "tomato" },
    etiqueta: "Tomate saladet / perita / Roma",
    pasillo: "Frutas y verduras",
    alternativas: [{ nombre: "Tomate triturado en lata", proporcion: "1 tomate ≈ 1/2 taza", nota: "Ideal para salsas.", mejor_para_objetivo: true }],
  },
  {
    keys: ["crema", "nata", "crema de leche", "heavy cream"],
    nombres: { México: "crema / media crema", Argentina: "crema de leche", España: "nata para cocinar / montar", Chile: "crema", "Estados Unidos": "heavy cream" },
    etiqueta: "Crema para batir / Nata 35% M.G.",
    pasillo: "Lácteos",
    alternativas: [
      { nombre: "Yogur griego natural", proporcion: "1:1", nota: "Agrégalo fuera del fuego. Mucha más proteína.", mejor_para_objetivo: true },
      { nombre: "Leche evaporada", proporcion: "1:1", nota: "Menos grasa.", mejor_para_objetivo: true },
    ],
  },
  {
    keys: ["pimiento", "chile morrón", "morrón", "ají", "pimentón"],
    nombres: { México: "chile morrón", Argentina: "morrón", España: "pimiento", Chile: "pimentón", Colombia: "pimentón", "Estados Unidos": "bell pepper" },
    etiqueta: "Pimiento rojo/verde/amarillo",
    pasillo: "Frutas y verduras",
    alternativas: [{ nombre: "Pimiento congelado en tiras", proporcion: "1 pieza ≈ 1 taza", nota: "Sirve para salteados.", mejor_para_objetivo: false }],
  },
  {
    keys: ["fécula de maíz", "maicena", "almidón de maíz", "cornstarch"],
    nombres: { México: "fécula de maíz", Argentina: "almidón de maíz", España: "harina fina de maíz", "Estados Unidos": "cornstarch" },
    etiqueta: "Maizena / Fécula de maíz",
    pasillo: "Harinas y repostería",
    alternativas: [{ nombre: "Harina de trigo", proporcion: "1 cda maicena = 2 cdas harina", nota: "Espesa menos y enturbia.", mejor_para_objetivo: false }],
  },
  {
    keys: ["queso panela", "panela", "queso fresco", "queso blanco"],
    nombres: { México: "queso panela", Argentina: "queso cremoso / port salut", España: "queso de Burgos", Colombia: "queso campesino", "Estados Unidos": "queso fresco" },
    etiqueta: "Queso fresco / Burgos / Campesino",
    pasillo: "Lácteos y salchichonería",
    alternativas: [
      { nombre: "Requesón / ricota", proporcion: "1:1", nota: "Más suave y menos sal.", mejor_para_objetivo: true },
      { nombre: "Tofu firme", proporcion: "1:1", nota: "Opción vegetal.", mejor_para_objetivo: true },
    ],
  },
];

export function localAlternatives(product, country) {
  const q = product.toLowerCase().trim();
  const hit = PRODUCTS.find((p) => p.keys.some((k) => q.includes(k) || k.includes(q)));
  if (!hit) {
    return {
      nombres_locales: [product],
      que_dice_la_etiqueta: `Busca "${product}" en la etiqueta o pregunta en el área correspondiente.`,
      pasillo: "Pregunta a un empleado del súper",
      alternativas: [],
    };
  }
  const local = hit.nombres[country];
  const others = Object.entries(hit.nombres)
    .filter(([c]) => c !== country)
    .map(([c, n]) => `${n} (${c})`);
  return {
    nombres_locales: local ? [local, ...others] : others,
    que_dice_la_etiqueta: hit.etiqueta,
    pasillo: hit.pasillo,
    alternativas: hit.alternativas,
  };
}
