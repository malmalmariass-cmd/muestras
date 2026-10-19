import express from "express";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { fetchSourceText } from "./lib/sources.js";
import { RECIPE_SCHEMA, ALTERNATIVES_SCHEMA, SCORE_SCHEMA } from "./lib/schemas.js";
import { localAlternatives } from "./lib/fallback.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(fileURLToPath(new URL("./public", import.meta.url))));

const MODEL = "claude-opus-5-5";
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;

// One structured-output call to Claude. Returns the parsed JSON object.
async function askClaude({ system, prompt, schema, effort = "medium", maxTokens = 16000 }) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("El modelo no pudo procesar esta solicitud.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("La respuesta fue demasiado larga; intenta con otra receta.");
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

const SCORING_RULES = `Califica la receta de 1 a 10 para tres objetivos:
- "rico": sabor, satisfacción y lo antojable que es (comer rico sin pensar en calorías).
- "bajar": qué tan útil es para bajar de peso (densidad calórica baja por porción, alta proteína y fibra, pocos azúcares añadidos y frituras, saciedad).
- "subir": qué tan útil es para subir de peso / ganar masa muscular (calorías suficientes, mucha proteína, carbohidratos de calidad, fácil de comer en cantidad).
Para cada objetivo da una razón breve (máx. 15 palabras) y un tip concreto para hacerla más pro ese objetivo.
Los valores nutricionales son estimaciones por porción.`;

app.get("/api/status", (_req, res) => {
  res.json({ ai: hasKey, model: hasKey ? MODEL : null });
});

app.post("/api/extract", async (req, res) => {
  const { url = "", text = "" } = req.body ?? {};
  if (!url && !text) return res.status(400).json({ error: "Pega un link o el texto de la receta." });
  if (!client) {
    return res.status(503).json({
      error: "Falta configurar ANTHROPIC_API_KEY en el servidor para extraer recetas de links.",
    });
  }
  try {
    const source = url ? await fetchSourceText(url) : { platform: "texto", title: "", author: "", text: "" };
    const combined = [source.text, text].filter(Boolean).join("\n\n---\n\n");
    const recipe = await askClaude({
      system:
        "Eres un chef y nutriólogo. Extraes recetas completas a partir del texto de publicaciones de redes sociales (descripción, caption o transcripción). Respondes siempre en español.",
      prompt: `Plataforma: ${source.platform}
Link: ${url || "(sin link)"}
Título del post: ${source.title || "(desconocido)"}
Autor: ${source.author || "(desconocido)"}

Contenido disponible:
"""
${combined || "(no se pudo leer el contenido, solo el título)"}
"""

Saca la receta completa: ingredientes con cantidad y unidad (normaliza a unidades métricas o de cocina comunes), pasos claros y numerables, porciones y tiempo.
Si el contenido no trae la receta completa, complétala con la versión más probable del platillo y marca "inferida": true; si viene completa marca false.
En "emoji" pon un solo emoji que represente el platillo.
En "secretos" da de 2 a 4 secretos de chef: técnicas o trucos que expliquen POR QUÉ algo funciona (ej. "seca bien el pollo antes de dorarlo: la humedad impide que se forme costra"), escritos con cariño, como una amiga chef que te enseña.
Asigna a cada ingrediente una categoría de supermercado: Frutas y verduras, Carnes y pescados, Lácteos y huevo, Panadería y tortillas, Granos y pastas, Enlatados y conservas, Especias y condimentos, Aceites y salsas, Congelados, Otros.
${SCORING_RULES}`,
      schema: RECIPE_SCHEMA,
      effort: "medium",
    });
    res.json({ recipe: { ...recipe, sourceUrl: url, platform: source.platform, author: source.author } });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: errorMessage(err) });
  }
});

app.post("/api/score", async (req, res) => {
  const { recipe } = req.body ?? {};
  if (!recipe) return res.status(400).json({ error: "Falta la receta." });
  if (!client) return res.status(503).json({ error: "Falta configurar ANTHROPIC_API_KEY." });
  try {
    const result = await askClaude({
      system: "Eres un nutriólogo deportivo. Respondes en español.",
      prompt: `${SCORING_RULES}\n\nReceta:\n${JSON.stringify(recipe)}`,
      schema: SCORE_SCHEMA,
      effort: "low",
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: errorMessage(err) });
  }
});

// Chat with the friend-chef persona. History comes from the client.
app.post("/api/chef", async (req, res) => {
  const { messages = [], recipe = null, goal = "rico", country = "", userName = "", chefName = "Canela" } = req.body ?? {};
  const history = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16);
  if (!history.length || history[history.length - 1].role !== "user") {
    return res.status(400).json({ error: "Falta tu mensaje." });
  }
  if (!client) {
    return res.status(503).json({ error: "Para platicar conmigo hace falta configurar la IA (ANTHROPIC_API_KEY)." });
  }
  // The API requires the conversation to start with a user turn.
  while (history[0]?.role !== "user") history.shift();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: `Eres ${chefName}, la mejor amiga chef de ${userName || "la persona"}. Eres cálida, cercana, divertida y paciente; hablas en español latino natural, de tú, como amiga (sin exagerar con los diminutivos).
Sabes muchísimo de cocina y de nutrición. Te encanta enseñar el porqué de las técnicas para que tu amiga aprenda, no solo que siga instrucciones.
Su objetivo ahora es: ${goalLabel(goal)}. Cuando venga al caso, sugiere cómo hacer el platillo más rico y más saludable para ese objetivo, sin regañar ni juzgar.
Compra en: ${country || "Latinoamérica"}; usa nombres de ingredientes de ese país.
Responde breve (2 a 6 frases o una lista corta), práctico y con un toque de cariño. No uses encabezados. Puedes usar algún emoji.
Si te preguntan algo de salud delicado (enfermedades, alergias graves, trastornos alimentarios), responde con cuidado y sugiere consultar a un profesional.
${recipe ? `Están viendo esta receta:\n${JSON.stringify(recipe).slice(0, 8000)}` : ""}`,
      messages: history.map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
    });
    if (response.stop_reason === "refusal") throw new Error("Uy, de eso mejor no puedo opinar. ¿Te ayudo con otra cosa de la cocina?");
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: errorMessage(err) });
  }
});

app.post("/api/alternatives", async (req, res) => {
  const { product = "", country = "", recipes = [], goal = "rico" } = req.body ?? {};
  if (!product) return res.status(400).json({ error: "Falta el producto." });
  if (!client) return res.json({ ...localAlternatives(product, country), offline: true });
  try {
    const result = await askClaude({
      system:
        "Eres un experto en supermercados de Latinoamérica, España y EE.UU. Ayudas a encontrar productos y sus sustitutos. Respondes en español.",
      prompt: `Estoy en el súper en ${country || "un país de habla hispana"} y no encuentro: "${product}".
Lo necesito para: ${recipes.join(", ") || "una receta"}.
Mi objetivo de alimentación: ${goalLabel(goal)}.

Dime:
1. Cómo se llama este producto en ${country || "mi país"} (y otros nombres comunes) y qué debe decir la etiqueta o empaque para reconocerlo.
2. En qué pasillo o sección suele estar.
3. De 3 a 5 alternativas o sustitutos que funcionen en la receta, con la proporción de cambio y cómo afecta el sabor; marca cuáles son mejores para mi objetivo.`,
      schema: ALTERNATIVES_SCHEMA,
      effort: "low",
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.json({ ...localAlternatives(product, country), offline: true, warning: errorMessage(err) });
  }
});

function goalLabel(goal) {
  return { rico: "comer rico", bajar: "bajar de peso", subir: "subir de peso / ganar masa" }[goal] ?? goal;
}

function errorMessage(err) {
  if (err instanceof Anthropic.AuthenticationError) return "La API key de Anthropic no es válida.";
  if (err instanceof Anthropic.RateLimitError) return "Demasiadas solicitudes, intenta en un momento.";
  if (err instanceof Anthropic.APIError) return "Error del servicio de IA, intenta de nuevo.";
  return err?.message || "Error inesperado.";
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Recetas listo en http://localhost:${port} (IA ${hasKey ? "activa" : "desactivada: falta ANTHROPIC_API_KEY"})`);
});
