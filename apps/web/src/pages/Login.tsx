import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../auth/firebase";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      nav("/dashboard", { replace: true });
    } catch (e: unknown) {
      const error = e as Error;
      setErr(error?.message ?? "Login failed");
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
      {/* Full-screen dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Branding — top left */}
      <div className="absolute left-8 top-6 z-10">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="Ceylonify"
            className="w-12 h-12 rounded-full object-cover shadow-lg ring-2 ring-white/20"
          />
          <div>
            <div className="text-white font-bold text-xl tracking-tight drop-shadow leading-tight">
              Ceylonify
            </div>
            <div className="text-white/60 text-xs">Host & Admin Dashboard</div>
          </div>
        </Link>
      </div>

      {/* Centered login card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sign in to manage your listings
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Input
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="example@email.com"
          />
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <div className="text-right mt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-sky-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {err ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Want to become a host?{" "}
          <Link to="/register" className="font-bold text-sky-600 hover:underline">
            Apply here
          </Link>
        </p>

      </div>

      {/* Footer */}
      <div className="absolute bottom-6 z-10 text-xs text-white/40">
        © {new Date().getFullYear()} Ceylonify
      </div>
    </div>
  );
}
