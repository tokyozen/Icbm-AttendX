export default function CheckInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#0F1E35" }}
    >
      <style>{`
        @keyframes blobDrift {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(-20px, 30px) scale(1.1); }
          66%  { transform: translate(20px, -15px) scale(0.92); }
          100% { transform: translate(-10px, 10px) scale(1.06); }
        }
      `}</style>

      {/* Teal blob — top right */}
      <div
        style={{
          position: "absolute",
          top: "-80px",
          right: "-60px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(14,124,123,0.9), rgba(14,124,123,0))",
          filter: "blur(48px)",
          zIndex: 0,
          pointerEvents: "none",
          animation: "blobDrift 16s ease-in-out infinite alternate",
        }}
      />

      {/* Gold blob — bottom left */}
      <div
        style={{
          position: "absolute",
          bottom: "-60px",
          left: "-60px",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,146,42,0.85), rgba(201,146,42,0))",
          filter: "blur(42px)",
          zIndex: 0,
          pointerEvents: "none",
          animation: "blobDrift 21s ease-in-out infinite alternate",
          animationDelay: "-8s",
        }}
      />

      {/* Small teal blob — center */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "40%",
          width: "160px",
          height: "160px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(14,124,123,0.55), rgba(14,124,123,0))",
          filter: "blur(36px)",
          zIndex: 0,
          pointerEvents: "none",
          animation: "blobDrift 26s ease-in-out infinite alternate",
          animationDelay: "-14s",
        }}
      />

      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}
