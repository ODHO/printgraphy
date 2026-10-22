"use client";

import { useEffect, useRef, useState } from "react";
import { mediaSrc } from "@/lib/mediaUrl";

export interface ChatItem {
  _id: string;
  body: string;
  mine: boolean;
  createdAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

const EMOJIS = ["😀", "😁", "😂", "😊", "😍", "👍", "🙏", "🎉", "🔥", "✅", "❌", "📦", "🚚", "💳", "📎", "⭐", "💯", "🤝", "😢", "😎"];

function isImage(name: string, url: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(name || url);
}

export default function ChatThread({
  messages,
  onSend,
  sending,
  disabled,
  placeholder = "Write a message",
}: {
  messages: ChatItem[];
  onSend: (payload: { body: string; attachmentUrl?: string; attachmentName?: string }) => Promise<string | void>;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (disabled || sending) return;
    if (!text && !file) return;
    setNotice("");
    let attachmentUrl = "";
    let attachmentName = "";
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setNotice("Files need to be 8 MB or smaller.");
        return;
      }
      const form = new FormData();
      form.append("file", file);
      const uploaded = await fetch("/api/upload", { method: "POST", body: form });
      const saved = await uploaded.json();
      if (!saved.success || !saved.url) {
        setNotice(saved.message || "Could not upload that file.");
        return;
      }
      attachmentUrl = saved.url;
      attachmentName = file.name;
    }
    const error = await onSend({
      body: text,
      ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}),
    });
    if (error) {
      setNotice(error);
      return;
    }
    setDraft("");
    setFile(null);
    setEmojiOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-[28rem]">
        {messages.length === 0 ? (
          <p className="text-base text-zinc-400 text-center py-10">No messages yet.</p>
        ) : messages.map((message) => (
          <div key={message._id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-base ${message.mine ? "bg-[#329AD4] text-white" : "bg-zinc-100 text-zinc-800"}`}>
              {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
              {message.attachmentUrl && isImage(message.attachmentName || "", message.attachmentUrl) && (
                <a href={mediaSrc(message.attachmentUrl)} target="_blank" rel="noreferrer" className="block mt-2">
                  <img src={mediaSrc(message.attachmentUrl)} alt={message.attachmentName || "Image"} className="max-h-40 rounded-lg" />
                </a>
              )}
              {message.attachmentUrl && !isImage(message.attachmentName || "", message.attachmentUrl) && (
                <a href={mediaSrc(message.attachmentUrl)} target="_blank" rel="noreferrer" className={`mt-2 block font-bold underline ${message.mine ? "text-white" : "text-[#329AD4]"}`}>
                  {message.attachmentName || "Download file"}
                </a>
              )}
              <p className={`mt-1 text-base ${message.mine ? "text-white/70" : "text-zinc-400"}`}>{new Date(message.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-100 p-4 space-y-2">
        {emojiOpen && (
          <div className="flex flex-wrap gap-1 rounded-2xl border border-zinc-200 bg-white p-2">
            {EMOJIS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => setDraft((current) => `${current}${emoji}`)} className="h-8 w-8 rounded-lg text-base hover:bg-zinc-100 cursor-pointer">
                {emoji}
              </button>
            ))}
          </div>
        )}
        {file && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-base">
            <span className="truncate text-zinc-700">{file.name}</span>
            <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="font-bold text-zinc-500 cursor-pointer">Remove</button>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" disabled={disabled} onClick={() => setEmojiOpen((open) => !open)} className="px-3 py-2 rounded-xl border border-zinc-200 text-base cursor-pointer disabled:opacity-50" aria-label="Add emoji">😊</button>
          <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl border border-zinc-200 text-base font-bold text-zinc-700 cursor-pointer disabled:opacity-50">File</button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx,.zip"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <input
            value={draft}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            className="flex-1 bg-[#ffffff] border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#329AD4] disabled:opacity-60"
          />
          <button type="button" disabled={disabled || sending} onClick={send} className="px-4 py-2 bg-[#329AD4] text-white text-base font-bold rounded-xl cursor-pointer disabled:opacity-50">
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
        {notice && <p className="text-base font-bold text-red-600">{notice}</p>}
      </div>
    </div>
  );
}
