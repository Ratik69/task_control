import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Маленькая копия фото лежит рядом с большой: abc.jpg -> abc_t.jpg
export function thumbPath(path: string) {
  return path.replace(/\.[^./]+$/, "") + "_t.jpg";
}

// Ссылки на фото: full для открытия, thumb для списка (у старых фото миниатюры нет, тогда берём полное)
export async function signPhotoUrls(supabase: Supabase, paths: string[]) {
  const result = new Map<string, { full: string; thumb: string }>();
  if (paths.length === 0) return result;

  const { data } = await supabase.storage
    .from("task-photos")
    .createSignedUrls(
      paths.flatMap((p) => [p, thumbPath(p)]),
      3600,
    );

  const url = new Map<string, string>();
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) url.set(s.path, s.signedUrl);
  }

  for (const p of paths) {
    const full = url.get(p);
    if (full) result.set(p, { full, thumb: url.get(thumbPath(p)) ?? full });
  }
  return result;
}
