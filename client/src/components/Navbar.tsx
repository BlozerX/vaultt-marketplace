"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, LogOut, Plus, Heart, MessageSquare } from "lucide-react";
import Avatar from "./Avatar";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-[#FCFCFC] text-neutral-900 sticky top-0 z-30">
      {/* Animated Marquee Logo */}
      <Link href="/" className="block w-36 overflow-hidden relative group flex-shrink-0">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="font-bold tracking-tight text-lg px-2 select-none">
              VAULTT //
            </span>
          ))}
        </div>
      </Link>

      {/* Right nav items */}
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/wishlist" className="text-neutral-500 hover:text-black transition-colors" title="Wishlist">
              <Heart size={18} />
            </Link>
            <Link href="/inbox" className="text-neutral-500 hover:text-black transition-colors" title="Inbox">
              <MessageSquare size={18} />
            </Link>

            {/* Sell button */}
            <Link
              href="/create"
              className="hidden sm:flex items-center gap-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider px-4 py-2 hover:bg-neutral-800 transition-colors"
            >
              <Plus size={13} /> SELL
            </Link>

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 border border-neutral-200 hover:border-black transition-colors px-3 py-1.5"
              >
                <Avatar src={user.avatar} name={user.name} size="sm" />
                <span className="hidden sm:block text-xs font-mono text-neutral-700 max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-neutral-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-xs font-bold uppercase tracking-wide truncate">{user.name}</p>
                    <p className="text-xs font-mono text-neutral-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-50 transition-colors"
                  >
                    <User size={14} className="text-neutral-500" />
                    <span className="text-xs font-mono uppercase tracking-wider">My Profile</span>
                  </Link>
                  <Link
                    href="/create"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-50 transition-colors sm:hidden"
                  >
                    <Plus size={14} className="text-neutral-500" />
                    <span className="text-xs font-mono uppercase tracking-wider">Sell Item</span>
                  </Link>
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-50 transition-colors border-t border-neutral-100"
                  >
                    <LogOut size={14} className="text-neutral-500" />
                    <span className="text-xs font-mono uppercase tracking-wider">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm hover:text-neutral-600 transition-colors font-mono">
              Login
            </Link>
            <Link
              href="/signup"
              className="font-mono text-xs px-3 py-2 border border-neutral-300 hover:bg-neutral-100 transition-colors uppercase tracking-wider"
            >
              SIGN UP
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
