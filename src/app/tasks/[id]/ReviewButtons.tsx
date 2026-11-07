"use client";

import { useFormStatus } from "react-dom";

// Кнопки «Отклонить» / «Принять»: сразу блокируются и показывают, что идёт сохранение
export default function ReviewButtons() {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="submit"
        name="decision"
        value="reject"
        disabled={pending}
        className="h-12 rounded-xl border-[1.5px] border-[#B4281A] bg-white text-[#9A2A1A] text-base font-semibold disabled:opacity-60"
      >
        {pending && decision === "reject" ? "Отклоняем…" : "Отклонить"}
      </button>
      <button
        type="submit"
        name="decision"
        value="accept"
        disabled={pending}
        className="h-12 rounded-xl bg-[#1F6F5C] text-white text-base font-semibold disabled:opacity-60"
      >
        {pending && decision === "accept" ? "Принимаем…" : "Принять"}
      </button>
    </div>
  );
}
