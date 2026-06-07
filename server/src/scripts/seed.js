import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Listing from '../models/Listing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure it reads from the server's .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const seedData = async () => {
  await connectDB();

  try {
    // Clear existing data
    const Offer = (await import('../models/Offer.js')).default;
    const Review = (await import('../models/Review.js')).default;
    const Report = (await import('../models/Report.js')).default;
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Offer.deleteMany({});
    await Review.deleteMany({});
    await Report.deleteMany({});

    // 10 Users — using a VALID bcrypt hash for "Test@123"
    const usersData = [];
    const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad', 'Kolkata', 'Chandigarh', 'Jaipur'];
    const bios = [
      'Streetwear collector. Hype pieces only.',
      'Vintage lover & sneakerhead from the South.',
      'Minimalist closet, quality over quantity.',
      'Designer reseller. Authenticated goods only.',
      'Full-time student, part-time hustler.',
      'Sneaker addict since 2015. DM for bundles.',
      'Fashion forward. Curated closet clearout.',
      'Tech enthusiast selling gear I no longer use.',
      'Sustainable fashion advocate. Pre-loved is the way.',
      'Premium streetwear. No lowballers please.',
    ];

    for (let i = 1; i <= 10; i++) {
      usersData.push({
        name: `User ${i}`,
        email: `user${i}@vaultt.com`,
        passwordHash: '$2a$10$r5AMnefDmCexgUPHCoBc2.FUeeKIcEiNGgbap9aJSrRymKy1k6Fja', // Test@123
        bio: bios[i - 1],
        location: cities[i - 1],
        avatar: '', // no avatar — use initials placeholder
      });
    }
    const createdUsers = await User.insertMany(usersData);
    console.log('✓ Created 10 users');

    // Categories and Sizes
    const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Accessories', 'Headwear', 'Bags', 'Jewellery', 'Vintage', 'Electronics'];
    const CONDITIONS = ['Deadstock', 'VNDS', 'Gently Used', 'Worn'];
    
    const sizesByCategory = {
      'Tops': ['S', 'M', 'L', 'XL', 'XXL'],
      'Bottoms': ['28', '30', '32', '34', '36'],
      'Outerwear': ['M', 'L', 'XL'],
      'Footwear': ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
      'Accessories': ['One Size'],
      'Headwear': ['One Size', 'S/M', 'L/XL'],
      'Bags': ['One Size'],
      'Jewellery': ['One Size', 'Ring 7', 'Ring 9', 'Ring 10'],
      'Vintage': ['M', 'L', 'XL'],
      'Electronics': ['One Size']
    };

    const brands = {
      'Tops': ['Supreme', 'BAPE', 'Palace', 'Stüssy', 'Corteiz', 'Essentials'],
      'Bottoms': ['Carhartt WIP', 'Dickies', 'Levis', 'Evisu', 'Stone Island'],
      'Outerwear': ['The North Face', 'Arc\'teryx', 'Moncler', 'Canada Goose'],
      'Footwear': ['Nike', 'Jordan', 'Adidas', 'New Balance', 'Asics', 'Salomon'],
      'Accessories': ['Off-White', 'Supreme', 'Kaws'],
      'Headwear': ['New Era', 'Supreme', 'Chrome Hearts'],
      'Bags': ['Prada', 'Goyard', 'Telfar', 'Supreme'],
      'Jewellery': ['Chrome Hearts', 'Vivienne Westwood', 'Homer'],
      'Vintage': ['Vintage Nike', 'Band Tees', 'Harley Davidson'],
      'Electronics': ['Apple', 'Sony', 'Nintendo', 'Beats']
    };

    const titles = {
      'Tops': ['Box Logo Hoodie FW23', 'Shark Full Zip', 'Tri-Ferg Tee', 'Basic Logo Tee', 'Running Dog Hoodie', 'Fear of God Knit'],
      'Bottoms': ['Double Knee Pant', '874 Work Pant', '501 Original Fit', 'Daicock Jeans', 'Cargo Combat Pant'],
      'Outerwear': ['Nuptse 700 Down', 'Beta LT Jacket', 'Maya Short Down', 'Chilliwack Bomber'],
      'Footwear': ['Air Force 1 Low', 'Retro 4 Bred', 'Yeezy 350 V2', '990v5 Made in USA', 'Gel-Kayano 14', 'XT-6 Advanced'],
      'Accessories': ['Industrial Belt', 'Bouncy Ball Set', 'BFF Companion Figure'],
      'Headwear': ['59FIFTY Fitted Cap', 'Camp Cap SS24', 'Cross Trucker Hat'],
      'Bags': ['Re-Nylon Backpack', 'Saint Louis PM', 'Shopping Bag Medium', 'Shoulder Bag SS22'],
      'Jewellery': ['Tiny Cross Ring', 'Bas Relief Choker', 'Gold Pendant Chain'],
      'Vintage': ['Center Swoosh Crew', 'Metallica World Tour Tee', 'Leather Biker Vest'],
      'Electronics': ['AirPods Pro 2', 'WH-1000XM5', 'Switch OLED', 'Solo4 Wireless']
    };

    const listingsData = [];
    
    // Generate 120 listings with NO images — rely on category placeholder icons
    for (let i = 1; i <= 120; i++) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const brandList = brands[category];
      const brand = brandList[Math.floor(Math.random() * brandList.length)];
      const titleList = titles[category];
      const title = titleList[Math.floor(Math.random() * titleList.length)];
      const sizes = sizesByCategory[category];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
      const seller = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const isSold = Math.random() > 0.9; // 10% sold

      listingsData.push({
        title: `${brand} ${title}`,
        description: `Authentic ${brand} ${title}. Size ${size}, condition is ${condition}. 100% legitimate — can provide receipts on request. Happy to answer any questions or negotiate on price.`,
        brand,
        size,
        price: Math.floor(Math.random() * 40000) + 1000,
        condition,
        category,
        imageUrls: [], // NO images — use placeholders
        status: isSold ? 'sold' : 'active',
        location: seller.location,
        negotiable: Math.random() > 0.2, // 80% negotiable
        views: Math.floor(Math.random() * 500),
        sellerId: seller._id
      });
    }

    const createdListings = await Listing.insertMany(listingsData);
    console.log('✓ Created 120 listings');

    // Create seed reviews so the reviews tab is populated
    const reviewComments = [
      'Super smooth transaction. Item exactly as described. Would buy again!',
      'Fast shipping and great communication. A+ seller.',
      'Item was in better condition than expected. Very happy with this purchase.',
      'Responsive seller, answered all my questions. Legit goods.',
      'Took a while to ship but item quality is excellent.',
      'Great seller — even threw in extra stickers. 10/10.',
      'Exactly as listed. Clean, authentic, and well packaged.',
      'Had a minor issue but seller resolved it quickly. Respect.',
    ];

    // Find sold listings to create reviews for their sellers
    const soldListings = createdListings.filter(l => l.status === 'sold');
    const reviewsData = [];

    for (const listing of soldListings) {
      // Pick a random buyer that is NOT the seller
      const potentialBuyers = createdUsers.filter(u => u._id.toString() !== listing.sellerId.toString());
      if (potentialBuyers.length === 0) continue;
      const buyer = potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)];

      reviewsData.push({
        sellerId: listing.sellerId,
        buyerId: buyer._id,
        listingId: listing._id,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
      });
    }

    // Also add a few extra reviews on random active-listing sellers
    for (let i = 0; i < 15; i++) {
      const randomListing = createdListings[Math.floor(Math.random() * createdListings.length)];
      const potentialBuyers = createdUsers.filter(u => u._id.toString() !== randomListing.sellerId.toString());
      if (potentialBuyers.length === 0) continue;
      const buyer = potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)];

      reviewsData.push({
        sellerId: randomListing.sellerId,
        buyerId: buyer._id,
        listingId: randomListing._id,
        rating: Math.floor(Math.random() * 3) + 3, // 3–5 stars
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
      });
    }

    await Review.insertMany(reviewsData);
    console.log(`✓ Created ${reviewsData.length} reviews`);

    console.log('\n✅ Database seeded successfully!');
    console.log('   Login: user1@vaultt.com / Test@123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
