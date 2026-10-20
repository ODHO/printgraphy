"use client";

import { useCallback, useEffect, useState } from "react";
import ChatThread, { type ChatItem } from "@/components/ChatThread";
import { useLiveRefresh } from "@/components/useMessageStream";

export default function MessagePanel({
  endpoint,
  title,
  hint,
}: {
  endpoint: string;
  title: string;
  hint: string;
}) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(endpoint);
    const data = await response.json();
    if (data.success) {
      setMessages(data.messages || []);
      window.dispatchEvent(new CustomEvent("xprints-unread", { detail: 0 }));
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  const send = async (payload: { body: string; attachmentUrl?: string; attachmentName?: string }) => {
    setSending(true);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSending(false);
    if (!data.success) return data.message || "Could not send.";
    setMessages((current) => [...current, data.message]);
  };

  return (
    <section className="bg-white rounded-3xl border border-zinc-200 flex flex-col min-h-[28rem]">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h2 className="text-base font-bold text-zinc-900">{title}</h2>
        <p className="text-base text-zinc-500 mt-1">{hint}</p>
      </div>
      <ChatThread messages={messages} onSend={send} sending={sending} />
    </section>
  );
}
