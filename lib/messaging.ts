import { Types } from "mongoose";
import Message, { type MessageParty, type MessageSender } from "@/models/Message";
import { publishMessage } from "@/lib/messageBus";
import User from "@/models/User";
import Vendor from "@/models/Vendor";

export interface ConversationRow {
  id: string;
  name: string;
  email: string;
  lastBody: string;
  lastAt: string;
  unread: number;
}

export interface ChatMessage {
  _id: string;
  body: string;
  mine: boolean;
  createdAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export function prepareMessage(body: unknown, attachmentUrl?: unknown, attachmentName?: unknown) {
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length > 2000) return { error: "Keep the message under 2000 characters." };
  let attachment: { url: string; name: string } | null = null;
  if (typeof attachmentUrl === "string" && attachmentUrl.trim()) {
    const url = attachmentUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) return { error: "That file could not be attached." };
    const name = typeof attachmentName === "string" && attachmentName.trim() ? attachmentName.trim() : "File";
    attachment = { url, name: name.slice(0, 180) };
  }
  if (!text && !attachment) return { error: "Write a message or attach a file." };
  return { text, attachment };
}

export async function unreadCount(partyType: MessageParty) {
  return Message.countDocuments({ partyType, senderRole: { $ne: "admin" }, readAt: null });
}

export async function listPeople(partyType: MessageParty) {
  if (partyType === "user") {
    const users = await User.find({ isAdmin: { $ne: true } })
      .select("firstName lastName email")
      .sort({ firstName: 1 })
      .limit(200)
      .lean();
    return users.map((user) => ({
      id: String(user._id),
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    }));
  }

  const vendors = await Vendor.find({ status: { $ne: "deactivated" } })
    .select("name email")
    .sort({ name: 1 })
    .limit(200)
    .lean();
  return vendors.map((vendor) => ({
    id: String(vendor._id),
    name: vendor.name,
    email: vendor.email,
  }));
}

export async function listConversations(partyType: MessageParty): Promise<ConversationRow[]> {
  const rows = await Message.aggregate<{ _id: Types.ObjectId; lastBody: string; lastAt: Date; unread: number }>([
    { $match: { partyType } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$partyId",
        lastBody: { $first: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$body", ""] } }, 0] }, "$body", { $ifNull: ["$attachmentName", "Attachment"] }] } },
        lastAt: { $first: "$createdAt" },
        unread: {
          $sum: {
            $cond: [{ $and: [{ $ne: ["$senderRole", "admin"] }, { $eq: ["$readAt", null] }] }, 1, 0],
          },
        },
      },
    },
    { $sort: { lastAt: -1 } },
  ]);

  const ids = rows.map((row) => row._id);
  const people = partyType === "user"
    ? await User.find({ _id: { $in: ids } }).select("firstName lastName email").lean()
    : await Vendor.find({ _id: { $in: ids } }).select("name email").lean();
  const byId = new Map(people.map((person) => [String(person._id), person]));

  return rows.map((row) => {
    const person = byId.get(String(row._id));
    const name = person && "firstName" in person
      ? `${person.firstName} ${person.lastName}`.trim()
      : person && "name" in person
        ? person.name
        : "Unknown";
    return {
      id: String(row._id),
      name,
      email: person?.email || "",
      lastBody: row.lastBody,
      lastAt: new Date(row.lastAt).toISOString(),
      unread: row.unread,
    };
  });
}

export async function partyExists(partyType: MessageParty, partyId: string) {
  if (!Types.ObjectId.isValid(partyId)) return false;
  if (partyType === "user") return Boolean(await User.findById(partyId).select("_id").lean());
  return Boolean(await Vendor.findById(partyId).select("_id").lean());
}

export async function readThread(partyType: MessageParty, partyId: string, viewer: MessageSender): Promise<ChatMessage[]> {
  const messages = await Message.find({ partyType, partyId }).sort({ createdAt: 1 }).lean();
  await Message.updateMany(
    {
      partyType,
      partyId,
      senderRole: viewer === "admin" ? { $ne: "admin" } : "admin",
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );
  return messages.map((message) => ({
    _id: String(message._id),
    body: message.body,
    attachmentUrl: message.attachmentUrl || "",
    attachmentName: message.attachmentName || "",
    mine: viewer === "admin" ? message.senderRole === "admin" : message.senderRole === viewer,
    createdAt: message.createdAt.toISOString(),
  }));
}

export async function addMessage(
  partyType: MessageParty,
  partyId: string,
  senderRole: MessageSender,
  body: string,
  attachment?: { url: string; name: string } | null
) {
  const message = await Message.create({
    partyType,
    partyId,
    senderRole,
    body,
    attachmentUrl: attachment?.url || "",
    attachmentName: attachment?.name || "",
    readAt: null,
  });
  publishMessage({ partyType, partyId: String(partyId) });
  return {
    _id: String(message._id),
    body: message.body,
    attachmentUrl: message.attachmentUrl || "",
    attachmentName: message.attachmentName || "",
    mine: true,
    createdAt: message.createdAt.toISOString(),
  };
}
