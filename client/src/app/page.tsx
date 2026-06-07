"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { API_URL, CATEGORIES, CONDITIONS, INDIA_CITIES, formatINR, Listing, SIZES_BY_CATEGORY } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PlaceholderImage from "@/components/PlaceholderImage";
import ImageWithFallback from "@/components/ImageWithFallback";

export default function Home() {
  const { user, token, toggleWishlist } = useAuth();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("newest");

  // Filter state
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false); // mobile filter panel

  // Fetch listings whenever filters or page change
  const fetchListings = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true);
      setPage(1);
    }
    
    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (selectedCategory) params.set("category", selectedCategory);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (sort) params.set("sort", sort);
      params.set("page", currentPage.toString());
      params.set("limit", "12");

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/listings?${params.toString()}`, {
        headers
      });
      const data = await res.json();
      
      const newListings = Array.isArray(data.listings) ? data.listings : [];
      
      if (isLoadMore) {
        setListings(prev => {
          const existingIds = new Set(prev.map(l => l._id));
          const unique = newListings.filter((l: Listing) => !existingIds.has(l._id));
          return [...prev, ...unique];
        });
        setPage(currentPage);
      } else {
        setListings(newListings);
      }
      
      setTotalPages(data.pages || 1);
    } catch {
      if (!isLoadMore) setListings([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, minPrice, maxPrice, sort, token]);

  useEffect(() => {
    fetchListings(false);
  }, [search, selectedCategory, minPrice, maxPrice, sort]); // refetch on filter change

  const handleConditionChange = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]
    );
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSize(""); // Reset size when category changes
  };

  // Client-side location, condition, and size filter
  const filteredListings = listings.filter((listing) => {
    if (selectedLocation && listing.location !== selectedLocation) return false;
    if (selectedConditions.length > 0 && !selectedConditions.includes(listing.condition)) return false;
    if (selectedSize && listing.size !== selectedSize) return false;
    return true;
  });

  const hasActiveFilters = search || selectedCategory || selectedSize || selectedLocation || selectedConditions.length > 0 || minPrice || maxPrice;

  const clearAllFilters = () => {
    setSearch("");
    setSearchInput("");
    setSelectedCategory("");
    setSelectedSize("");
    setSelectedLocation("");
    setSelectedConditions([]);
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const conditionColors: Record<string, string> = {
    Deadstock: "bg-emerald-600",
    VNDS: "bg-blue-600",
    "Gently Used": "bg-amber-500",
    Worn: "bg-neutral-500",
  };

  const isInWishlist = (id: string) => {
    return user?.wishlist?.includes(id) || false;
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      {/* ── Top Search Bar ──────────────────────────────── */}
      <div className="border-b border-neutral-200 px-4 md:px-6 py-3 bg-white sticky top-[57px] z-20">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="w-full md:flex-1 flex items-center gap-2 border border-neutral-300 focus-within:border-black transition-colors">
            <Search size={16} className="ml-3 text-neutral-400 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search brands, items, categories..."
              className="flex-1 py-2.5 pr-3 text-sm font-mono bg-transparent focus:outline-none placeholder-neutral-400"
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(""); setSearch(""); }} className="px-2 text-neutral-400 hover:text-black">
                <X size={14} />
              </button>
            )}
            <button type="submit" className="bg-black text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors whitespace-nowrap">
              SEARCH
            </button>
          </form>
          
          <div className="w-full md:w-auto flex items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="flex-1 md:w-auto border border-neutral-300 px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-black cursor-pointer bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="most_viewed">Most Viewed</option>
            </select>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-1.5 border border-neutral-300 px-3 py-2.5 text-xs font-mono hover:border-black transition-colors"
            >
              <SlidersHorizontal size={14} />
              {hasActiveFilters ? <span className="w-1.5 h-1.5 rounded-full bg-black"></span> : null}
            </button>
          </div>
        </div>
        
        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2 mt-2">
            {search && (
              <span className="flex items-center gap-1 text-xs font-mono bg-black text-white px-2 py-1">
                "{search}" <button onClick={() => { setSearch(""); setSearchInput(""); }}><X size={10} /></button>
              </span>
            )}
            {selectedCategory && (
              <span className="flex items-center gap-1 text-xs font-mono border border-neutral-300 px-2 py-1">
                {selectedCategory} <button onClick={() => handleCategoryChange("")}><X size={10} /></button>
              </span>
            )}
            {selectedSize && (
              <span className="flex items-center gap-1 text-xs font-mono border border-neutral-300 px-2 py-1">
                Size: {selectedSize} <button onClick={() => setSelectedSize("")}><X size={10} /></button>
              </span>
            )}
            {selectedLocation && (
              <span className="flex items-center gap-1 text-xs font-mono border border-neutral-300 px-2 py-1">
                {selectedLocation} <button onClick={() => setSelectedLocation("")}><X size={10} /></button>
              </span>
            )}
            {selectedConditions.map((c) => (
              <span key={c} className="flex items-center gap-1 text-xs font-mono border border-neutral-300 px-2 py-1">
                {c} <button onClick={() => handleConditionChange(c)}><X size={10} /></button>
              </span>
            ))}
            {(minPrice || maxPrice) && (
              <span className="flex items-center gap-1 text-xs font-mono border border-neutral-300 px-2 py-1">
                ₹{minPrice || "0"} – ₹{maxPrice || "∞"} <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}><X size={10} /></button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-xs font-mono text-neutral-400 hover:text-black underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1">
        {/* ── Sidebar (desktop always visible, mobile conditional) ── */}
        <aside className={`${showFilters ? "block" : "hidden"} md:block w-full md:w-60 lg:w-64 flex-shrink-0 border-r border-neutral-200 bg-white`}>
          <div className="sticky top-[105px] p-5 flex flex-col gap-8 overflow-y-auto max-h-[calc(100vh-105px)]">

            {/* Category */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Category</h3>
              <div className="flex flex-col gap-2">
                <button
                  className={`text-left text-sm transition-colors ${selectedCategory === "" ? "font-bold text-black" : "text-neutral-500 hover:text-black"}`}
                  onClick={() => handleCategoryChange("")}
                >
                  All Categories
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`text-left text-sm transition-colors ${selectedCategory === cat ? "font-bold text-black" : "text-neutral-500 hover:text-black"}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Size (Dynamic based on Category) */}
            {selectedCategory && SIZES_BY_CATEGORY[selectedCategory] && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Size</h3>
                <div className="relative">
                  <select
                    className="w-full appearance-none border border-neutral-300 py-2 px-3 text-sm font-mono focus:outline-none focus:border-black bg-white cursor-pointer"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    <option value="">All Sizes</option>
                    {SIZES_BY_CATEGORY[selectedCategory].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                    <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Price Range */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Price (₹)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onBlur={() => fetchListings(false)}
                  className="w-full border border-neutral-300 p-2 text-sm font-mono focus:outline-none focus:border-black"
                />
                <span className="text-neutral-400 flex-shrink-0">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onBlur={() => fetchListings(false)}
                  className="w-full border border-neutral-300 p-2 text-sm font-mono focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Condition */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Condition</h3>
              <div className="flex flex-col gap-3">
                {CONDITIONS.map((cond) => (
                  <label key={cond} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${selectedConditions.includes(cond) ? "bg-black border-black" : "border-neutral-300 group-hover:border-black"}`}
                      onClick={() => handleConditionChange(cond)}
                    >
                      {selectedConditions.includes(cond) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${conditionColors[cond] || "bg-neutral-400"}`} />
                      <span
                        className={`text-sm transition-colors cursor-pointer ${selectedConditions.includes(cond) ? "text-black font-medium" : "text-neutral-600 group-hover:text-black"}`}
                        onClick={() => handleConditionChange(cond)}
                      >
                        {cond}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">City</h3>
              <div className="relative">
                <select
                  className="w-full appearance-none border border-neutral-300 py-2 px-3 text-sm font-mono focus:outline-none focus:border-black bg-white cursor-pointer"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="">All India</option>
                  {INDIA_CITIES.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                  <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* ── Main Grid ──────────────────────────────────── */}
        <main className="flex-1 bg-white flex flex-col">
          {/* Result count */}
          <div className="px-4 md:px-6 py-3 border-b border-neutral-200 flex items-center justify-between">
            <p className="text-xs font-mono text-neutral-400">
              {loading && page === 1 ? "LOADING..." : `${filteredListings.length} ${filteredListings.length === 1 ? "ITEM" : "ITEMS"}`}
            </p>
          </div>

          {loading && page === 1 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border-b border-r border-neutral-200">
                  <div className="aspect-square bg-neutral-100 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-neutral-100 animate-pulse w-2/3" />
                    <div className="h-3 bg-neutral-100 animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Search size={36} className="text-neutral-300" />
              <div className="text-center">
                <p className="text-sm font-bold uppercase text-neutral-400">No items found</p>
                <p className="text-xs font-mono text-neutral-400 mt-1">Try adjusting your filters</p>
              </div>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-sm font-mono text-neutral-500 hover:text-black underline">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0">
                {filteredListings.map((item) => (
                  <Link
                    key={item._id}
                    href={`/listings/${item._id}`}
                    className="group border-b border-r border-neutral-200 flex flex-col relative bg-white"
                  >
                    {/* Image */}
                    <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
                      <ImageWithFallback
                        src={item.imageUrls?.[0] || ""}
                        alt={item.title}
                        category={item.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />

                      {/* Condition dot */}
                      <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${conditionColors[item.condition] || "bg-neutral-400"}`} title={item.condition} />

                      {/* Price Tag */}
                      <div className="absolute bottom-0 left-0 bg-black text-white px-3 py-1.5 font-mono text-sm leading-none tracking-tight flex items-center gap-2">
                        {formatINR(item.price)}
                        {item.negotiable && <span className="text-[9px] text-neutral-400">OBO</span>}
                      </div>

                      {/* SOLD overlay */}
                      {item.status === "sold" && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                          <span className="text-white font-bold text-lg tracking-widest font-mono border-2 border-white px-3 py-0.5 rotate-[-12deg]">
                            SOLD
                          </span>
                        </div>
                      )}

                      {/* Heart */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (user) toggleWishlist(item._id);
                        }}
                        className={`absolute top-2 right-2 flex items-center justify-center p-1.5 border transition-colors z-10 ${
                          isInWishlist(item._id)
                            ? "bg-black border-black text-white"
                            : "bg-white/80 border-neutral-300 text-neutral-500 hover:text-black hover:border-black"
                        }`}
                        aria-label="Save to wishlist"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isInWishlist(item._id) ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    {/* Card Details */}
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
              
              {/* Pagination Load More */}
              {page < totalPages && (
                <div className="p-8 flex justify-center">
                  <button 
                    onClick={() => fetchListings(true)}
                    disabled={loading}
                    className="border border-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loading ? "LOADING..." : "LOAD MORE"}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
