import type { ToastKind } from "@/ui";

/** The `formSuccess` message from the server. */
export type FormSuccess = { success: string; email?: string };

export type Notify = (kind: ToastKind, message: string) => void;
