import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../auth/firebase";
import { Link } from "react-router-dom";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e: unknown) {
      const error = e as { code?: string; message?: string };
      if (error.code === "auth/user-not-found") {
        setErr("No account found with this email address.");
      } else if (error.code === "auth/invalid-email") {
        setErr("Please enter a valid email address.");
      } else {
        setErr(error.message ?? "Failed to send reset email. Please try again.");
      }
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
        <Link
          to="/"
          className="text-2xl font-bold tracking-tight drop-shadow hover:opacity-80 transition-opacity"
        >
          Ceylonify
        </Link>
        <div className="text-sm text-white/60">Password Reset</div>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm">
        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Check your inbox</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              We've sent a password reset link to{" "}
              <span className="font-semibold text-slate-700">{email.trim()}</span>.
              Follow the link in the email to set a new password.
            </p>
            <div className="rounded-xl bg-sky-50 border border-sky-100 px-5 py-3 mb-6 text-left text-sm text-sky-800">
              Didn't receive it? Check your spam folder, or{" "}
              <button
                onClick={() => setSent(false)}
                className="font-bold text-sky-600 hover:underline"
              >
                try again
              </button>
              .
            </div>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg text-sm transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-neutral-900">Forgot password?</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Enter your registered email and we'll send you a reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <Input
                label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              {err && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-400">
              Remember your password?{" "}
              <Link to="/login" className="font-bold text-sky-600 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="absolute bottom-6 z-10 text-xs text-white/40">
        © {new Date().getFullYear()} Ceylonify · Index 220596H
      </div>
    </div>
  );
}
