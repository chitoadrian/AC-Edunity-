const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type TutorHistoryItem = {
  role?: string;
  content?: string;
};

type TutorRequestBody = {
  message?: string;
  history?: TutorHistoryItem[];
  context?: {
    subjects?: unknown[];
    tasks?: unknown[];
    resources?: unknown[];
  };
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function cleanText(value: unknown, maxLength = 6000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function compactWorkspaceContext(context: TutorRequestBody["context"]) {
  const subjects = Array.isArray(context?.subjects) ? context.subjects.slice(0, 12) : [];
  const tasks = Array.isArray(context?.tasks) ? context.tasks.slice(0, 20) : [];
  const resources = Array.isArray(context?.resources) ? context.resources.slice(0, 12) : [];

  return JSON.stringify({ subjects, tasks, resources }).slice(0, 8000);
}

function buildGeminiContents(message: string, history: TutorHistoryItem[] = []) {
  const safeHistory = history
    .slice(-10)
    .map((item) => ({
      role: item.role === "assistant" || item.role === "model" ? "model" : "user",
      parts: [{ text: cleanText(item.content, 3000) }],
    }))
    .filter((item) => item.parts[0].text);

  return [
    ...safeHistory,
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];
}

function extractGeminiAnswer(data: Record<string, unknown>) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  return candidates
    .flatMap((candidate) => {
      const parts = (candidate as { content?: { parts?: { text?: string }[] } })?.content?.parts;
      return Array.isArray(parts) ? parts.map((part) => part.text || "") : [];
    })
    .join("")
    .trim();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido" }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("[tutor-ai] Falta GEMINI_API_KEY en Supabase Secrets");
    return jsonResponse({ ok: false, error: "Tutor no configurado" }, 500);
  }

  try {
    const body = await request.json() as TutorRequestBody;
    const message = cleanText(body.message);

    if (!message) {
      return jsonResponse({ ok: false, error: "Mensaje vacío" }, 400);
    }

    const workspaceContext = compactWorkspaceContext(body.context);
    const contents = buildGeminiContents(message, body.history);

    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              "Eres Tutor IA de AC Edunity, un asistente educativo para estudiantes. " +
              "Responde siempre en español claro, profesional y didáctico. " +
              "Explica paso a paso cuando sea útil. Crea ejercicios, preguntas tipo examen, flashcards y resúmenes si el usuario lo pide. " +
              "No inventes datos personales. Usa el contexto académico del usuario solo para adaptar ejemplos. " +
              "Si el usuario pide respuestas largas, organiza la explicación con subtítulos breves. " +
              `Contexto académico disponible en AC Edunity: ${workspaceContext}`,
          }],
        },
        contents,
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          maxOutputTokens: 1200,
        },
      }),
    });

    const data = await geminiResponse.json().catch(() => ({}));

    if (!geminiResponse.ok) {
      console.error("[tutor-ai] Error Gemini:", geminiResponse.status, JSON.stringify(data));
      return jsonResponse({ ok: false, error: "Gemini no respondió" }, 502);
    }

    const answer = extractGeminiAnswer(data);

    if (!answer) {
      console.error("[tutor-ai] Respuesta vacía de Gemini:", JSON.stringify(data));
      return jsonResponse({ ok: false, error: "Respuesta vacía" }, 502);
    }

    return jsonResponse({ ok: true, answer, model: GEMINI_MODEL });
  } catch (error) {
    console.error("[tutor-ai] Error inesperado:", error);
    return jsonResponse({ ok: false, error: "Error interno del Tutor" }, 500);
  }
});