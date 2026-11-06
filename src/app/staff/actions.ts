"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f-]{36}$/i;

// Кто вызывает действие: должен быть управляющей или администратором
async function getCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || !["manager", "admin"].includes(me.role)) redirect("/");
  return { supabase, user, me };
}

// Если секретный ключ не добавлен в .env.local, показываем понятное сообщение вместо ошибки
function requireKey() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/staff?error=nokey");
}

// Администратор управляет всеми, управляющая только сотрудниками
function canManage(callerRole: string, targetRole: string) {
  return callerRole === "admin" || targetRole === "employee";
}

export async function createStaff(formData: FormData) {
  requireKey();
  const { me } = await getCaller();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  let role = String(formData.get("role") ?? "employee");

  if (fullName.length < 2 || fullName.length > 60) redirect("/staff?error=name");
  if (!/^[a-z0-9._-]{2,32}$/.test(username)) redirect("/staff?error=username");
  if (password.length < 6 || password.length > 72) redirect("/staff?error=password");

  // Только администратор может создавать управляющих
  if (me.role !== "admin" || (role !== "employee" && role !== "manager")) {
    role = "employee";
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `${username}@example.com`,
    password,
    email_confirm: true,
  });

  const newUser = created?.user;

  if (createError || !newUser) {
    const taken = createError?.message?.toLowerCase().includes("already");
    redirect(`/staff?error=${taken ? "taken" : "create"}`);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUser.id,
    restaurant_id: me.restaurant_id,
    username,
    full_name: fullName,
    role,
  });

  if (profileError) {
    // Откатываем: не оставляем пользователя без профиля
    await admin.auth.admin.deleteUser(newUser.id);
    redirect("/staff?error=profile");
  }

  revalidatePath("/staff");
  redirect("/staff?ok=created");
}

export async function setStaffActive(formData: FormData) {
  requireKey();
  const { supabase, user, me } = await getCaller();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!UUID.test(id) || id === user.id) redirect("/staff");

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, restaurant_id")
    .eq("id", id)
    .maybeSingle();

  if (
    !target ||
    target.restaurant_id !== me.restaurant_id ||
    !canManage(me.role, target.role)
  ) {
    redirect("/staff?error=forbidden");
  }

  const admin = createAdminClient();

  const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", id);
  if (error) redirect("/staff?error=save");

  // Отключённый сотрудник не сможет войти
  await admin.auth.admin.updateUserById(id, {
    ban_duration: active ? "none" : "876000h",
  });

  revalidatePath("/staff");
  redirect("/staff");
}

export async function deleteStaff(formData: FormData) {
  requireKey();
  const { supabase, user, me } = await getCaller();

  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id) || id === user.id) redirect("/staff");

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, restaurant_id, username, is_active")
    .eq("id", id)
    .maybeSingle();

  if (
    !target ||
    target.restaurant_id !== me.restaurant_id ||
    !canManage(me.role, target.role)
  ) {
    redirect("/staff?error=forbidden");
  }

  const admin = createAdminClient();

  // 1. Прячем запись. Она остаётся в базе 14 дней ради истории, потом её удалит очистка.
  //    Логин переименовываем, чтобы его можно было занять заново.
  const { error: hideError } = await admin
    .from("profiles")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      username: `${target.username}~${id.slice(0, 8)}`,
    })
    .eq("id", id);

  if (hideError) redirect("/staff?error=save");

  // 2. Удаляем вход, сотрудник больше не сможет войти
  const { error: authError } = await admin.auth.admin.deleteUser(id);

  if (authError && authError.status !== 404) {
    // Не получилось: возвращаем запись как была
    await admin
      .from("profiles")
      .update({
        is_active: target.is_active,
        deleted_at: null,
        username: target.username,
      })
      .eq("id", id);
    redirect("/staff?error=delete");
  }

  revalidatePath("/staff");
  redirect("/staff?ok=deleted");
}

export async function resetStaffPassword(formData: FormData) {
  requireKey();
  const { supabase, me } = await getCaller();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!UUID.test(id)) redirect("/staff");
  if (password.length < 6 || password.length > 72) redirect("/staff?error=password");

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, restaurant_id")
    .eq("id", id)
    .maybeSingle();

  if (
    !target ||
    target.restaurant_id !== me.restaurant_id ||
    !canManage(me.role, target.role)
  ) {
    redirect("/staff?error=forbidden");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) redirect("/staff?error=save");

  revalidatePath("/staff");
  redirect("/staff?ok=password");
}
