"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function AdminReturnButton() {
    const router = useRouter();

    useEffect(() => {
        router.prefetch("/canvas");
    }, [router]);

    return (
        <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:text-stone-950 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:text-white"
            onMouseEnter={() => router.prefetch("/canvas")}
            onFocus={() => router.prefetch("/canvas")}
            onClick={() => router.push("/canvas")}
        >
            <ArrowLeft className="size-4" />
            返回画布
        </button>
    );
}
