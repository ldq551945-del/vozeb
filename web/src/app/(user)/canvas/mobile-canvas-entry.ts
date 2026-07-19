"use client";

const ENTRY_KEY = "dq:canvas-mobile-entry";

type RouterLike = { push: (href: string) => void };

function isTouchPhone() {
    return typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-width: 900px)").matches;
}

function isLandscape() {
    return typeof window !== "undefined" && window.matchMedia("(orientation: landscape)").matches;
}

function ensureOverlay() {
    if (typeof document === "undefined") return null;
    let overlay = document.getElementById("dq-canvas-entry-transition");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "dq-canvas-entry-transition";
    overlay.className = "dq-canvas-entry-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<span class="dq-canvas-entry-mark"></span><span class="dq-canvas-entry-ring"></span>';
    document.body.append(overlay);
    requestAnimationFrame(() => overlay?.classList.add("is-visible"));
    return overlay;
}

async function requestLandscapeGameMode() {
    try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    } catch {
        // Fullscreen is optional and unavailable in some mobile browsers.
    }
    try {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: "landscape") => Promise<void> };
        await orientation.lock?.("landscape");
    } catch {
        // iOS Safari and non-installed browsers commonly reject orientation locks.
    }
}

export function enterMobileCanvas(router: RouterLike, href: string) {
    if (!isTouchPhone()) {
        router.push(href);
        return;
    }
    window.sessionStorage.setItem(ENTRY_KEY, "1");
    ensureOverlay();
    void requestLandscapeGameMode();
    window.setTimeout(() => router.push(href), 180);
}

export function syncMobileCanvasEntry(ready: boolean) {
    if (!isTouchPhone()) return;
    const shouldGate = window.sessionStorage.getItem(ENTRY_KEY) === "1" || !isLandscape();
    const existing = document.getElementById("dq-canvas-entry-transition");
    if (!shouldGate && !existing) return;
    const overlay = existing || ensureOverlay();
    if (!overlay) return;
    overlay.classList.toggle("is-landscape-gate", !isLandscape());
    if (!ready || !isLandscape()) return;
    window.sessionStorage.removeItem(ENTRY_KEY);
    overlay.classList.add("is-complete");
    window.setTimeout(() => overlay?.remove(), 260);
}

export function releaseMobileCanvasGameMode() {
    if (typeof window === "undefined") return;
    try {
        screen.orientation?.unlock?.();
    } catch {
        // Orientation unlock is best-effort.
    }
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
}
