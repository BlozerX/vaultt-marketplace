"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { UploadCloud, X, ArrowLeft, Check } from "lucide-react";
import { API_URL, CATEGORIES, CONDITIONS, INDIA_CITIES, SIZES_BY_CATEGORY } from "@/lib/api";
import Link from "next/link";

export default function CreateListing() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    category: "",
    size: "",
    condition: "Deadstock",
    location: "",
    price: "",
    description: "",
    negotiable: false,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear size if category changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, size: "" }));
  }, [formData.category]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const processFiles = (newFiles: File[]) => {
    // Limit to 5 images max
    const combinedFiles = [...files, ...newFiles].slice(0, 5);
    setFiles(combinedFiles);
    
    // Create new previews
    const newPreviews = combinedFiles.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(Array.from(e.target.files));
    }
    // Reset input so same files can be selected again if needed
    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("upload_preset", "vaultt_uploads");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: uploadData }
    );
    if (!res.ok) throw new Error("Failed to upload image");
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one image.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    setIsUploading(true);

    try {
      // Upload all images in parallel
      const imageUrls = await Promise.all(files.map(uploadToCloudinary));
      setIsUploading(false);

      const res = await fetch(`${API_URL}/api/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ...formData, 
          price: Number(formData.price), 
          imageUrls 
        }),
      });

      if (res.status === 401) {
        setError("Your session has expired. Please log out and log back in.");
        setIsUploading(false);
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create listing");

      router.push(`/listings/${data._id}`);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full border border-neutral-300 p-3 bg-white text-sm font-mono focus:outline-none focus:border-black transition-colors cursor-pointer";
  const labelClass = "block text-xs font-bold uppercase tracking-wider mb-2";

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm font-mono text-neutral-500">You need to be logged in to sell.</p>
        <Link href="/login" className="bg-black text-white text-xs font-bold uppercase tracking-wider px-6 py-3 hover:bg-neutral-800 transition-colors">
          LOGIN
        </Link>
      </div>
    );
  }

  const availableSizes = formData.category ? SIZES_BY_CATEGORY[formData.category] || [] : [];

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 w-full">
      <Link href="/" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-black transition-colors mb-8 font-mono">
        <ArrowLeft size={16} /> BACK
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">Create Listing</h1>
        <p className="text-sm font-mono text-neutral-500 mt-2">List your item on Vaultt.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 mb-8 text-sm font-mono">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">

        {/* Upload */}
        <div>
          <label className={labelClass}>Photos (Up to 5)</label>
          <div
            className={`border border-neutral-300 relative transition-colors min-h-[280px] p-4 ${
              previews.length === 0 ? "hover:border-black cursor-pointer bg-neutral-50 flex items-center justify-center" : "bg-white"
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={(e) => {
              if (previews.length === 0) {
                fileInputRef.current?.click();
              }
            }}
          >
            <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            
            {previews.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square border border-neutral-200">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1 right-1 bg-black text-white p-1 hover:bg-neutral-800 transition-colors shadow-sm"
                      >
                        <X size={14} />
                      </button>
                      {idx === 0 && (
                        <div className="absolute bottom-1 left-1 bg-black text-white text-[10px] font-bold uppercase px-1.5 py-0.5">
                          Cover
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {previews.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="relative aspect-square border border-dashed border-neutral-300 hover:border-black transition-colors flex flex-col items-center justify-center bg-neutral-50"
                    >
                      <UploadCloud size={24} className="text-neutral-400 mb-2" />
                      <span className="text-xs font-mono text-neutral-500">Add Photo</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-neutral-400 font-mono text-right">
                  {previews.length} / 5 photos added
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 pointer-events-none">
                <UploadCloud size={44} strokeWidth={1} className="text-neutral-400" />
                <div className="font-mono text-sm">
                  <span className="font-bold underline">Click to upload</span> or drag and drop
                </div>
                <p className="text-xs text-neutral-400">PNG, JPG, WEBP · max 10MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>Title</label>
          <input required type="text" name="title" value={formData.title} onChange={handleChange} className={inputClass} placeholder="e.g. Supreme Box Logo Hoodie FW23" />
        </div>

        {/* Brand + Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Brand</label>
            <input required type="text" name="brand" value={formData.brand} onChange={handleChange} className={inputClass} placeholder="e.g. Supreme" />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select required name="category" value={formData.category} onChange={handleChange} className={inputClass}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Size + Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Size</label>
            <select 
              required 
              name="size" 
              value={formData.size} 
              onChange={handleChange} 
              className={inputClass}
              disabled={!formData.category}
            >
              <option value="">{formData.category ? "Select size" : "Select category first"}</option>
              {availableSizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Condition</label>
            <select required name="condition" value={formData.condition} onChange={handleChange} className={inputClass}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Location + Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>City</label>
            <select required name="location" value={formData.location} onChange={handleChange} className={inputClass}>
              <option value="">Select your city</option>
              {INDIA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Price (₹)</label>
            <input required type="number" min="1" step="1" name="price" value={formData.price} onChange={handleChange} className={inputClass} placeholder="e.g. 15000" />
            
            <label className="flex items-center gap-2 mt-3 cursor-pointer group">
              <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors ${formData.negotiable ? "bg-black border-black" : "border-neutral-300 group-hover:border-black"}`}>
                {formData.negotiable && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
              <input type="checkbox" name="negotiable" checked={formData.negotiable} onChange={handleChange} className="hidden" />
              <span className="text-xs font-mono text-neutral-600 group-hover:text-black">Open to offers (Negotiable)</span>
            </label>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea required name="description" value={formData.description} onChange={handleChange} rows={5} className={inputClass} placeholder="Describe the item honestly — condition details, measurements, what's included, how you got it..." />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-4"
        >
          {isUploading ? "UPLOADING PHOTOS..." : isSubmitting ? "PUBLISHING..." : "PUBLISH LISTING"}
        </button>
      </form>
    </div>
  );
}
