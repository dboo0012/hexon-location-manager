import { Navigate, Outlet, useLocation } from "react-router";
import { isTokenExpired, useAuthStore } from "../store/authStore";

function useIsSignedIn(): boolean {
  const token = useAuthStore((s) => s.token);
  return token !== null && !isTokenExpired(token);
}

/** Renders child routes for signed-in users; everyone else is sent to /login. */
export function ProtectedRoute() {
  const signedIn = useIsSignedIn();
  const location = useLocation();
  if (!signedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Login and registration are only for signed-out visitors. Once a session exists (including
 * the moment the user signs in) they continue to the page they originally asked for.
 */
export function GuestRoute() {
  const signedIn = useIsSignedIn();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/map";
  return signedIn ? <Navigate to={from} replace /> : <Outlet />;
}
