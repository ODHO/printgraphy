import { EventEmitter } from "events";
import type { MessageParty } from "@/models/Message";

export interface LiveMessage {
  partyType: MessageParty;
  partyId: string;
}

const globalBus = globalThis as typeof globalThis & { __xprintsMessageBus?: EventEmitter };

export function messageBus() {
  if (!globalBus.__xprintsMessageBus) {
    const bus = new EventEmitter();
    bus.setMaxListeners(0);
    globalBus.__xprintsMessageBus = bus;
  }
  return globalBus.__xprintsMessageBus;
}

export function publishMessage(event: LiveMessage) {
  messageBus().emit("message", event);
}

export function publishLive() {
  messageBus().emit("live", { type: "records" });
}

export function messageStream(filter: (event: LiveMessage) => boolean) {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const push = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          unsubscribe();
        }
      };
      const send = (event: LiveMessage) => {
        if (!filter(event)) return;
        push(`data: ${JSON.stringify(event)}\n\n`);
      };
      const onLive = () => push(`data: {"type":"records"}\n\n`);
      const bus = messageBus();
      bus.on("message", send);
      bus.on("live", onLive);
      const ping = setInterval(() => {
        push(`: ping\n\n`);
      }, 15000);
      controller.enqueue(encoder.encode(`data: {"type":"ready"}\n\n`));
      unsubscribe = () => {
        bus.off("message", send);
        bus.off("live", onLive);
        clearInterval(ping);
      };
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
