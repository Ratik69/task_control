import { createClient } from "@/lib/supabase/server";
import AppMenu from "@/components/AppMenu";
import { runCleanup } from "@/lib/cleanup";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  due_at: string;
  available_at: string | null;
  photos_required: number;
  status: string;
};

type Attempt = {
  task_id: string;
  submitted_by: string;
  submitted_at: string;
  review_status: string;
  review_comment: string | null;
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Bucharest",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOf(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
  });
}

const badges: Record<string, { text: string; className: string }> = {
  todo: { text: "К выполнению", className: "bg-[#E8EEF4] text-[#2F4A66]" },
  rejected: { text: "Отказ", className: "bg-[#FCE4E0] text-[#9A2A1A]" },
  pending_review: { text: "На проверке", className: "bg-[#FFF1CC] text-[#7A5200]" },
};

export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, role, restaurant_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // У тех, кто добавляет задачи, заодно удаляем всё старше 14 дней
  if (me && me.role !== "employee" && me.restaurant_id) await runCleanup(me.restaurant_id);

  // Создаём на сегодня задачи по шаблонам (дублей не будет)
  await supabase.rpc("ensure_tasks_for_today");

  // Задачи на будущие дни не показываем, пока их день не наступил
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Bucharest",
  });

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("id, title, due_at, available_at, photos_required, status")
    .neq("status", "done")
    .or(`task_date.lte.${today},task_date.is.null`)
    .order("due_at");

  // Сотрудники видят задачу только после времени «Появится в», управляющий видит все
  const nowMs = Date.now();
  const tasks: Task[] = ((tasksData ?? []) as Task[]).filter(
    (t) => me?.role !== "employee" || !t.available_at || new Date(t.available_at).getTime() <= nowMs,
  );

  const { data: attemptsData } = await supabase
    .from("task_attempts")
    .select("task_id, submitted_by, submitted_at, review_status, review_comment")
    .in(
      "task_id",
      tasks.map((t) => t.id)
    )
    .order("submitted_at", { ascending: false });

  const attempts: Attempt[] = attemptsData ?? [];

  const { data: peopleData } = await supabase
    .from("profiles")
    .select("id, full_name");

  const names = new Map<string, string>(
    (peopleData ?? []).map((p) => [p.id as string, p.full_name as string])
  );

  // Последняя попытка по каждой задаче (список уже отсортирован от новых к старым)
  const lastAttempt = new Map<string, Attempt>();
  for (const a of attempts) {
    if (!lastAttempt.has(a.task_id)) lastAttempt.set(a.task_id, a);
  }

  const now = new Date();
  const rejected = tasks.filter((t) => t.status === "rejected");
  const todo = tasks.filter((t) => t.status === "todo");
  const pending = tasks.filter((t) => t.status === "pending_review");

  function Card({ task }: { task: Task }) {
    const badge = badges[task.status];
    const attempt = lastAttempt.get(task.id);
    const overdue =
      new Date(task.due_at) < now &&
      (task.status === "todo" || task.status === "rejected");

    return (
      <div
        className={`relative bg-white rounded-2xl p-4 border ${
          task.status === "rejected" ? "border-[#F0C9C2]" : "border-[#E6E4DF]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/tasks/${task.id}`}
            className="text-base font-semibold after:absolute after:inset-0"
          >
            {task.title}
          </Link>
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}
          >
            {badge.text}
          </span>
        </div>

        {task.status === "rejected" && attempt?.review_comment && (
          <div className="mt-2 rounded-xl bg-[#FDF1EF] text-[#7A2216] text-sm p-2.5">
            {attempt.review_comment}
          </div>
        )}

        {task.status === "pending_review" && attempt && (
          <div className="mt-2 text-sm text-[#5B6670]">
            Отправил {names.get(attempt.submitted_by) ?? "сотрудник"} ·{" "}
            {timeOf(attempt.submitted_at)}
          </div>
        )}

        {task.status !== "pending_review" && (
          <div className="mt-2 flex gap-4 text-sm">
            <span className={overdue ? "text-[#B4281A] font-semibold" : "text-[#5B6670]"}>
              {overdue
                ? `Просрочено · ${dateOf(task.due_at)} ${timeOf(task.due_at)}`
                : `до ${timeOf(task.due_at)}`}
            </span>
            <span className="text-[#5B6670]">фото: {task.photos_required}</span>
            {task.available_at && new Date(task.available_at).getTime() > nowMs && (
              <span className="text-[#7A5200]">появится в {timeOf(task.available_at)}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  function Section({ title, items }: { title: string; items: Task[] }) {
    if (items.length === 0) return null;
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5B6670] mt-3">
          {title}
        </h2>
        {items.map((t) => (
          <Card key={t.id} task={t} />
        ))}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4 pb-28 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#5B6670]">{me?.full_name ?? ""}</div>
          <h1 className="text-2xl font-bold">Задачи смены</h1>
        </div>
        <AppMenu role={me?.role ?? "employee"} />
      </div>

      {me && me.role !== "employee" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: "На проверке", value: pending.length },
            { label: "К выполнению", value: todo.length },
            { label: "Переделать", value: rejected.length },
            {
              label: "Просрочено",
              value: tasks.filter(
                (t) =>
                  (t.status === "todo" || t.status === "rejected") &&
                  new Date(t.due_at) < now,
              ).length,
            },
          ].map((x) => (
            <div
              key={x.label}
              className="bg-white rounded-2xl border border-[#E6E4DF] p-3 flex flex-col"
            >
              <span
                className={`text-3xl font-bold ${
                  x.value > 0 && x.label !== "К выполнению" ? "text-[#B4281A]" : "text-[#1B1F23]"
                }`}
              >
                {x.value}
              </span>
              <span className="text-sm text-[#5B6670]">{x.label}</span>
            </div>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <p className="mt-4 text-[#5B6670]">Все задачи выполнены. Новых нет.</p>
      )}

      <Section title="Нужно переделать" items={rejected} />
      <Section title="К выполнению" items={todo} />
      <Section title="На проверке" items={pending} />

      {me && me.role !== "employee" && (
        <Link
          href="/templates/new"
          aria-label="Добавить новую задачу"
          className="fixed bottom-6 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[#1F6F5C] text-4xl font-light leading-none text-white shadow-lg"
        >
          +
        </Link>
      )}
    </main>
  );
}