import { createClient } from "./supabase";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface GenerateRequest {
  source_type: "youtube" | "pdf" | "article" | "text";
  content: string;
  style: string;
  description: string;
  provider: string;
  model: string;
  api_key: string;
  proficiency?: string;
  card_count?: number;
}

export interface SSEMessage {
  event: "status" | "notes_start" | "token" | "card" | "summary" | "revised" | "done" | "error";
  data: string;
}

async function* readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEMessage> {
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const msg: SSEMessage = JSON.parse(line.slice(6));
          yield msg;
        } catch {
          // malformed line, skip
        }
      }
    }
  }
  // Flush any remaining buffer (handles streams that end without a trailing newline)
  if (buffer.startsWith("data: ")) {
    try {
      yield JSON.parse(buffer.slice(6)) as SSEMessage;
    } catch {
      // skip
    }
  }
}

function backendUnreachableMsg(): string {
  const isLocalBackend = BACKEND_URL.includes("localhost") || BACKEND_URL.includes("127.0.0.1");
  const isDeployedFrontend =
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";
  if (isLocalBackend && isDeployedFrontend) {
    return `Backend URL is still set to ${BACKEND_URL}. Set the NEXT_PUBLIC_BACKEND_URL environment variable to your deployed backend URL and rebuild.`;
  }
  return `Cannot reach backend at ${BACKEND_URL}. Is the server running?`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function httpErrorMessage(response: Response): Promise<string> {
  let detail = "";
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") detail = body.detail;
  } catch {
    // non-JSON error body
  }
  if (response.status === 401) return detail || "Your session has expired — sign in again.";
  if (response.status === 429) {
    const wait = response.headers.get("Retry-After");
    return detail || `Too many requests — try again in ${wait ?? "a few "}s.`;
  }
  return detail ? `Server error: ${detail}` : `Server error: ${response.status} ${response.statusText}`;
}

export async function* generateNotes(
  request: GenerateRequest,
  signal?: AbortSignal
): AsyncGenerator<SSEMessage> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    yield { event: "error", data: backendUnreachableMsg() };
    return;
  }

  if (!response.ok) {
    yield { event: "error", data: await httpErrorMessage(response) };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { event: "error", data: "No response body from server." };
    return;
  }
  yield* readSSEStream(reader);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface ReviseRequest {
  notes: string;
  instruction: string;
  history: { role: string; text: string }[];
  source_type: string;
  content: string;
  provider: string;
  model: string;
  api_key: string;
}

export async function* reviseNotes(
  request: ReviseRequest,
  signal?: AbortSignal
): AsyncGenerator<SSEMessage> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    yield { event: "error", data: backendUnreachableMsg() };
    return;
  }

  if (!response.ok) {
    yield { event: "error", data: await httpErrorMessage(response) };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { event: "error", data: "No response body from server." };
    return;
  }
  yield* readSSEStream(reader);
}
