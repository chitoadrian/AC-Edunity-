const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

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
  return String(value || "").trim().slice(0, maxLength);
}

function compactWorkspaceContext(context: TutorRequestBody["context"]) {
  const subjects = Array.isArray(context?.subjects) ? context.subjects.slice(0, 12) : [];
  const tasks = Array.isArray(context?.tasks) ? context.tasks.slice(0, 20) : [];
  const resources = Array.isArray(context?.resources) ? context.resources.slice(0, 12) : [];

  return JSON.stringify({ subjects, tasks, resources }).slice(0, 8000);
}

function buildGeminiInput(message: string, history: TutorHistoryItem[] = []) {
  const safeHistory = history
    .slice(-10)
    .map((item) => {
      const role = item.role === "assistant" || item.role === "model" ? "Tutor IA" : "Estudiante";
      const content = cleanText(item.content, 3000);
      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return safeHistory
    ? `Historial reciente de la conversacion:\n${safeHistory}\n\nPregunta actual del estudiante:\n${message}`
    : message;
}

function extractGeminiAnswer(data: Record<string, unknown>) {
  if (typeof data?.output_text === "string") {
    return data.output_text.trim();
  }

  const steps = Array.isArray(data?.steps) ? data.steps : [];
  for (const step of steps.slice().reverse()) {
    const content = (step as { content?: unknown })?.content;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
    if (Array.isArray(content)) {
      const text = content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            return String((part as { text?: unknown }).text || "");
          }
          return "";
        })
        .join("")
        .trim();
      if (text) return text;
    }
  }

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const candidateText = candidates
    .flatMap((candidate) => {
      const parts = (candidate as { content?: { parts?: { text?: string }[] } })?.content?.parts;
      return Array.isArray(parts) ? parts.map((part) => part.text || "") : [];
    })
    .join("")
    .trim();

  return candidateText;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo no permitido" }, 405);
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
      return jsonResponse({ ok: false, error: "Mensaje vacio" }, 400);
    }

    const workspaceContext = compactWorkspaceContext(body.context);
    const input = buildGeminiInput(message, body.history);

    const geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        store: false,
        system_instruction:
          "Eres Tutor IA de AC Edunity, un asistente educativo para estudiantes. " +
          "Responde siempre en espanol claro, profesional y didactico. " +
          "Explica paso a paso cuando sea util. Crea ejercicios, preguntas tipo examen, flashcards y resumenes si el usuario lo pide. " +
          "No inventes datos personales. Usa el contexto academico del usuario solo para adaptar ejemplos. " +
          "Si el usuario pide respuestas largas, organiza la explicacion con subtitulos breves. " +
          `Contexto academico disponible en AC Edunity: ${workspaceContext}`,
        input,
        generation_config: {
          temperature: 0.55,
          top_p: 0.9,
          max_output_tokens: 1200,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("[tutor-ai] Error Gemini:", geminiResponse.status, errorText);
      return jsonResponse({ ok: false, error: "Gemini no respondio" }, 502);
    }

    const data = await geminiResponse.json();
    const answer = extractGeminiAnswer(data);

    if (!answer) {
      console.error("[tutor-ai] Respuesta vacia de Gemini", data);
      return jsonResponse({ ok: false, error: "Respuesta vacia" }, 502);
    }

    return jsonResponse({ ok: true, answer });
  } catch (error) {
    console.error("[tutor-ai] Error inesperado:", error);
    return jsonResponse({ ok: false, error: "Error interno del Tutor" }, 500);
  }
});
