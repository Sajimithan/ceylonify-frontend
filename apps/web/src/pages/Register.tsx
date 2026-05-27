import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../auth/firebase";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      nav("/dashboard", { replace: true });
    } catch (e: unknown) {
      const error = e as Error;
      setErr(error?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('/login-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="absolute left-8 top-8 z-10 text-white">
        <Link to="/" className="text-2xl font-bold tracking-tight drop-shadow hover:opacity-80 transition-opacity">
          Ceylonify
        </Link>
        <div className="text-sm text-white/60">Create your account</div>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Create account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Start discovering or hosting Sri Lankan experiences
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Input
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />

          {err ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-sky-600 hover:underline">
            Sign in
          </Link>
        </p>

        <div className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
          New accounts start as Travelers. Contact an admin to upgrade to Host access.
        </div>
      </div>

      <div className="absolute bottom-6 z-10 text-xs text-white/40">
        © {new Date().getFullYear()} Ceylonify · Index 220596H
      </div>
    </div>
  );
}
