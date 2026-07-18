"use client";

import { Activity, CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type StatusPayload = {
    status?: "healthy" | "degraded" | "offline";
    onlineApprox?: number;
};

const STATUS_COPY = {
    healthy: { label: "系统正常", color: "text-emerald-600 dark:text-emerald-300", icon: CheckCircle2 },
    degraded: { label: "部分受限", color: "text-amber-600 dark:text-amber-300", icon: CircleAlert },
    offline: { label: "状态不可用", color: "text-rose-600 dark:text-rose-300", icon: CircleX },
} as const;

export function SystemStatusPopover({ className, style }: { className?: string; style?: React.CSSProperties }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<StatusPayload>({ status: "offline" });
    const [latency, setLatency] = useState<number | null>(null);
    const load = async () => {
        const started = performance.now();
        try {
            const response = await fetch("/api/status", { cache: "no-store" });
            const payload = (await response.json()) as StatusPayload;
            if (!response.ok) throw new Error("status unavailable");
            setStatus({ status: payload.status || "offline", onlineApprox: payload.onlineApprox });
            setLatency(Math.max(0, Math.round(performance.now() - started)));
        } catch {
            setStatus({ status: "offline" });
            setLatency(null);
        }
    };

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void load();
        }, 30000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!open) return;
        const close = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", close, true);
        document.addEventListener("keydown", escape);
        return () => {
            document.removeEventListener("pointerdown", close, true);
            document.removeEventListener("keydown", escape);
        };
    }, [open]);

    const current = STATUS_COPY[status.status || "offline"];
    const Icon = current.icon;

    return (
        <div ref={rootRef} className="relative shrink-0" data-dq-status>
            <button
                type="button"
                className={cn("inline-flex size-8 items-center justify-center rounded-md border border-stone-200 bg-white/85 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950/35 dark:hover:border-stone-700 dark:hover:bg-stone-900", className)}
                style={style}
                onClick={() => setOpen((value) => !value)}
                aria-label="DQ 系统状态"
                aria-expanded={open}
                title="DQ 系统状态"
            >
                <Activity className={cn("size-4", current.color)} />
            </button>
            {open ? (
                <section className="absolute right-0 top-[calc(100%+0.6rem)] z-[80] w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-stone-200 bg-white p-4 text-stone-900 shadow-xl shadow-stone-950/10 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100" role="dialog" aria-label="系统状态">
                    <div className="flex items-center gap-2">
                        <Icon className={cn("size-4", current.color)} />
                        <span className="font-semibold">系统状态</span>
                        <span className={cn("ml-auto text-sm", current.color)}>{current.label}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md bg-stone-50 px-3 py-2 dark:bg-stone-900"><dt className="text-xs text-stone-500 dark:text-stone-400">在线用户</dt><dd className="mt-1 font-semibold">约 {Math.max(0, status.onlineApprox || 0)} 人</dd></div>
                        <div className="rounded-md bg-stone-50 px-3 py-2 dark:bg-stone-900"><dt className="text-xs text-stone-500 dark:text-stone-400">访问延迟</dt><dd className="mt-1 font-semibold">{latency === null ? "--" : `${latency} ms`}</dd></div>
                    </dl>
                </section>
            ) : null}
        </div>
    );
}
