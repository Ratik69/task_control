"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  taskId: string;
  restaurantId: string;
  photosRequired: number;
};

type Item = { file: File; url: string };

// Уменьшаем фото до 1600 px по длинной стороне, чтобы оно весило мало
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

function randomName() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export default function SubmitForm({ taskId, restaurantId, photosRequired }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    setItems((prev) =>
      [...prev, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5)
    );
  }

  function removeItem(index: number) {
    setItems((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function submit() {
    setError(null);

    if (items.length < photosRequired) {
      setError(`Нужно фото: ${photosRequired}`);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const uploaded: { path: string; mime: string; size: number }[] = [];

      for (const item of items) {
        const blob = await compress(item.file);
        const mime = blob.type || item.file.type;
        const ext =
          mime === "image/png"
            ? "png"
            : mime === "image/webp"
              ? "webp"
              : mime === "image/heic"
                ? "heic"
                : "jpg";
        const path = `${restaurantId}/${taskId}/${randomName()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("task-photos")
          .upload(path, blob, { contentType: mime });

        if (uploadError) throw new Error("Не удалось загрузить фото. Попробуйте ещё раз.");
        uploaded.push({ path, mime, size: blob.size });
      }

      const { error: rpcError } = await supabase.rpc("submit_attempt", {
        p_task_id: taskId,
        p_comment: comment.trim(),
        p_photos: uploaded,
      });

      if (rpcError) throw new Error(rpcError.message);

      router.push("/tasks");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#5B6670]">
        Фото результата ({items.length} из {photosRequired})
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.map((item, i) => (
          <div
            key={item.url}
            className="relative aspect-square rounded-xl overflow-hidden bg-[#DDE1E4]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="Фото" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeItem(i)}
              aria-label="Убрать фото"
              className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white text-sm"
            >
              ×
            </button>
          </div>
        ))}

        {items.length < 5 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-[#B9C0C6] bg-white text-sm text-[#3A434B]"
          >
            + Фото
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />

      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#5B6670]">
        Комментарий
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Например: делала с Мариной"
          className="rounded-xl border border-[#CFD4D8] bg-white p-3 text-base font-normal normal-case tracking-normal text-[#1B1F23]"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-[#FDF1EF] border border-[#F0C9C2] text-[#7A2216] text-sm p-3">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="h-12 rounded-xl bg-[#1F6F5C] text-white text-base font-semibold disabled:opacity-60"
      >
        {busy ? "Отправляю…" : "Отправить на проверку"}
      </button>
    </div>
  );
}
