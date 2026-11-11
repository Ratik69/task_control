"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

// Кнопка отправки формы: пока server action выполняется, повторные нажатия блокируются.
export default function SubmitButton({
  children,
  pendingText = "Сохраняем…",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  // Ref срабатывает мгновенно, раньше, чем React успеет перерисовать pending
  const locked = useRef(false);

  useEffect(() => {
    if (!pending) locked.current = false;
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        if (locked.current) {
          e.preventDefault();
          return;
        }
        locked.current = true;
      }}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
