"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { API_URL, formatINR, Listing } from "@/lib/api";
import PlaceholderImage from "@/components/PlaceholderImage";
import ImageWithFallback from "@/components/ImageWithFallback";

export default function WishlistPage() {
  const { user, token, toggleWishlist } = useAuth();
  const router = useRouter();

  const [wishlistItems, setWishlistItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${API_URL}/api/auth/wishlist`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setWishlistItems(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, router, user?.wishlist]); // Re-fetch when user.wishlist changes (e.g. they removed an item)

  const conditionColors: Record<string, string> = {
    Deadstock: "bg-emerald-600",
    VNDS: "bg-blue-600",
    "Gently Used": "bg-amber-500",
    Worn: "bg-neutral-500",
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full min-h-screen">
      <div className="mb-8 flex items-center gap-3">
        <Heart className="text-red-500 fill-current" size={28} />
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tighter">Your Wishlist</h1>
          <p className="text-sm font-mono text-neutral-500 mt-1">Items you're keeping an eye on.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-neutral-200">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border-b border-r border-neutral-200">
              <div className="aspect-square bg-neutral-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-neutral-100 animate-pulse w-2/3" />
                <div className="h-3 bg-neutral-100 animate-pulse w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-neutral-300 bg-neutral-50">
          <Heart size={36} className="text-neutral-300" />
          <div className="text-center">
            <p className="text-sm font-bold uppercase text-neutral-400">Wishlist is empty</p>
            <p className="text-xs font-mono text-neutral-400 mt-1">Start saving items you like.</p>
          </div>
          <Link href="/" className="mt-2 text-sm font-mono text-black underline uppercase tracking-wider font-bold">
            Explore Vaultt
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-neutral-200">
          {wishlistItems.map((item) => (
            <Link
              key={item._id}
              href={`/listings/${item._id}`}
              className="group border-b border-r border-neutral-200 flex flex-col relative bg-white"
            >
              <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                <ImageWithFallback
                  src={item.imageUrls?.[0] || ""}
                  alt={item.title}
                  category={item.category}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${conditionColors[item.condition] || "bg-neutral-400"}`} title={item.condition} />

                <div className="absolute bottom-0 left-0 bg-black text-white px-3 py-1.5 font-mono text-sm leading-none tracking-tight flex items-center gap-2">
                  {formatINR(item.price)}
                  {item.negotiable && <span className="text-[9px] text-neutral-400">OBO</span>}
                </div>

                {item.status === "sold" && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white font-bold text-lg tracking-widest font-mono border-2 border-white px-3 py-0.5 rotate-[-12deg]">
                      SOLD
                    </span>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(item._id);
                  }}
                  className={`absolute top-2 right-2 flex items-center justify-center p-1.5 border transition-colors z-10 bg-black border-black text-white`}
                  aria-label="Remove from wishlist"
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>

              <div className="p-3 flex flex-col gap-0.5">
                <h4 className="font-bold uppercase text-black text-xs tracking-wide truncate leading-tight">
                  {item.brand}
                </h4>
                <p className="text-xs text-neutral-600 truncate">{item.title}</p>
                <div className="mt-1.5 font-mono text-xs text-neutral-400 flex items-center gap-1.5 uppercase">
                  <span>{item.size}</span>
                  <span className="text-neutral-200">·</span>
                  <span>{item.location}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
