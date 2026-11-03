import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { GuestRoute, ProtectedRoute } from "./components/RouteGuards";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import RegisterPage from "./pages/RegisterPage";

// Upload is filled in by task F5.
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
        <Route element={<AppLayout />}>
          <Route path="/map" element={<MapPage />} />
          <Route path="/upload" element={<Placeholder title="Upload" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}
