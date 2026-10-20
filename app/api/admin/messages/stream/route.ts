import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { messageStream } from "@/lib/messageBus";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  return messageStream(() => true);
}
