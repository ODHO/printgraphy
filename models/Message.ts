import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MessageParty = "user" | "vendor";
export type MessageSender = "admin" | "user" | "vendor";

export interface IMessage extends Document {
  partyType: MessageParty;
  partyId: Types.ObjectId;
  senderRole: MessageSender;
  body: string;
  attachmentUrl?: string;
  attachmentName?: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    partyType: { type: String, enum: ["user", "vendor"], required: true, index: true },
    partyId: { type: Schema.Types.ObjectId, required: true, index: true },
    senderRole: { type: String, enum: ["admin", "user", "vendor"], required: true },
    body: { type: String, default: "", maxlength: 2000 },
    attachmentUrl: { type: String, default: "" },
    attachmentName: { type: String, default: "" },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ partyType: 1, partyId: 1, createdAt: 1 });

if (mongoose.models.Message && !mongoose.models.Message.schema.path("attachmentUrl")) {
  mongoose.deleteModel("Message");
}

const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
