import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoTask } from "@/lib/server/video-task-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const task = getVideoTask(id);
    if (!task || task.userId !== user.id) return NextResponse.json({ error: "视频任务不存在" }, { status: 404 });
    return NextResponse.json({ task: { id: task.id, status: task.status, upstreamId: task.upstreamId, resultUrl: task.resultUrl, error: task.error } }, { headers: { "cache-control": "no-store" } });
}
