import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../auth/firebase";
import { Link } from "react-router-dom";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

type Step = "form" | "traveler-success" | "host-pending";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"TRAVELER" | "HOST">("TRAVELER");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Both roles create a TRAVELER account by default.
      // HOST access requires admin approval — shown in host-pending screen.
      setStep(role === "HOST" ? "host-pending" : "traveler-success");
    } catch (e: unknown) {
      const error = e as Error;
      setErr(error?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "traveler-success") {
    return (
      <div
        className="relative flex h-screen w-screen items-center justify-center overflow-hidden px-4"
        style={{
          backgroundImage: "url('/login-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            Registration Successful!
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Welcome to Ceylonify! Your Traveler account has been created
            successfully.
          </p>
          <div className="rounded-xl bg-sky-50 border border-sky-100 px-5 py-4 mb-6 text-left">
            <div className="text-xs font-bold uppercase text-sky-600 mb-1">
              Next step
            </div>
            <p className="text-sm text-sky-800 leading-relaxed">
              Download the <span className="font-bold">Ceylonify mobile app</span> to
              discover and book authentic Sri Lankan experiences. Sign in using
              your registered email and password.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex gap-3 justify-center">
              <div className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold">
                🍎 App Store
              </div>
              <div className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold">
                ▶ Google Play
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Already a host?{" "}
              <Link to="/login" className="font-bold text-sky-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "host-pending") {
    return (
      <div
        className="relative flex h-screen w-screen items-center justify-center overflow-hidden px-4"
        style={{
          backgroundImage: "url('/login-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            Account Created!
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Your account has been registered with the email{" "}
            <span className="font-semibold text-slate-600">{email}</span>.
          </p>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-5 py-4 mb-6 text-left">
            <div className="text-xs font-bold uppercase text-amber-600 mb-1">
              Host Access Pending
            </div>
            <p className="text-sm text-amber-800 leading-relaxed">
              Host dashboard access requires admin approval. Please contact a
              Ceylonify administrator to upgrade your account to Host status.
              Once approved, you can sign in at the link below.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg text-sm transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden px-4"
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
        <div className="text-sm text-white/60">Create your account</div>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 p-10 shadow-2xl backdrop-blur-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Create account
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Join Ceylonify to discover or host experiences
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {/* Role selector */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase text-slate-600">
              I am a…
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["TRAVELER", "HOST"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-colors ${
                    role === r
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {r === "TRAVELER" ? "✈️ Traveler" : "🏡 Host"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {role === "TRAVELER"
                ? "Discover experiences via the Ceylonify mobile app."
                : "List and manage experiences. Requires admin approval."}
            </p>
          </div>

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

          {err && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-sky-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="absolute bottom-6 z-10 text-xs text-white/40">
        © {new Date().getFullYear()} Ceylonify · Index 220596H
      </div>
    </div>
  );
}
