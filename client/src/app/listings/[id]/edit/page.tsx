"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_URL, CATEGORIES, CONDITIONS, INDIA_CITIES, SIZES_BY_CATEGORY } from "@/lib/api";
import { ArrowLeft, Check, UploadCloud, X } from "lucide-react";
import Link from "next/link";

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
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
    status: "active",
    negotiable: false,
  });

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/listings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message) { setError(data.message); return; }
        // Verify ownership
        if (user && data.sellerId._id !== user.id) {
          router.push("/");
          return;
        }
        setFormData({
          title: data.title || "",
          brand: data.brand || "",
          category: data.category || "",
          size: data.size || "",
          condition: data.condition || "Deadstock",
          location: data.location || "",
          price: String(data.price || ""),
          description: data.description || "",
          status: data.status || "active",
          negotiable: data.negotiable || false,
        });
        setExistingImages(data.imageUrls || (data.imageUrl ? [data.imageUrl] : []));
      })
      .catch(() => setError("Failed to load listing"))
      .finally(() => setLoading(false));
  }, [id, user]);

  // Clear size if category changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setFormData(prev => ({ ...prev, category: newCategory, size: "" }));
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

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const processFiles = (filesToAdd: File[]) => {
    const totalImages = existingImages.length + newFiles.length;
    const remainingSlots = 5 - totalImages;
    
    if (remainingSlots <= 0) return;
    
    const filesToKeep = filesToAdd.slice(0, remainingSlots);
    setNewFiles([...newFiles, ...filesToKeep]);
    setNewPreviews([...newPreviews, ...filesToKeep.map(f => URL.createObjectURL(f))]);
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
    if (e.target) e.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    const newExisting = [...existingImages];
    newExisting.splice(index, 1);
    setExistingImages(newExisting);
  };

  const removeNewFile = (index: number) => {
    const updatedFiles = [...newFiles];
    updatedFiles.splice(index, 1);
    setNewFiles(updatedFiles);
    
    const updatedPreviews = [...newPreviews];
    updatedPreviews.splice(index, 1);
    setNewPreviews(updatedPreviews);
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
    if (!token) { router.push("/login"); return; }
    
    if (existingImages.length === 0 && newFiles.length === 0) {
      setError("Please have at least one image.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // Upload new images
      const newlyUploadedUrls = await Promise.all(newFiles.map(uploadToCloudinary));
      const finalImageUrls = [...existingImages, ...newlyUploadedUrls];

      const res = await fetch(`${API_URL}/api/listings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ...formData, 
          price: Number(formData.price),
          imageUrls: finalImageUrls
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      router.push(`/listings/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/listings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/profile");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const inputClass = "w-full border border-neutral-300 p-3 bg-white text-sm font-mono focus:outline-none focus:border-black transition-colors";
  const labelClass = "block text-xs font-bold uppercase tracking-wider mb-2";

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-neutral-400 text-sm font-mono">LOADING...</div>
  );

  const availableSizes = formData.category ? SIZES_BY_CATEGORY[formData.category] || [] : [];
  const totalImages = existingImages.length + newFiles.length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 w-full">
      <Link href={`/listings/${id}`} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-black transition-colors mb-8 font-mono">
        <ArrowLeft size={16} /> BACK TO LISTING
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">Edit Listing</h1>
        <p className="text-sm font-mono text-neutral-500 mt-2">Update your item details.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 mb-8 text-sm font-mono">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Upload */}
        <div>
          <label className={labelClass}>Photos (Up to 5)</label>
          <div
            className={`border border-neutral-300 relative transition-colors p-4 bg-white`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Existing Images */}
                {existingImages.map((url, idx) => (
                  <div key={`existing-${idx}`} className="relative aspect-square border border-neutral-200">
                    <img src={url} alt={`Existing ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
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

                {/* New Previews */}
                {newPreviews.map((preview, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square border border-neutral-200 border-dashed">
                    <img src={preview} alt={`New Preview ${idx + 1}`} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                      <span className="bg-black text-white text-[10px] font-bold uppercase px-1.5 py-0.5">New</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="absolute top-1 right-1 bg-black text-white p-1 hover:bg-neutral-800 transition-colors shadow-sm pointer-events-auto"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                
                {/* Add Photo Button */}
                {totalImages < 5 && (
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
                {totalImages} / 5 photos added
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Title</label>
          <input required type="text" name="title" value={formData.title} onChange={handleChange} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Brand</label>
            <input required type="text" name="brand" value={formData.brand} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select required name="category" value={formData.category} onChange={handleCategoryChange} className={inputClass}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Location</label>
            <select required name="location" value={formData.location} onChange={handleChange} className={inputClass}>
              <option value="">Select city</option>
              {INDIA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Price (₹)</label>
            <input required type="number" min="0" name="price" value={formData.price} onChange={handleChange} className={inputClass} />
            <label className="flex items-center gap-2 mt-3 cursor-pointer group">
              <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors ${formData.negotiable ? "bg-black border-black" : "border-neutral-300 group-hover:border-black"}`}>
                {formData.negotiable && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
              <input type="checkbox" name="negotiable" checked={formData.negotiable} onChange={handleChange} className="hidden" />
              <span className="text-xs font-mono text-neutral-600 group-hover:text-black">Open to offers (Negotiable)</span>
            </label>
          </div>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
            <option value="active">Active</option>
            <option value="sold">Mark as Sold</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea required name="description" value={formData.description} onChange={handleChange} rows={5} className={inputClass} />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-black text-white font-bold uppercase tracking-wider py-4 hover:bg-neutral-800 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "SAVING..." : "SAVE CHANGES"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-6 py-4 border border-red-300 text-red-600 font-bold uppercase tracking-wider hover:bg-red-50 transition-colors text-sm"
          >
            DELETE
          </button>
        </div>
      </form>
    </div>
  );
}
