"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatThread, { type ChatItem } from "@/components/ChatThread";
import { useLiveRefresh } from "@/components/useMessageStream";
import { Avatar, Badge, Card, cx, EmptyState, Icon, inputClass, labelClass, PageHeader, type IconName } from "@/components/admin/ui";

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
      <PageHeader
        icon="messages"
        title="Messages"
        description="Two separate inboxes. Customer messages stay with users. Vendor messages stay with vendors."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ConnectionButton label="Users messaging" icon="users" count={counts.user} active={party === "user"} onClick={() => setParty("user")} />
        <ConnectionButton label="Vendor messaging" icon="vendors" count={counts.vendor} active={party === "vendor"} onClick={() => setParty("vendor")} />
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-[32rem]">
          <aside className="flex flex-col border-b border-zinc-100 lg:border-b-0 lg:border-r min-w-0">
            <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-zinc-100">
              <p className="text-sm font-semibold text-zinc-900">{party === "user" ? "Customers" : "Vendors"}</p>
              <Badge tone="brand" className="tabular-nums">{conversations.length}</Badge>
            </div>
            <div className="flex-1 max-h-[32rem] overflow-y-auto">
              {conversations.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#329AD4]">
                    <Icon name="inbox" className="w-5 h-5" />
                  </span>
                  <p className="mt-3 text-sm text-zinc-500">No conversations yet.</p>
                </div>
              )}
              <ul className="p-2 space-y-0.5">
                {conversations.map((row) => {
                  const isActive = selected === row.id;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => openPerson(row.id)}
                        className={cx(
                          "relative w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors",
                          isActive ? "bg-[#EAF5FB] ring-1 ring-inset ring-[#b8e0f6]" : "hover:bg-zinc-50"
                        )}
                      >
                        <span className="relative">
                          <Avatar name={row.name || row.email || "?"} />
                          {row.unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#329AD4] ring-2 ring-white" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className={cx("text-sm truncate", row.unread > 0 ? "font-semibold text-zinc-900" : "font-medium text-zinc-800")}>{row.name}</span>
                            <span className="shrink-0 text-[11px] text-zinc-400 tabular-nums">{timeLabel(row.lastAt)}</span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span className={cx("block text-xs truncate", row.unread > 0 ? "text-zinc-700" : "text-zinc-500")}>{row.lastBody}</span>
                            {row.unread > 0 && <span className="shrink-0 rounded-full bg-[#329AD4] px-1.5 text-[10px] font-semibold leading-4 text-white tabular-nums">{row.unread}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {starters.length > 0 && (
                <div className="mx-2 mb-2 rounded-xl border border-dashed border-[#b8e0f6] bg-[#f0f8fd] p-3">
                  <label className={cx(labelClass, "flex items-center gap-1.5 text-[#1b5b80]")}>
                    <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
                    Start a conversation
                  </label>
                  <select value="" onChange={(event) => openPerson(event.target.value)} className={inputClass}>
                    <option value="">Choose {party === "user" ? "a customer" : "a vendor"}</option>
                    {starters.map((person) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </aside>
          <section className="flex flex-col min-h-[32rem] min-w-0">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-100">
              {active ? (
                <Avatar name={active.name || active.email || "?"} />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  <Icon name="messages" className="w-4 h-4" />
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-900 truncate">{active?.name || "Select a conversation"}</h2>
                {active?.email && <p className="text-xs text-zinc-500 truncate">{active.email}</p>}
              </div>
            </div>
            {selected ? (
              <ChatThread messages={messages} onSend={send} sending={sending} placeholder="Write a message" />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-[#f0f8fd]/60">
                <EmptyState
                  icon="messages"
                  title="No conversation selected"
                  description={`Pick someone from the ${party === "user" ? "users" : "vendors"} list.`}
                />
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}

const timeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const clockFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function timeLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString() === new Date().toDateString() ? clockFormat.format(date) : timeFormat.format(date);
}

function ConnectionButton({ label, icon, count, active, onClick }: { label: string; icon: IconName; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "flex items-center gap-4 rounded-2xl p-5 text-left cursor-pointer border transition-all",
        active
          ? "bg-gradient-to-br from-[#55b2e7] to-[#2884b8] border-transparent text-white shadow-md shadow-[#329AD4]/25"
          : "bg-white border-zinc-200/70 text-zinc-900 shadow-xs hover:border-[#b8e0f6] hover:-translate-y-0.5"
      )}
    >
      <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", active ? "bg-white/20 text-white" : "bg-[#EAF5FB] text-[#2884b8]")}>
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <span className="min-w-0">
        <span className={cx("block text-sm font-semibold", active ? "text-white/90" : "text-zinc-600")}>{label}</span>
        <span className="mt-0.5 block text-2xl font-bold tracking-tight tabular-nums">{count} <span className={cx("text-sm font-medium", active ? "text-white/80" : "text-zinc-500")}>unread</span></span>
      </span>
    </button>
  );
}
