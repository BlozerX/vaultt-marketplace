"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Share2, MapPin, Tag, Package, ArrowLeft, X, CheckCircle, AlertTriangle, Eye, Star, Flag } from "lucide-react";
import { API_URL, formatINR, Listing } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PlaceholderImage from "@/components/PlaceholderImage";
import Avatar from "@/components/Avatar";
import ImageWithFallback from "@/components/ImageWithFallback";


export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, toggleWishlist } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [sellerRating, setSellerRating] = useState(0);
  const [sellerReviewsCount, setSellerReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Image Carousel state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState("");

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  // Copy link state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Fetch Listing
    fetch(`${API_URL}/api/listings/${id}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          setError(data.message);
        } else {
          setListing(data);
          // Fetch related listings
          fetch(`${API_URL}/api/listings/${id}/related`, { headers })
            .then(r => r.json())
            .then(related => setRelatedListings(Array.isArray(related) ? related : []))
            .catch(console.error);
            
          // Fetch seller info to get rating
          if (data.sellerId && typeof data.sellerId === 'object' && '_id' in data.sellerId) {
            fetch(`${API_URL}/api/auth/users/${data.sellerId._id}`, { headers })
              .then(r => r.json())
              .then(sellerData => {
                if (sellerData.user) {
                  setSellerRating(sellerData.user.rating || 0);
                  setSellerReviewsCount(sellerData.user.reviewsCount || 0);
                }
              })
              .catch(console.error);
          }
        }
      })
      .catch(() => setError("Failed to load listing"))
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      router.push("/login");
      return;
    }
    setOfferLoading(true);
    setOfferError("");
    try {
      const res = await fetch(`${API_URL}/api/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: id,
          offerPrice: Number(offerPrice),
          message: offerMessage,
        }),
      });

      if (res.status === 401) {
        setOfferError("Your session has expired. Please log out and log back in.");
        setOfferLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send offer");
      setOfferSuccess(true);
      setOfferPrice("");
      setOfferMessage("");
    } catch (err: any) {
      setOfferError(err.message);
    } finally {
      setOfferLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      router.push("/login");
      return;
    }
    setReportLoading(true);
    setReportError("");
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: id,
          reason: reportReason,
          description: reportDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit report");
      setReportSuccess(true);
    } catch (err: any) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const conditionColor: Record<string, string> = {
    Deadstock: "bg-emerald-50 text-emerald-700 border-emerald-200",
    VNDS: "bg-blue-50 text-blue-700 border-blue-200",
    "Gently Used": "bg-amber-50 text-amber-700 border-amber-200",
    Worn: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  const isInWishlist = (listingId: string) => {
    return user?.wishlist?.includes(listingId) || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-neutral-400 text-sm font-mono">
        LOADING...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-neutral-500 font-mono text-sm">LISTING NOT FOUND</p>
        <Link href="/" className="text-sm underline text-neutral-600">← Back to Vault</Link>
      </div>
    );
  }

  const sellerId = typeof listing.sellerId === 'object' && '_id' in listing.sellerId ? (listing.sellerId as any)._id : listing.sellerId;
  const isOwnListing = user && sellerId && (sellerId === user.id || sellerId === user._id);
  const isSold = listing.status === "sold";
  const seller = listing.sellerId as any; // Cast to access populated fields

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-black transition-colors mb-8 font-mono"
      >
        <ArrowLeft size={16} /> BACK
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 mb-16">
        {/* Left: Image Carousel */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square bg-neutral-100 overflow-hidden w-full">
            <ImageWithFallback
              src={listing.imageUrls?.[activeImageIndex] || ""}
              alt={listing.title}
              category={listing.category}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            
            {isSold && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-3xl tracking-widest font-mono border-4 border-white px-6 py-2 rotate-[-12deg]">
                  SOLD
                </span>
              </div>
            )}
          </div>
          
          {/* Thumbnails */}
          {listing.imageUrls && listing.imageUrls.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {listing.imageUrls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                    activeImageIndex === idx ? "border-black" : "border-transparent hover:border-neutral-300"
                  }`}
                >
                  <ImageWithFallback 
                    src={url} 
                    alt={`${listing.title} thumbnail ${idx + 1}`} 
                    category={listing.category}
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
            </div>
          )}

          {/* Action buttons under image */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (user) toggleWishlist(listing._id);
                  else router.push("/login");
                }}
                className={`flex items-center gap-2 px-4 py-2 border text-sm font-mono transition-colors ${
                  isInWishlist(listing._id)
                    ? "bg-black text-white border-black"
                    : "border-neutral-300 text-neutral-600 hover:border-black hover:text-black"
                }`}
              >
                <Heart size={15} className={isInWishlist(listing._id) ? "fill-current" : ""} />
                {isInWishlist(listing._id) ? "SAVED" : "SAVE"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-sm font-mono text-neutral-600 hover:border-black hover:text-black transition-colors"
              >
                <Share2 size={15} />
                {copied ? "COPIED!" : "SHARE"}
              </button>
            </div>
            
            <button 
              onClick={() => setShowReportModal(true)}
              className="text-xs font-mono text-neutral-400 hover:text-black flex items-center gap-1 transition-colors"
            >
              <Flag size={12} /> REPORT
            </button>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex flex-col">
          {/* Brand + Category */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              {listing.category}
            </span>
            <span className="text-neutral-200">|</span>
            <span
              className={`text-xs font-mono px-2 py-0.5 border ${conditionColor[listing.condition] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}
            >
              {listing.condition}
            </span>
          </div>

          <h1 className="text-2xl font-bold uppercase tracking-tight leading-tight mb-1">
            {listing.brand}
          </h1>
          <p className="text-lg text-neutral-700 mb-6">{listing.title}</p>

          {/* Price */}
          <div className="flex items-end gap-3 mb-6">
            <div className="text-4xl font-bold font-mono leading-none">
              {formatINR(listing.price)}
            </div>
            {listing.negotiable && (
              <div className="text-xs font-mono text-neutral-500 border border-neutral-300 px-2 py-1 uppercase mb-1">
                OBO / Negotiable
              </div>
            )}
          </div>

          {/* Meta tags */}
          <div className="flex flex-wrap gap-3 mb-8">
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 border border-neutral-200 px-3 py-1.5">
              <Tag size={12} /> SIZE {listing.size}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 border border-neutral-200 px-3 py-1.5">
              <MapPin size={12} /> {listing.location}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 border border-neutral-200 px-3 py-1.5">
              <Eye size={12} /> {listing.views} VIEWS
            </div>
          </div>

          {/* CTA */}
          {!isOwnListing && !isSold && (
            <button
              onClick={() => setShowOfferModal(true)}
              className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 hover:bg-neutral-800 transition-colors text-sm mb-3"
            >
              MAKE AN OFFER
            </button>
          )}
          {isOwnListing && (
            <div className="flex gap-3 mb-3">
              <Link
                href={`/listings/${listing._id}/edit`}
                className="flex-1 text-center border border-black text-black font-bold uppercase tracking-wider py-3 hover:bg-black hover:text-white transition-colors text-sm"
              >
                EDIT LISTING
              </Link>
            </div>
          )}
          {isSold && (
            <div className="w-full border border-neutral-200 text-neutral-400 font-bold uppercase tracking-wider py-4 text-center text-sm mb-3">
              THIS ITEM HAS BEEN SOLD
            </div>
          )}

          {/* Description */}
          <div className="border-t border-neutral-200 pt-6 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Description</h3>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          {/* Seller Card */}
          <div className="border border-neutral-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Seller</h3>
            <div className="flex items-center gap-4">
              <Avatar src={seller.avatar} name={seller.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  {seller.name}
                  {sellerReviewsCount > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-mono bg-yellow-100 text-yellow-800 px-1.5 py-0.5 ml-1">
                      <Star size={10} className="fill-current" /> {sellerRating.toFixed(1)} ({sellerReviewsCount})
                    </span>
                  )}
                </p>
                {seller.location && (
                  <p className="text-xs text-neutral-500 font-mono mt-0.5 flex items-center gap-1">
                    <MapPin size={10} /> {seller.location}
                  </p>
                )}
                {seller.bio && (
                  <p className="text-xs text-neutral-500 mt-1 truncate">{seller.bio}</p>
                )}
              </div>
              <Link
                href={`/sellers/${seller._id}`}
                className="text-xs font-mono text-neutral-500 hover:text-black border border-neutral-200 px-3 py-1.5 hover:border-black transition-colors whitespace-nowrap"
              >
                PROFILE
              </Link>
            </div>
          </div>

          {/* Listed date */}
          <p className="text-xs text-neutral-400 font-mono mt-4">
            Listed {new Date(listing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Related Listings Section */}
      {relatedListings.length > 0 && (
        <div className="border-t border-neutral-200 pt-10 mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-black mb-6">
            You might also like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-l border-neutral-200">
            {relatedListings.slice(0, 4).map((item) => (
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
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-0 left-0 bg-black text-white px-3 py-1.5 font-mono text-sm leading-none tracking-tight">
                    {formatINR(item.price)}
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-0.5">
                  <h4 className="font-bold uppercase text-black text-xs tracking-wide truncate">{item.brand}</h4>
                  <p className="text-xs text-neutral-600 truncate">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <div>
                <h2 className="font-bold uppercase tracking-tight text-sm">Make an Offer</h2>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{listing.brand} — {listing.title}</p>
              </div>
              <button
                onClick={() => { setShowOfferModal(false); setOfferSuccess(false); setOfferError(""); }}
                className="p-2 hover:bg-neutral-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {offerSuccess ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <CheckCircle size={48} className="text-emerald-500" />
                  <div>
                    <p className="font-bold uppercase text-sm">Offer Sent!</p>
                    <p className="text-xs text-neutral-500 font-mono mt-1">
                      Check your inbox to track the conversation.
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowOfferModal(false); setOfferSuccess(false); router.push('/inbox'); }}
                    className="text-xs font-mono text-black underline font-bold uppercase tracking-wider mt-2"
                  >
                    Go to Inbox
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOfferSubmit} className="space-y-5">
                  <div className="bg-neutral-50 border border-neutral-200 p-3 flex items-center justify-between">
                    <span className="text-xs text-neutral-500 font-mono">Listed price</span>
                    <span className="font-bold font-mono">{formatINR(listing.price)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                      Your Offer (₹)
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="w-full border border-neutral-300 p-3 text-sm font-mono focus:outline-none focus:border-black transition-colors"
                      placeholder={`e.g. ${Math.round(listing.price * 0.85)}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                      Initial Message
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      className="w-full border border-neutral-300 p-3 text-sm font-mono focus:outline-none focus:border-black transition-colors resize-none"
                      placeholder="Hi, I'm interested in this item. Can you do ₹___?"
                    />
                  </div>

                  {offerError && (
                    <div className="flex items-center gap-2 text-red-600 text-xs font-mono bg-red-50 border border-red-200 p-3">
                      <AlertTriangle size={14} /> {offerError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={offerLoading}
                    className="w-full bg-black text-white font-bold uppercase tracking-wider py-3 hover:bg-neutral-800 transition-colors disabled:opacity-50 text-sm"
                  >
                    {offerLoading ? "SENDING..." : "SEND OFFER"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200">
              <div>
                <h2 className="font-bold uppercase tracking-tight text-sm text-red-600">Report Listing</h2>
              </div>
              <button
                onClick={() => { setShowReportModal(false); setReportSuccess(false); setReportError(""); }}
                className="p-2 hover:bg-neutral-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {reportSuccess ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <CheckCircle size={48} className="text-emerald-500" />
                  <div>
                    <p className="font-bold uppercase text-sm">Report Submitted</p>
                    <p className="text-xs text-neutral-500 font-mono mt-1">
                      Our moderation team will review this listing shortly.
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowReportModal(false); setReportSuccess(false); }}
                    className="text-xs font-mono text-black underline font-bold uppercase tracking-wider mt-2"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                      Reason
                    </label>
                    <select
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full border border-neutral-300 p-3 text-sm font-mono focus:outline-none focus:border-black transition-colors"
                    >
                      <option value="" disabled>Select a reason...</option>
                      <option value="spam">Spam or misleading</option>
                      <option value="inappropriate">Inappropriate content</option>
                      <option value="scam">Suspicious or scam</option>
                      <option value="counterfeit">Counterfeit / Fake item</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                      Additional Details
                    </label>
                    <textarea
                      rows={3}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      className="w-full border border-neutral-300 p-3 text-sm font-mono focus:outline-none focus:border-black transition-colors resize-none"
                      placeholder="Please provide any additional context..."
                    />
                  </div>

                  {reportError && (
                    <div className="flex items-center gap-2 text-red-600 text-xs font-mono bg-red-50 border border-red-200 p-3">
                      <AlertTriangle size={14} /> {reportError}
                    </div>
                  )}

                  {!user && (
                    <div className="text-xs text-neutral-500 font-mono bg-neutral-50 border border-neutral-200 p-3">
                      You need to <Link href="/login" className="underline font-bold">login</Link> to report.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={reportLoading || !user}
                    className="w-full bg-red-600 text-white font-bold uppercase tracking-wider py-3 hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {reportLoading ? "SUBMITTING..." : "SUBMIT REPORT"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
