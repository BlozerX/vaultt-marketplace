import express from 'express';
import {
  getListings,
  searchListings,
  getListingById,
  getListingsByUser,
  createListing,
  updateListing,
  deleteListing,
  seedListings,
  getRelatedListings,
} from '../controllers/listingController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(optionalAuth, getListings)
  .post(protect, createListing);

router.route('/search')
  .get(optionalAuth, searchListings);

router.route('/seed')
  .post(seedListings);

router.route('/user/:userId')
  .get(optionalAuth, getListingsByUser);

router.route('/:id/related')
  .get(optionalAuth, getRelatedListings);

router.route('/:id')
  .get(optionalAuth, getListingById)
  .patch(protect, updateListing)
  .delete(protect, deleteListing);

export default router;
