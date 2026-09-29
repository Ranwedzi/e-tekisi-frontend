import type { ReactNode } from "react";
import { RequireAuth } from "../components/RequireAuth";

// Commuter screens: home, book, history, wallet, saved ranks.
export default function CommuterLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={["COMMUTER"]}>{children}</RequireAuth>;
}
