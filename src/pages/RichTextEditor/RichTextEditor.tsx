import { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import "./RichTextEditor.scss"

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
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

export function NotePad() {
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

  const createNote = () => {
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
        content: typeof x.content === "string" ? x.content : "<p></p>",
        createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
        updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : Date.now(),
      }));

    const sorted = normalized.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(sorted);
    setSelectedId(sorted[0]?.id ?? null);
  };

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
            "min-h-0 flex-1 p-4 outline-none text-sm leading-6 text-gray-900 text-left",
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

  const setFontSize = (size: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setMark("textStyle", { style: `font-size: ${size}` })
      .run();
  };

  const clearFontSize = () => {
    if (!editor) return;
    editor.chain().focus().unsetMark("textStyle").run();
  };

  const setTextColor = (color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
  };

  return (
    <div className="h-screen w-full overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <aside className="flex h-full flex-col border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-base font-bold text-gray-900">Notes</h2>
              <button
                type="button"
                onClick={createNote}
                className="inline-flex items-center justify-center rounded-xl bg-green-900 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
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
                  const preview =
                    stripHtml(n.content || "").slice(0, 80) || "—";
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
                        {preview}
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
              <div className="border-b border-gray-200 p-3">
                {!editor ? null : (
                  <div className="flex flex-wrap items-center gap-2 rounded border border-gray-300 p-2">
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`rounded px-2 py-1 border  text-green-600 ${
                        editor.isActive("bold") ? "bg-gray-200" : ""
                      }`}
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                      }
                      className={`rounded px-2 py-1 border  text-green-600 ${
                        editor.isActive("italic") ? "bg-gray-200" : ""
                      }`}
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                      }
                      className={`rounded px-2 py-1 border text-green-600 ${
                        editor.isActive("underline") ? "bg-gray-200" : ""
                      }`}
                    >
                      Underline
                    </button>
                    <span className="mx-1 h-6 w-px bg-gray-300 text-green-600" />
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                      }
                      className={`rounded px-2 py-1 border text-green-600 ${
                        editor.isActive("heading", { level: 1 })
                          ? "bg-gray-200"
                          : ""
                      }`}
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                      }
                      className={`rounded px-2 py-1 border text-green-600 ${
                        editor.isActive("heading", { level: 2 })
                          ? "bg-gray-200"
                          : ""
                      }`}
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                      }
                      className={`rounded px-2 py-1 border text-green-600 ${
                        editor.isActive("heading", { level: 3 })
                          ? "bg-gray-200"
                          : ""
                      }`}
                    >
                      H3
                    </button>

                    <span className="mx-1 h-6 w-px bg-gray-300" />

                    <select
                      onChange={(e) => setFontSize(e.target.value)}
                      defaultValue=""
                      className="rounded border px-2 py-1 text-green-600"
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
                      type="button"
                      onClick={clearFontSize}
                      className="rounded px-2 py-1 border  text-green-600"
                    >
                      Clear size
                    </button>
                    <span className="mx-1 h-6 w-px bg-gray-300  text-green-600" />
                    <input
                      className="rounded border px-2 py-1 text-green-600"
                      type="color"
                      onChange={(e) => setTextColor(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().unsetColor().run()}
                      className="rounded px-2 py-1 border  text-green-600"
                    >
                      Clear color
                    </button>
                    <span className="mx-1 h-6 w-px bg-gray-300  text-green-600" />
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleTaskList().run()
                      }
                      className={`rounded px-2 py-1 border text-green-600 ${
                        editor.isActive("taskList") ? "bg-gray-200" : ""
                      }`}
                    >
                      Checkbox
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                      }
                      className={`rounded px-2 py-1 border  text-green-600 ${
                        editor.isActive("bulletList") ? "bg-gray-200" : ""
                      }`}
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                      }
                      className={`rounded px-2 py-1 border  text-green-600 ${
                        editor.isActive("orderedList") ? "bg-gray-200" : ""
                      }`}
                    >
                      1. List
                    </button>
                  </div>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
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
