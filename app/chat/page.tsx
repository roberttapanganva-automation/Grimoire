"use client";

import { FormEvent, KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bot, Loader2, MessageSquare, Plus, Send, Trash2, UserRound } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { ChatApiResponse, ChatMessage, ChatSession, ChatSessionDetail, ChatSource } from "@/types";

type UiMessage = ChatMessage & {
  id: string;
  sources?: ChatSource[];
  isLoading?: boolean;
};

const welcomeMessage: UiMessage = {
  id: "welcome",
  role: "assistant",
  content: "Ask a question about your processed TXT documents. I will answer only from retrieved chunks and show the sources I used.",
  sources: [],
};

function createMessage(role: UiMessage["role"], content: string): UiMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    sources: [],
  };
}

function mapSavedMessage(message: ChatMessage): UiMessage {
  return {
    id: message.id ?? crypto.randomUUID(),
    role: message.role,
    content: message.content,
    sources: message.sources ?? [],
    createdAt: message.createdAt,
    sessionId: message.sessionId,
  };
}

function previewTitle(session: ChatSession) {
  return session.title || session.latestMessagePreview || "New Chat";
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );

  const loadSessions = useCallback(async (preferredSessionId?: string) => {
    setIsLoadingSessions(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/sessions");

      if (response.status === 401) {
        window.location.href = "/login?next=/chat";
        return;
      }

      const result = (await response.json().catch(() => null)) as { sessions?: ChatSession[]; error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Could not load chat sessions.");
      }

      const loadedSessions = result?.sessions ?? [];
      setSessions(loadedSessions);

      if (preferredSessionId) {
        setActiveSessionId(preferredSessionId);
      } else if (activeSessionId && !loadedSessions.some((session) => session.id === activeSessionId)) {
        setActiveSessionId(null);
        setMessages([welcomeMessage]);
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Could not load chat sessions.");
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function loadConversation(sessionId: string) {
    setActiveSessionId(sessionId);
    setIsLoadingConversation(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);

      if (response.status === 401) {
        window.location.href = "/login?next=/chat";
        return;
      }

      const result = (await response.json().catch(() => null)) as (ChatSessionDetail & { error?: string }) | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Could not load selected chat.");
      }

      setMessages(result?.messages?.length ? result.messages.map(mapSavedMessage) : [welcomeMessage]);
    } catch (conversationError) {
      setError(conversationError instanceof Error ? conversationError.message : "Could not load selected chat.");
    } finally {
      setIsLoadingConversation(false);
      textareaRef.current?.focus();
    }
  }

  function startNewChat() {
    setMessages([welcomeMessage]);
    setInput("");
    setActiveSessionId(null);
    setError(null);
    textareaRef.current?.focus();
  }

  async function deleteSession(sessionId: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setDeletingSessionId(sessionId);
    setError(null);

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Could not delete chat session.");
      }

      setSessions((current) => current.filter((session) => session.id !== sessionId));

      if (activeSessionId === sessionId) {
        startNewChat();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete chat session.");
    } finally {
      setDeletingSessionId(null);
    }
  }

  async function sendMessage() {
    const question = input.trim();

    if (!question || isSending) {
      return;
    }

    const userMessage = createMessage("user", question);
    const loadingMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Searching your document chunks...",
      isLoading: true,
      sources: [],
    };

    setInput("");
    setError(null);
    setIsSending(true);
    setMessages((current) => [...(activeSessionId ? current : [welcomeMessage]), userMessage, loadingMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          sessionId: activeSessionId,
        }),
      });

      if (response.status === 401) {
        window.location.href = "/login?next=/chat";
        return;
      }

      const result = (await response.json().catch(() => null)) as ChatApiResponse | null;

      if (result?.sessionId) {
        setActiveSessionId(result.sessionId);
      }

      if (!response.ok) {
        throw new Error(result?.error ?? "Chat request failed.");
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessage.id
            ? {
                id: loadingMessage.id,
                role: "assistant",
                content: result?.answer ?? "I could not find this in your uploaded documents yet.",
                sources: result?.sources ?? [],
              }
            : message,
        ),
      );

      if (result?.sessionId) {
        await loadSessions(result.sessionId);
      }
    } catch (requestError) {
      const errorMessage = requestError instanceof Error ? requestError.message : "Network request failed.";
      setError(errorMessage);
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessage.id
            ? {
                id: loadingMessage.id,
                role: "assistant",
                content: errorMessage,
                sources: [],
              }
            : message,
        ),
      );
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#E2E8F0]">
      <Sidebar />

      <main className="min-h-screen md:pl-[240px]">
        <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[#2A2D3E] bg-[#11141C] p-4 lg:block">
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-3 py-2 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <Plus className="size-4" aria-hidden="true" />
              New Chat
            </button>

            <div className="mt-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                <MessageSquare className="size-4" aria-hidden="true" />
                Chat History
              </div>

              {isLoadingSessions ? (
                <div className="flex items-center gap-2 rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-3 text-sm text-[#64748B]">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading sessions
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-3 text-sm text-[#64748B]">
                  No saved chats yet.
                </div>
              ) : (
                <div className="grid gap-2">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isDeleting = deletingSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        className={`group flex items-start justify-between gap-2 rounded-[6px] border p-3 transition-colors duration-150 ${
                          isActive ? "border-[#F59E0B] bg-[#21243A]" : "border-[#2A2D3E] bg-[#1A1D27] hover:bg-[#21243A]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => void loadConversation(session.id)}
                          className="min-w-0 flex-1 text-left focus:outline-none focus:ring-1 focus:ring-amber-400"
                        >
                            <p className="truncate text-sm font-medium text-[#E2E8F0]">{previewTitle(session)}</p>
                            {session.latestMessagePreview ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">{session.latestMessagePreview}</p>
                            ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => void deleteSession(session.id, event)}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-[4px] text-[#64748B] transition-colors duration-150 hover:bg-[#0F1117] hover:text-red-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          aria-label={`Delete ${previewTitle(session)}`}
                        >
                          {isDeleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-screen flex-col">
            <header className="border-b border-[#2A2D3E] bg-[#1A1D27] px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-[#E2E8F0]">RAG Chat</h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {activeSession ? activeSession.title : "Answers are constrained to retrieved document chunks."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-[#2A2D3E] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors duration-150 hover:bg-[#21243A] focus:outline-none focus:ring-1 focus:ring-amber-400 lg:hidden"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New Chat
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto flex max-w-4xl flex-col gap-4">
                {error ? (
                  <div className="flex items-start gap-3 rounded-[6px] border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-100">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {isLoadingConversation ? (
                  <div className="flex items-center gap-2 rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] p-4 text-sm text-[#64748B]">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Loading conversation
                  </div>
                ) : (
                  messages.map((message) => (
                    <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" ? (
                        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] text-amber-400">
                          {message.isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Bot className="size-4" aria-hidden="true" />}
                        </div>
                      ) : null}

                      <div className={`max-w-[min(720px,100%)] ${message.role === "user" ? "order-first" : ""}`}>
                        <div
                          className={`rounded-[6px] border p-4 ${
                            message.role === "user"
                              ? "border-amber-400/40 bg-amber-400/10 text-[#E2E8F0]"
                              : "border-[#2A2D3E] bg-[#1A1D27] text-[#E2E8F0]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        </div>

                        {message.sources && message.sources.length > 0 ? (
                          <div className="mt-3 grid gap-2">
                            {message.sources.map((source, index) => (
                              <div key={`${message.id}-${source.chunk_id}`} className="rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                                    Source {index + 1}: {source.document_title}
                                  </p>
                                  <p className="font-mono text-xs text-[#64748B]">{Math.round(source.similarity * 100)}%</p>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{source.excerpt}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {message.role === "user" ? (
                        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-[#2A2D3E] bg-[#1A1D27] text-[#E2E8F0]">
                          <UserRound className="size-4" aria-hidden="true" />
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="border-t border-[#2A2D3E] bg-[#1A1D27] p-4 sm:p-6">
              <div className="mx-auto flex max-w-4xl items-end gap-3">
                <label className="sr-only" htmlFor="chat-message">
                  Ask about your documents
                </label>
                <textarea
                  ref={textareaRef}
                  id="chat-message"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  rows={2}
                  placeholder="Ask about a processed TXT document..."
                  className="max-h-40 min-h-[52px] flex-1 resize-y rounded-[6px] border border-[#2A2D3E] bg-[#0F1117] px-3 py-3 text-sm text-[#E2E8F0] placeholder:text-[#64748B] focus:outline-none focus:ring-1 focus:ring-amber-400"
                  disabled={isSending || isLoadingConversation}
                />
                <button
                  type="submit"
                  disabled={isSending || isLoadingConversation || !input.trim()}
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[4px] bg-amber-400 px-4 text-sm font-semibold text-[#0F1117] transition-colors duration-150 hover:bg-[#FBBF24] focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                  Send
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
