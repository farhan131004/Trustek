import React, { useEffect, useState } from "react";
// FIX: Removed unused 'next/router' import which caused warnings.
import { useNavigate } from "react-router-dom"; // Essential for programmatic redirection
import { useAuth } from '@/contexts/AuthContext'; // Must match your context path

// --- DEVELOPMENT FLAG ---
// SET THIS TO TRUE TO BYPASS AUTHENTICATION FOR TESTING DASHBOARD LAYOUT
const IS_DEV_MODE = true; 

// Simple Loading Spinner component
const LoadingSpinner: React.FC = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/90 z-50">
    {/* Use Tailwind classes from your custom design system */}
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
    <p className="mt-4 text-primary font-semibold text-shadow-sm">Checking credentials...</p>
  </div>
);

/**
 * Higher-Order Component (HOC) to protect pages requiring authentication.
 * If the user is not logged in, it redirects them to the /auth page.
 */
const withAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const ComponentWithAuth: React.FC<P> = (props) => {
    // Get user state from the AuthContext
    const { user, isLoading } = useAuth();
    const navigate = useNavigate(); // Hook for programmatic routing
    // Use isChecking to prevent flickering if user state is immediately available but needs checking
    const [isChecking, setIsChecking] = useState(true);
    
    // --- BYPASS CHECK FOR DEVELOPMENT ---
    if (IS_DEV_MODE) {
        if (isChecking) setIsChecking(false);
        return <WrappedComponent {...props} />;
    }
    // ------------------------------------

    useEffect(() => {
      // 1. Wait until the initial auth check is done
      if (!isLoading) {
        if (!user) {
          // 2. If no user, redirect to the authentication page
          // NOTE: Changed path to "/auth" to match our App.tsx routing structure
          navigate("/auth", { replace: true });
        } else {
          // 3. User is logged in
          setIsChecking(false);
        }
      }
    }, [user, isLoading, navigate]);

    // Show loading spinner while checking authentication or redirecting
    if (isLoading || isChecking) {
      return <LoadingSpinner />;
    }

    // User is logged in, render the protected component
    return <WrappedComponent {...props} />;
  };

  // Assign a display name for easier debugging
  ComponentWithAuth.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ComponentWithAuth;
};

export default withAuth;
