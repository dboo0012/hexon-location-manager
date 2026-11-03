import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { FormAlert } from "../components/Alert";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Where the user was headed before being redirected here.
  const from = (location.state as { from?: string } | null)?.from ?? "/map";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { token, user } = await api.login(email, password);
      setSession(token, user);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      intro="Pick up where you left off on your map."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-cobalt hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormAlert message={error} />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
