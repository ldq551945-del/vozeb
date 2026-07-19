import type { AiConfig, SystemChannelAdvancedConfig, SystemVideoAdapter } from "@/stores/use-config-store";

export const WAVESPEED_SEEDANCE2_ADAPTER: SystemVideoAdapter = "wavespeed-seedance2";

export function isWaveSpeedSeedance2Adapter(config: AiConfig, model: string) {
    return videoAdvancedConfig(config, model)?.videoAdapter === WAVESPEED_SEEDANCE2_ADAPTER && isWaveSpeedSeedance2Model(rawModelName(model));
}

export function isWaveSpeedSeedance2Model(model: string) {
    const normalized = model.trim().toLowerCase();
    return normalized.includes("seedance-2.0") && (normalized.includes("jimeng-video") || normalized.includes("bytedance/seedance") || normalized.includes("seedance-2.0"));
}

export function normalizeWaveSpeedSeedance2Resolution(value: string) {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/p$/, "");
    if (normalized === "1080" || normalized === "2k" || normalized === "2160" || normalized === "uhd") return "1080p";
    return "720p";
}

export function normalizeChannelVideoResolution(config: AiConfig, model: string, value: string, fallback: (value: string) => string) {
    return isWaveSpeedSeedance2Adapter(config, model) ? normalizeWaveSpeedSeedance2Resolution(value) : fallback(value);
}

function videoAdvancedConfig(config: AiConfig, model: string): SystemChannelAdvancedConfig | undefined {
    const decoded = decodeChannelModelValue(model);
    if (decoded) return config.channels.find((channel) => channel.id === decoded.channelId)?.advancedConfig;
    return config.advancedConfig;
}

function decodeChannelModelValue(value: string) {
    const index = value.indexOf("::");
    if (index < 0) return null;
    return { channelId: value.slice(0, index), model: value.slice(index + 2) };
}

function rawModelName(value: string) {
    return decodeChannelModelValue(value)?.model || value;
}

export function waveSpeedSeedance2ErrorMessage(config: AiConfig, model: string, message: string) {
    if (!isWaveSpeedSeedance2Adapter(config, model)) return message;
    if (/resolution|720p|1080p|2k/i.test(message)) return "当前 WaveSpeed Seedance 2.0 仅支持 720P 或 1080P";
    return message;
}

export function videoAdapterLabel(adapter: SystemVideoAdapter | undefined) {
    return adapter === WAVESPEED_SEEDANCE2_ADAPTER ? "WaveSpeed Seedance 2.0" : "";
}
