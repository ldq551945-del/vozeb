import { randomUUID } from "node:crypto";

import { refundUserPoints } from "@/lib/auth/store";

export type VideoTaskStatus = "pending" | "running" | "success" | "error" | "cancelled";

export type VideoTaskReference = { name?: string; type?: string; dataUrl: string };

export type VideoTask = {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    status: VideoTaskStatus;
    createdAt: number;
    updatedAt: number;
    channelId: string;
    internalBaseUrl: string;
    model: string;
    prompt: string;
    videoSize: string;
    vquality: string;
    videoSeconds: string;
    references: VideoTaskReference[];
    upstreamId?: string;
    resultUrl?: string;
    remoteUrl?: string;
    error?: string;
    pointsCost: number;
    pointsRemaining?: number;
    refundState: "none" | "pending" | "completed";
    abortController: AbortController;
};

const TASK_TTL_MS = 60 * 60 * 1000;
const globalStore = globalThis as typeof globalThis & { __dqVideoTasks?: Map<string, VideoTask> };
const tasks = (globalStore.__dqVideoTasks ??= new Map<string, VideoTask>());

export function createVideoTask(input: Omit<VideoTask, "id" | "status" | "createdAt" | "updatedAt" | "refundState" | "abortController">) {
    cleanupVideoTasks();
    const now = Date.now();
    const task: VideoTask = {
        ...input,
        id: randomUUID(),
        status: "pending",
        createdAt: now,
        updatedAt: now,
        refundState: "none",
        abortController: new AbortController(),
    };
    tasks.set(task.id, task);
    return task;
}

export function getVideoTask(id: string) {
    cleanupVideoTasks();
    return tasks.get(id) || null;
}

export function countActiveVideoTasks(userId: string) {
    cleanupVideoTasks();
    return Array.from(tasks.values()).filter((task) => task.userId === userId && (task.status === "pending" || task.status === "running")).length;
}

export function updateVideoTask(id: string, patch: Partial<Pick<VideoTask, "status" | "upstreamId" | "resultUrl" | "remoteUrl" | "error" | "pointsRemaining" | "refundState">>) {
    const task = tasks.get(id);
    if (!task) return null;
    const next = { ...task, ...patch, updatedAt: Date.now() };
    tasks.set(id, next);
    return next;
}

export function cancelVideoTask(id: string) {
    const task = tasks.get(id);
    if (!task || !["pending", "running"].includes(task.status)) return task || null;
    task.abortController.abort();
    return updateVideoTask(id, { status: "cancelled", error: "视频生成已取消" });
}

export async function refundVideoTaskPoints(id: string) {
    const task = tasks.get(id);
    if (!task || task.refundState !== "none" || task.pointsCost <= 0) return task || null;
    updateVideoTask(id, { refundState: "pending" });
    try {
        const user = await refundUserPoints(task.userId, task.model, task.pointsCost, "video");
        return updateVideoTask(id, { refundState: "completed", pointsRemaining: user?.pointsBalance });
    } catch (error) {
        updateVideoTask(id, { refundState: "none" });
        throw error;
    }
}

function cleanupVideoTasks() {
    const expiresBefore = Date.now() - TASK_TTL_MS;
    for (const [id, task] of tasks) if (task.updatedAt < expiresBefore) tasks.delete(id);
}
