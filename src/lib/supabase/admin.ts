import { createClient } from "@supabase/supabase-js";

// Клиент с полными правами. Использовать ТОЛЬКО в серверном коде (actions.ts),
// никогда не импортировать в файлы с "use client".
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("Не задан SUPABASE_SERVICE_ROLE_KEY в файле .env.local");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
