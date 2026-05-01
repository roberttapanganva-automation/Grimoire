import "server-only";
import { getGeminiApiKey } from "@/lib/server/gemini";
import { normalizeTags } from "@/lib/tagging";

const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
const defaultFlashModel = "gemini-2.5-flash";
const genericTags = new Set(["document", "file", "note", "content", "text", "general", "misc", "information", "data"]);

export function getAutoTagModel() {
  return process.env.GEMINI_FLASH_MODEL?.trim() || defaultFlashModel;
}

function modelPath(model: string) {
  const trimmed = model.trim();
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

function extractJsonArray(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("[");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const character = trimmed[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (character === "\\") {
      isEscaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "[") {
      depth += 1;
    }

    if (character === "]") {
      depth -= 1;

      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseTags(text: string) {
  const jsonArrayText = extractJsonArray(text);

  if (!jsonArrayText) {
    return [];
  }

  const parsed = JSON.parse(jsonArrayText) as unknown;

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { tags?: unknown }).tags)) {
    return (parsed as { tags: unknown[] }).tags;
  }

  return [];
}

export function sanitizeTags(tags: unknown, maxTags = 7) {
  const seen = new Set<string>();
  const limit = Math.max(1, Math.min(maxTags, 10));

  return normalizeTags(tags)
    .filter((tag) => tag.length > 1 && tag.length <= 32 && !genericTags.has(tag))
    .filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    })
    .slice(0, limit);
}

export function mergeTags(existingTags: string[] = [], suggestedTags: string[] = [], maxTags = 12) {
  return sanitizeTags([...existingTags, ...suggestedTags], maxTags);
}

export async function suggestTagsFromText({
  title,
  content,
  type,
  existingTags = [],
  maxTags = 7,
  diagnosticPrefix,
}: {
  title: string;
  content: string;
  type?: string;
  existingTags?: string[];
  maxTags?: number;
  diagnosticPrefix?: string;
}) {
  const apiKey = getGeminiApiKey();
  const cleanContent = content.trim();

  if (!apiKey || (!title.trim() && !cleanContent)) {
    if (diagnosticPrefix) {
      console.info(`${diagnosticPrefix} raw generated tags`, []);
    }
    return [];
  }

  try {
    const model = getAutoTagModel();
    const prompt = [
      "Return only a JSON array of strings.",
      `Generate 3 to ${Math.max(3, Math.min(maxTags, 7))} smart practical tags for this Grimoire item.`,
      "Include: one content type tag, topic tags, and obvious use-case tags.",
      "Content type examples: movie, quote, book, article, job-application, resume, cover-letter, proposal, interview, prompt, sop, checklist, tutorial, code, command, meeting-note, idea, research, personal-note, automation, crm, webhook, finance, health, travel, learning, client-note.",
      "Rules: lowercase, kebab-case, no spaces, no duplicates, max 32 characters each.",
      "Avoid generic tags: document, file, note, text, content, general, misc, information, data.",
      'Examples: "The Matrix is a 1999 sci-fi movie..." => ["movie","sci-fi","film","summary"].',
      '"Keep it simple, specific, and practical." => ["quote","kiss-method","writing","clarity"].',
      '"Upwork proposal for n8n automation role..." => ["job-application","proposal","upwork","n8n","automation"].',
      '"curl -X POST https://api..." => ["command","api","curl","webhook"].',
      '"Steps to onboard a new client..." => ["sop","client-onboarding","checklist","operations"].',
      existingTags.length ? `Existing tags to avoid duplicating: ${existingTags.join(", ")}` : "",
      "",
      `Item type: ${type?.trim() || "unknown"}`,
      `Title: ${title.trim() || "Untitled"}`,
      "Content:",
      cleanContent.slice(0, 3000),
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(`${geminiBaseUrl}/${modelPath(model)}:generateContent?key=${apiKey}`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
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
          temperature: 0.15,
          topP: 0.8,
          maxOutputTokens: 160,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      console.warn("[auto-tag] Gemini request failed", { status: response.status });
      return [];
    }

    const result = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const text = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) {
      console.warn("[auto-tag] Gemini returned no JSON array");
      return [];
    }

    const rawTags = parseTags(text);
    const tags = sanitizeTags(rawTags, maxTags);

    if (diagnosticPrefix) {
      console.info(`${diagnosticPrefix} raw generated tags`, rawTags);
      console.info(`${diagnosticPrefix} generated tags count`, tags.length);
    }

    return tags;
  } catch (error) {
    console.warn("[auto-tag] skipped", error instanceof Error ? error.message : "unknown failure");
    if (diagnosticPrefix) {
      console.info(`${diagnosticPrefix} raw generated tags`, []);
    }
    return [];
  }
}
