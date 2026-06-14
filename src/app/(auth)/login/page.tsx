"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-12 relative overflow-hidden"
        style={{ backgroundColor: "#0F1E35" }}
      >
        {/* dot-grid background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 text-center max-w-md">
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">
            ICBM-AttendX
          </h1>
          <p className="text-2xl font-semibold mb-4" style={{ color: "#0E7C7B" }}>
            Attendance. Simplified.
          </p>
          <p className="text-base" style={{ color: "#94a3b8" }}>
            QR-powered attendance for modern training programs
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <h1 className="text-3xl font-extrabold" style={{ color: "#0F1E35" }}>
            ICBM-AttendX
          </h1>
          <p className="text-sm mt-1" style={{ color: "#0E7C7B" }}>
            Attendance. Simplified.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#0F1E35" }}>
            Welcome back
          </h2>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F1E35" }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: "#E2E8F0",
                  color: "#0F1E35",
                  // @ts-ignore
                  "--tw-ring-color": "#0E7C7B",
                }}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F1E35" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:ring-2"
                  style={{
                    borderColor: "#E2E8F0",
                    color: "#0F1E35",
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm rounded-lg px-3 py-2.5 bg-red-50 border border-red-200 text-red-600">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: loading ? "#0a5a59" : "#0E7C7B" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-10 text-center text-xs" style={{ color: "#94a3b8" }}>
            SBTS Group © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
