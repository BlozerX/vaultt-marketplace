export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface User {
  _id: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  avatar?: string;
  phone?: string;
  wishlist?: string[];
}

export interface Listing {
  _id: string;
  title: string;
  description: string;
  brand: string;
  size: string;
  price: number;
  condition: string;
  category: string;
  imageUrls: string[];
  status: string;
  location: string;
  negotiable: boolean;
  views: number;
  sellerId: User | string;
  createdAt: string;
}

export const CATEGORIES = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Footwear',
  'Accessories',
  'Headwear',
  'Bags',
  'Jewellery',
  'Vintage',
  'Electronics',
  'Miscellaneous'
];

export const SIZES_BY_CATEGORY: Record<string, string[]> = {
  'Tops': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  'Bottoms': ['26', '28', '30', '32', '34', '36', '38', '40', '42'],
  'Outerwear': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  'Footwear': ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13'],
  'Accessories': ['One Size'],
  'Headwear': ['One Size', 'S/M', 'L/XL'],
  'Bags': ['One Size'],
  'Jewellery': ['One Size', 'Ring 6', 'Ring 7', 'Ring 8', 'Ring 9', 'Ring 10', 'Ring 11', 'Ring 12', 'Ring 13'],
  'Vintage': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Electronics': ['One Size'],
  'Miscellaneous': ['One Size']
};

export const CONDITIONS = ['Deadstock', 'VNDS', 'Gently Used', 'Worn'];

export const INDIA_CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Chandigarh',
  'Surat',
  'Lucknow',
  'Indore',
  'Kochi',
  'Goa',
];

export const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
