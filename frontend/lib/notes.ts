import { createClient } from "./supabase";

export interface NoteRecord {
  id: string;
  user_id: string;
  title: string;
  style: string;
  source_type: string;
  source_url: string | null;
  content: string;
  cards: { question: string; answer: string; type: string }[] | null;
  created_at: string;
  updated_at: string;
}

export type NoteInsert = Omit<NoteRecord, "id" | "user_id" | "created_at" | "updated_at">;

// These headings are too generic to serve as a recognisable note title.
const SKIP_HEADINGS = /^(summary|key takeaways|takeaways|introduction|overview|full summary|flashcards|notes|deep.?dive|timestamped notes|deep notes)$/i;

/** Extract a human-readable title from generated notes. */
export function extractTitle(
  notes: string,
  cards: NoteRecord["cards"],
  style: string,
  sourceType: string,
  sourceUrl: string
): string {
  if (style === "flashcard" && cards?.length) {
    return `${cards.length} flashcard${cards.length > 1 ? "s" : ""} — ${sourceLabel(sourceType, sourceUrl)}`;
  }

  // Find the first heading that isn't a generic structural label
  for (const m of notes.matchAll(/^#{1,3}\s+(.+)$/gm)) {
    const clean = m[1].replace(/[*_`[\]]/g, "").replace(/^\d{1,2}:\d{2}(:\d{2})?\s*/, "").trim();
    if (clean.length > 3 && !SKIP_HEADINGS.test(clean)) {
      return clean.slice(0, 80);
    }
  }

  // Fall back to the first substantive bullet point (at least 30 chars of real content)
  const bullet = notes.match(/^[\*\-]\s+(.{30,})$/m);
  if (bullet) return bullet[1].replace(/[*_`]/g, "").trim().slice(0, 80);

  // Last resort
  return `${style.charAt(0).toUpperCase() + style.slice(1)} — ${sourceLabel(sourceType, sourceUrl)}`;
}

function sourceLabel(sourceType: string, sourceUrl: string): string {
  if (sourceType === "youtube" && sourceUrl) {
    const m = sourceUrl.match(/(?:youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
    return m ? `youtu.be/${m[1]}` : "YouTube";
  }
  if (sourceType === "article" && sourceUrl) {
    try { return new URL(sourceUrl).hostname.replace("www.", ""); } catch { /* ignore */ }
  }
  if (sourceType === "pdf") return "PDF";
  return sourceType;
}

export function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export async function saveNote(note: NoteInsert): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("notes")
    .insert({ ...note, user_id: user.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function loadNotes(): Promise<NoteRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

export async function updateNoteContent(
  id: string,
  updates: Partial<Pick<NoteRecord, "content" | "cards" | "title">>
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("notes").update(updates).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}
