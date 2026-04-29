import "server-only";
import type { DocumentFileType } from "@/types";

export const scannedPdfMessage = "No readable text found in this PDF. It may be scanned or image-only.";
export const pdfRuntimeInitMessage = "PDF parser failed to initialize in the server runtime. TXT and MD processing are still available.";

interface ExtractDocumentTextInput {
  data: ArrayBuffer | Blob | Buffer | Uint8Array;
  fileName?: string | null;
  fileType?: string | null;
}

export function normalizeFileType(fileName?: string | null, fileType?: string | null): DocumentFileType {
  const extension = fileName?.split(".").pop()?.trim().toLowerCase() ?? "";
  const type = fileType?.trim().toLowerCase() ?? "";

  if (extension === "pdf" || type === "pdf" || type === "application/pdf") {
    return "pdf";
  }

  if (extension === "md" || extension === "markdown" || type === "md" || type === "markdown" || type === "text/markdown") {
    return "md";
  }

  if (extension === "txt" || type === "txt" || type === "text/plain") {
    return "txt";
  }

  throw new Error(`Unsupported document type: ${fileType || extension || "unknown"}`);
}

function stripBom(text: string) {
  return text.replace(/^\uFEFF/, "");
}

function normalizePdfText(text: string) {
  return stripBom(text)
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

async function toBuffer(data: ExtractDocumentTextInput["data"]) {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof Blob) {
    return Buffer.from(await data.arrayBuffer());
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  return Buffer.from(data);
}

function isPdfRuntimeInitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Object.defineProperty called on non-object");
}

async function extractPdfText(buffer: Buffer) {
  let PDFParse: typeof import("pdf-parse").PDFParse;

  try {
    ({ PDFParse } = await import("pdf-parse"));
  } catch (error) {
    if (isPdfRuntimeInitError(error)) {
      throw new Error(pdfRuntimeInitMessage);
    }

    throw error;
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = normalizePdfText(result.text);

    if (!text) {
      throw new Error(scannedPdfMessage);
    }

    return text;
  } catch (error) {
    if (isPdfRuntimeInitError(error)) {
      throw new Error(pdfRuntimeInitMessage);
    }

    throw error;
  } finally {
    await parser.destroy();
  }
}

export async function extractDocumentText(input: ExtractDocumentTextInput) {
  const fileType = normalizeFileType(input.fileName, input.fileType);
  const buffer = await toBuffer(input.data);

  if (fileType === "pdf") {
    return extractPdfText(buffer);
  }

  const text = stripBom(buffer.toString("utf8")).trim();

  if (!text) {
    throw new Error(fileType === "md" ? "No readable text found in this Markdown file." : "No readable text found in this text file.");
  }

  return text;
}
