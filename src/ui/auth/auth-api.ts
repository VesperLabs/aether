type Failure = { error: string; expired?: boolean };
type Ticket = { ticket: string; token?: string };

/** Posts to an auth endpoint. Refusals come back as `{ error }`; an unreachable server throws. */
async function post<T>(path: string, body: object): Promise<T | Failure> {
  const res = await fetch(`${process.env.SERVER_URL}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new Error("Server is offline, try again soon");
  });
  return res.json().catch(() => ({ error: "Something went wrong" }));
}

export const loginWithPassword = (args: { email: string; password: string; remember: boolean }) =>
  post<Ticket>("login", args);

export const loginWithToken = (token: string) => post<Ticket>("token", { token });

export const registerAccount = (args: {
  email: string;
  password: string;
  charClass: string;
  gender: string;
  remember: boolean;
}) => post<{ email: string; token?: string }>("register", args);
