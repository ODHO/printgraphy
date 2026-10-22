"use client";

import { useEffect, useRef, type ReactNode } from "react";

function run(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export default function EmailBodyEditor({
  value,
  onChange,
  placeholders,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholders: string[];
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== value) editor.innerHTML = value || "";
  }, [value]);

  const sync = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const format = (command: string) => {
    editorRef.current?.focus();
    run(command);
    sync();
  };

  const insertField = (token: string) => {
    editorRef.current?.focus();
    run("insertText", token);
    sync();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs transition focus-within:border-[#329AD4] focus-within:ring-4 focus-within:ring-[#329AD4]/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-2.5 py-2">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-xs">
          <ToolButton label="B" title="Bold" onClick={() => format("bold")} className="font-bold" />
          <ToolButton label="I" title="Italic" onClick={() => format("italic")} className="italic font-serif" />
          <ToolButton label="U" title="Underline" onClick={() => format("underline")} className="underline" />
          <span className="mx-0.5 h-4 w-px bg-zinc-200" />
          <ToolButton
            label={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
              </svg>
            }
            title="Bullet list"
            onClick={() => format("insertUnorderedList")}
          />
        </div>
        {placeholders.length > 0 && (
          <>
            <span className="hidden sm:block h-5 w-px bg-zinc-200" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Insert</span>
          </>
        )}
        {placeholders.map((token) => (
          <button
            key={token}
            type="button"
            title={`Insert ${token}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertField(token)}
            className="inline-flex items-center gap-1 rounded-md border border-[#dbeefb] bg-[#EAF5FB] px-2 py-1 font-mono text-[11px] font-semibold text-[#2884b8] cursor-pointer transition-colors hover:border-[#b8e0f6] hover:bg-[#dbeefb]"
          >
            <span className="text-[#329AD4]/70">+</span>
            {token.replace(/[{}]/g, "")}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={sync}
        className="min-h-[180px] px-4 py-3.5 text-sm leading-6 text-zinc-900 outline-none [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
      />
    </div>
  );
}

function ToolButton({
  label,
  title,
  onClick,
  className = "",
}: {
  label: ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-sm text-zinc-600 transition-colors hover:bg-[#EAF5FB] hover:text-[#2884b8] cursor-pointer ${className}`}
    >
      {label}
    </button>
  );
}
