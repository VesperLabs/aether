/*
 * "Remember me": the server sends a signed token after such a login (kept by the app's
 * `loginToken` handler). While it is kept, the login form shows the password as remembered
 * and logs in with the token instead.
 */

const TOKEN_KEY = "loginToken";
const REMEMBER_KEY = "rememberMe";

export const getRememberMe = () => localStorage.getItem(REMEMBER_KEY) === "true";
export const setRememberMe = (remember: boolean) => {
  localStorage.setItem(REMEMBER_KEY, `${remember}`);
  if (!remember) forgetLoginToken();
};

export const getLoginToken = () => localStorage.getItem(TOKEN_KEY);
export const rememberLoginToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const forgetLoginToken = () => localStorage.removeItem(TOKEN_KEY);
