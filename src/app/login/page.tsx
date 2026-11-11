import { login } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F6F5F2] text-[#1B1F23] p-4">
      <form
        action={login}
        className="w-full max-w-sm bg-white rounded-2xl border border-[#E6E4DF] p-6 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold">Вход</h1>

        {error && (
          <p className="rounded-xl bg-[#FDF1EF] border border-[#F0C9C2] text-[#7A2216] text-sm p-3">
            Неверный логин или пароль
          </p>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#5B6670]">
          Логин
          <input
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            required
            className="h-12 rounded-xl border border-[#CFD4D8] px-3 text-base font-normal text-[#1B1F23]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#5B6670]">
          Пароль
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-12 rounded-xl border border-[#CFD4D8] px-3 text-base font-normal text-[#1B1F23]"
          />
        </label>

        <SubmitButton
          pendingText="Входим…"
          className="h-12 rounded-xl bg-[#1F6F5C] text-white text-base font-semibold"
        >
          Войти
        </SubmitButton>
      </form>
    </main>
  );
}