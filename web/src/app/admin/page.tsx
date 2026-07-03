import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthUserHydrator } from "@/components/auth/auth-user-hydrator";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { UserStatusActions } from "@/components/layout/user-status-actions";
import { getAuthSettings, listPublicUsers } from "@/lib/auth/store";
import { getCurrentUser } from "@/lib/auth/session";
import { listAllLibraryPrompts } from "@/lib/prompts/store";

export default async function AdminPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/login?next=/admin");
    if (currentUser.role !== "admin") redirect("/");

    const [users, settings, prompts] = await Promise.all([listPublicUsers(), getAuthSettings(), listAllLibraryPrompts()]);

    return (
        <AuthUserHydrator user={{ id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, role: currentUser.role, status: currentUser.status, quota: currentUser.quota, checkedInToday: currentUser.checkedInToday, lastCheckInDate: currentUser.lastCheckInDate }}>
            <main className="h-dvh overflow-y-auto bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-100">
                <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
                        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-stone-950 dark:text-stone-100">
                            <span
                                className="size-5 bg-current"
                                style={{
                                    mask: "url(/logo.svg) center / contain no-repeat",
                                    WebkitMask: "url(/logo.svg) center / contain no-repeat",
                                }}
                            />
                            <span>管理后台</span>
                        </Link>
                        <UserStatusActions showConfig={false} />
                    </div>
                </header>

                <div className="mx-auto max-w-7xl px-6 py-8">
                    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-normal text-stone-950 dark:text-stone-100">管理员后台</h1>
                            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">管理注册开关、用户状态和基础角色权限。</p>
                        </div>
                        <Link href="/canvas" className="text-sm font-medium text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white">
                            返回画布
                        </Link>
                    </div>
                    <AdminDashboard initialUsers={users} initialSettings={settings} initialPrompts={prompts} currentUser={currentUser} />
                </div>
            </main>
        </AuthUserHydrator>
    );
}
