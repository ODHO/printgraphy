"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatThread, { type ChatItem } from "@/components/ChatThread";
import { useLiveRefresh } from "@/components/useMessageStream";

interface Person {
  id: string;
  name: string;
  email: string;
}

interface Conversation extends Person {
  lastBody: string;
  lastAt: string;
  unread: number;
}

type ChatMessage = ChatItem;

type Party = "user" | "vendor";

export default function AdminMessagesPage() {
  const [party, setParty] = useState<Party>("user");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [counts, setCounts] = useState({ user: 0, vendor: 0 });

  const loadList = useCallback(async (nextParty: Party) => {
    const response = await fetch(`/api/admin/messages?party=${nextParty}`);
    const data = await response.json();
    if (!data.success) return;
    setConversations(data.conversations || []);
    setPeople(data.people || []);
    setCounts({ user: data.userUnread || 0, vendor: data.vendorUnread || 0 });
  }, []);

  const loadThread = useCallback(async (nextParty: Party, id: string) => {
    if (!id) {
      setMessages([]);
      return;
    }
    const response = await fetch(`/api/admin/messages?party=${nextParty}&with=${id}`);
    const data = await response.json();
    if (data.success) {
      setMessages(data.messages || []);
      const total = (data.userUnread || 0) + (data.vendorUnread || 0);
      setCounts({ user: data.userUnread || 0, vendor: data.vendorUnread || 0 });
      window.dispatchEvent(new CustomEvent("xprints-unread", { detail: total }));
    }
  }, []);

  useEffect(() => {
    setSelected("");
    setMessages([]);
    loadList(party);
  }, [party, loadList]);

  useEffect(() => {
    if (!selected) return;
    loadThread(party, selected);
  }, [party, selected, loadThread]);

  const refreshRef = useRef({ party, selected, loadList, loadThread });
  refreshRef.current = { party, selected, loadList, loadThread };
  useLiveRefresh(() => {
    const current = refreshRef.current;
    current.loadList(current.party);
    if (current.selected) current.loadThread(current.party, current.selected);
  });

  const openPerson = (id: string) => {
    setSelected(id);
  };

  const send = async (payload: { body: string; attachmentUrl?: string; attachmentName?: string }) => {
    if (!selected) return "Select a conversation first.";
    setSending(true);
    const response = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ party, with: selected, ...payload }),
    });
    const data = await response.json();
    setSending(false);
    if (!data.success) return data.message || "Could not send.";
    setMessages((current) => [...current, data.message]);
    loadList(party);
  };

  const active = people.find((person) => person.id === selected) || conversations.find((row) => row.id === selected);
  const listedIds = new Set(conversations.map((row) => row.id));
  const starters = people.filter((person) => !listedIds.has(person.id));

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Messages</h1>
        <p className="text-base text-zinc-500 mt-1">Two separate inboxes. Customer messages stay with users. Vendor messages stay with vendors.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ConnectionButton label="Users messaging" count={counts.user} active={party === "user"} onClick={() => setParty("user")} />
        <ConnectionButton label="Vendor messaging" count={counts.vendor} active={party === "vendor"} onClick={() => setParty("vendor")} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-[32rem]">
        <aside className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <p className="text-base font-bold text-zinc-900">{party === "user" ? "Customers" : "Vendors"}</p>
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {conversations.length === 0 && <p className="px-4 py-6 text-base text-zinc-400">No conversations yet.</p>}
            {conversations.map((row) => (
              <button key={row.id} type="button" onClick={() => openPerson(row.id)} className={`w-full text-left px-4 py-3 border-b border-zinc-100 cursor-pointer ${selected === row.id ? "bg-sky-50" : "hover:bg-zinc-50"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-zinc-900 truncate">{row.name}</span>
                  {row.unread > 0 && <span className="rounded-full bg-[#e74b2d] text-white text-base font-bold px-1.5 py-0.5">{row.unread}</span>}
                </span>
                <span className="block text-base text-zinc-500 truncate mt-0.5">{row.lastBody}</span>
              </button>
            ))}
            {starters.length > 0 && (
              <div className="p-3">
                <label className="text-base font-bold text-zinc-500 block mb-1">Start a conversation</label>
                <select value="" onChange={(event) => openPerson(event.target.value)} className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base">
                  <option value="">Choose {party === "user" ? "a customer" : "a vendor"}</option>
                  {starters.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </aside>
        <section className="bg-white rounded-3xl border border-zinc-200 flex flex-col min-h-[32rem]">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-base font-bold text-zinc-900">{active?.name || "Select a conversation"}</h2>
            {active?.email && <p className="text-base text-zinc-500">{active.email}</p>}
          </div>
          {selected ? (
            <ChatThread messages={messages} onSend={send} sending={sending} placeholder="Write a message" />
          ) : (
            <p className="text-base text-zinc-400 text-center py-16">Pick someone from the {party === "user" ? "users" : "vendors"} list.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ConnectionButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-3xl p-5 text-left cursor-pointer shadow-md ${active ? "bg-[#e74b2d] text-white" : "bg-white border border-zinc-200 text-zinc-900"}`}>
      <p className="text-base font-bold opacity-90">{label}</p>
      <p className="text-2xl font-black mt-2">{count} unread</p>
    </button>
  );
}
