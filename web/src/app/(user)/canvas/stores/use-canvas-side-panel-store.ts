"use client";

import { create } from "zustand";

export const CANVAS_SIDE_PANEL_MIN_WIDTH = 220;
export const CANVAS_SIDE_PANEL_MAX_WIDTH = 380;
export const CANVAS_SIDE_PANEL_DEFAULT_WIDTH = 280;

const WIDTH_KEY = "vozeb-canvas-side-panel-width";
const OPEN_KEY = "vozeb-canvas-side-panel-open";

function initialWidth() {
    if (typeof window === "undefined") return CANVAS_SIDE_PANEL_DEFAULT_WIDTH;
    const value = Number(window.localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(value) && value > 0 ? Math.min(CANVAS_SIDE_PANEL_MAX_WIDTH, Math.max(CANVAS_SIDE_PANEL_MIN_WIDTH, value)) : CANVAS_SIDE_PANEL_DEFAULT_WIDTH;
}

function initialOpen() {
    return typeof window === "undefined" || window.localStorage.getItem(OPEN_KEY) !== "0";
}

type CanvasSidePanelState = {
    width: number;
    open: boolean;
    setWidth: (width: number) => void;
    toggle: () => void;
};

export const useCanvasSidePanelStore = create<CanvasSidePanelState>((set, get) => ({
    width: initialWidth(),
    open: initialOpen(),
    setWidth: (width) => {
        const next = Math.min(CANVAS_SIDE_PANEL_MAX_WIDTH, Math.max(CANVAS_SIDE_PANEL_MIN_WIDTH, width));
        if (typeof window !== "undefined") window.localStorage.setItem(WIDTH_KEY, String(next));
        set({ width: next });
    },
    toggle: () => {
        const open = !get().open;
        if (typeof window !== "undefined") window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
        set({ open });
    },
}));
