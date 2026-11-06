import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { removeTemplate } from "./actions";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!profile || !["manager", "admin"].includes(profile.role)) redirect("/");

  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, title, due_time, available_from, photos_required, repeat_type, once_date")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Шаблоны задач</h1>
        <Link
          href="/"
          className="h-10 px-4 rounded-xl border border-[#CFD4D8] bg-white text-sm font-semibold flex items-center"
        >
          На главную
        </Link>
      </div>

      {(!templates || templates.length === 0) && (
        <p className="text-[#5B6670]">Шаблонов пока нет. Создайте первый.</p>
      )}

      <div className="flex flex-col gap-2">
        {templates?.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-[#E6E4DF] rounded-xl p-3 flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-semibold">{t.title}</div>
              <div className="text-sm text-[#5B6670]">
                {t.available_from ? `с ${String(t.available_from).slice(0, 5)} ` : ""}до{" "}
                {String(t.due_time).slice(0, 5)} · фото: {t.photos_required}
              </div>
              <div className="text-sm text-[#5B6670]">
                {t.repeat_type === "daily"
                  ? "Каждый день"
                  : `Один раз · ${t.once_date}`}
              </div>
            </div>
            <form action={removeTemplate}>
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                className="h-10 px-3 rounded-lg border border-[#CFD4D8] text-sm"
              >
                Убрать
              </button>
            </form>
          </div>
        ))}
      </div>

      <Link
        href="/templates/new"
        className="h-12 rounded-xl bg-[#1F6F5C] text-white font-semibold flex items-center justify-center"
      >
        Новая задача
      </Link>
    </main>
  );
}