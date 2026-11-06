"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["manager", "admin"].includes(profile.role)) redirect("/");
  return { supabase, user, profile };
}

export async function createTemplate(formData: FormData) {
  const { supabase, user, profile } = await getManager();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const dueTime = String(formData.get("due_time") ?? "12:00");
  const photos = Number(formData.get("photos_required") ?? 1);
  const repeat = String(formData.get("repeat_type") ?? "daily");
  const availableFrom = String(formData.get("available_from") ?? "");
  const onceDate = String(formData.get("once_date") ?? "");
  const saveTemplate = formData.get("save_template") === "on";

  if (!title || title.length > 120) redirect("/templates/new?error=title");
  if (!/^\d{2}:\d{2}$/.test(dueTime)) redirect("/templates/new?error=time");
  if (!Number.isInteger(photos) || photos < 0 || photos > 5)
    redirect("/templates/new?error=photos");
  if (repeat !== "daily" && repeat !== "once")
    redirect("/templates/new?error=repeat");
  if (repeat === "once" && !/^\d{4}-\d{2}-\d{2}$/.test(onceDate))
    redirect("/templates/new?error=date");
  if (!/^\d{2}:\d{2}$/.test(availableFrom)) redirect("/templates/new?error=time");
  if (availableFrom > dueTime) redirect("/templates/new?error=start");

  // Разовая задача без галочки «Сохранить как шаблон»: создаём только саму задачу
  if (repeat === "once" && !saveTemplate) {
    const { error: taskError } = await supabase.rpc("create_one_time_task", {
      p_title: title,
      p_description: description,
      p_category_id: categoryId || null,
      p_date: onceDate,
      p_time: dueTime,
      p_from: availableFrom,
      p_photos: photos,
    });

    if (taskError) redirect("/templates/new?error=save");

    revalidatePath("/tasks");
    redirect("/tasks");
  }

  const { error } = await supabase.from("task_templates").insert({
    restaurant_id: profile.restaurant_id,
    category_id: categoryId || null,
    title,
    description,
    due_time: dueTime,
    available_from: availableFrom,
    photos_required: photos,
    repeat_type: repeat,
    once_date: repeat === "once" ? onceDate : null,
    created_by: user.id,
  });

  if (error) redirect("/templates/new?error=save");

  // Создаём задачи на сегодня по шаблонам
  await supabase.rpc("ensure_tasks_for_today");

  revalidatePath("/templates");
  redirect("/templates");
}

export async function removeTemplate(formData: FormData) {
  const { supabase } = await getManager();
  const id = String(formData.get("id") ?? "");

  await supabase.from("task_templates").update({ is_active: false }).eq("id", id);

  revalidatePath("/templates");
  redirect("/templates");
}