import { randomUUID } from "node:crypto";

export type VideoTaskStatus = "pending" | "running" | "success" | "error";
export type VideoTaskConfig = {
    apiSource: "system";
    baseUrl: string;
    apiKey: string;
    apiFormat: "openai";
    model: string;
    size: string;
    vquality: string;
    videoSeconds: string;
    advancedConfig?: { protocol?: string; createPath?: string; queryPath?: string };
};
export type VideoTaskReference = { dataUrl?: string; type?: string; name?: string };
export type VideoTask = {
    id: string;
    userId: string;
    status: VideoTaskStatus;
    createdAt: number;
    updatedAt: number;
    config: VideoTaskConfig;
    prompt: string;
    references: VideoTaskReference[];
    upstreamId?: string;
    resultUrl?: string;
    error?: string;
};

const globalStore = globalThis as typeof globalThis & { __dqVideoTasks?: Map<string, VideoTask> };
const tasks = (globalStore.__dqVideoTasks ??= new Map<string, VideoTask>());
const TTL = 60 * 60 * 1000;

export function createVideoTask(input: Omit<VideoTask, "id" | "status" | "createdAt" | "updatedAt">) {
    cleanupVideoTasks();
    const now = Date.now();
    const task: VideoTask = { ...input, id: randomUUID(), status: "pending", createdAt: now, updatedAt: now };
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

export function updateVideoTask(id: string, patch: Partial<Pick<VideoTask, "status" | "upstreamId" | "resultUrl" | "error">>) {
    const task = tasks.get(id);
    if (!task) return null;
    const next = { ...task, ...patch, updatedAt: Date.now() };
    tasks.set(id, next);
    return next;
}

function cleanupVideoTasks() {
    const before = Date.now() - TTL;
    for (const [id, task] of tasks) if (task.updatedAt < before) tasks.delete(id);
}
