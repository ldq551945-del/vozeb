import { NextResponse } from "next/server";

import { listPublicUsers } from "@/lib/auth/store";
import { getCurrentUser, serializeCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (currentUser.role !== "admin") return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });

    const users = await listPublicUsers();
    return NextResponse.json({ users, currentUser: serializeCurrentUser(currentUser) });
}
