import { NextResponse } from "next/server";

import { consumeUserQuota, getAuthSettings, isQuotaExceededError, type ApiCallFormat, type QuotaKind } from "@/lib/auth/store";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{ channelId: string; path: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
    return proxySystemRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
    return proxySystemRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
    return proxySystemRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
    return proxySystemRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
    return proxySystemRequest(request, context);
}

async function proxySystemRequest(request: Request, context: RouteContext) {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const { channelId, path } = await context.params;
    const settings = await getAuthSettings();
    const channel = settings.systemChannels.find((item) => item.id === channelId && item.enabled);
    if (!channel || !channel.baseUrl.trim() || !channel.apiKey.trim()) return NextResponse.json({ error: "默认接口未配置或已停用" }, { status: 404 });

    const target = targetUrl(channel.baseUrl, channel.apiFormat, path, new URL(request.url).search);
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    const accept = request.headers.get("accept");
    if (contentType) headers.set("content-type", contentType);
    if (accept) headers.set("accept", accept);
    if (channel.apiFormat === "gemini") headers.set("x-goog-api-key", channel.apiKey);
    else headers.set("authorization", `Bearer ${channel.apiKey}`);

    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
    const quotaRequest = classifyQuotaRequest(request.method, channel.apiFormat, path, contentType, body);
    if (quotaRequest) {
        try {
            await consumeUserQuota(currentUser.id, quotaRequest.kind, quotaRequest.amount);
        } catch (error) {
            if (isQuotaExceededError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
            throw error;
        }
    }

    const upstream = await fetch(target, {
        method: request.method,
        headers,
        body,
        cache: "no-store",
    });

    return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders(upstream.headers),
    });
}

function classifyQuotaRequest(method: string, apiFormat: ApiCallFormat, path: string[], contentType: string | null, body?: ArrayBuffer): { kind: QuotaKind; amount: number } | null {
    if (method.toUpperCase() !== "POST") return null;
    const cleanPath = path[0] === "v1" || path[0] === "v1beta" ? path.slice(1) : path;
    const routePath = `/${cleanPath.join("/")}`.toLowerCase();

    if (routePath === "/images/generations" || routePath === "/images/edits") {
        return { kind: "image", amount: readJsonCount(contentType, body) };
    }
    if (routePath === "/audio/speech") return { kind: "audio", amount: 1 };
    if (routePath === "/videos" || routePath === "/contents/generations/tasks") return { kind: "video", amount: 1 };
    if (routePath === "/responses" || routePath === "/chat/completions") return { kind: "text", amount: 1 };
    if (apiFormat === "gemini" && routePath.includes(":streamgeneratecontent")) return { kind: "text", amount: 1 };
    if (apiFormat === "gemini" && routePath.includes(":generatecontent")) return { kind: "image", amount: 1 };

    return null;
}

function readJsonCount(contentType: string | null, body?: ArrayBuffer) {
    if (!body || !contentType?.toLowerCase().includes("application/json")) return 1;
    try {
        const payload = JSON.parse(new TextDecoder().decode(body)) as { n?: unknown };
        const count = Math.floor(Number(payload.n) || 1);
        return Math.max(1, Math.min(1000, count));
    } catch {
        return 1;
    }
}

function targetUrl(baseUrl: string, apiFormat: "openai" | "gemini", path: string[], search: string) {
    const apiBase = normalizeApiBaseUrl(baseUrl, apiFormat);
    const cleanPath = path[0] === "v1" || path[0] === "v1beta" ? path.slice(1) : path;
    return `${apiBase}/${cleanPath.map(encodeURIComponent).join("/")}${search}`;
}

function normalizeApiBaseUrl(baseUrl: string, apiFormat: "openai" | "gemini") {
    const normalized = baseUrl.trim().replace(/\/+$/, "");
    const lower = normalized.toLowerCase();
    if (lower.endsWith("/v1") || lower.endsWith("/v1beta") || lower.endsWith("/api/v3") || lower.endsWith("/api/plan/v3")) return normalized;
    if (apiFormat === "gemini") return `${normalized}/v1beta`;
    return `${normalized}/v1`;
}

function responseHeaders(headers: Headers) {
    const nextHeaders = new Headers();
    const passthrough = ["content-type", "cache-control", "content-disposition"];
    passthrough.forEach((key) => {
        const value = headers.get(key);
        if (value) nextHeaders.set(key, value);
    });
    return nextHeaders;
}
