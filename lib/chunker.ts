export interface TextChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

interface ChunkTextOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkText(rawText: string, options: ChunkTextOptions = {}): TextChunk[] {
  const chunkSize = Math.max(1, Math.floor(options.chunkSize ?? 500));
  const overlap = Math.max(0, Math.min(Math.floor(options.overlap ?? 50), chunkSize - 1));
  const text = rawText.replace(/\s+/g, " ").trim();

  if (!text) {
    return [];
  }

  const words = text.split(" ").filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  if (words.length <= chunkSize) {
    return [
      {
        content: text,
        chunkIndex: 0,
        tokenCount: words.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  const step = chunkSize - overlap;
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const content = words.slice(start, end).join(" ").trim();

    if (content) {
      chunks.push({
        content,
        chunkIndex: chunks.length,
        tokenCount: end - start,
      });
    }

    if (end >= words.length) {
      break;
    }

    start += step;
  }

  return chunks;
}
