import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { cancelVideoTask, getVideoTask, refundVideoTaskPoints } from "@/lib/server/video-task-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const task = getVideoTask(id);
    if (!task || task.userId !== user.id) return NextResponse.json({ error: "任务不存在或已过期" }, { status: 404 });
    return taskResponse(task);
}

export async function DELETE(_request: Request, context: RouteContext) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const { id } = await context.params;
    const task = getVideoTask(id);
    if (!task || task.userId !== user.id) return NextResponse.json({ error: "任务不存在或已过期" }, { status: 404 });
    cancelVideoTask(id);
    await refundVideoTaskPoints(id);
    return taskResponse(getVideoTask(id)!);
}

function taskResponse(task: NonNullable<ReturnType<typeof getVideoTask>>) {
    const headers = new Headers({ "cache-control": "no-store" });
    if (typeof task.pointsRemaining === "number") headers.set("x-vozeb-points-remaining", String(task.pointsRemaining));
    return NextResponse.json(
        {
            task: {
                id: task.id,
                status: task.status,
                model: task.model,
                upstreamId: task.upstreamId,
                resultUrl: task.resultUrl,
                remoteUrl: task.remoteUrl,
                error: task.error,
            },
        },
        { headers },
    );
}
