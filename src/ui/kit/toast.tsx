import { useEffect } from "react";
import { Box, Flex, Text } from "theme-ui";

export type ToastKind = "success" | "error";

/** One message; a new `id` restarts the toast, even with the same text. */
export interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
}

const TOAST_DURATION_MS = 3000;

const CHECK_PATH = "M3 8.5l3 3 7-7";
const CROSS_PATH = "M4 4l8 8M12 4l-8 8";

const ToastBadge = ({ kind }: { kind: ToastKind }) => (
  <Flex
    sx={{
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      width: 22,
      height: 22,
      borderRadius: "50%",
      bg: "shadow.30",
      border: "1px solid #000",
      boxShadow: "inset 0px 0px 0px 1px rgba(255,255,255,.15)",
      color: kind === "success" ? "success" : "danger",
    }}
  >
    <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden>
      <path
        d={kind === "success" ? CHECK_PATH : CROSS_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </Flex>
);

/** A wooden notice that dismisses itself, right above the positioned box it is placed in. */
export const Toast = ({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "100%",
        left: "50%",
        mb: 2,
        width: "max-content",
        transform: "translateX(-50%)",
        zIndex: "modal",
        pointerEvents: "all",
      }}
    >
      <Flex
        key={toast.id}
        role={toast.kind === "error" ? "alert" : "status"}
        variant="buttons.wood"
        onClick={onDismiss}
        sx={{
          alignItems: "center",
          gap: 2,
          py: 1,
          pl: 1,
          pr: 3,
          borderRadius: 999,
          cursor: "pointer",
          maxWidth: 280,
          animation: "toast-in .25s cubic-bezier(0.33, 1, 0.68, 1)",
          "@keyframes toast-in": {
            from: { opacity: 0, transform: "translateY(8px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <ToastBadge kind={toast.kind} />
        <Text sx={{ fontSize: 1, whiteSpace: "normal" }}>{toast.message}</Text>
      </Flex>
    </Box>
  );
};
