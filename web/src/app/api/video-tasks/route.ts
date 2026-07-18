import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAuthSettings } from "@/lib/auth/store";
import { resolveInternalOrigin, fetchInternalApi } from "@/lib/server/internal-origin";
import { countActiveVideoTasks, createVideoTask, updateVideoTask, type VideoTask, type VideoTaskConfig, type VideoTaskReference } from "@/lib/server/video-task-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { config?: Partial<VideoTaskConfig>; prompt?: string; references?: VideoTaskReference[] };

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const settings = await getAuthSettings();
    if (countActiveVideoTasks(user.id) >= Math.max(1, Math.min(5, Math.floor(Number(settings.generationConcurrency?.video) || 1)))) {
        return NextResponse.json({ error: "当前用户视频生成已达到并发上限，请稍后再试" }, { status: 429 });
    }
    const body = (await request.json().catch(() => ({}))) as Body;
    const config = sanitizeConfig(body.config);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!config || !prompt) return NextResponse.json({ error: "视频任务参数不完整" }, { status: 400 });
    if (!/^\/api\/ai\/system\/[^/]+$/.test(config.baseUrl)) return NextResponse.json({ error: "视频必须使用系统渠道" }, { status: 400 });
    const task = createVideoTask({ userId: user.id, config, prompt, references: Array.isArray(body.references) ? body.references.slice(0, 1) : [] });
    const origin = resolveInternalOrigin(new URL(request.url).origin);
    const cookie = request.headers.get("cookie") || "";
    void runVideoTask(task, origin, cookie);
    return NextResponse.json({ task: { id: task.id, provider: "server", model: task.config.model } });
}

function sanitizeConfig(input?: Partial<VideoTaskConfig>): VideoTaskConfig | null {
    if (!input || input.apiSource !== "system" || typeof input.baseUrl !== "string" || typeof input.model !== "string") return null;
    return {
        apiSource: "system",
        baseUrl: input.baseUrl.trim(),
        apiKey: "system",
        apiFormat: "openai",
        model: input.model.trim(),
        size: typeof input.size === "string" ? input.size : "9:16",
        vquality: typeof input.vquality === "string" ? input.vquality : "720",
        videoSeconds: typeof input.videoSeconds === "string" ? input.videoSeconds : "10",
        advancedConfig: input.advancedConfig,
    };
}

async function runVideoTask(task: VideoTask, origin: string, cookie: string) {
    updateVideoTask(task.id, { status: "running" });
    try {
        const createUrl = `${origin}${task.config.baseUrl}/v1/videos`;
        const form = new FormData();
        form.set("model", task.config.model);
        form.set("prompt", task.prompt);
        const grok = /grok.*video|video.*grok/i.test(task.config.model);
        form.set("seconds", grok ? (Number(task.config.videoSeconds) >= 15 ? "15" : "10") : String(Math.max(1, Math.min(15, Number(task.config.videoSeconds) || 5))));
        if (grok) {
            form.set("aspect_ratio", ["2:3", "3:2", "1:1", "16:9", "9:16"].includes(task.config.size) ? task.config.size : "9:16");
            form.set("size", String(task.config.vquality).replace(/p$/i, "") === "1080" ? "1080P" : "720P");
        } else {
            form.set("size", task.config.size || "1280x720");
        }
        const reference = task.references[0];
        if (reference?.dataUrl?.startsWith("data:")) form.append("input_reference", dataUrlToBlob(reference.dataUrl), reference.name || "reference.png");
        const response = await fetchInternalApi(createUrl, { method: "POST", headers: { cookie }, body: form, signal: AbortSignal.timeout(3 * 60 * 1000) });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (!response.ok) throw new Error(readPayloadError(payload) || `上游视频接口返回 ${response.status}`);
        const id = readTaskId(payload);
        const immediate = readVideoUrl(payload);
        if (!id && !immediate) throw new Error("上游没有返回视频任务 ID");
        if (immediate) {
            updateVideoTask(task.id, { status: "success", resultUrl: immediate });
            return;
        }
        updateVideoTask(task.id, { upstreamId: id });
        await pollVideoTask(task, origin, cookie, id);
    } catch (error) {
        updateVideoTask(task.id, { status: "error", error: error instanceof Error ? error.message : "视频生成失败" });
    }
}

async function pollVideoTask(task: VideoTask, origin: string, cookie: string, upstreamId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
        const url = `${origin}${task.config.baseUrl}/v1/videos/${encodeURIComponent(upstreamId)}`;
        const response = await fetchInternalApi(url, { headers: { cookie }, cache: "no-store", signal: AbortSignal.timeout(30 * 1000) });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (!response.ok) throw new Error(readPayloadError(payload) || `视频任务查询失败（${response.status}）`);
        const status = String(payload.status || (payload.data as Record<string, unknown> | undefined)?.status || "").toLowerCase();
        if (["failed", "cancelled", "error"].includes(status)) throw new Error(readPayloadError(payload) || "上游视频生成失败");
        const videoUrl = readVideoUrl(payload);
        if (videoUrl || ["completed", "succeeded", "success"].includes(status)) {
            updateVideoTask(task.id, { status: "success", resultUrl: videoUrl || `${task.config.baseUrl}/v1/videos/${encodeURIComponent(upstreamId)}/content` });
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    throw new Error("视频生成超时，请稍后重试");
}

function dataUrlToBlob(value: string) {
    const match = value.match(/^data:([^;]+);base64,(.*)$/s);
    if (!match) throw new Error("参考图格式不正确");
    return new Blob([Buffer.from(match[2], "base64")], { type: match[1] || "image/png" });
}
function readTaskId(payload: Record<string, unknown>) {
    const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : payload;
    return String(data.id || data.task_id || data.taskId || "").trim();
}
function readVideoUrl(payload: Record<string, unknown>) {
    const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : payload;
    const output = data.output && typeof data.output === "object" ? data.output as Record<string, unknown> : {};
    return String(data.video_url || data.videoUrl || output.url || data.url || "").trim();
}
function readPayloadError(payload: Record<string, unknown>) {
    const error = payload.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : {};
    return String(error.message || payload.msg || payload.message || "").trim();
}
