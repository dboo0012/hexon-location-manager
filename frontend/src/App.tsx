import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { GuestRoute, ProtectedRoute } from "./components/RouteGuards";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import RegisterPage from "./pages/RegisterPage";
import UploadPage from "./pages/UploadPage";

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
          <Route path="/upload" element={<UploadPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}
