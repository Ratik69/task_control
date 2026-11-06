"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function deleteTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || !["lead", "manager", "admin"].includes(me.role)) redirect("/");

  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/upcoming");

  await supabase.rpc("cancel_task", { p_id: id });

  revalidatePath("/upcoming");
  revalidatePath("/tasks");
  redirect("/upcoming");
}
