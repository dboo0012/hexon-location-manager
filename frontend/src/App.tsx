import { Navigate, Route, Routes } from "react-router";

// Pages are filled in by later tasks (F2–F5); routes are wired here first.
function Placeholder({ title }: { title: string }) {
  return (
    <main className="contours grid min-h-full place-items-center p-6">
      <h1 className="text-3xl font-bold">{title}</h1>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Placeholder title="Sign in" />} />
      <Route path="/register" element={<Placeholder title="Create account" />} />
      <Route path="/map" element={<Placeholder title="Map" />} />
      <Route path="/upload" element={<Placeholder title="Upload" />} />
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}
