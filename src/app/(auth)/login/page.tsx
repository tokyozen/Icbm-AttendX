"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ICBM_LOGO_BASE64 } from "@/lib/logo";

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
    <div className="min-h-screen flex" style={{ background: "#0F1E35" }}>
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: "#0F1E35" }}
      >
        <style>{`
          @keyframes blobDrift {
            0%   { transform: translate(0,0) scale(1); }
            33%  { transform: translate(-30px, 40px) scale(1.12); }
            66%  { transform: translate(25px, -20px) scale(0.91); }
            100% { transform: translate(-15px, 15px) scale(1.07); }
          }
        `}</style>

        {/* LARGE Teal blob — top right, bleeds off screen */}
        <div style={{
          position: "absolute", top: "-160px", right: "-140px",
          width: "550px", height: "550px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14,124,123,0.95), rgba(14,124,123,0.3) 50%, rgba(14,124,123,0))",
          filter: "blur(70px)", zIndex: 0, pointerEvents: "none",
          animation: "blobDrift 16s ease-in-out infinite alternate",
        }} />

        {/* LARGE Gold blob — bottom left, bleeds off screen */}
        <div style={{
          position: "absolute", bottom: "-160px", left: "-140px",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,146,42,0.95), rgba(201,146,42,0.3) 50%, rgba(201,146,42,0))",
          filter: "blur(65px)", zIndex: 0, pointerEvents: "none",
          animation: "blobDrift 21s ease-in-out infinite alternate",
          animationDelay: "-8s",
        }} />

        {/* Medium teal blob — center mass, adds depth */}
        <div style={{
          position: "absolute", top: "30%", left: "20%",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14,124,123,0.5), rgba(14,124,123,0))",
          filter: "blur(55px)", zIndex: 0, pointerEvents: "none",
          animation: "blobDrift 26s ease-in-out infinite alternate",
          animationDelay: "-14s",
        }} />

        {/* Liquid glass overlay — sits over blobs, under content */}
        <div style={{
          position: "absolute", inset: 0,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          background: "rgba(15,30,53,0.35)",
          zIndex: 1, pointerEvents: "none",
        }} />

        {/* Subtle glass sheen — top edge highlight */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.03) 100%)",
          zIndex: 1, pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 2 }}
          className="flex flex-col items-center justify-center w-full h-full px-12 text-center">
          <img
            src={ICBM_LOGO_BASE64}
            alt="ICBM"
            style={{
              width: "180px",
              height: "180px",
              objectFit: "contain",
              mixBlendMode: "screen",
              display: "block",
              margin: "0 auto",
            }}
          />
          <h1 style={{
            color: "white",
            fontSize: "4.5rem",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            marginTop: "16px",
            textAlign: "center",
          }}>
            ICBM-AttendX
          </h1>
          <p style={{
            color: "#0E7C7B",
            fontSize: "2rem",
            fontWeight: 700,
            marginTop: "14px",
            textAlign: "center",
            letterSpacing: "0.01em",
          }}>
            Attendance. Simplified.
          </p>
          <p style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "1.25rem",
            fontWeight: 400,
            marginTop: "16px",
            textAlign: "center",
            maxWidth: "320px",
            lineHeight: 1.65,
            margin: "16px auto 0",
          }}>
            QR-powered attendance for modern training programs
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
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
                className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-all duration-200 focus:ring-2"
                style={{
                  borderColor: "#CBD5E0",
                  color: "#0F1E35",
                  // @ts-ignore
                  "--tw-ring-color": "#0E7C7B33",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#0E7C7B";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,124,123,0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#CBD5E0";
                  e.currentTarget.style.boxShadow = "none";
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
                  className="w-full rounded-lg border px-4 py-3 pr-10 text-base outline-none transition-all duration-200"
                  style={{ borderColor: "#CBD5E0", color: "#0F1E35" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0E7C7B";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,124,123,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#CBD5E0";
                    e.currentTarget.style.boxShadow = "none";
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
              className="w-full rounded-lg py-3 text-base font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: loading ? "#0a5a59" : "#0E7C7B" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <a
            href="/register"
            className="w-full flex items-center justify-center px-4 py-3 border-2 border-[#0E7C7B] text-[#0E7C7B] text-sm font-semibold rounded-lg hover:bg-[#0E7C7B] hover:text-white transition-all duration-200"
          >
            Register as Instructor
          </a>

          {/* SBTS footer */}
          <div className="flex flex-col items-center gap-1 mt-8">
            <span className="text-gray-400 text-xs">
              Powered by SBTS Group · © 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
