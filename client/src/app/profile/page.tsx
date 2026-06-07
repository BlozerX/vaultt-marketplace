"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit2, Plus, MapPin, Package, CheckCircle, X, Trash2, Tag, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_URL, formatINR, Listing } from "@/lib/api";
import { INDIA_CITIES } from "@/lib/api";
import Avatar from "@/components/Avatar";
import PlaceholderImage from "@/components/PlaceholderImage";
import ImageWithFallback from "@/components/ImageWithFallback";

export default function ProfilePage() {
  const { user, token, updateUser, isLoading } = useAuth();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", location: "", phone: "", avatar: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setProfileForm({ 
        name: user.name || "", 
        bio: user.bio || "", 
        location: user.location || "",
        phone: user.phone || "",
        avatar: user.avatar || ""
      });
      setAvatarPreview(user.avatar || null);
      fetchListings();
    }
  }, [user]);

  const fetchListings = async () => {
    if (!user) return;
    setListingsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/listings/user/${user._id || user.id}`);
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setAvatarFile(f);
      setAvatarPreview(URL.createObjectURL(f));
    }
  };

  const uploadAvatarToCloudinary = async (): Promise<string> => {
    if (!avatarFile) return profileForm.avatar;
    const uploadData = new FormData();
    uploadData.append("file", avatarFile);
    uploadData.append("upload_preset", "vaultt_uploads");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: uploadData }
    );
    if (!res.ok) throw new Error("Failed to upload avatar");
    const data = await res.json();
    return data.secure_url;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    setProfileError("");
    try {
      const uploadedAvatarUrl = await uploadAvatarToCloudinary();

      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...profileForm, avatar: uploadedAvatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      
      updateUser({ ...user!, name: data.name, bio: data.bio, location: data.location, phone: data.phone, avatar: data.avatar });
      setEditMode(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMarkSold = async (listingId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/listings/${listingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "sold" }),
      });
      if (!res.ok) throw new Error("Failed to mark as sold");
      setListings((prev) =>
        prev.map((l) => (l._id === listingId ? { ...l, status: "sold" } : l))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/listings/${listingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setListings((prev) => prev.filter((l) => l._id !== listingId));
      setDeletingId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-96 text-neutral-400 text-sm font-mono">
        LOADING...
      </div>
    );
  }

  const activeListings = listings.filter((l) => l.status === "active");
  const soldListings = listings.filter((l) => l.status === "sold");

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 w-full">
      {/* Profile Header */}
      <div className="border border-neutral-200 p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          {editMode ? (
            <div 
              className="relative w-24 h-24 group cursor-pointer border border-neutral-200 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar src={avatarPreview || undefined} name={profileForm.name} size="xl" className="w-full h-full" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={24} />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
              />
            </div>
          ) : (
            <Avatar src={user.avatar} name={user.name} size="xl" />
          )}

          {/* Info */}
          {editMode ? (
            <form onSubmit={handleSaveProfile} className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Name</label>
                  <input
                    required
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full border border-neutral-300 p-2.5 text-sm font-mono focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+91..."
                    className="w-full border border-neutral-300 p-2.5 text-sm font-mono focus:outline-none focus:border-black"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">Location</label>
                  <select
                    value={profileForm.location}
                    onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full border border-neutral-300 p-2.5 text-sm font-mono focus:outline-none focus:border-black bg-white"
                  >
                    <option value="">Select city</option>
                    {INDIA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">Bio</label>
                <textarea
                  rows={2}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell buyers a bit about yourself..."
                  className="w-full border border-neutral-300 p-2.5 text-sm font-mono focus:outline-none focus:border-black resize-none"
                />
              </div>
              {profileError && (
                <p className="text-red-600 text-xs font-mono">{profileError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-black text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {savingProfile ? "SAVING..." : "SAVE"}
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setEditMode(false); 
                    setProfileError(""); 
                    setAvatarFile(null);
                    setAvatarPreview(user.avatar || null);
                  }}
                  className="border border-neutral-300 text-xs font-bold uppercase tracking-wider px-5 py-2.5 hover:bg-neutral-50 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold uppercase tracking-tight">{user.name}</h1>
                  <p className="text-sm text-neutral-500 font-mono mt-0.5">{user.email}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {user.location && (
                      <p className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
                        <MapPin size={12} /> {user.location}
                      </p>
                    )}
                    {user.phone && (
                      <p className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
                        Phone: {user.phone}
                      </p>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-sm text-neutral-600 mt-2 max-w-md">{user.bio}</p>
                  )}
                  {!user.bio && !user.location && (
                    <p className="text-sm text-neutral-400 mt-2 italic">No bio yet. Add one to build trust with buyers.</p>
                  )}
                </div>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 text-xs font-mono text-neutral-500 border border-neutral-200 px-3 py-2 hover:border-black hover:text-black transition-colors flex-shrink-0"
                >
                  <Edit2 size={12} /> EDIT PROFILE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 border-t border-neutral-200 mt-6 pt-5 gap-0">
          <div className="text-center pr-4 border-r border-neutral-200">
            <p className="text-2xl font-bold font-mono">{listings.length}</p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest mt-0.5">Total</p>
          </div>
          <div className="text-center px-4 border-r border-neutral-200">
            <p className="text-2xl font-bold font-mono">{activeListings.length}</p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest mt-0.5">Active</p>
          </div>
          <div className="text-center pl-4">
            <p className="text-2xl font-bold font-mono">{soldListings.length}</p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest mt-0.5">Sold</p>
          </div>
        </div>
      </div>

      {profileSaved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 mb-6 text-sm font-mono">
          <CheckCircle size={16} /> Profile updated successfully.
        </div>
      )}

      {/* Listings Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
          My Listings ({listings.length})
        </h2>
        <Link
          href="/create"
          className="flex items-center gap-2 bg-black text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 hover:bg-neutral-800 transition-colors"
        >
          <Plus size={14} /> NEW LISTING
        </Link>
      </div>

      {listingsLoading ? (
        <div className="flex items-center justify-center h-32 text-neutral-400 text-sm font-mono">
          LOADING LISTINGS...
        </div>
      ) : listings.length === 0 ? (
        <div className="border border-dashed border-neutral-300 flex flex-col items-center justify-center py-20 gap-4">
          <Package size={36} className="text-neutral-300" />
          <div className="text-center">
            <p className="text-sm font-bold uppercase text-neutral-400">No listings yet</p>
            <p className="text-xs text-neutral-400 font-mono mt-1">Start selling by creating your first listing.</p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 bg-black text-white text-xs font-bold uppercase tracking-wider px-5 py-3 hover:bg-neutral-800 transition-colors"
          >
            <Plus size={13} /> CREATE LISTING
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
          {listings.map((item) => (
            <div key={item._id} className="group border-b border-r border-neutral-200 relative bg-white flex flex-col">
              {/* Image */}
              <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                <ImageWithFallback
                  src={item.imageUrls?.[0] || ""}
                  alt={item.title}
                  category={item.category}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Price tag */}
                <div className="absolute bottom-0 left-0 bg-black text-white px-3 py-1.5 font-mono text-sm tracking-tight flex items-center gap-2">
                  {formatINR(item.price)}
                  {item.negotiable && <span className="text-[9px] text-neutral-400">OBO</span>}
                </div>
                {/* SOLD overlay */}
                {item.status === "sold" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg tracking-widest font-mono border-2 border-white px-3 py-1 rotate-[-12deg]">
                      SOLD
                    </span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <h4 className="font-bold uppercase text-black text-xs tracking-wide truncate">{item.brand}</h4>
                <p className="text-xs text-neutral-600 truncate">{item.title}</p>
                <div className="font-mono text-xs text-neutral-500 flex items-center gap-1 mt-auto pt-1">
                  <Tag size={9} /> {item.size}
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 border-t border-neutral-200">
                <Link
                  href={`/listings/${item._id}`}
                  className="text-center text-xs font-mono text-neutral-500 py-2 hover:text-black hover:bg-neutral-50 transition-colors border-r border-neutral-200"
                >
                  VIEW
                </Link>
                <Link
                  href={`/listings/${item._id}/edit`}
                  className="text-center text-xs font-mono text-neutral-500 py-2 hover:text-black hover:bg-neutral-50 transition-colors border-r border-neutral-200"
                >
                  EDIT
                </Link>
                {item.status === "active" ? (
                  <button
                    onClick={() => handleMarkSold(item._id)}
                    className="text-center text-xs font-mono text-emerald-600 py-2 hover:bg-emerald-50 transition-colors"
                  >
                    SOLD
                  </button>
                ) : (
                  <button
                    onClick={() => setDeletingId(item._id)}
                    className="text-center text-xs font-mono text-red-500 py-2 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-6">
            <h3 className="font-bold uppercase text-sm mb-2">Delete Listing?</h3>
            <p className="text-sm text-neutral-500 font-mono mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
               <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 bg-red-600 text-white text-xs font-bold uppercase tracking-wider py-3 hover:bg-red-700 transition-colors"
              >
                DELETE
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 border border-neutral-300 text-xs font-bold uppercase tracking-wider py-3 hover:bg-neutral-50 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
