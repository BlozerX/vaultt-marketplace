import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Listing from '../models/Listing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const electronicsImages = [
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80', // smartwatch
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', // headphones
  'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=800&q=80', // iphone
  'https://images.unsplash.com/photo-1606220588913-b3eea4eceb24?auto=format&fit=crop&w=800&q=80', // camera
];

const fixElectronics = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const electronics = await Listing.find({ category: 'Electronics' });
    let count = 0;
    for (const listing of electronics) {
      const numImages = Math.floor(Math.random() * 2) + 1;
      const imageUrls = [];
      for(let j=0; j<numImages; j++) {
        imageUrls.push(electronicsImages[Math.floor(Math.random() * electronicsImages.length)]);
      }
      listing.imageUrls = imageUrls;
      await listing.save();
      count++;
    }

    console.log(`Updated ${count} electronics listings`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixElectronics();
