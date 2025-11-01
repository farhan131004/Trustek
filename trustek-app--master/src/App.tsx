import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// --- Import all page components ---
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import FakeNewsDetection from "./pages/fake-news-detection";
import WebsiteScannerPage from "./pages/Websitescanner";
import ReviewAnalyzer from "./pages/ReviewAnalyzer";
import NotFound from "./pages/NotFound";

// --- Protected Route Wrapper ---
const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        Checking authentication...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{element}</>;
};

// --- Main App Routes ---
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={<ProtectedRoute element={<Dashboard />} />}
      />
      <Route
        path="/fake-news-detection"
        element={<ProtectedRoute element={<FakeNewsDetection />} />}
      />
      <Route
        path="/website-scanner"
        element={<ProtectedRoute element={<WebsiteScannerPage />} />}
      />
      <Route
        path="/review-analyzer"
        element={<ProtectedRoute element={<ReviewAnalyzer />} />}
      />

      {/* Coming Soon Pages */}
      <Route
        path="/about"
        element={
          <ProtectedRoute
            element={<NotFound title="About Us Coming Soon" />}
          />
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute
            element={<NotFound title="Meet the Team Coming Soon" />}
          />
        }
      />
      <Route
        path="/feedback"
        element={
          <ProtectedRoute
            element={<NotFound title="Feedback Forum Coming Soon" />}
          />
        }
      />
      <Route
        path="/faqs"
        element={
          <ProtectedRoute
            element={<NotFound title="Website FAQs Coming Soon" />}
          />
        }
      />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// --- App Wrapper with Router and AuthProvider ---
const App = () => (
  <Router>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </Router>
);

export default App;
