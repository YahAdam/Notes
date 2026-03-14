import "./RichTextEditor.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import { useEditor, EditorContent } from "@tiptap/react";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import FileHandler from "@tiptap/extension-file-handler";
import { Dropcursor } from "@tiptap/extensions";
import type { ThemeName, Note } from "../../types";
import { FONT_SIZES } from "../../constants";
import { formatEpochDate } from "../../utilities/date";
import { stripHtml } from "../../utilities/text";
import { SidePanel } from "../../components/SidePanel";
import { ResizableImage } from "../../components/ResizeableImage/ResizeableImage";
import { getNotes, saveNote, deleteNoteFromIdb } from "../../idb/notes";
import { uid } from "../../utilities/uid";

type NotePadProps = {
  theme: ThemeName;
  setTheme: React.Dispatch<React.SetStateAction<ThemeName>>;
};

export function NotePad({ theme, setTheme }: NotePadProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isDragOverEditor, setIsDragOverEditor] = useState(false);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const storedNotes = await getNotes();

      if (cancelled) return;

      const sorted = storedNotes
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(sorted);
      setSelectedId(sorted[0]?.id ?? null);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

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
    saveNote(newNote);
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
    deleteNoteFromIdb(id);
  }

  function updateSelected(patch: Partial<Pick<Note, "title" | "content">>) {
    if (!selectedId) return;
    const now = Date.now();

    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedId) return n;

        const updated = { ...n, ...patch, updatedAt: now };
        saveNote(updated);
        return updated;
      }),
    );
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
        ResizableImage.configure({
          allowBase64: true,
          HTMLAttributes: {
            class: "note-image",
          },
        }),
        FileHandler.configure({
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
          ],
          onDrop: async (currentEditor, files, pos) => {
            const file = files[0];
            if (!file || !file.type.startsWith("image/")) return;

            const src = await readFileAsDataUrl(file);

            currentEditor
              .chain()
              .focus()
              .insertContentAt(pos, {
                type: "image",
                attrs: {
                  src,
                  alt: file.name,
                  title: file.name,
                },
              })
              .run();
          },
          onPaste: async (currentEditor, files) => {
            const file = files[0];
            if (!file || !file.type.startsWith("image/")) return;

            const src = await readFileAsDataUrl(file);

            currentEditor
              .chain()
              .focus()
              .setImage({
                src,
                alt: file.name,
                title: file.name,
              })
              .run();
          },
        }),
        Dropcursor.configure({
          color: "var(--accent)",
          width: 2,
        }),
      ],
      content: selectedNote?.content ?? "<p></p>",
      editorProps: {
        attributes: {
          class:
            "note-editor-content min-h-0 flex-1 p-4 outline-none text-sm leading-6 text-left h-full cursor-text",
        },
        handleDOMEvents: {
          dragenter: (_view, event) => {
            const e = event as DragEvent;
            const hasImage = Array.from(e.dataTransfer?.items ?? []).some(
              (item) => item.kind === "file" && item.type.startsWith("image/"),
            );
            if (!hasImage) return false;
            dragDepthRef.current += 1;
            setIsDragOverEditor(true);
            return false;
          },
          dragover: (_view, event) => {
            const e = event as DragEvent;
            const hasImage = Array.from(e.dataTransfer?.items ?? []).some(
              (item) => item.kind === "file" && item.type.startsWith("image/"),
            );
            if (!hasImage) return false;
            e.preventDefault();
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = "copy";
            }
            setIsDragOverEditor(true);
            return false;
          },
          dragleave: (_view, event) => {
            const e = event as DragEvent;
            const hasImage = Array.from(e.dataTransfer?.items ?? []).some(
              (item) => item.kind === "file" && item.type.startsWith("image/"),
            );
            if (!hasImage) return false;
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) {
              setIsDragOverEditor(false);
            }
            return false;
          },
          drop: (_view, event) => {
            const e = event as DragEvent;
            const hasImage = Array.from(e.dataTransfer?.items ?? []).some(
              (item) => item.kind === "file" && item.type.startsWith("image/"),
            );
            if (!hasImage) return false;
            dragDepthRef.current = 0;
            setIsDragOverEditor(false);
            return false;
          },
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

  async function insertImage(file: File) {
    await insertImageFile(file);
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file as data URL."));
        }
      };

      reader.onerror = () => {
        reject(reader.error ?? new Error("Failed to read file."));
      };

      reader.readAsDataURL(file);
    });
  }

  async function insertImageFile(file: File, editorInstance = editor) {
    if (!editorInstance) return;
    if (!file.type.startsWith("image/")) return;

    const src = await readFileAsDataUrl(file);

    editorInstance
      .chain()
      .focus()
      .setImage({
        src,
        alt: file.name,
        title: file.name,
      })
      .run();
  }

  return (
    <div
      data-theme={theme}
      className="notes-root h-screen w-full overflow-hidden border shadow-sm"
    >
      <div className="grid h-full grid-cols-1 md:grid-cols-[340px_1fr]">
        <SidePanel
          theme={theme}
          setTheme={setTheme}
          notes={filteredNotes}
          selectedId={selectedId}
          query={query}
          setQuery={setQuery}
          onSelectNote={setSelectedId}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
        />
        <section className="notes-main flex h-full min-w-0 min-h-0 flex-col">
          {!selectedNote ? (
            <div className="text-soft flex h-full flex-col items-center justify-center gap-3 p-6">
              <p className="m-0 text-base">No note selected.</p>
            </div>
          ) : (
            <>
              <div className="notes-sticky-top sticky top-0 z-20">
                <div className="notes-header border-b p-4">
                  <input
                    className="input-base w-full rounded-xl px-3 py-2 text-lg font-extrabold focus:outline-none"
                    placeholder="Title"
                    value={selectedNote.title}
                    onChange={(e) => updateSelected({ title: e.target.value })}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-muted flex flex-col gap-1 text-xs sm:flex-row sm:gap-4">
                      <div>
                        Created: {formatEpochDate(selectedNote.createdAt)}
                      </div>
                      <div>
                        Updated: {formatEpochDate(selectedNote.updatedAt)}
                      </div>
                    </div>
                  </div>
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
                    <label className="toolbar-btn rounded px-2 py-1 border cursor-pointer">
                      Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            insertImage(file);
                          }
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div
                className={`notes-editor-area min-h-0 flex-1 overflow-auto ${isDragOverEditor ? "notes-editor-area-dragover" : ""}`}
              >
                <div
                  className={`tiptap h-full ${isDragOverEditor ? "tiptap-dragover" : ""}`}
                >
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
