"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Package, ArrowLeft, Star, MessageSquare } from "lucide-react";
import { API_URL, formatINR } from "@/lib/api";
import Avatar from "@/components/Avatar";
import PlaceholderImage from "@/components/PlaceholderImage";
import ImageWithFallback from "@/components/ImageWithFallback";
import { useAuth } from "@/context/AuthContext";

interface SellerUser {
  _id: string;
  name: string;
  location?: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  rating?: number;
  reviewsCount?: number;
}

interface Listing {
  _id: string;
  title: string;
  brand: string;
  price: number;
  condition: string;
  category: string;
  imageUrls: string[];
  status: string;
  size: string;
  negotiable: boolean;
}

interface Review {
  _id: string;
  rating: number;
  comment: string;
  buyerId: {
    name: string;
    avatar?: string;
  };
  listingId: {
    title: string;
  };
  createdAt: string;
}

export default function SellerProfile() {
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [seller, setSeller] = useState<SellerUser | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    Promise.all([
      fetch(`${API_URL}/api/auth/users/${id}`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/reviews/seller/${id}`).then(r => r.json())
    ])
      .then(([userData, reviewsData]) => {
        if (userData.message) { setError(userData.message); return; }
        setSeller(userData.user);
        setListings(userData.listings || []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setReviewLoading(true);
    setReviewError("");
    try {
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sellerId: id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit review");
      }
      
      setReviewSuccess(true);
      setReviews(prev => [data, ...prev]);
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSuccess(false);
        setReviewRating(5);
        setReviewComment("");
      }, 2000);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-neutral-400 text-sm font-mono">LOADING...</div>
  );
  if (error || !seller) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <p className="text-neutral-500 font-mono text-sm">SELLER NOT FOUND</p>
      <Link href="/" className="text-sm underline text-neutral-600">← Back to Vault</Link>
    </div>
  );

  const memberSince = new Date(seller.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const hasReviews = reviews.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 w-full">
      <Link href="/" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-black transition-colors mb-8 font-mono">
        <ArrowLeft size={16} /> BACK TO VAULT
      </Link>

      {/* Seller Header */}
      <div className="border border-neutral-200 p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <Avatar src={seller.avatar} name={seller.name} size="xl" />
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-3">
              {seller.name}
              {seller.rating && seller.rating > 0 ? (
                <span className="flex items-center gap-1 text-sm font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  <Star size={14} className="fill-current" /> {seller.rating.toFixed(1)} ({seller.reviewsCount})
                </span>
              ) : null}
            </h1>
            {seller.location && (
              <p className="flex items-center gap-1.5 text-sm text-neutral-500 mt-1 font-mono">
                <MapPin size={13} /> {seller.location}
              </p>
            )}
            {seller.bio && (
              <p className="text-sm text-neutral-600 mt-3 max-w-lg">{seller.bio}</p>
            )}
            <p className="text-xs text-neutral-400 font-mono mt-3">Member since {memberSince}</p>
          </div>
          
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="text-center border border-neutral-200 px-6 py-3">
              <p className="text-2xl font-bold font-mono">{listings.length}</p>
              <p className="text-xs text-neutral-400 uppercase tracking-widest">Listings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 mb-6">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'listings' ? 'border-b-2 border-black text-black' : 'text-neutral-500 hover:text-black'
          }`}
        >
          Active Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
            activeTab === 'reviews' ? 'border-b-2 border-black text-black' : 'text-neutral-500 hover:text-black'
          }`}
        >
          Reviews {hasReviews && <span className="bg-neutral-100 px-2 py-0.5 text-xs font-mono">{reviews.length}</span>}
        </button>
      </div>

      {activeTab === 'reviews' && (
        <div className="flex justify-end mb-6">
          <button 
            onClick={() => setShowReviewModal(true)}
            className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
          >
            Leave a Review
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'listings' ? (
        listings.length === 0 ? (
          <div className="border border-dashed border-neutral-300 flex flex-col items-center justify-center py-20 gap-3">
            <Package size={36} className="text-neutral-300" />
            <p className="text-sm text-neutral-400 uppercase tracking-widest">No active listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-neutral-200">
            {listings.map((item) => (
              <Link key={item._id} href={`/listings/${item._id}`} className="group border-b border-r border-neutral-200 flex flex-col relative bg-white">
                <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                  <ImageWithFallback
                    src={item.imageUrls?.[0] || ""}
                    alt={item.title}
                    category={item.category}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-0 left-0 bg-black text-white px-3 py-1.5 font-mono text-sm tracking-tight flex items-center gap-2">
                    {formatINR(item.price)}
                    {item.negotiable && <span className="text-[9px] text-neutral-400">OBO</span>}
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-0.5">
                  <h4 className="font-bold uppercase text-black text-xs tracking-wide truncate">{item.brand}</h4>
                  <p className="text-xs text-neutral-600 truncate">{item.title}</p>
                  <p className="font-mono text-xs text-neutral-400 mt-1">{item.size} · {item.condition}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        reviews.length === 0 ? (
          <div className="border border-dashed border-neutral-300 flex flex-col items-center justify-center py-20 gap-3 bg-neutral-50">
            <MessageSquare size={36} className="text-neutral-300" />
            <p className="text-sm text-neutral-400 uppercase tracking-widest">No reviews yet</p>
            <p className="text-xs text-neutral-500 font-mono">This seller hasn't received any feedback.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <div key={review._id} className="border border-neutral-200 p-5 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={review.buyerId.avatar} name={review.buyerId.name} size="sm" />
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wide">{review.buyerId.name}</p>
                      <p className="text-xs font-mono text-neutral-500 mt-0.5">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={14} 
                        className={star <= review.rating ? "text-black fill-current" : "text-neutral-300"} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed">"{review.comment}"</p>
                {review.listingId && (
                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-2 text-xs font-mono text-neutral-500">
                    <Package size={12} /> Purchased: {review.listingId.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors">
              <span className="sr-only">Close</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-xl font-bold uppercase tracking-tighter mb-1">Leave a Review</h2>
            <p className="text-xs font-mono text-neutral-500 mb-6">Rate your experience with {seller.name}. You must have an accepted offer with them.</p>

            {reviewSuccess ? (
              <div className="bg-green-50 text-green-700 p-4 border border-green-200 text-sm font-mono flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Review submitted successfully!
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {reviewError && (
                  <div className="bg-red-50 text-red-600 p-3 border border-red-200 text-xs font-mono">{reviewError}</div>
                )}
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        type="button" 
                        onClick={() => setReviewRating(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star size={24} className={star <= reviewRating ? "text-black fill-current" : "text-neutral-300"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="review-comment" className="block text-xs font-bold uppercase tracking-wider mb-2">Comment</label>
                  <textarea 
                    id="review-comment"
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    className="w-full border border-neutral-300 p-3 bg-white text-sm font-mono focus:outline-none focus:border-black transition-colors"
                    placeholder="Describe your transaction experience..."
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={reviewLoading || !reviewComment.trim()} 
                  className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 hover:bg-neutral-800 transition-colors disabled:opacity-50 text-sm mt-4"
                >
                  {reviewLoading ? "SUBMITTING..." : "SUBMIT REVIEW"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
