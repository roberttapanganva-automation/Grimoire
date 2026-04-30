import "server-only";
import type { ChatMode, ChatResponseStyle } from "@/types";

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
  mode = "ask_documents",
  responseStyle = "kiss",
}: {
  apiKey: string;
  question: string;
  context: string;
  mode?: ChatMode;
  responseStyle?: ChatResponseStyle;
}) {
  const model = process.env.GEMINI_FLASH_MODEL?.trim() || defaultFlashModel;
  const modeInstructions: Record<ChatMode, string[]> = {
    ask_documents: [
      "Mode: Ask My Documents.",
      "Answer using only the retrieved context.",
      'If the context does not contain the answer, reply exactly: "I could not find this in your uploaded documents yet."',
    ],
    job_application: [
      "Mode: Job Application Writer.",
      "Write job application letters, proposals, OLJ replies, Upwork proposals, LinkedIn messages, or client replies.",
      "Use the retrieved context as the user's background and style guide.",
      "If the user pasted a job post or client request, tailor the answer to that request.",
      "Use a simple, natural, practical tone.",
      "Avoid overclaiming.",
      "Emphasize n8n, AI automation, workflow systems, CRM or lead systems, APIs and webhooks, Supabase, and operational problem-solving only when supported by retrieved context or the user's message.",
      "When useful, structure the answer as: short opening, relevant fit, practical proof, clear close.",
    ],
    interview_coach: [
      "Mode: Interview Answer Coach.",
      "Help answer interview or screening questions.",
      "Write in first person.",
      "Keep answers honest and natural.",
      "Use STAR or a simple situation-action-result shape only if helpful.",
      "Do not make the user sound overly corporate.",
      "Do not invent employment history.",
    ],
    kiss: [
      "Mode: KISS Mode.",
      "Keep it brief.",
      "Remove fluff.",
      "Use plain English.",
      "Prioritize clarity over sounding impressive.",
    ],
  };
  const styleInstructions: Record<ChatResponseStyle, string[]> = {
    direct: ["Response style: Direct.", "Give only the answer."],
    kiss: ["Response style: KISS.", "Short, simple, practical.", "No long explanation."],
    detailed: ["Response style: Detailed.", "Give a more complete version with clear sections."],
    natural_proposal: [
      "Response style: Natural Proposal.",
      "Write like a human freelancer applying for a role.",
      "Do not sound too polished or too salesy.",
      "No fake claims.",
    ],
    interview_answer: [
      "Response style: Interview Answer.",
      "Write a first-person answer.",
      "Make it confident but honest.",
      "Keep it short enough to say out loud.",
    ],
  };

  const prompt = [
    "You are Grimoire, a concise RAG assistant.",
    "Use retrieved document context first.",
    "Do not invent experience, tools, client results, credentials, employment history, or metrics.",
    "If important information is missing, say what is missing or write a safe version without overclaiming.",
    "Keep answers practical and human.",
    "Use the user's uploaded documents as the source of truth.",
    ...modeInstructions[mode],
    ...styleInstructions[responseStyle],
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
