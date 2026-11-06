"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Логин: латиница, цифры, точка, дефис, подчёркивание
  if (!/^[a-z0-9._-]{2,32}$/.test(username) || !password) {
    redirect("/login?error=1");
  }

  const supabase = await createClient();

  // Логин превращается в служебный адрес, сотрудник этого не видит
  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@example.com`,
    password,
  });

  if (error) {
    redirect("/login?error=1");
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}