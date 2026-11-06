"use client";

import { useEffect, useState } from "react";

export default function RepeatFields() {
  const [repeat, setRepeat] = useState<"daily" | "once">("daily");
  const [date, setDate] = useState("");

  // Сразу подставляем сегодняшнюю дату, чтобы поле было видно на телефоне
  useEffect(() => {
    setDate(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date()),
    );
  }, []);

  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-[#5B6670] mb-1">
          Как часто
        </legend>

        <label className="flex items-center gap-3 rounded-xl border border-[#CFD4D8] bg-white p-3">
          <input
            type="radio"
            name="repeat_type"
            value="daily"
            checked={repeat === "daily"}
            onChange={() => setRepeat("daily")}
          />
          Каждый день
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-[#CFD4D8] bg-white p-3">
          <input
            type="radio"
            name="repeat_type"
            value="once"
            checked={repeat === "once"}
            onChange={() => setRepeat("once")}
          />
          Один раз
        </label>
      </fieldset>

      {repeat === "once" && (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#5B6670]">
            Дата (можно выбрать завтра)
            <input
              name="once_date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block h-12 w-full min-w-0 appearance-none rounded-xl border border-[#CFD4D8] bg-white px-3 text-base font-normal text-[#1B1F23]"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-[#CFD4D8] bg-white p-3">
            <input type="checkbox" name="save_template" className="mt-1 h-5 w-5" />
            <span>
              <span className="block text-sm font-semibold text-[#1B1F23]">
                Сохранить как шаблон
              </span>
              <span className="block text-sm text-[#5B6670]">
                Без галочки задача создаётся один раз и не попадает в список шаблонов.
              </span>
            </span>
          </label>
        </>
      )}
    </>
  );
}