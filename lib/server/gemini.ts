import "server-only";

const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
const embeddingModel = "gemini-embedding-2";
const defaultFlashModel = "gemini-2.5-flash";

// Keep this at 768 because your Supabase chunks.embedding column is vector(768).
const embeddingDimensions = 768;

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

function modelPath(model: string) {
  const trimmed = model.trim();
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

async function parseGeminiError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;

  return body?.error?.message ?? `Gemini request failed with status ${response.status}.`;
}

type EmbedKind = "query" | "document";

function formatEmbeddingText(text: string, kind: EmbedKind, title?: string) {
  const cleanText = text.trim();

  if (kind === "document") {
    return `title: ${title?.trim() || "none"} | text: ${cleanText}`;
  }

  return `task: question answering | query: ${cleanText}`;
}

export async function embedText(
  text: string,
  apiKey: string,
  options?: {
    kind?: EmbedKind;
    title?: string;
  },
) {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Cannot embed empty text.");
  }

  const kind = options?.kind ?? "query";
  const formattedText = formatEmbeddingText(cleanText, kind, options?.title);

  const response = await fetch(`${geminiBaseUrl}/${modelPath(embeddingModel)}:embedContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelPath(embeddingModel),
      content: {
        parts: [{ text: formattedText }],
      },
      outputDimensionality: embeddingDimensions,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseGeminiError(response));
  }

  const result = (await response.json()) as {
    embedding?: { values?: number[] };
  };

  const values = result.embedding?.values;

  if (!values || values.length === 0) {
    throw new Error("Gemini returned an empty embedding.");
  }

  if (values.length !== embeddingDimensions) {
    throw new Error(`Gemini returned ${values.length} dimensions, expected ${embeddingDimensions}.`);
  }

  return values;
}

export async function embedQueryText(text: string, apiKey: string) {
  return embedText(text, apiKey, { kind: "query" });
}

export async function embedDocumentText(text: string, apiKey: string, title?: string) {
  return embedText(text, apiKey, { kind: "document", title });
}

export async function generateAnswerFromContext({
  apiKey,
  question,
  context,
}: {
  apiKey: string;
  question: string;
  context: string;
}) {
  const model = process.env.GEMINI_FLASH_MODEL?.trim() || defaultFlashModel;

  const prompt = [
    "You are Grimoire, a concise RAG assistant.",
    "Answer the user's question using ONLY the retrieved document context below.",
    'If the context does not contain the answer, reply exactly: "I could not find this in your uploaded documents yet."',
    "Do not use outside knowledge.",
    "",
    "Retrieved context:",
    context,
    "",
    `Question: ${question}`,
  ].join("\n");

  const response = await fetch(`${geminiBaseUrl}/${modelPath(model)}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 800,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await parseGeminiError(response));
  }

  const result = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const answer = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Gemini returned an empty answer.");
  }

  return answer;
}