import express from 'express';
import { signup, login, getMe, updateProfile, getPublicUser, toggleWishlist, getWishlist, blockUser, unblockUser } from '../controllers/authController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.get('/users/:id', optionalAuth, getPublicUser);
router.post('/wishlist/:listingId', protect, toggleWishlist);
router.get('/wishlist', protect, getWishlist);
router.post('/block/:id', protect, blockUser);
router.post('/unblock/:id', protect, unblockUser);

export default router;
