import { createContext, useContext, useEffect, useState } from "react";

type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: replace with real session check, e.g.:
    //   const token = await SecureStore.getItemAsync('session_token')
    //   setIsLoggedIn(!!token)
    const checkSession = async () => {
      try {
        await Promise.resolve(); // yields to allow the first render to paint
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        signIn: () => setIsLoggedIn(true),
        signOut: () => setIsLoggedIn(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
