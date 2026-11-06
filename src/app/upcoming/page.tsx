import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppMenu from "@/components/AppMenu";

const TZ = "Europe/Bucharest";

type Task = {
  id: string;
  title: string;
  due_at: string;
  available_at: string | null;
  task_date: string | null;
  photos_required: number;
};

function timeOf(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

function dayLabel(day: string, today: string) {
  const [y, m, d] = day.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export default async function UpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!me) redirect("/login");

  // Создаём на сегодня задачи по шаблонам, чтобы список был полным
  await supabase.rpc("ensure_tasks_for_today");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const nowMs = Date.now();

  const { data } = await supabase
    .from("tasks")
    .select("id, title, due_at, available_at, task_date, photos_required")
    .eq("status", "todo")
    .gte("task_date", today)
    .order("task_date")
    .order("available_at", { nullsFirst: true })
    .order("due_at");

  // Предстоящие: на другие дни или ещё не наступило время «Появится в»
  const upcoming = ((data ?? []) as Task[]).filter(
    (t) =>
      (t.task_date && t.task_date > today) ||
      (t.available_at && new Date(t.available_at).getTime() > nowMs),
  );

  const groups = new Map<string, Task[]>();
  for (const t of upcoming) {
    const k = t.task_date ?? today;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Предстоящие задачи</h1>
        <AppMenu role={me.role} />
      </div>

      {upcoming.length === 0 && (
        <p className="text-[#5B6670]">Предстоящих задач пока нет.</p>
      )}

      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5B6670] mt-2">
            {dayLabel(day, today)}
          </h2>
          {items.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-[#E6E4DF] p-4">
              <div className="font-semibold">{t.title}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5B6670]">
                {t.available_at && <span>появится в {timeOf(t.available_at)}</span>}
                <span>до {timeOf(t.due_at)}</span>
                <span>фото: {t.photos_required}</span>
              </div>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
