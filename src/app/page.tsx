import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppMenu from "@/components/AppMenu";

// Главный экран у всех ролей: список задач
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (profile) redirect("/tasks");

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">Контроль задач</h1>
        <AppMenu role="employee" />
      </div>
      <p className="text-lg text-[#9A2A1A]">
        Вход выполнен, но для этого пользователя нет профиля в базе.
      </p>
    </main>
  );
}
