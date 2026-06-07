"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_URL } from "@/lib/api";

export interface User {
  id: string;
  _id?: string; // alias for backend compatibility
  name: string;
  email: string;
  bio?: string;
  location?: string;
  avatar?: string;
  phone?: string;
  wishlist?: string[];
  blockedUsers?: string[];
  blockedBy?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  toggleWishlist: (listingId: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = sessionStorage.getItem("token");
    const storedUser = sessionStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem("token", newToken);
    sessionStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev, ...data };
      sessionStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
  };

  const toggleWishlist = async (listingId: string) => {
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/wishlist/${listingId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Token is invalid/expired — force re-login
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        updateUser({ wishlist: data.wishlist });
      }
    } catch (err) {
      console.error("Failed to toggle wishlist", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, toggleWishlist, isLoading }}>
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
