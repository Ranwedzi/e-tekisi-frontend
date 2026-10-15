import type { ReactNode } from "react";
import { RequireAuth } from "../components/RequireAuth";

// Operator / admin screens.
export default function OpsLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={["OPERATOR", "ADMIN"]}>{children}</RequireAuth>;
}
