import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const FEATURES = [
  {
    icon: "🗺️",
    title: "Discover Sri Lanka",
    body: "Browse curated events, rentals, accommodations, and activities across the island.",
  },
  {
    icon: "⭐",
    title: "Host Your Experience",
    body: "List your experience and reach thousands of travelers looking for authentic local stays and activities.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Listings",
    body: "Our AI enhances your listing descriptions and automatically reviews content for quality.",
  },
  {
    icon: "🔔",
    title: "Real-time Notifications",
    body: "Get instant push notifications when your listing is approved or reviewed by our team.",
  },
];

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen font-sans antialiased text-slate-800">
      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden"
        style={{
          backgroundImage: "url('/login-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/55" />

        {/* Top nav */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-5">
          <div className="text-white font-bold text-xl tracking-tight drop-shadow">
            Ceylonify
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-5 py-2 rounded-lg shadow transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-white/90 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-5 py-2 rounded-lg shadow transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg leading-tight mb-4">
            Experience Sri Lanka <br className="hidden sm:block" />
            Like Never Before
          </h1>
          <p className="text-lg text-white/80 mb-8 font-light leading-relaxed">
            Discover authentic events, stays, adventures, and cultural
            experiences curated by local hosts across the Pearl of the Indian
            Ocean.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to={user ? "/browse" : "/login"}
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-lg transition-colors text-sm uppercase tracking-wider"
            >
              Browse Experiences
            </Link>
            <Link
              to={user ? "/dashboard" : "/register"}
              className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl shadow-lg border border-white/30 transition-colors text-sm uppercase tracking-wider backdrop-blur-sm"
            >
              {user ? "My Dashboard" : "Become a Host"}
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 z-10 text-white/50 text-xs font-semibold uppercase tracking-widest animate-bounce">
          ↓ Explore
        </div>
      </div>

      {/* Features */}
      <div className="bg-slate-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-700 text-center mb-2">
            Why Ceylonify?
          </h2>
          <p className="text-slate-400 text-center text-sm mb-12 font-light">
            Everything you need to discover or share Sri Lankan experiences.
          </p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl shadow p-6 flex flex-col items-start gap-3 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="font-bold text-slate-700 text-sm">{f.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-sky-600 py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          Ready to explore?
        </h2>
        <p className="text-white/70 text-sm mb-8">
          Join thousands of travelers discovering authentic Sri Lankan experiences.
        </p>
        <Link
          to={user ? "/browse" : "/register"}
          className="inline-block px-10 py-3 bg-white text-sky-600 font-bold rounded-xl shadow-lg hover:bg-sky-50 transition-colors text-sm uppercase tracking-wider"
        >
          {user ? "Browse Now" : "Sign Up Free"}
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 py-8 px-6 text-center">
        <div className="text-slate-400 text-xs">
          © {new Date().getFullYear()} Ceylonify · Index 220596H
        </div>
      </footer>
    </div>
  );
}
