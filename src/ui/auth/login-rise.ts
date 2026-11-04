/** Quick enough to finish before the world behind the login fades in. */
const LOGIN_RISE_MS = 300;

/** The login form sliding up into place as the page opens. */
export const LOGIN_RISE_SX = {
  animation: `loginFormRise ${LOGIN_RISE_MS}ms ease-out backwards`,
  "@keyframes loginFormRise": {
    from: { opacity: 0, transform: "translateY(24px)" },
    to: { opacity: 1, transform: "none" },
  },
};
