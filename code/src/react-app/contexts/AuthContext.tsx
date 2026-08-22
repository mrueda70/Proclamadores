import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  authenticated: boolean;
  role: "user" | "admin" | null;
  isLoading: boolean;
  loginAsUser: () => Promise<void>;
  loginAsAdmin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper functions for token management
const getToken = () => localStorage.getItem("auth_token");
const setToken = (token: string) => localStorage.setItem("auth_token", token);
const removeToken = () => localStorage.removeItem("auth_token");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    const token = getToken();
    if (!token) {
      setAuthenticated(false);
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/session", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setAuthenticated(data.authenticated);
      setRole(data.role);
      
      if (!data.authenticated) {
        removeToken();
      }
    } catch (error) {
      console.error("Error checking session:", error);
      setAuthenticated(false);
      setRole(null);
      removeToken();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const loginAsUser = async () => {
    try {
      const response = await fetch("/api/auth/user-login", {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        setToken(data.token);
        setAuthenticated(true);
        setRole("user");
      }
    } catch (error) {
      console.error("Error logging in as user:", error);
      throw error;
    }
  };

  const loginAsAdmin = async (pin: string) => {
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        setToken(data.token);
        setAuthenticated(true);
        setRole("admin");
        return { success: true };
      } else {
        return { success: false, error: data.error || "PIN incorrecto" };
      }
    } catch (error) {
      console.error("Error logging in as admin:", error);
      return { success: false, error: "Error de conexión" };
    }
  };

  const logout = async () => {
    const token = getToken();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      removeToken();
      setAuthenticated(false);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        role,
        isLoading,
        loginAsUser,
        loginAsAdmin,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
