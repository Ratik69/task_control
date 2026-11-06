import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTemplate } from "../actions";
import RepeatFields from "./RepeatFields";

const errors: Record<string, string> = {
  title: "Введите название задачи",
  time: "Проверьте время",
  photos: "Количество фото от 0 до 5",
  repeat: "Выберите, как часто",
  date: "Для разовой задачи укажите дату",
  start: "Время «Появится в» не может быть позже срока",
  save: "Не удалось сохранить, попробуйте ещё раз",
};

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!profile || !["lead", "manager", "admin"].includes(profile.role)) redirect("/");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");

  const field =
    "h-12 rounded-xl border border-[#CFD4D8] bg-white px-3 text-base font-normal text-[#1B1F23]";
  const label = "flex flex-col gap-1.5 text-sm font-semibold text-[#5B6670]";

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4">
      <Link href="/templates" className="text-[#1F6F5C] font-semibold">
        ← Шаблоны
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-4">Новая задача</h1>

      <form action={createTemplate} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-xl bg-[#FDF1EF] border border-[#F0C9C2] text-[#7A2216] text-sm p-3">
            {errors[error] ?? "Ошибка"}
          </p>
        )}

        <label className={label}>
          Название
          <input name="title" type="text" required maxLength={120} className={field} />
        </label>

        <label className={label}>
          Описание
          <textarea
            name="description"
            rows={3}
            className="rounded-xl border border-[#CFD4D8] bg-white p-3 text-base font-normal"
          />
        </label>

        <label className={label}>
          Категория
          <select name="category_id" className={field}>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Появится в
            <input
              name="available_from"
              type="time"
              defaultValue="10:00"
              required
              className={`${field} w-full min-w-0`}
            />
          </label>
          <label className={label}>
            Срок до
            <input
              name="due_time"
              type="time"
              defaultValue="12:00"
              required
              className={`${field} w-full min-w-0`}
            />
          </label>
        </div>
        <p className="-mt-2 text-sm text-[#5B6670]">
          В это время задача появится у сотрудников, и её нужно сделать до срока.
        </p>

        <label className={label}>
          Сколько фото нужно
          <select name="photos_required" defaultValue="1" className={field}>
            <option value="0">Без фото</option>
            <option value="1">1 фото</option>
            <option value="2">2 фото</option>
            <option value="3">3 фото</option>
          </select>
        </label>

        <RepeatFields />

        <button
          type="submit"
          className="h-12 rounded-xl bg-[#1F6F5C] text-white text-base font-semibold"
        >
          Сохранить задачу
        </button>
      </form>
    </main>
  );
}