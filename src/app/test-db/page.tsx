import { redirect } from "next/navigation";

// Служебная страница проверки связи больше не нужна
export default function TestDb() {
  redirect("/");
}
