const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface GenerateRequest {
  source_type: "youtube" | "pdf" | "article";
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

export async function* generateNotes(
  request: GenerateRequest,
  signal?: AbortSignal
): AsyncGenerator<SSEMessage> {
  const response = await fetch(`${BACKEND_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    yield { event: "error", data: `Server error: ${response.status} ${response.statusText}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { event: "error", data: "No response body from server." };
    return;
  }

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
  const response = await fetch(`${BACKEND_URL}/api/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    yield { event: "error", data: `Server error: ${response.status} ${response.statusText}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { event: "error", data: "No response body from server." };
    return;
  }

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
}
