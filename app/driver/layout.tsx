import type { ReactNode } from "react";
import { RequireAuth } from "../components/RequireAuth";

// Driver screens: dashboard, earnings, queue.
export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["DRIVER"]} dark>
      {children}
    </RequireAuth>
  );
}
