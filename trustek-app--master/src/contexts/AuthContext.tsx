// hooks/AuthContext.tsx (or lib/AuthContext.tsx)

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// --- Interfaces ---

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  /** Attempts to log in a user. Throws an error on invalid credentials. */
  login: (email: string, password: string) => Promise<void>;
  /** Attempts to sign up a new user. Throws an error if the email already exists. */
  signup: (email: string, password: string, name: string) => Promise<void>;
  /** Logs out the current user. */
  logout: () => void;
  /** True while the initial user session is being checked. */
  isLoading: boolean;
}

// --- Context and Hook ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This runtime check ensures the hook is used inside the provider
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Provider Component ---

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to safely get all users from localStorage
  const getAllUsers = () => {
    try {
      const usersJson = localStorage.getItem('trustek_users');
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (e) {
      console.error("Could not parse trustek_users from localStorage", e);
      return [];
    }
  };

  // 1. Initial Load: Check for stored user session
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('trustek_user');
      if (storedUser) {
        // We only store the User interface (without password) in 'trustek_user'
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to restore user from session.", e);
      localStorage.removeItem('trustek_user'); // Clear corrupted session data
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Login Logic
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const users = getAllUsers();
    
    // Find user by matching both email and (mocked) password
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    
    if (!foundUser) {
      setIsLoading(false);
      throw new Error('Invalid email or password.');
    }

    // Destructure to remove the password before storing in state/session
    const { password: _, ...userWithoutPassword } = foundUser;
    
    setUser(userWithoutPassword);
    localStorage.setItem('trustek_user', JSON.stringify(userWithoutPassword));
    setIsLoading(false);
  };

  // 3. Signup Logic
  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    let users = getAllUsers();
    
    if (users.find((u: any) => u.email === email)) {
      setIsLoading(false);
      throw new Error('An account with this email already exists.');
    }

    const newUserWithPassword = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Unique ID
      email,
      password, // Storing password is for mock only; NEVER do this in production
      name,
    };

    // Store the full user object (including password) in the 'trustek_users' list
    users.push(newUserWithPassword);
    localStorage.setItem('trustek_users', JSON.stringify(users));

    // Set state/session with user data *without* password
    const { password: _, ...newUser } = newUserWithPassword;
    
    setUser(newUser);
    localStorage.setItem('trustek_user', JSON.stringify(newUser));
    setIsLoading(false);
  };

  // 4. Logout Logic
  const logout = () => {
    setUser(null);
    localStorage.removeItem('trustek_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};