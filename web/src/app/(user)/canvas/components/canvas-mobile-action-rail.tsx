"use client";

import type { ReactNode } from "react";
import { Hand, PanelRightOpen, Redo2, Undo2, Upload } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

type CanvasMobileActionRailProps = {
    canUndo: boolean;
    canRedo: boolean;
    onDeselect: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onToggleElements: () => void;
    onUpload: () => void;
};

export function CanvasMobileActionRail({ canUndo, canRedo, onDeselect, onUndo, onRedo, onToggleElements, onUpload }: CanvasMobileActionRailProps) {
    const colorTheme = useThemeStore((state) => state.theme);
    const theme = canvasThemes[colorTheme];
    const style = {
        background: theme.toolbar.panel,
        borderColor: theme.toolbar.border,
        color: theme.toolbar.item,
        boxShadow: colorTheme === "dark" ? "0 12px 30px rgba(0,0,0,.3)" : "0 12px 28px rgba(28,25,23,.12)",
    };

    return (
        <div className="canvas-mobile-action-rail" data-canvas-no-zoom style={style}>
            <RailButton label="选择或移动画布" onClick={onDeselect}>
                <Hand className="size-[18px]" />
            </RailButton>
            <RailButton label="撤销" disabled={!canUndo} onClick={onUndo}>
                <Undo2 className="size-[18px]" />
            </RailButton>
            <RailButton label="重做" disabled={!canRedo} onClick={onRedo}>
                <Redo2 className="size-[18px]" />
            </RailButton>
            <RailButton label="画布元素与素材" onClick={onToggleElements}>
                <PanelRightOpen className="size-[18px]" />
            </RailButton>
            <RailButton label="上传素材" onClick={onUpload}>
                <Upload className="size-[18px]" />
            </RailButton>
        </div>
    );
}

function RailButton({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" className="canvas-mobile-action-button" disabled={disabled} onClick={onClick} aria-label={label} title={label}>
            {children}
        </button>
    );
}
