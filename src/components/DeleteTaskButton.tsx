"use client";

import { useRef } from "react";
import SubmitButton from "@/components/SubmitButton";

type Props = {
  id: string;
  title: string;
  action: (formData: FormData) => void | Promise<void>;
};

export default function DeleteTaskButton({ id, title, action }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="h-10 px-4 rounded-xl border border-[#E8B4AB] bg-white text-sm font-semibold text-[#9A2A1A]"
      >
        Удалить
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(92vw,380px)] rounded-2xl p-5 text-[#1B1F23] backdrop:bg-black/40"
      >
        <h3 className="text-lg font-bold">Удалить задачу?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#3A434B]">
          «{title}» пропадёт из списка, и сотрудники её не увидят.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-12 rounded-xl border border-[#CFD4D8] bg-white text-base font-semibold"
          >
            Отмена
          </button>

          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton
              pendingText="Удаляем…"
              className="h-12 w-full rounded-xl bg-[#B4281A] text-base font-semibold text-white"
            >
              Удалить
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
