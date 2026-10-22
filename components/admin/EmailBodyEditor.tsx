"use client";

import { useEffect, useRef } from "react";

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
    <div className="mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-[#fbfaf7] px-2 py-1.5">
        <ToolButton label="B" title="Bold" onClick={() => format("bold")} className="font-bold" />
        <ToolButton label="I" title="Italic" onClick={() => format("italic")} className="italic" />
        <ToolButton label="U" title="Underline" onClick={() => format("underline")} className="underline" />
        <ToolButton label="List" title="Bullet list" onClick={() => format("insertUnorderedList")} />
        <span className="mx-1 h-4 w-px bg-zinc-200" />
        {placeholders.map((token) => (
          <button
            key={token}
            type="button"
            title={`Insert ${token}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertField(token)}
            className="rounded-md bg-white px-2 py-1 text-base font-semibold text-[#e74b2d] border border-zinc-200 cursor-pointer hover:bg-sky-50"
          >
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
        className="min-h-[160px] px-3.5 py-3 text-base leading-6 text-zinc-900 outline-none [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
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
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`min-w-7 rounded-md px-2 py-1 text-base text-zinc-700 hover:bg-white cursor-pointer ${className}`}
    >
      {label}
    </button>
  );
}
