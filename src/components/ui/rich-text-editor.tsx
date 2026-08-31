import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import Mention from "@tiptap/extension-mention";
import { getMentionSuggestions } from "./mention-suggestion";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Palette, Highlighter,
  Link2 as LinkIcon,
} from "lucide-react";

const COLORS = [
  "#ffffff", "#a1a1aa", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Escreva aqui...", minHeight = "160px" }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline hover:text-primary/80 cursor-pointer",
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-primary/20 text-primary-foreground font-semibold px-1 py-0.5 rounded-md',
        },
        suggestion: getMentionSuggestions(),
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap outline-none min-h-full text-sm leading-relaxed",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Digite o link (URL):", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Basic URL validation/prefixing if missing protocol
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl) && !/^mailto:/i.test(finalUrl) && !/^tel:/i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
  };

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColorPicker(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) setShowHighlightPicker(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition ${active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("link")} onClick={setLink} title="Inserir Link">
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título 1">
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título 2">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Título 3">
          <Heading3 className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Alinhar esquerda">
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centralizar">
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Alinhar direita">
          <AlignRight className="h-4 w-4" />
        </ToolBtn>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Color picker */}
        <div className="relative" ref={colorRef}>
          <ToolBtn onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }} title="Cor do texto">
            <Palette className="h-4 w-4" />
          </ToolBtn>
          {showColorPicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 px-3 py-2.5 rounded-full border border-white/10 bg-[oklch(0.15_0.01_270)] shadow-xl flex items-center gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }} className="h-7 w-7 rounded-full border-2 border-white/10 hover:scale-125 hover:border-white/40 transition-transform" style={{ background: c }} />
              ))}
              <div className="w-px h-5 bg-white/10 mx-0.5" />
              <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }} className="text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap px-1.5">Remover</button>
            </div>
          )}
        </div>

        {/* Highlight picker */}
        <div className="relative" ref={highlightRef}>
          <ToolBtn active={editor.isActive("highlight")} onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }} title="Destaque">
            <Highlighter className="h-4 w-4" />
          </ToolBtn>
          {showHighlightPicker && (
            <div className="absolute top-full right-0 mt-2 z-50 px-3 py-2.5 rounded-full border border-white/10 bg-[oklch(0.15_0.01_270)] shadow-xl flex items-center gap-2">
              {COLORS.slice(2).map((c) => (
                <button key={c} type="button" onClick={() => { editor.chain().focus().toggleHighlight({ color: c + "33" }).run(); setShowHighlightPicker(false); }} className="h-7 w-7 rounded-full border-2 border-white/10 hover:scale-125 hover:border-white/40 transition-transform" style={{ background: c }} />
              ))}
              <div className="w-px h-5 bg-white/10 mx-0.5" />
              <button type="button" onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }} className="text-[10px] text-muted-foreground hover:text-foreground whitespace-nowrap px-1.5">Remover</button>
            </div>
          )}
        </div>
      </div>

      {/* Editor content */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
