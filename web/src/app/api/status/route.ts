import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSessionCookieValue } from "@/lib/auth/session";

type StatusVisitorMap = Map<string, number>;

const globalState = globalThis as typeof globalThis & { __dqStatusVisitors?: StatusVisitorMap };
const visitors = globalState.__dqStatusVisitors || new Map<string, number>();
globalState.__dqStatusVisitors = visitors;
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export async function GET() {
    const now = Date.now();
    const cookie = await getSessionCookieValue();
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const identity = cookie || forwarded;
    const key = createHash("sha256").update(identity).digest("hex").slice(0, 24);
    visitors.set(key, now);
    for (const [visitor, seenAt] of visitors) {
        if (now - seenAt > ACTIVE_WINDOW_MS) visitors.delete(visitor);
    }

    return Response.json(
        {
            status: "healthy",
            onlineApprox: visitors.size,
        },
        {
            headers: {
                "Cache-Control": "no-store",
            },
        },
    );
}
