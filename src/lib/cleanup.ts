import { createAdminClient } from "@/lib/supabase/admin";

const KEEP_DAYS = 14;

// Удаляет всё, что старше 14 дней: принятые задачи с фото, историю и удалённых сотрудников.
// Вызывается сама, когда управляющий открывает главную или историю. Ошибки не показываются.
export async function runCleanup(restaurantId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // 1. Старые принятые задачи (невыполненные и просроченные остаются в списке)
    const { data: oldTasks } = await admin
      .from("tasks")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .in("status", ["done", "cancelled"])
      .lt("done_at", cutoff)
      .limit(100);

    const taskIds = (oldTasks ?? []).map((t) => t.id);

    if (taskIds.length > 0) {
      const { data: attempts } = await admin
        .from("task_attempts")
        .select("id")
        .in("task_id", taskIds);
      const attemptIds = (attempts ?? []).map((a) => a.id);

      if (attemptIds.length > 0) {
        const { data: photos } = await admin
          .from("attempt_photos")
          .select("storage_path")
          .in("attempt_id", attemptIds);

        const paths = (photos ?? []).map((p) => p.storage_path);
        if (paths.length > 0) {
          const { error: storageError } = await admin.storage.from("task-photos").remove(paths);
          if (storageError) return; // файлы не удалились, записи не трогаем, попробуем позже
        }

        await admin.from("attempt_photos").delete().in("attempt_id", attemptIds);
        await admin.from("task_attempts").delete().in("id", attemptIds);
      }

      await admin.from("task_events").delete().in("task_id", taskIds);
      await admin.from("tasks").delete().in("id", taskIds);
    }

    // 2. Старые отклонённые попытки по ещё не принятым задачам: фото и записи тоже живут 14 дней
    const { data: oldRejected } = await admin
      .from("task_attempts")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("review_status", "rejected")
      .lt("submitted_at", cutoff)
      .limit(100);

    const rejectedIds = (oldRejected ?? []).map((a) => a.id);
    if (rejectedIds.length > 0) {
      const { data: photos } = await admin
        .from("attempt_photos")
        .select("storage_path")
        .in("attempt_id", rejectedIds);
      const paths = (photos ?? []).map((p) => p.storage_path);
      if (paths.length > 0) {
        const { error: storageError } = await admin.storage.from("task-photos").remove(paths);
        if (storageError) return;
      }
      await admin.from("attempt_photos").delete().in("attempt_id", rejectedIds);
      await admin.from("task_attempts").delete().in("id", rejectedIds);
    }

    // 3. Удалённые сотрудники старше 14 дней
    const { data: oldProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff)
      .limit(50);

    for (const p of oldProfiles ?? []) {
      await admin.from("tasks").update({ created_by: null }).eq("created_by", p.id);
      await admin.from("task_attempts").update({ reviewed_by: null }).eq("reviewed_by", p.id);
      await admin.from("task_events").update({ user_id: null }).eq("user_id", p.id);
      // Если у него ещё остались попытки в истории, запись не удалится и будет повторена позже
      await admin.from("profiles").delete().eq("id", p.id);
    }
  } catch {
    // очистка не должна ломать страницу
  }
}
