import { Navigate, Route, Routes } from "react-router";
import { GuestRoute, ProtectedRoute } from "./components/RouteGuards";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Map and Upload are filled in by later tasks (F3–F5).
function Placeholder({ title }: { title: string }) {
  return (
    <main className="grid min-h-full place-items-center p-6">
      <h1 className="text-3xl font-bold">{title}</h1>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/map" element={<Placeholder title="Map" />} />
        <Route path="/upload" element={<Placeholder title="Upload" />} />
      </Route>
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}
