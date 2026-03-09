import { useEffect, useMemo, useState } from "react";
import "./RichTextEditor.scss";
import type { ThemeName } from "../../types/theme";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

type NotePadProps = {
  theme: ThemeName;
  setTheme: React.Dispatch<React.SetStateAction<ThemeName>>;
};

const STORAGE_KEY = "notes_app_v1";
const FONT_SIZES = ["12px", "14px", "16px", "18px", "24px", "32px"];

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

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function NotePad({ theme, setTheme }: NotePadProps) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [selectedId, setSelectedId] = useState<string | null>(
    () => loadNotes()[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = notes.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;

    return sorted.filter((n) => {
      const title = (n.title || "").toLowerCase();
      const contentText = stripHtml(n.content || "").toLowerCase();
      return title.includes(q) || contentText.includes(q);
    });
  }, [notes, query]);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (selectedId && !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null);
    }
  }, [notes, selectedId]);

  function createNote() {
    const now = Date.now();
    const newNote: Note = {
      id: uid(),
      title: "Untitled",
      content: "<p></p>",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(newNote.id);
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateSelected(patch: Partial<Pick<Note, "title" | "content">>) {
    if (!selectedId) return;
    const now = Date.now();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId ? { ...n, ...patch, updatedAt: now } : n,
      ),
    );
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as Note[];
    if (!Array.isArray(parsed)) return;

    const normalized: Note[] = parsed
      .filter((x) => x && typeof x === "object")
      .map((x: any) => ({
        id: typeof x.id === "string" ? x.id : uid(),
        title: typeof x.title === "string" ? x.title : "Untitled",
        content: typeof x.content === "string" ? x.content : "<p></p>",
        createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
        updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : Date.now(),
      }));

    const sorted = normalized.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(sorted);
    setSelectedId(sorted[0]?.id ?? null);
  }

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Underline,
        TextStyle,
        Color.configure({ types: ["textStyle"] }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          defaultAlignment: "left",
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
      ],
      content: selectedNote?.content ?? "<p></p>",
      editorProps: {
        attributes: {
          class:
            "note-editor-content min-h-0 flex-1 p-4 outline-none text-sm leading-6 text-left h-full cursor-text",
        },
      },
      onUpdate: ({ editor }) => {
        updateSelected({ content: editor.getHTML() });
      },
    },
    [selectedNote?.id],
  );

  useEffect(() => {
    if (!editor || !selectedNote) return;

    const next = selectedNote.content || "<p></p>";
    const current = editor.getHTML();

    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, selectedNote]);

  function setFontSize(size: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setMark("textStyle", { style: `font-size: ${size}` })
      .run();
  }

  function clearFontSize() {
    if (!editor) return;
    editor.chain().focus().unsetMark("textStyle").run();
  }

  function setTextColor(color: string) {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
  }

  return (
    <div
      data-theme={theme}
      className="notes-root h-screen w-full overflow-hidden border shadow-sm"
    >
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="notes-sidebar flex h-full flex-col border-b md:border-b-0 md:border-r">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-base font-bold">Notes</h2>
              <button
                className="btn-primary inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold"
                type="button"
                onClick={createNote}
              >
                + New
              </button>
            </div>
            <input
              className="input-base mt-3 w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              placeholder="Search notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button
                className="btn-secondary inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold"
                type="button"
                onClick={exportJson}
              >
                Export
              </button>
              <label className="btn-secondary inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold">
                Import
                <input
                  className="hidden"
                  type="file"
                  accept="application/json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importJson(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <select
                className="input-base rounded-xl px-3 py-2 text-sm focus:outline-none"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeName)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="forest">Forest</option>
                <option value="dark-forest">Dark Forest</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {filteredNotes.length === 0 ? (
              <div className="text-muted px-2 py-3 text-sm">
                No notes found.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredNotes.map((n) => {
                  const isSelected = n.id === selectedId;
                  const preview =
                    stripHtml(n.content || "").slice(0, 80) || "—";
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={[
                        "note-card w-full rounded-2xl border px-3 py-2 text-left transition",
                        isSelected ? "note-card-selected" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">
                            {n.title || "Untitled"}
                          </div>
                        </div>
                        <div className="text-muted shrink-0 whitespace-nowrap text-xs">
                          {formatDate(n.updatedAt)}
                        </div>
                      </div>
                      <div className="text-soft mt-1 truncate text-sm">
                        {preview}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
        <section className="notes-main flex h-full min-w-0 flex-col">
          {!selectedNote ? (
            <div className="text-soft flex h-full flex-col items-center justify-center gap-3 p-6">
              <p className="m-0 text-base">No note selected.</p>
              <button
                className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
                type="button"
                onClick={createNote}
              >
                {notes.length > 0 ? "Create new note" : "Create your first note"}
              </button>
            </div>
          ) : (
            <>
              <div className="notes-header border-b p-4">
                <input
                  className="input-base w-full rounded-xl px-3 py-2 text-lg font-extrabold focus:outline-none"
                  placeholder="Title"
                  value={selectedNote.title}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-muted flex flex-col gap-1 text-xs sm:flex-row sm:gap-4">
                    <div>Created: {formatDate(selectedNote.createdAt)}</div>
                    <div>Updated: {formatDate(selectedNote.updatedAt)}</div>
                  </div>

                  <button
                    className="btn-danger rounded-xl px-3 py-2 text-sm font-bold"
                    type="button"
                    title="Delete note"
                    onClick={() => deleteNote(selectedNote.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="notes-toolbar-wrap border-b p-3">
                {!editor ? null : (
                  <div className="notes-toolbar flex flex-wrap items-center gap-2 rounded border p-2">
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("bold") ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                      Bold
                    </button>
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("italic") ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                      }
                    >
                      Italic
                    </button>
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("underline") ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                      }
                    >
                      Underline
                    </button>
                    <span className="toolbar-divider mx-1 h-6 w-px" />
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("heading", { level: 1 }) ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                      }
                    >
                      H1
                    </button>
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("heading", { level: 2 }) ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                      }
                    >
                      H2
                    </button>
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("heading", { level: 3 }) ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                      }
                    >
                      H3
                    </button>
                    <span className="toolbar-divider mx-1 h-6 w-px" />
                    <select
                      className="input-base rounded px-2 py-1 text-sm focus:outline-none"
                      onChange={(e) => setFontSize(e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Font size…
                      </option>
                      {FONT_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      className="toolbar-btn rounded px-2 py-1 border"
                      type="button"
                      onClick={clearFontSize}
                    >
                      Clear size
                    </button>
                    <span className="toolbar-divider mx-1 h-6 w-px" />
                    <input
                      className="color-input rounded border px-2 py-1"
                      type="color"
                      onChange={(e) => setTextColor(e.target.value)}
                    />
                    <button
                      className="toolbar-btn rounded px-2 py-1 border"
                      type="button"
                      onClick={() => editor.chain().focus().unsetColor().run()}
                    >
                      Clear color
                    </button>
                    <span className="toolbar-divider mx-1 h-6 w-px" />
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("taskList") ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleTaskList().run()
                      }
                    >
                      Checkbox
                    </button>
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("bulletList") ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                      }
                    >
                      • List
                    </button>
                    <button
                      className={`toolbar-btn rounded px-2 py-1 border ${editor.isActive("orderedList") ? "toolbar-btn-active" : ""}`}
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                      }
                    >
                      1. List
                    </button>
                  </div>
                )}
              </div>
              <div className="notes-editor-area min-h-0 flex-1 overflow-auto">
                <div className="tiptap h-full">
                  <EditorContent editor={editor} className="h-full" />
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
