"use client";

import { useState } from "react";
import Link from "next/link";
import { ICBM_LOGO_BASE64 } from "@/lib/logo";
import { LEARNING_TRACKS, TRAINING_LOCATIONS } from "@/types/index";

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  location: string;
  learningTrack: string;
}

const BLANK: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  location: "",
  learningTrack: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(BLANK);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password || !form.learningTrack || !form.location) {
      setError("All fields are required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        location: form.location,
        learningTrack: form.learningTrack,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registration failed. Please try again.");
      return;
    }

    setSuccess(true);
  }

  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#0E7C7B";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14,124,123,0.15)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#CBD5E0";
    e.currentTarget.style.boxShadow = "none";
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F5F6FA" }}>
        <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md w-full text-center" style={{ borderColor: "#E2E8F0" }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "#dcfce7" }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#15803d" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#0F1E35" }}>
            Application Submitted!
          </h2>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>
            Your registration is pending admin approval. You will be notified once your account is approved.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold px-6 py-2.5 rounded-lg text-white"
            style={{ backgroundColor: "#0E7C7B" }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
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
          }}>
            Join the Program
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
            Apply for access to the QR-powered attendance system
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <h1 className="text-3xl font-extrabold" style={{ color: "#0F1E35" }}>
            ICBM-AttendX
          </h1>
          <p className="text-sm mt-1" style={{ color: "#0E7C7B" }}>
            Join the Program
          </p>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#0F1E35" }}>
            Create an account
          </h2>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>
            Submit your application for admin approval
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
                Full Name
              </label>
              <input
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-all duration-200"
                style={{ borderColor: "#CBD5E0", color: "#0F1E35" }}
                onFocus={inputFocus}
                onBlur={inputBlur}
                placeholder="e.g. Amina Bello"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-all duration-200"
                style={{ borderColor: "#CBD5E0", color: "#0F1E35" }}
                onFocus={inputFocus}
                onBlur={inputBlur}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
                Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-all duration-200"
                style={{ borderColor: "#CBD5E0", color: "#0F1E35" }}
                onFocus={inputFocus}
                onBlur={inputBlur}
                placeholder="Min. 8 characters"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
                Confirm Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-all duration-200"
                style={{ borderColor: "#CBD5E0", color: "#0F1E35" }}
                onFocus={inputFocus}
                onBlur={inputBlur}
                placeholder="Re-enter your password"
              />
            </div>

            {/* Learning Track */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
                Learning Track
              </label>
              <select
                value={form.learningTrack}
                onChange={(e) => set("learningTrack", e.target.value)}
                className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-all duration-200"
                style={{ borderColor: "#CBD5E0", color: form.learningTrack ? "#0F1E35" : "#94a3b8" }}
                onFocus={inputFocus}
                onBlur={inputBlur}
              >
                <option value="">Select a track…</option>
                {LEARNING_TRACKS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
                Training Location
              </label>
              <select
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="w-full rounded-lg border px-4 py-3 text-base outline-none transition-all duration-200"
                style={{ borderColor: "#CBD5E0", color: form.location ? "#0F1E35" : "#94a3b8" }}
                onFocus={inputFocus}
                onBlur={inputBlur}
                required
              >
                <option value="" disabled>Select a location...</option>
                {TRAINING_LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2.5 bg-red-50 border border-red-200 text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 text-base font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#0E7C7B" }}
            >
              {loading ? "Submitting…" : "Submit Application"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: "#64748b" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "#0E7C7B" }}>
              Sign in
            </Link>
          </p>

          {/* SBTS footer */}
          <div className="flex flex-col items-center gap-1 mt-6">
            <span className="text-gray-400 text-xs">
              Powered by SBTS Group · © 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
