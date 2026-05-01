import { NextResponse } from "next/server";
import { getAutoTagModel, suggestTagsFromText } from "@/lib/server/autoTag";
import { getGeminiApiKey } from "@/lib/server/gemini";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    content?: unknown;
    type?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title : "";
  const content = typeof body?.content === "string" ? body.content : "";
  const type = typeof body?.type === "string" ? body.type : undefined;
  const inputLength = `${title}\n${content}`.trim().length;
  const geminiKeyPresent = Boolean(getGeminiApiKey());
  const diagnostics = {
    geminiKeyPresent,
    model: getAutoTagModel(),
    inputLength,
  };

  if (!geminiKeyPresent) {
    return NextResponse.json({ tags: [], error: "Gemini API key is not configured.", diagnostics });
  }

  const tags = await suggestTagsFromText({
    title,
    content,
    type,
    maxTags: 7,
    diagnosticPrefix: "[auto-tag:manual]",
  });

  if (tags.length === 0) {
    return NextResponse.json({ tags, error: "No tags were generated.", diagnostics });
  }

  return NextResponse.json({ tags, diagnostics });
}
