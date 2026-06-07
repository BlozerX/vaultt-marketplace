import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Listing from '../models/Listing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const categoryImages = {
  'Tops': [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80'
  ],
  'Bottoms': [
    'https://images.unsplash.com/photo-1542272604-780996843469?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80'
  ],
  'Outerwear': [
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520975954732-57dd22299614?auto=format&fit=crop&w=800&q=80'
  ],
  'Footwear': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80'
  ],
  'Accessories': [
    'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80'
  ],
  'Headwear': [
    'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1556306535-0f09a536f01f?auto=format&fit=crop&w=800&q=80'
  ],
  'Bags': [
    'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80'
  ],
  'Jewellery': [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1599643478514-4a42090d540e?auto=format&fit=crop&w=800&q=80'
  ],
  'Vintage': [
    'https://images.unsplash.com/photo-1550614000-4b95d466f68c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=800&q=80'
  ],
  'Electronics': [
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80'
  ]
};

const addImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const listings = await Listing.find({});
    let count = 0;
    
    for (const listing of listings) {
      const imgs = categoryImages[listing.category] || categoryImages['Tops'];
      
      // Let's add 1-2 images for 85% of listings
      if (Math.random() > 0.15) {
        const numImages = Math.floor(Math.random() * 2) + 1;
        const newUrls = [];
        for(let j=0; j<numImages; j++) {
          newUrls.push(imgs[Math.floor(Math.random() * imgs.length)]);
        }
        listing.imageUrls = newUrls;
        await listing.save();
        count++;
      }
    }

    console.log(`Updated ${count} listings with category specific images`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

addImages();
