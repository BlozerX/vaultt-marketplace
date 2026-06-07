"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const { login, user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (user || token)) {
      router.push("/");
    }
  }, [user, token, authLoading, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid credentials");
      login(data.token, {
        id: data._id,
        _id: data._id,
        name: data.name,
        email: data.email,
        bio: data.bio,
        location: data.location,
        avatar: data.avatar,
        phone: data.phone,
        wishlist: data.wishlist || [],
      });
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full border border-neutral-300 p-3 bg-white text-sm font-mono focus:outline-none focus:border-black transition-colors";
  const labelClass = "block text-xs font-bold uppercase tracking-wider mb-2";

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-3xl font-bold uppercase tracking-tighter">Login</h1>
          <p className="text-sm font-mono text-neutral-500 mt-2">Access your vault.</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 mb-6 text-sm font-mono">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="login-email" className={labelClass}>Email</label>
            <input id="login-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@email.com" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="login-password" className={labelClass}>Password</label>
            <input id="login-password" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 hover:bg-neutral-800 transition-colors disabled:opacity-50 text-sm">
            {isLoading ? "AUTHENTICATING..." : "LOGIN"}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-neutral-500">
          No account?{" "}
          <Link href="/signup" className="text-black font-bold uppercase text-xs hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
