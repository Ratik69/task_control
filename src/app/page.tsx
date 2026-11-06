import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppMenu from "@/components/AppMenu";
import { runCleanup } from "@/lib/cleanup";

const roleNames: Record<string, string> = {
  employee: "Сотрудник",
  manager: "Управляющая",
  admin: "Администратор",
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, restaurant_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Сотрудник сразу попадает на свои задачи
  if (profile?.role === "employee") redirect("/tasks");

  // Раз в визит управляющей удаляем всё старше 14 дней
  if (profile?.restaurant_id) await runCleanup(profile.restaurant_id);

  // Счётчики для управляющей
  await supabase.rpc("ensure_tasks_for_today");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
  const nowIso = new Date().toISOString();
  const open = () =>
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .or(`task_date.lte.${today},task_date.is.null`);

  const [pending, todo, redo, overdue] = await Promise.all([
    open().eq("status", "pending_review"),
    open().eq("status", "todo"),
    open().eq("status", "rejected"),
    open().in("status", ["todo", "rejected"]).lt("due_at", nowIso),
  ]);

  const stats = [
    { label: "На проверке", value: pending.count ?? 0, warn: (pending.count ?? 0) > 0 },
    { label: "К выполнению", value: todo.count ?? 0, warn: false },
    { label: "Переделать", value: redo.count ?? 0, warn: (redo.count ?? 0) > 0 },
    { label: "Просрочено", value: overdue.count ?? 0, warn: (overdue.count ?? 0) > 0 },
  ];

  const linkClass =
    "h-12 rounded-xl bg-white border border-[#E6E4DF] flex items-center px-4 font-semibold";

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Restaurant Task Control</h1>
        <AppMenu role={profile?.role ?? "manager"} />
      </div>

      {profile ? (
        <p className="text-lg">
          Вы вошли как {profile.full_name} ({roleNames[profile.role] ?? profile.role})
        </p>
      ) : (
        <p className="text-lg text-[#9A2A1A]">
          Вход выполнен, но для этого пользователя нет профиля в базе.
        </p>
      )}

      <Link href="/tasks" className="grid grid-cols-2 gap-2">
        {stats.map((x) => (
          <div
            key={x.label}
            className="bg-white rounded-2xl border border-[#E6E4DF] p-3 flex flex-col"
          >
            <span
              className={`text-3xl font-bold ${x.warn ? "text-[#B4281A]" : "text-[#1B1F23]"}`}
            >
              {x.value}
            </span>
            <span className="text-sm text-[#5B6670]">{x.label}</span>
          </div>
        ))}
      </Link>

      <nav className="flex flex-col gap-2">
        <Link href="/tasks" className={linkClass}>
          Задачи смены
        </Link>
        <Link href="/templates/new" className={linkClass}>
          Добавить новую задачу
        </Link>
      </nav>
    </main>
  );
}