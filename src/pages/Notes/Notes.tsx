import { useEffect, useMemo, useRef, useState } from "react";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "notes_app_v1";

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function NotesPad() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [selectedId, setSelectedId] = useState<string | null>(
    () => loadNotes()[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes.slice().sort((a, b) => b.updatedAt - a.updatedAt);

    return notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, query]);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (selectedId && !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null);
    }
  }, [notes, selectedId]);

  useEffect(() => {
    if (selectedNote) requestAnimationFrame(() => contentRef.current?.focus());
  }, [selectedNote?.id]);

  const createNote = () => {
    const now = Date.now();
    const newNote: Note = {
      id: uid(),
      title: "Untitled",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(newNote.id);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateSelected = (patch: Partial<Pick<Note, "title" | "content">>) => {
    if (!selectedId) return;
    const now = Date.now();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId ? { ...n, ...patch, updatedAt: now } : n,
      ),
    );
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as Note[];
    if (!Array.isArray(parsed)) return;

    const normalized: Note[] = parsed
      .filter((x) => x && typeof x === "object")
      .map((x: any) => ({
        id: typeof x.id === "string" ? x.id : uid(),
        title: typeof x.title === "string" ? x.title : "Untitled",
        content: typeof x.content === "string" ? x.content : "",
        createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
        updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : Date.now(),
      }));

    const sorted = normalized.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(sorted);
    setSelectedId(sorted[0]?.id ?? null);
  };

  return (
    <div className="h-[calc(100vh-2rem)] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="flex h-full flex-col border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-base font-bold text-gray-900">Notes</h2>
              <button
                type="button"
                onClick={createNote}
                className="inline-flex items-center justify-center rounded-xl bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              >
                + New
              </button>
            </div>
            <input
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Search notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                Export
              </button>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                Import
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importJson(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {filteredNotes.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500">
                No notes found.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredNotes.map((n) => {
                  const isSelected = n.id === selectedId;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={[
                        "w-full rounded-2xl border px-3 py-2 text-left transition",
                        "bg-white hover:bg-gray-50",
                        isSelected
                          ? "border-blue-300 ring-4 ring-blue-500/15"
                          : "border-gray-200",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-gray-900">
                            {n.title || "Untitled"}
                          </div>
                        </div>
                        <div className="shrink-0 whitespace-nowrap text-xs text-gray-500">
                          {formatDate(n.updatedAt)}
                        </div>
                      </div>

                      <div className="mt-1 truncate text-sm text-gray-700">
                        {(n.content || "").slice(0, 80) || "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
        <section className="flex h-full min-w-0 flex-col bg-white">
          {!selectedNote ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-gray-700">
              <p className="m-0 text-base">No note selected.</p>
              <button
                type="button"
                onClick={createNote}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                Create your first note
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 p-4">
                <input
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-lg font-extrabold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={selectedNote.title}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                  placeholder="Title"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:gap-4">
                    <div>Created: {formatDate(selectedNote.createdAt)}</div>
                    <div>Updated: {formatDate(selectedNote.updatedAt)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteNote(selectedNote.id)}
                    title="Delete note"
                    className="rounded-xl border border-red-500/60 bg-white px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <textarea
                ref={contentRef}
                className="min-h-0 flex-1 resize-none border-0 p-4 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400"
                value={selectedNote.content}
                onChange={(e) => updateSelected({ content: e.target.value })}
                placeholder="Write your note..."
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
