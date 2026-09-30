import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { AlertCircle } from 'lucide-react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Locations from './pages/Locations';
import Dormitories from './pages/Dormitories';
import Planning from './pages/Planning';
import Weapons from './pages/Weapons';
import Vehicles from './pages/Vehicles';
import Maintenance from './pages/Maintenance';
import Projects from './pages/Projects';
import People from './pages/People';
import Reports from './pages/Reports';
import History from './pages/History';
import Notifications from './pages/Notifications';
import Users from './pages/Users';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100">
          <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase mb-2">Acceso Denegado</h2>
          <p className="text-sm text-slate-500 mb-6 font-medium">No se encontró un perfil de usuario asociado a esta cuenta en el sistema.</p>
          <button 
            onClick={async () => {
              await signOut();
              window.location.href = '/login';
            }}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
          >
            Cerrar sesión y volver
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="locations" element={<Locations />} />
        <Route path="dormitories" element={<Dormitories />} />
        <Route path="planning" element={<Planning />} />
        <Route path="weapons" element={<Weapons />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="projects" element={<Projects />} />
        <Route path="people" element={<People />} />
        <Route path="reports" element={<Reports />} />
        <Route path="history" element={<History />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="users" element={<Users />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
