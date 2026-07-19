"use client";

import { type ReactNode } from "react";
import { Switch } from "antd";

import { ImageSettingsTheme } from "@/components/image-settings-panel";
import { boolConfig, isSeedanceVideoConfig } from "@/lib/seedance-video";
import { videoModelCapabilities } from "@/lib/video-model-capabilities";
import { isWaveSpeedSeedance2Adapter, normalizeWaveSpeedSeedance2Resolution } from "@/lib/video-channel-adapters";
import { type CanvasTheme } from "@/lib/canvas-theme";
import { type AiConfig } from "@/stores/use-config-store";

const resolutionOptions = [
    { value: "480", label: "480P" },
    { value: "720", label: "720P" },
    { value: "1080", label: "1080P" },
];

const ratioOptions = ["2:3", "3:2", "1:1", "16:9", "9:16"] as const;

type VideoSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: "vquality" | "videoSize" | "videoSeconds" | "videoGenerateAudio" | "videoWatermark", value: string) => void;
    theme: CanvasTheme;
    showTitle?: boolean;
    className?: string;
};

export function VideoSettingsPanel({ config, onConfigChange, theme, showTitle = true, className = "w-[320px] space-y-4 rounded-2xl px-1 py-0.5" }: VideoSettingsPanelProps) {
    const model = config.model || config.videoModel;
    const wavespeedSeedance2 = isWaveSpeedSeedance2Adapter(config, model);
    const resolution = wavespeedSeedance2 ? normalizeWaveSpeedSeedance2Resolution(config.vquality).replace(/p$/, "") : normalizeVideoResolutionValue(config.vquality);
    const ratio = normalizeVideoSizeValue(config.videoSize);
    const seconds = Math.max(1, Math.min(15, Math.floor(Number(config.videoSeconds) || 10)));
    const seedance = isSeedanceVideoConfig(config);
    const capabilities = videoModelCapabilities(model);

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-lg font-semibold">视频设置</div> : null}
                <SettingGroup title="清晰度" color={theme.node.muted}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {resolutionOptions.map((item) => (
                            <OptionPill
                                key={item.value}
                                selected={resolution === item.value}
                                disabled={Boolean((wavespeedSeedance2 && item.value === "480") || (capabilities?.supportedQualities && !capabilities.supportedQualities.includes(item.value)))}
                                theme={theme}
                                onClick={() => onConfigChange("vquality", item.value)}
                            >
                                {item.label}
                            </OptionPill>
                        ))}
                    </div>
                    {wavespeedSeedance2 ? (
                        <div className="text-xs" style={{ color: theme.node.muted }}>
                            WaveSpeed Seedance 2.0 · 支持 720P / 1080P
                        </div>
                    ) : null}
                </SettingGroup>
                <SettingGroup title="比例" color={theme.node.muted}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {ratioOptions.map((value) => (
                            <button
                                key={value}
                                type="button"
                                disabled={Boolean(capabilities?.supportedRatios && !capabilities.supportedRatios.includes(value))}
                                className="flex h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border bg-transparent text-sm transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35"
                                style={{ borderColor: ratio === value ? theme.node.text : theme.node.stroke, color: theme.node.text }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => onConfigChange("videoSize", value)}
                            >
                                <RatioPreview value={value} color={theme.node.text} />
                                <span>{value}</span>
                            </button>
                        ))}
                    </div>
                </SettingGroup>
                <SettingGroup title="时长" color={theme.node.muted}>
                    <div className="flex items-center gap-3">
                        <span className="w-7 text-xs tabular-nums opacity-55">1S</span>
                        <input
                            type="range"
                            min={1}
                            max={15}
                            step={1}
                            value={seconds}
                            aria-label="视频时长"
                            className="h-5 min-w-0 flex-1 cursor-pointer accent-current"
                            onChange={(event) => onConfigChange("videoSeconds", event.target.value)}
                            onMouseDown={(event) => event.stopPropagation()}
                        />
                        <span className="w-8 text-right text-xs tabular-nums opacity-55">15S</span>
                    </div>
                    <div className="text-center text-sm font-medium tabular-nums">{seconds}S</div>
                </SettingGroup>
                {seedance ? (
                    <SettingGroup title="输出" color={theme.node.muted}>
                        <div className="grid gap-2 rounded-lg border p-2.5" style={{ borderColor: theme.node.stroke }}>
                            <SwitchRow label="生成声音" checked={boolConfig(config.videoGenerateAudio, true)} theme={theme} onChange={(checked) => onConfigChange("videoGenerateAudio", String(checked))} />
                            <SwitchRow label="添加水印" checked={boolConfig(config.videoWatermark, false)} theme={theme} onChange={(checked) => onConfigChange("videoWatermark", String(checked))} />
                        </div>
                    </SettingGroup>
                ) : null}
            </div>
        </ImageSettingsTheme>
    );
}

function RatioPreview({ value, color }: { value: (typeof ratioOptions)[number]; color: string }) {
    const [width, height] = value.split(":").map(Number);
    const scale = 20 / Math.max(width, height);
    return <span className="block rounded-[2px] border" style={{ width: Math.max(6, width * scale), height: Math.max(6, height * scale), borderColor: color, opacity: 0.72 }} />;
}

export function videoResolutionLabel(value: string) {
    return normalizeVideoResolutionValue(value) + "P";
}

export function videoSizeLabel(value: string) {
    return normalizeVideoSizeValue(value);
}

export function videoSecondsLabel(value: string) {
    return String(Math.max(1, Math.min(15, Math.floor(Number(value) || 10)))) + "S";
}

export function normalizeVideoSizeValue(value: string) {
    return ratioOptions.includes(value as (typeof ratioOptions)[number]) ? value : "16:9";
}

export function normalizeVideoResolutionValue(value: string) {
    if (value === "480p" || value === "low") return "480";
    if (value === "720p" || value === "auto" || value === "high" || value === "medium") return "720";
    return value.replace(/p$/i, "") || "720";
}

function OptionPill({ selected, disabled = false, theme, onClick, children }: { selected: boolean; disabled?: boolean; theme: CanvasTheme; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            disabled={disabled}
            className="h-9 cursor-pointer rounded-full border px-2 text-sm transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35"
            style={{ background: "transparent", borderColor: selected ? theme.node.text : theme.node.stroke, color: theme.node.text }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function SettingGroup({ title, color, children }: { title: string; color: string; children: ReactNode }) {
    return (
        <div className="space-y-2.5">
            <div className="text-xs font-medium" style={{ color }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function SwitchRow({ label, checked, theme, onChange }: { label: string; checked: boolean; theme: CanvasTheme; onChange: (checked: boolean) => void }) {
    return (
        <div className="flex h-8 items-center justify-between gap-3">
            <span className="text-sm" style={{ color: theme.node.text }}>
                {label}
            </span>
            <span onMouseDown={(event) => event.stopPropagation()}>
                <Switch size="small" checked={checked} onChange={onChange} />
            </span>
        </div>
    );
}
