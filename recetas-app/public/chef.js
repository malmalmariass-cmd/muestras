// The friend-chef's voice: technique lessons matched to each step, tips of
// the day, and the little phrases she says while she works.

// Matched against each cooking step so she can teach the "why" in context.
export const TECNICAS = [
  { re: /sofr[ií]e|sofrito|acitron/i, tip: "Sofríe a fuego medio y sin prisa: la cebolla debe ponerse transparente, no dorada. Ahí nace el dulzor de la receta." },
  { re: /dora|dorar|sella|sellar/i, tip: "Para dorar, el sartén tiene que estar bien caliente y sin amontonar. Si echas todo junto se cuece al vapor y no se dora." },
  { re: /hierv|herv/i, tip: "Cuando hierva, baja a fuego medio: un hervor suave cocina parejo y no deshace los ingredientes." },
  { re: /marin/i, tip: "La marinada trabaja mejor en el refri y tapada. Si tienes prisa, corta la carne más delgada: se impregna más rápido." },
  { re: /horn|precalient/i, tip: "Precalienta siempre el horno: si metes la comida en frío, se seca antes de dorarse." },
  { re: /licú|licua|lic[uú]a/i, tip: "Licúa primero lo líquido y después lo sólido: las aspas giran mejor y queda más terso." },
  { re: /pica|corta|rebana/i, tip: "Corta todo del mismo tamaño para que se cocine parejo. Y dobla los dedos como garra: tus nudillos guían el cuchillo." },
  { re: /sal\b|sazona|salpimienta/i, tip: "Sazona poco a poco y prueba. Siempre puedes agregar sal; quitarla es casi imposible." },
  { re: /arroz/i, tip: "Enjuaga el arroz hasta que el agua salga clara: le quitas almidón y queda suelto." },
  { re: /pasta|fettuccine|espagueti/i, tip: "El agua de la pasta debe saber como agua de mar. Es tu única oportunidad de sazonar la pasta por dentro." },
  { re: /huevo/i, tip: "Huevo estrellado perfecto: fuego medio-bajo y tapa el sartén un minuto; la clara se cuaja y la yema queda líquida." },
  { re: /vapor/i, tip: "Al vapor las verduras conservan más vitaminas y color. Sácalas cuando estén verde brillante." },
  { re: /refriger|reposa|repose/i, tip: "El reposo también es cocina: los sabores se asientan y las texturas se acomodan. ¡Paciencia!" },
  { re: /lim[oó]n|vinagre/i, tip: "Un toque ácido al final despierta todos los sabores, como subirle el volumen a la canción." },
  { re: /ajo/i, tip: "El ajo se quema rapidísimo y amarga. Agrégalo después de la cebolla y muévelo poquito." },
  { re: /aplasta|plancha/i, tip: "Plancha bien caliente y no muevas la comida hasta que se despegue sola: esa es la señal de que ya tiene costra." },
  { re: /mezcla|integra|revuelve/i, tip: "Mezcla con movimientos envolventes, de abajo hacia arriba, para no aplastar los ingredientes." },
];

export function tecnicaPara(paso) {
  return TECNICAS.find((t) => t.re.test(paso))?.tip ?? null;
}

export const TIPS_DEL_DIA = [
  "Llena medio plato de verduras y los antojos se acomodan solitos. 🥦",
  "La proteína en el desayuno te deja satisfecha hasta la comida. Prueba huevo, yogur griego o frijoles.",
  "Hornear o asar en vez de freír te ahorra mucho aceite y queda igual de dorado si la temperatura es alta.",
  "Las especias son sabor sin calorías: comino, pimentón, ajo en polvo, orégano… ¡juega!",
  "Cocina doble y congela la mitad: tu yo del jueves te lo va a agradecer.",
  "Los frijoles y las lentejas son proteína barata, con fibra y llenan muchísimo.",
  "El agua a veces se disfraza de hambre. Antes de picar algo, toma un vaso.",
  "Lava y corta tus verduras al volver del súper; si están listas, las usas más.",
  "El yogur griego natural sustituye a la crema en casi todo, con mucha más proteína.",
  "Un buen cuchillo afilado es más seguro que uno sin filo: resbala menos.",
  "Comer rico y comer sano no pelean: el secreto está en las técnicas y las porciones.",
  "Para subir de peso sano: agrega aguacate, nueces y aceite de oliva a lo que ya comes.",
  "Para bajar de peso sin sufrir: más volumen (verduras, caldos) y proteína en cada comida.",
  "Prueba tu comida mientras cocinas. Así es como se aprende a sazonar.",
  "Las hierbas frescas al final, las secas al principio. Así cada una da su mejor sabor.",
];

export const FRASES_EXTRAYENDO = [
  "Viendo el video con palomitas… 🍿",
  "Anotando los ingredientes en mi libreta…",
  "Calculando cantidades y porciones…",
  "Pensando qué tan rica y qué tan sana es…",
  "Escribiendo mis secretos de chef para ti…",
];

export const ANIMOS = [
  { emoji: "😍", label: "¡Me encantó!" },
  { emoji: "😋", label: "Rica" },
  { emoji: "🙂", label: "Bien" },
  { emoji: "🤔", label: "Le falta algo" },
  { emoji: "😅", label: "Desastre divertido" },
];

export function saludo(nombre) {
  const h = new Date().getHours();
  const base = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  return nombre ? `${base}, ${nombre}` : base;
}

export function tipDelDia() {
  const day = Math.floor(Date.now() / 86400000);
  return TIPS_DEL_DIA[day % TIPS_DEL_DIA.length];
}

// What she says when cooking is done, depending on how it went.
export function reaccionDiario(estrellas) {
  if (estrellas >= 5) return "¡Te salió de libro! Guardé esta página en tu diario con estrellita. ⭐";
  if (estrellas >= 4) return "¡Qué orgullo! Cada vez te sale mejor.";
  if (estrellas >= 3) return "¡Bien hecho! Anota qué cambiarías y la próxima queda perfecta.";
  return "Hasta los chefs tenemos días así. Lo importante es que lo intentaste. 💛";
}
