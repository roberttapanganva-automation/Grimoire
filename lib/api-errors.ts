interface SupabaseErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

export function logSupabaseError(context: string, error: SupabaseErrorLike) {
  console.error("[Supabase]", context, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

export function safeApiError(error: string, detail?: string | null) {
  return {
    error,
    ...(process.env.NODE_ENV !== "production" && detail ? { detail } : {}),
  };
}
