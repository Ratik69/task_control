import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStaff, setStaffActive, resetStaffPassword, deleteStaff } from "./actions";
import DeleteStaffButton from "./DeleteStaffButton";
import AppMenu from "@/components/AppMenu";

const roleNames: Record<string, string> = {
  employee: "Сотрудник",
  manager: "Управляющая",
  admin: "Администратор",
};

const errorMessages: Record<string, string> = {
  name: "Введите имя: от 2 до 60 символов",
  username: "Логин: латиница, цифры, точка, дефис или подчёркивание, от 2 до 32 символов",
  password: "Пароль: от 6 символов",
  taken: "Такой логин уже занят",
  create: "Не удалось создать пользователя",
  profile: "Не удалось сохранить профиль, попробуйте ещё раз",
  forbidden: "Нет прав на это действие",
  save: "Не удалось сохранить. Если вы ещё не выполнили запрос в базе из инструкции, сделайте это.",
  delete: "Не удалось удалить сотрудника, попробуйте ещё раз",
  nokey:
    "Сайт не видит секретный ключ. Добавьте SUPABASE_SERVICE_ROLE_KEY в файл .env.local и перезапустите сайт.",
};

const okMessages: Record<string, string> = {
  created: "Сотрудник добавлен",
  password: "Пароль изменён",
  deleted: "Сотрудник удалён",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!me || !["manager", "admin"].includes(me.role)) redirect("/");

  // Удалённые сотрудники в списке не показываются
  const visible = await supabase
    .from("profiles")
    .select("id, full_name, username, role, is_active")
    .is("deleted_at", null)
    .order("created_at");

  // Запасной вариант на случай, если колонка deleted_at ещё не добавлена в базу
  const people = visible.error
    ? (
        await supabase
          .from("profiles")
          .select("id, full_name, username, role, is_active")
          .order("created_at")
      ).data
    : visible.data;

  const keyMissing = !process.env.SUPABASE_SERVICE_ROLE_KEY;

  const field =
    "h-12 rounded-xl border border-[#CFD4D8] bg-white px-3 text-base font-normal text-[#1B1F23]";
  const label = "flex flex-col gap-1.5 text-sm font-semibold text-[#5B6670]";
  const smallButton =
    "h-10 px-4 rounded-xl border border-[#CFD4D8] bg-white text-sm font-semibold";

  return (
    <main className="min-h-screen bg-[#F6F5F2] text-[#1B1F23] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
        <AppMenu role={me.role} />
      </div>

      {keyMissing && (
        <p className="rounded-xl bg-[#FFF1CC] border border-[#EBD28A] text-[#7A5200] text-sm p-3">
          Не задан секретный ключ SUPABASE_SERVICE_ROLE_KEY в файле .env.local, добавлять
          сотрудников пока нельзя.
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-[#FDF1EF] border border-[#F0C9C2] text-[#7A2216] text-sm p-3">
          {errorMessages[error] ?? "Ошибка"}
        </p>
      )}

      {ok && okMessages[ok] && (
        <p className="rounded-xl bg-[#DDF1E2] border border-[#B5DDBF] text-[#1E6B3A] text-sm p-3">
          {okMessages[ok]}
        </p>
      )}

      <section className="flex flex-col gap-2">
        {people?.map((p) => {
          const isSelf = p.id === user?.id;
          const manageable = !isSelf && (me.role === "admin" || p.role === "employee");

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border border-[#E6E4DF] p-3 flex flex-col gap-2 ${
                p.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {p.full_name}
                    {isSelf && <span className="text-[#5B6670] font-normal"> (вы)</span>}
                  </div>
                  <div className="text-sm text-[#5B6670]">
                    логин: {p.username} · {roleNames[p.role] ?? p.role}
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    p.is_active
                      ? "bg-[#DDF1E2] text-[#1E6B3A]"
                      : "bg-[#ECECEC] text-[#5B6670]"
                  }`}
                >
                  {p.is_active ? "Работает" : "Отключён"}
                </span>
              </div>

              {manageable && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <form action={setStaffActive}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.is_active ? "false" : "true"} />
                      <button type="submit" className={smallButton}>
                        {p.is_active ? "Отключить" : "Включить"}
                      </button>
                    </form>
                    <DeleteStaffButton id={p.id} name={p.full_name} action={deleteStaff} />
                  </div>

                  <details>
                    <summary className="text-sm font-semibold text-[#1F6F5C] cursor-pointer">
                      Сменить пароль
                    </summary>
                    <form action={resetStaffPassword} className="mt-2 flex gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="password"
                        type="text"
                        autoComplete="off"
                        placeholder="Новый пароль"
                        required
                        minLength={6}
                        className={`${field} flex-1 min-w-0`}
                      />
                      <button type="submit" className={smallButton}>
                        Сохранить
                      </button>
                    </form>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded-2xl border border-[#E6E4DF] p-4">
        <h2 className="text-lg font-bold mb-3">Добавить сотрудника</h2>

        <form action={createStaff} className="flex flex-col gap-3">
          <label className={label}>
            Имя
            <input name="full_name" type="text" required maxLength={60} className={field} />
          </label>

          <label className={label}>
            Логин (латиницей)
            <input
              name="username"
              type="text"
              required
              maxLength={32}
              autoComplete="off"
              autoCapitalize="none"
              className={field}
            />
          </label>

          <label className={label}>
            Пароль (от 6 символов)
            <input
              name="password"
              type="text"
              required
              minLength={6}
              autoComplete="off"
              className={field}
            />
          </label>

          {me.role === "admin" && (
            <label className={label}>
              Роль
              <select name="role" defaultValue="employee" className={field}>
                <option value="employee">Сотрудник</option>
                <option value="manager">Управляющая</option>
              </select>
            </label>
          )}

          <button
            type="submit"
            className="h-12 rounded-xl bg-[#1F6F5C] text-white text-base font-semibold"
          >
            Добавить
          </button>
        </form>
      </section>
    </main>
  );
}
