import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import App from "../App";
import { useAuthStore } from "../store/authStore";

/** Base64url-encodes a JSON object (enough to fake a JWT payload). */
const b64 = (obj: object) =>
  btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export function fakeToken(expiresInSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${b64({ alg: "HS256" })}.${b64({ sub: "1", email: "a@b.c", exp })}.sig`;
}

export function signIn(email = "alice@example.com") {
  useAuthStore.setState({ token: fakeToken(), user: { id: 1, email } });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
}

export function renderApp(path: string) {
  const user = userEvent.setup();
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
  return { user, ...utils };
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
