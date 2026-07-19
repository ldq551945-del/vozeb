import { NextResponse } from "next/server";

import { consumeUserPoints, getAuthSettings, isQuotaExceededError, type SystemModelChannel } from "@/lib/auth/store";
import { getCurrentUser } from "@/lib/auth/session";
import { toSafeGenerationErrorMessage } from "@/lib/server/generation-errors";
import { configureServerProxyDispatcher } from "@/lib/server/proxy-dispatcher";
import { countActiveVideoTasks, createVideoTask, refundVideoTaskPoints, updateVideoTask, type VideoTask, type VideoTaskReference } from "@/lib/server/video-task-store";
import { resolveGrokVideoPixelSize, videoCapabilityError, videoModelCapabilities } from "@/lib/video-model-capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

configureServerProxyDispatcher();

type CreateVideoTaskBody = {
    config?: { baseUrl?: unknown; model?: unknown; videoSize?: unknown; vquality?: unknown; videoSeconds?: unknown };
    prompt?: unknown;
    references?: unknown;
    videoReferences?: unknown;
    audioReferences?: unknown;
};

const VIDEO_RATIOS = new Set(["2:3", "3:2", "1:1", "16:9", "9:16"]);
const VIDEO_QUALITIES = new Set(["480", "720", "1080"]);
const CREATE_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_TIMEOUT_MS = 30 * 1000;
const POLL_INTERVAL_MS = 2500;
const POLL_ATTEMPTS = 240;

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const settings = await getAuthSettings();
    if (countActiveVideoTasks(user.id) >= Math.max(1, Math.min(5, Math.floor(Number(settings.generationConcurrency?.video) || 1)))) {
        return NextResponse.json({ error: "当前用户视频生成已达到并发上限，请稍后再试" }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateVideoTaskBody;
    const input = sanitizeInput(body);
    if (!input) return NextResponse.json({ error: "视频任务参数不完整" }, { status: 400 });
    const channel = settings.systemChannels.find((item) => item.id === input.channelId && item.enabled !== false);
    if (!channel || !channel.baseUrl.trim() || !channel.apiKey.trim() || !channel.models.includes(input.model)) {
        return NextResponse.json({ error: "视频渠道不存在、已停用或不包含所选模型" }, { status: 400 });
    }
    const template = channel.advancedConfig?.requestTemplate || "";
    if (!/multipart\/form-data/i.test(template)) return NextResponse.json({ error: "当前视频渠道未配置 multipart 请求模板" }, { status: 400 });

    const capabilities = videoModelCapabilities(input.model);
    const capabilityError = videoCapabilityError(input.model, input.videoSize, input.vquality);
    if (capabilityError) return NextResponse.json({ error: capabilityError }, { status: 400 });
    if (capabilities && !input.references.length) return NextResponse.json({ error: "当前模型仅支持图生视频，请添加 1 张参考图作为首帧" }, { status: 400 });
    if (capabilities?.maxReferenceImages && input.references.length > capabilities.maxReferenceImages) return NextResponse.json({ error: `当前模型最多支持 ${capabilities.maxReferenceImages} 张参考图` }, { status: 400 });
    if (capabilities && (input.videoReferenceCount || input.audioReferenceCount)) return NextResponse.json({ error: "当前模型不支持参考视频或参考音频" }, { status: 400 });

    const amount = videoPointMultiplier(settings.generationPointMultipliers, input.vquality, input.videoSeconds);
    let points: Awaited<ReturnType<typeof consumeUserPoints>>;
    try {
        points = await consumeUserPoints(user.id, input.model, amount, "video");
    } catch (error) {
        if (isQuotaExceededError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
        throw error;
    }

    const task = createVideoTask({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        channelId: channel.id,
        internalBaseUrl: input.internalBaseUrl,
        model: input.model,
        prompt: input.prompt,
        videoSize: input.videoSize,
        vquality: input.vquality,
        videoSeconds: input.videoSeconds,
        references: input.references,
        pointsCost: points.cost,
        pointsRemaining: points.remaining,
    });
    void runVideoTask(task, channel);

    return NextResponse.json({ task: { id: task.id, provider: "server", model: task.model, status: task.status } }, { status: 202, headers: { "x-vozeb-points-remaining": String(points.remaining) } });
}

function sanitizeInput(body: CreateVideoTaskBody) {
    const baseUrl = typeof body.config?.baseUrl === "string" ? body.config.baseUrl.trim().replace(/\/+$/, "") : "";
    const channelMatch = baseUrl.match(/^\/api\/ai\/system\/([^/]+)$/);
    const model = typeof body.config?.model === "string" ? body.config.model.trim() : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!channelMatch || !model || !prompt) return null;
    const ratio = typeof body.config?.videoSize === "string" && VIDEO_RATIOS.has(body.config.videoSize) ? body.config.videoSize : "16:9";
    const qualityValue = String(body.config?.vquality || "720").replace(/p$/i, "");
    const quality = VIDEO_QUALITIES.has(qualityValue) ? qualityValue : "720";
    const seconds = String(Math.max(1, Math.min(15, Math.floor(Number(body.config?.videoSeconds) || 10))));
    const references = Array.isArray(body.references)
        ? body.references
              .map(sanitizeReference)
              .filter((item): item is VideoTaskReference => Boolean(item))
              .slice(0, 9)
        : [];
    return {
        channelId: decodeURIComponent(channelMatch[1]),
        internalBaseUrl: baseUrl,
        model,
        prompt,
        videoSize: ratio,
        vquality: quality,
        videoSeconds: seconds,
        references,
        videoReferenceCount: Array.isArray(body.videoReferences) ? body.videoReferences.length : 0,
        audioReferenceCount: Array.isArray(body.audioReferences) ? body.audioReferences.length : 0,
    };
}

function sanitizeReference(value: unknown): VideoTaskReference | null {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    const dataUrl = typeof item.dataUrl === "string" ? item.dataUrl.trim() : "";
    if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl)) return null;
    return {
        dataUrl,
        name: typeof item.name === "string" ? item.name.slice(0, 160) : "reference.png",
        type: typeof item.type === "string" ? item.type.slice(0, 100) : "image/png",
    };
}

async function runVideoTask(task: VideoTask, channel: SystemModelChannel) {
    updateVideoTask(task.id, { status: "running" });
    console.info("Video task dispatched", { taskId: task.id, channelId: channel.id, model: task.model });
    try {
        const createPath = normalizePath(channel.advancedConfig?.createPath || "/videos");
        const response = await fetch(upstreamUrl(channel.baseUrl, createPath), {
            method: "POST",
            headers: { authorization: `Bearer ${channel.apiKey}`, accept: "application/json" },
            body: buildMultipartBody(task),
            cache: "no-store",
            signal: AbortSignal.any([task.abortController.signal, AbortSignal.timeout(CREATE_TIMEOUT_MS)]),
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readPayloadError(payload) || `上游视频接口返回 ${response.status}`);
        const immediateUrl = findString(payload, VIDEO_URL_KEYS);
        if (immediateUrl) {
            updateVideoTask(task.id, { status: "success", resultUrl: clientMediaUrl(task, immediateUrl), remoteUrl: immediateUrl });
            return;
        }
        const upstreamId = findString(payload, TASK_ID_KEYS);
        if (!upstreamId) throw new Error("上游没有返回视频任务 ID");
        updateVideoTask(task.id, { upstreamId });
        await pollVideoTask(task, channel, upstreamId);
    } catch (error) {
        const current = updateVideoTask(task.id, {});
        if (current?.status === "cancelled") {
            await refundSafely(task.id);
            return;
        }
        const message = toSafeGenerationErrorMessage(error, "视频生成失败");
        updateVideoTask(task.id, { status: "error", error: message });
        await refundSafely(task.id);
        console.error("Video task failed", { taskId: task.id, model: task.model, error: message });
    }
}

async function pollVideoTask(task: VideoTask, channel: SystemModelChannel, upstreamId: string) {
    const configuredPath = normalizePath(channel.advancedConfig?.queryPath || `${normalizePath(channel.advancedConfig?.createPath || "/videos")}/:task_id`);
    const queryPath = applyTaskId(configuredPath, upstreamId);
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        if (task.abortController.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const response = await fetch(upstreamUrl(channel.baseUrl, queryPath), {
            headers: { authorization: `Bearer ${channel.apiKey}`, accept: "application/json" },
            cache: "no-store",
            signal: AbortSignal.any([task.abortController.signal, AbortSignal.timeout(POLL_TIMEOUT_MS)]),
        });
        const payload = await readPayload(response);
        if (!response.ok) throw new Error(readPayloadError(payload) || `视频任务查询失败（${response.status}）`);
        const status = findString(payload, [channel.advancedConfig?.statusField || "status", "status", "state"]).toLowerCase();
        if (["failed", "cancelled", "error", "expired"].includes(status)) throw new Error(readPayloadError(payload) || "上游视频生成失败");
        const remoteUrl = findString(payload, VIDEO_URL_KEYS);
        if (remoteUrl || ["completed", "succeeded", "success"].includes(status)) {
            const resultUrl = remoteUrl ? clientMediaUrl(task, remoteUrl) : `${task.internalBaseUrl}/v1${normalizePath(channel.advancedConfig?.createPath || "/videos")}/${encodeURIComponent(upstreamId)}/content`;
            updateVideoTask(task.id, { status: "success", resultUrl, remoteUrl: remoteUrl || undefined });
            console.info("Video task completed", { taskId: task.id, model: task.model, upstreamId });
            return;
        }
        await delay(POLL_INTERVAL_MS, task.abortController.signal);
    }
    throw new Error("视频生成超时，请稍后重试");
}

function buildMultipartBody(task: VideoTask) {
    const form = new FormData();
    form.set("model", task.model);
    form.set("prompt", task.prompt);
    form.set("seconds", task.videoSeconds);
    form.set("aspect_ratio", task.videoSize);
    form.set("size", resolveGrokVideoPixelSize(task.videoSize, task.vquality));
    for (const reference of task.references) form.append("input_reference[]", dataUrlToBlob(reference.dataUrl), reference.name || "reference.png");
    return form;
}

function dataUrlToBlob(value: string) {
    const match = value.match(/^data:([^;]+);base64,(.*)$/s);
    if (!match) throw new Error("参考图格式不正确");
    return new Blob([Buffer.from(match[2], "base64")], { type: match[1] || "image/png" });
}

function upstreamUrl(baseUrl: string, path: string) {
    const base = baseUrl.trim().replace(/\/+$/, "");
    const lower = base.toLowerCase();
    const apiBase = lower.endsWith("/v1") || lower.endsWith("/v1beta") || lower.endsWith("/api/v3") || lower.endsWith("/api/plan/v3") ? base : `${base}/v1`;
    return `${apiBase}${normalizePath(path)}`;
}

function normalizePath(value: string) {
    const path = value.trim();
    return path.startsWith("/") ? path : `/${path}`;
}

function applyTaskId(path: string, taskId: string) {
    const encoded = encodeURIComponent(taskId);
    const replaced = path.replace(/\{(?:task_id|taskId|id)\}/g, encoded).replace(/:(?:task_id|taskId|id)\b/g, encoded);
    return replaced === path ? `${path.replace(/\/+$/, "")}/${encoded}` : replaced;
}

function clientMediaUrl(task: VideoTask, remoteUrl: string) {
    return `${task.internalBaseUrl}/v1/_media?url=${encodeURIComponent(remoteUrl)}`;
}

async function readPayload(response: Response) {
    return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

const TASK_ID_KEYS = ["task_id", "taskId", "id", "job_id", "jobId", "request_id", "requestId", "generation_id", "generationId"];
const VIDEO_URL_KEYS = ["video_url", "videoUrl", "media_url", "mediaUrl", "play_url", "playUrl", "content_url", "contentUrl", "output_url", "outputUrl", "download_url", "downloadUrl", "url"];

function findString(value: unknown, keys: string[], depth = 0): string {
    if (!value || depth > 6) return "";
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findString(item, keys, depth + 1);
            if (found) return found;
        }
        return "";
    }
    if (typeof value !== "object") return "";
    const record = value as Record<string, unknown>;
    for (const key of keys) {
        const item = readPath(record, key);
        if (typeof item === "string" && item.trim()) return item.trim();
        if (typeof item === "number") return String(item);
    }
    for (const item of Object.values(record)) {
        const found = findString(item, keys, depth + 1);
        if (found) return found;
    }
    return "";
}

function readPath(value: Record<string, unknown>, path: string) {
    return path.split(".").reduce<unknown>((current, part) => (current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined), value);
}

function readPayloadError(payload: Record<string, unknown>) {
    let message = findString(payload, ["error.message", "message", "msg", "detail"]);
    for (let depth = 0; depth < 3 && message.startsWith("{"); depth += 1) {
        try {
            const nested = JSON.parse(message) as Record<string, unknown>;
            const next = findString(nested, ["error.message", "message", "msg", "detail"]);
            if (!next || next === message) break;
            message = next;
        } catch {
            break;
        }
    }
    return message;
}

function videoPointMultiplier(multipliers: { videoQuality?: Record<string, number>; videoSeconds?: Record<string, number> } | undefined, quality: string, seconds: string) {
    const qualityMultiplier = Number(multipliers?.videoQuality?.[quality]);
    const secondsMultiplier = Number(multipliers?.videoSeconds?.[seconds]);
    return (Number.isFinite(qualityMultiplier) ? qualityMultiplier : 1) * (Number.isFinite(secondsMultiplier) ? secondsMultiplier : 1);
}

async function refundSafely(taskId: string) {
    await refundVideoTaskPoints(taskId).catch((error) => console.error("Video task refund failed", { taskId, error: error instanceof Error ? error.message : "unknown" }));
}

function delay(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}
