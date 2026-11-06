import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitForm from "./SubmitForm";
import { reviewAttempt } from "./actions";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Bucharest",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateTimeOf(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusBadges: Record<string, { text: string; className: string }> = {
  todo: { text: "К выполнению", className: "bg-[#E8EEF4] text-[#2F4A66]" },
  rejected: { text: "Отказ", className: "bg-[#FCE4E0] text-[#9A2A1A]" },
  pending_review: { text: "На проверке", className: "bg-[#FFF1CC] text-[#7A5200]" },
  done: { text: "Выполнено", className: "bg-[#DDF1E2] text-[#1E6B3A]" },
};

const reviewLabels: Record<string, string> = {
  pending: "Ожидает проверки",
  accepted: "Принято",
  rejected: "Отказ",
};

const reviewErrors: Record<string, string> = {
  reason: "Укажите причину отказа",
  review: "Не удалось сохранить решение. Обновите страницу и попробуйте ещё раз.",
};

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorCode } = await searchParams;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!me) notFound();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, due_at, photos_required, status")
    .eq("id", id)
    .maybeSingle();

  if (!task) notFound();

  const { data: attempts } = await supabase
    .from("task_attempts")
    .select("id, submitted_by, submitted_at, comment, review_status, review_comment")
    .eq("task_id", id)
    .order("submitted_at", { ascending: false });

  const attemptList = attempts ?? [];

  const { data: photos } = await supabase
    .from("attempt_photos")
    .select("attempt_id, storage_path")
    .in(
      "attempt_id",
      attemptList.map((a) => a.id)
    );

  const photoList = photos ?? [];
  const urlByPath = new Map<string, string>();

  if (photoList.length > 0) {
    const { data: signed } = await supabase.storage
      .from("task-photos")
      .createSignedUrls(
        photoList.map((p) => p.storage_path),
        3600
      );
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    });
  }

  const { data: people } = await supabase.from("profiles").select("id, full_name");
  const names = new Map<string, string>(
    (people ?? []).map((p) => [p.id as string, p.full_name as string])
  );

  const badge = statusBadges[task.status];
  const canSubmit = task.status === "todo" || task.status === "rejected";
  const lastRejected = attemptList.find((a) => a.review_status === "rejected");
  const pendingAttempt = attemptList.find((a) => a.review_status === "pending");
  const isReviewer = me.role === "manager" || me.role === "admin";

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4 flex flex-col gap-4">
      <Link href="/tasks" className="text-[#1F6F5C] font-semibold">
        ← Все задачи
      </Link>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
        <span
          className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${badge.className}`}
        >
          {badge.text}
        </span>
      </div>

      <div className="text-sm text-[#5B6670]">
        Срок: {dateTimeOf(task.due_at)} · фото: {task.photos_required}
      </div>

      {task.description && (
        <p className="text-[15px] leading-relaxed text-[#3A434B]">{task.description}</p>
      )}

      {task.status === "rejected" && lastRejected?.review_comment && (
        <div className="rounded-xl bg-[#FDF1EF] border border-[#F0C9C2] p-3">
          <div className="text-xs font-semibold text-[#9A2A1A]">Причина отказа</div>
          <div className="mt-1 text-sm text-[#7A2216]">{lastRejected.review_comment}</div>
        </div>
      )}

      {canSubmit && (
        <SubmitForm
          taskId={task.id}
          restaurantId={me.restaurant_id}
          photosRequired={task.photos_required}
        />
      )}

      {task.status === "pending_review" && (
        <p className="rounded-xl bg-[#FFF1CC] text-[#7A5200] text-sm p-3">
          Работа отправлена и ждёт проверки управляющей.
        </p>
      )}

      {task.status === "pending_review" &&
        isReviewer &&
        pendingAttempt &&
        (pendingAttempt.submitted_by === user?.id ? (
          <p className="rounded-xl bg-white border border-[#E6E4DF] text-sm p-3">
            Это ваша работа. Её должна проверить другая управляющая или администратор.
          </p>
        ) : (
          <form
            action={reviewAttempt}
            className="flex flex-col gap-3 bg-white rounded-2xl border border-[#E6E4DF] p-3"
          >
            <input type="hidden" name="attempt_id" value={pendingAttempt.id} />
            <input type="hidden" name="task_id" value={task.id} />

            <div className="text-xs font-semibold uppercase tracking-wide text-[#5B6670]">
              Проверка
            </div>

            {errorCode && (
              <p className="rounded-xl bg-[#FDF1EF] border border-[#F0C9C2] text-[#7A2216] text-sm p-3">
                {reviewErrors[errorCode] ?? "Ошибка"}
              </p>
            )}

            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#5B6670]">
              Причина (обязательна при отказе)
              <textarea
                name="comment"
                rows={2}
                maxLength={300}
                placeholder="Что нужно исправить"
                className="rounded-xl border border-[#CFD4D8] bg-white p-3 text-base font-normal text-[#1B1F23]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                name="decision"
                value="reject"
                className="h-12 rounded-xl border-[1.5px] border-[#B4281A] bg-white text-[#9A2A1A] text-base font-semibold"
              >
                Отклонить
              </button>
              <button
                type="submit"
                name="decision"
                value="accept"
                className="h-12 rounded-xl bg-[#1F6F5C] text-white text-base font-semibold"
              >
                Принять
              </button>
            </div>
          </form>
        ))}

      {attemptList.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5B6670]">
            Попытки
          </h2>

          {attemptList.map((a, index) => (
            <div key={a.id} className="bg-white rounded-2xl border border-[#E6E4DF] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">
                  Попытка {attemptList.length - index} ·{" "}
                  {names.get(a.submitted_by) ?? "сотрудник"}
                </div>
                <div className="text-xs text-[#5B6670]">{reviewLabels[a.review_status]}</div>
              </div>
              <div className="text-xs text-[#5B6670]">{timeOf(a.submitted_at)}</div>

              {a.comment && <div className="mt-1 text-sm">Комментарий: {a.comment}</div>}
              {a.review_comment && (
                <div className="mt-1 text-sm text-[#7A2216]">Причина: {a.review_comment}</div>
              )}

              <div className="mt-2 grid grid-cols-3 gap-2">
                {photoList
                  .filter((p) => p.attempt_id === a.id)
                  .map((p) => {
                    const url = urlByPath.get(p.storage_path);
                    return url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.storage_path}
                        src={url}
                        alt="Фото результата"
                        className="aspect-square w-full rounded-xl object-cover bg-[#DDE1E4]"
                      />
                    ) : null;
                  })}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
