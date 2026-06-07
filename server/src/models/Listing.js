import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  brand: { type: String, required: true },
  size: { type: String, required: true },
  price: { type: Number, required: true },
  condition: { 
    type: String, 
    enum: ['Deadstock', 'VNDS', 'Gently Used', 'Worn'],
    required: true
  },
  category: { 
    type: String, 
    enum: ['Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Accessories', 'Headwear', 'Bags', 'Jewellery', 'Vintage', 'Electronics', 'Miscellaneous'],
    required: true 
  },
  imageUrls: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['active', 'sold'],
    default: 'active'
  },
  location: { type: String, required: true },
  negotiable: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Backward compat: if old code reads .imageUrl, return first image
listingSchema.virtual('imageUrl').get(function () {
  return this.imageUrls && this.imageUrls.length > 0 ? this.imageUrls[0] : '';
});

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
