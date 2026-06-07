import express from 'express';
import {
  createOffer,
  getOffersForListing,
  getMyOffers,
  getReceivedOffers,
  updateOfferStatus,
  getOfferById,
  sendMessage,
} from '../controllers/offerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createOffer);
router.get('/mine', protect, getMyOffers);
router.get('/received', protect, getReceivedOffers);
router.get('/listing/:listingId', protect, getOffersForListing);
router.get('/:id', protect, getOfferById);
router.patch('/:id', protect, updateOfferStatus);
router.patch('/:id/renegotiate', protect, async (req, res) => {
  try {
    const { offerPrice, message } = req.body;
    if (!offerPrice || !message) return res.status(400).json({ message: 'Price and message required' });
    
    const offer = await import('../models/Offer.js').then(m => m.default).then(Offer => Offer.findById(req.params.id));
    if (!offer || offer.buyerId.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    if (offer.deletedBy?.length > 0 || offer.blockedBy?.length > 0) {
      return res.status(403).json({ message: 'This conversation has been closed.' });
    }

    const isBuyer = offer.buyerId.toString() === req.user._id.toString();
    const otherPartyId = isBuyer ? offer.listingId.sellerId?.toString() : offer.buyerId.toString();
    const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])].map(id => id.toString());
    
    if (otherPartyId && excludedUserIds.includes(otherPartyId)) {
      return res.status(403).json({ message: 'You are blocked from interacting with this user' });
    }

    offer.offerPrice = offerPrice;
    offer.status = 'pending';
    offer.messages.push({ senderId: req.user._id, text: `[OFFER: ${offerPrice}] ${message}` });
    await offer.save();

    res.status(200).json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.patch('/:id/delete', protect, async (req, res) => {
  try {
    const offer = await import('../models/Offer.js').then(m => m.default).then(Offer => Offer.findById(req.params.id));
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    
    if (!offer.deletedBy.includes(req.user._id)) {
      offer.deletedBy.push(req.user._id);
      await offer.save();
    }
    res.status(200).json({ message: 'Chat deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/block', protect, async (req, res) => {
  try {
    const offer = await import('../models/Offer.js').then(m => m.default).then(Offer => Offer.findById(req.params.id));
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    
    if (!offer.blockedBy.includes(req.user._id)) {
      offer.blockedBy.push(req.user._id);
      await offer.save();
    }
    res.status(200).json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/messages', protect, sendMessage);

export default router;
