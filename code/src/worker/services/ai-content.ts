/**
 * Service for generating AI-powered content (Lectio Divina and Cantos)
 */
import { GoogleGenAI } from "@google/genai";

interface LectioDivinaContent {
  lectio: string;
  meditatio: string;
  oratio: string;
  contemplatio: string;
  actio: string;
}

interface CantoSugerido {
  titulo: string;
  autor: string;
  momento: string;
  razon: string;
  letra_con_acordes: string;
}

interface CantosResponse {
  cantos: CantoSugerido[];
}

/**
 * Generate Lectio Divina content based on Sunday readings
 */
export async function generateLectioDivina(
  apiKey: string,
  readings: {
    first_reading: string | null;
    first_reading_text: string | null;
    psalm: string | null;
    psalm_text: string | null;
    second_reading: string | null;
    second_reading_text: string | null;
    gospel: string | null;
    gospel_text: string | null;
    liturgical_day: string | null;
  }
): Promise<LectioDivinaContent> {
  const ai = new GoogleGenAI({ apiKey });

  const readingsContext = `
LECTURAS DEL DÍA: ${readings.liturgical_day || 'Domingo'}

PRIMERA LECTURA (${readings.first_reading || 'No disponible'}):
${readings.first_reading_text || 'Texto no disponible'}

SALMO (${readings.psalm || 'No disponible'}):
${readings.psalm_text || 'Texto no disponible'}

${readings.second_reading ? `SEGUNDA LECTURA (${readings.second_reading}):
${readings.second_reading_text || 'Texto no disponible'}` : ''}

EVANGELIO (${readings.gospel || 'No disponible'}):
${readings.gospel_text || 'Texto no disponible'}
`.trim();

  const prompt = `Eres un guía espiritual católico experto en Lectio Divina. Basándote en las lecturas del domingo, genera una guía completa para hacer Lectio Divina.

${readingsContext}

Genera contenido para cada uno de los 5 pasos de la Lectio Divina, enfocándote especialmente en el Evangelio pero integrando también las otras lecturas:

1. LECTIO (Lectura): Una breve introducción que invite a leer el texto con atención, destacando palabras o frases clave para notar.

2. MEDITATIO (Meditación): Preguntas reflexivas y puntos para meditar sobre el significado del texto. ¿Qué nos dice Dios a través de estas palabras?

3. ORATIO (Oración): Una oración de respuesta al texto, que puede incluir alabanza, petición, acción de gracias o arrepentimiento.

4. CONTEMPLATIO (Contemplación): Una invitación a quedarse en silencio en la presencia de Dios, dejando que su Palabra repose en el corazón.

5. ACTIO (Acción): Sugerencias concretas y prácticas para vivir esta Palabra durante la semana.

Responde en formato JSON con la siguiente estructura:
{
  "lectio": "...",
  "meditatio": "...",
  "oratio": "...",
  "contemplatio": "...",
  "actio": "..."
}

El contenido debe ser profundo pero accesible, en español, y adecuado para laicos católicos.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          lectio: { type: "string" },
          meditatio: { type: "string" },
          oratio: { type: "string" },
          contemplatio: { type: "string" },
          actio: { type: "string" }
        },
        required: ["lectio", "meditatio", "oratio", "contemplatio", "actio"]
      },
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

/**
 * Generate suggested Catholic songs based on Sunday readings
 */
export async function generateCantosSugeridos(
  apiKey: string,
  readings: {
    first_reading: string | null;
    first_reading_text: string | null;
    psalm: string | null;
    psalm_text: string | null;
    second_reading: string | null;
    second_reading_text: string | null;
    gospel: string | null;
    gospel_text: string | null;
    liturgical_day: string | null;
  }
): Promise<CantosResponse> {
  const ai = new GoogleGenAI({ apiKey });

  const readingsContext = `
LECTURAS DEL DÍA: ${readings.liturgical_day || 'Domingo'}

PRIMERA LECTURA (${readings.first_reading || 'No disponible'}):
${readings.first_reading_text || 'Texto no disponible'}

SALMO (${readings.psalm || 'No disponible'}):
${readings.psalm_text || 'Texto no disponible'}

${readings.second_reading ? `SEGUNDA LECTURA (${readings.second_reading}):
${readings.second_reading_text || 'Texto no disponible'}` : ''}

EVANGELIO (${readings.gospel || 'No disponible'}):
${readings.gospel_text || 'Texto no disponible'}
`.trim();

  const prompt = `Eres un experto en música litúrgica católica. Basándote en las lecturas del domingo, sugiere 6 cantos católicos apropiados para la celebración eucarística.

${readingsContext}

Sugiere cantos conocidos del repertorio católico hispano (de autores como Cesáreo Gabaráin, Juan Antonio Espinosa, Kiko Argüello, Martín Valverde, Cristóbal Fones, entre otros). Los cantos deben relacionarse con los temas de las lecturas, especialmente el Evangelio.

Para cada canto, incluye:
1. El título exacto del canto
2. El autor o compositor
3. El momento de la misa donde es apropiado (Entrada, Ofertorio, Comunión, Salida, Acción de Gracias, etc.)
4. Una breve explicación de por qué este canto es apropiado para estas lecturas
5. La letra completa con acordes en formato ChordPro (acordes entre corchetes antes de la sílaba correspondiente)
Formato ChordPro ejemplo:
[G]Junto a ti, [D]Señor, [Em]quiero es[C]tar
[G]Siempre a[D]lerte, siem[G]pre fiel

Responde en formato JSON:
{
  "cantos": [
    {
      "titulo": "Nombre del canto",
      "autor": "Nombre del compositor",
      "momento": "Momento de la misa",
      "razon": "Por qué es apropiado para estas lecturas",
      "letra_con_acordes": "Letra completa en formato ChordPro"
    }
  ]
}

IMPORTANTE: 
- Incluye solo cantos católicos reales y conocidos, con letras y acordes correctos.
- NO incluyas enlaces de YouTube.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          cantos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                autor: { type: "string" },
                momento: { type: "string" },
                razon: { type: "string" },
                letra_con_acordes: { type: "string" }
              },
              required: ["titulo", "autor", "momento", "razon", "letra_con_acordes"]
            }
          }
        },
        required: ["cantos"]
      },
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
  });

  return JSON.parse(response.text || '{"cantos":[]}');
}
