import type { ToastKind } from "@/ui/kit";

/** What to do with a login's one-time ticket. Rejecting shows the error on the form. */
export type OnTicket = (ticket: string) => void | Promise<void>;

export type Notify = (kind: ToastKind, message: string) => void;
