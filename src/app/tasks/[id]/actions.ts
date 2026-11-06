"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function reviewAttempt(formData: FormData) {
  const attemptId = String(formData.get("attempt_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (!UUID.test(attemptId) || !UUID.test(taskId)) redirect("/tasks");

  if (decision !== "accept" && decision !== "reject") {
    redirect(`/tasks/${taskId}`);
  }

  if (decision === "reject" && !comment) {
    redirect(`/tasks/${taskId}?error=reason`);
  }

  const supabase = await createClient();

  // Все проверки прав (роль, своя ли работа, уже ли проверено) делает база данных
  const { error } = await supabase.rpc("review_attempt", {
    p_attempt_id: attemptId,
    p_accept: decision === "accept",
    p_comment: comment,
  });

  if (error) redirect(`/tasks/${taskId}?error=review`);

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  redirect("/tasks");
}
