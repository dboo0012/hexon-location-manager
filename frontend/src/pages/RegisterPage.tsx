import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FormAlert } from "../components/Alert";
import { AuthShell } from "../components/AuthShell";
import { FormField } from "../components/FormField";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (confirm !== password) errors.confirm = "Passwords do not match.";
  return errors;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validate(email, password, confirm);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const { token, user } = await api.register(email.trim(), password);
      setSession(token, user);
      navigate("/map", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      intro="Your saved places are private to you."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-cobalt hover:underline">
            Sign in
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
          error={fieldErrors.email}
          autoFocus
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          hint="At least 8 characters."
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
        />
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
