import { logout } from "@/app/login/actions";
import MenuDrawer from "./MenuDrawer";

// Кнопка с тремя полосками: меню справа и «Выйти» внизу. Для сотрудника в меню только «Выйти».
export default function AppMenu({ role }: { role: string }) {
  return <MenuDrawer role={role} logoutAction={logout} />;
}
