import "server-only";
import { getGeminiApiKey } from "@/lib/server/gemini";

const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
const defaultFlashModel = "gemini-2.5-flash";
const genericTags = new Set(["document", "file", "note", "content", "text"]);

function modelPath(model: string) {
  const trimmed = model.trim();
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

function extractJsonArray(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return trimmed.slice(start, end + 1);
}

export function sanitizeTags(tags: string[], maxTags = 5) {
  const seen = new Set<string>();
  const limit = Math.max(1, Math.min(maxTags, 10));

  return tags
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter((tag) => tag.length > 1 && !genericTags.has(tag))
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
  existingTags = [],
  maxTags = 5,
}: {
  title: string;
  content: string;
  existingTags?: string[];
  maxTags?: number;
}) {
  const apiKey = getGeminiApiKey();
  const cleanContent = content.trim();

  if (!apiKey || (!title.trim() && !cleanContent)) {
    return [];
  }

  try {
    const model = process.env.GEMINI_FLASH_MODEL?.trim() || defaultFlashModel;
    const prompt = [
      "Return only a JSON array of strings.",
      `Generate 3 to ${Math.max(3, Math.min(maxTags, 6))} practical tags for this Grimoire item.`,
      "Rules: lowercase, short, useful, no duplicates, use hyphens instead of spaces.",
      "Avoid generic tags: document, file, note, content, text.",
      existingTags.length ? `Existing tags to avoid duplicating: ${existingTags.join(", ")}` : "",
      "",
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
    const jsonText = text ? extractJsonArray(text) : null;

    if (!jsonText) {
      console.warn("[auto-tag] Gemini returned no JSON array");
      return [];
    }

    const parsed = JSON.parse(jsonText) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sanitizeTags(parsed.filter((tag): tag is string => typeof tag === "string"), maxTags);
  } catch (error) {
    console.warn("[auto-tag] skipped", error instanceof Error ? error.message : "unknown failure");
    return [];
  }
}
