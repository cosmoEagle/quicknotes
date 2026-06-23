# QuickNotes

Turn any YouTube video, PDF, article, or piece of text into clean, structured notes — powered by your own LLM API key.

No subscriptions. No data stored on our servers. Just paste a source, pick a style, and watch your notes appear.

**[Try it live → quicknotes.shreesh.app](https://quicknotes.shreesh.app)**

---

## What you get

### 4 ways to bring in content

- **YouTube URL** — transcript pulled automatically, no manual copy-paste
- **PDF** — upload any document and get notes from it
- **Article URL** — paste any public web link
- **Raw text** — paste anything: meeting notes, book excerpts, lecture transcripts

### 4 note styles

- **Summary** — tight bullet points and key takeaways, nothing more
- **Deep-dive** — full sectioned notes that cover every concept, definition, and example
- **Flashcards** — Q&A cards matched to your level (beginner / intermediate / expert), exportable to Anki
- **Timestamped** — chapter-by-chapter notes with clickable timestamps that jump the YouTube video to exactly that moment

### Your LLM, your key

Pick from **Gemini, OpenAI, Anthropic, or Groq**. Enter your API key once — it stays in your browser and is never sent to or stored on our servers.

### After generation

- **Revise with AI** — chat directly with your notes: "make this more concise", "add a section on X", "rewrite in bullet points"
- **Edit manually** — toggle inline editing and change anything yourself
- **Export as Markdown** — one click downloads a clean `.md` file ready for Obsidian, Notion, Logseq, or any notes app
- **Note history** — every note you generate in a session is saved in the sidebar

---

## How it works

1. Enter your API key in the provider panel (top right)
2. Choose a source — paste a YouTube link, article URL, or raw text, or upload a PDF
3. Pick your note style and hit **Generate**
4. Watch notes stream in live, token by token
5. Revise, edit, and export when you're happy

For **timestamped notes**: click any `MM:SS` link in the output to jump directly to that point in a floating video player — no tab switching.

For **flashcards**: set your proficiency level and how many cards you want before generating, then hit **Export to Anki** to get a ready-to-import `.txt` file.

---

## Self-hosting

### Prerequisites

- Python 3.12+
- Node.js 18+

### 1. Clone the repo

```bash
git clone https://github.com/cosmoEagle/quicknotes.git
cd quicknotes
```

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend && npm install && cd ..
```

### 4. Start the backend

Run from the **project root**:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

### 5. Start the frontend

```bash
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables (optional)

Create a `.env` file in the project root:

```env
CORS_ORIGINS=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

API keys for LLM providers are entered in the UI — they never touch the server.

---

## Tech

Built with FastAPI, LangGraph, Next.js, and Tailwind CSS.
