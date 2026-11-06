"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  role: string;
  logoutAction: () => void | Promise<void>;
};

const allLinks = [
  { href: "/tasks", label: "Главная" },
  { href: "/upcoming", label: "Предстоящие задачи" },
  { href: "/history", label: "История по дням" },
  { href: "/staff", label: "Сотрудники" },
];

// Сотруднику: главная и предстоящие. Менеджеру ещё история. Управляющему и администратору ещё сотрудники.
const linksByRole: Record<string, string[]> = {
  employee: ["/tasks", "/upcoming"],
  lead: ["/tasks", "/upcoming", "/history"],
};

export default function MenuDrawer({ role, logoutAction }: Props) {
  const [open, setOpen] = useState(false);
  const allowed = linksByRole[role];
  const links = allowed ? allLinks.filter((l) => allowed.includes(l.href)) : allLinks;

  return (
    <>
      <button
        type="button"
        aria-label="Меню"
        onClick={() => setOpen(true)}
        className="h-10 w-10 shrink-0 rounded-xl border border-[#CFD4D8] bg-white flex flex-col items-center justify-center gap-[5px]"
      >
        <span className="block h-0.5 w-5 rounded bg-[#1B1F23]" />
        <span className="block h-0.5 w-5 rounded bg-[#1B1F23]" />
        <span className="block h-0.5 w-5 rounded bg-[#1B1F23]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute right-0 top-0 flex h-full w-[min(80vw,300px)] flex-col bg-[#F6F5F2] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Меню</span>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-xl border border-[#CFD4D8] bg-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <nav className="mt-4 flex flex-col gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="h-12 rounded-xl border border-[#E6E4DF] bg-white px-4 flex items-center font-semibold"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <form action={logoutAction} className="mt-auto pt-4">
              <button
                type="submit"
                className="h-12 w-full rounded-xl border border-[#CFD4D8] bg-white text-base font-semibold"
              >
                Выйти
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
