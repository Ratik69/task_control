import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runCleanup } from "@/lib/cleanup";
import AppMenu from "@/components/AppMenu";

const TZ = "Europe/Bucharest";
const KEEP_DAYS = 14;

function dayOf(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // 2026-11-06
}

function offsetMs(at: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return asUtc - Math.floor(at / 1000) * 1000;
}

// Момент начала дня YYYY-MM-DD по времени ресторана
function startOfDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return guess - offsetMs(guess - offsetMs(guess));
}

function longDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function time(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const statusText: Record<string, { text: string; cls: string }> = {
  accepted: { text: "Принято", cls: "bg-[#DDF1E2] text-[#1E6B3A]" },
  rejected: { text: "Отказ", cls: "bg-[#FDF1EF] text-[#9A2A1A]" },
  pending: { text: "На проверке", cls: "bg-[#FFF1CC] text-[#7A5200]" },
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role, restaurant_id")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!me || !["manager", "admin"].includes(me.role)) redirect("/");

  await runCleanup(me.restaurant_id);

  // Последние 14 дней, сегодня первым
  const today = dayOf(new Date());
  const [ty, tm, td] = today.split("-").map(Number);
  const days = Array.from({ length: KEEP_DAYS }, (_, i) =>
    new Date(Date.UTC(ty, tm - 1, td - i)).toISOString().slice(0, 10),
  );

  const smallButton =
    "h-10 px-4 rounded-xl border border-[#CFD4D8] bg-white text-sm font-semibold flex items-center";

  const selected = date && days.includes(date) ? date : null;

  // ---------- Список дней ----------
  if (!selected) {
    const since = new Date(startOfDay(days[days.length - 1])).toISOString();
    const { data: recent } = await supabase
      .from("task_attempts")
      .select("submitted_at")
      .gte("submitted_at", since);

    const counts: Record<string, number> = {};
    for (const a of recent ?? []) {
      const k = dayOf(new Date(a.submitted_at));
      counts[k] = (counts[k] ?? 0) + 1;
    }

    return (
      <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">История по дням</h1>
          <AppMenu role={me.role} />
        </div>

        <p className="text-sm text-[#5B6670]">Хранится 14 дней, потом удаляется.</p>

        <section className="flex flex-col gap-2">
          {days.map((d) => (
            <Link
              key={d}
              href={`/history?date=${d}`}
              className="bg-white rounded-2xl border border-[#E6E4DF] p-4 flex items-center justify-between"
            >
              <span className="font-semibold capitalize">
                {d === today ? "Сегодня" : longDate(d)}
              </span>
              <span className="text-sm text-[#5B6670]">
                {counts[d] ? `${counts[d]} сдано` : "нет записей"}
              </span>
            </Link>
          ))}
        </section>
      </main>
    );
  }

  // ---------- Один день ----------
  const from = new Date(startOfDay(selected)).toISOString();
  const [sy, sm, sd] = selected.split("-").map(Number);
  const nextDay = new Date(Date.UTC(sy, sm - 1, sd + 1)).toISOString().slice(0, 10);
  const to = new Date(startOfDay(nextDay)).toISOString();

  const { data: attempts } = await supabase
    .from("task_attempts")
    .select(
      "id, task_id, submitted_by, submitted_at, comment, review_status, reviewed_by, review_comment",
    )
    .gte("submitted_at", from)
    .lt("submitted_at", to)
    .order("submitted_at");

  const list = attempts ?? [];
  const taskIds = [...new Set(list.map((a) => a.task_id))];
  const attemptIds = list.map((a) => a.id);
  const userIds = [
    ...new Set(list.flatMap((a) => [a.submitted_by, a.reviewed_by]).filter(Boolean)),
  ] as string[];

  const [{ data: tasks }, { data: people }, { data: photos }] = await Promise.all([
    taskIds.length
      ? supabase.from("tasks").select("id, title").in("id", taskIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    attemptIds.length
      ? supabase.from("attempt_photos").select("attempt_id, storage_path").in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] as { attempt_id: string; storage_path: string }[] }),
  ]);

  const titleOf = new Map((tasks ?? []).map((t) => [t.id, t.title]));
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  const urlOf = new Map<string, string>();
  if (photos && photos.length > 0) {
    const { data: signed } = await supabase.storage
      .from("task-photos")
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        3600,
      );
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlOf.set(s.path, s.signedUrl);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold capitalize">
          {selected === today ? "Сегодня" : longDate(selected)}
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/history" className={smallButton}>
            К дням
          </Link>
          <AppMenu role={me.role} />
        </div>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-[#5B6670]">В этот день записей нет.</p>
      )}

      <section className="flex flex-col gap-3">
        {list.map((a) => {
          const st = statusText[a.review_status] ?? statusText.pending;
          const pics = (photos ?? []).filter((p) => p.attempt_id === a.id);

          return (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-[#E6E4DF] p-3 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/tasks/${a.task_id}`} className="font-semibold">
                  {titleOf.get(a.task_id) ?? "Задача"}
                </Link>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}
                >
                  {st.text}
                </span>
              </div>

              <div className="text-sm text-[#5B6670]">
                Сдал(а): {nameOf.get(a.submitted_by) ?? "—"} в {time(a.submitted_at)}
                {a.reviewed_by && <> · проверил(а): {nameOf.get(a.reviewed_by) ?? "—"}</>}
              </div>

              {a.comment && <div className="text-sm">Комментарий: {a.comment}</div>}
              {a.review_comment && (
                <div className="text-sm text-[#9A2A1A]">Причина: {a.review_comment}</div>
              )}

              {pics.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {pics.map((p) => {
                    const url = urlOf.get(p.storage_path);
                    return url ? (
                      <a key={p.storage_path} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      </a>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
