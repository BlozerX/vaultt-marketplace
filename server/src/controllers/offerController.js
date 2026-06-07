import Offer from '../models/Offer.js';
import Listing from '../models/Listing.js';

// @desc    Create an offer/inquiry on a listing
// @route   POST /api/offers
// @access  Private
export const createOffer = async (req, res) => {
  try {
    const { listingId, message, offerPrice } = req.body;

    if (!listingId || !message || !offerPrice) {
      return res.status(400).json({ message: 'listingId, message, and offerPrice are required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Can't make offer on your own listing
    if (listing.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot make an offer on your own listing' });
    }

    // Check if seller blocked buyer, or buyer blocked seller
    const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])].map(id => id.toString());
    if (excludedUserIds.includes(listing.sellerId.toString())) {
      return res.status(403).json({ message: 'You are blocked from interacting with this user' });
    }

    if (listing.status === 'sold') {
      return res.status(400).json({ message: 'This listing has already been sold' });
    }

    const offer = await Offer.create({
      listingId,
      buyerId: req.user._id,
      offerPrice,
      message,
      messages: [{
        senderId: req.user._id,
        text: `[OFFER: ${offerPrice}] ${message}`
      }]
    });

    const populated = await offer.populate([
      { path: 'buyerId', select: 'name email' },
      { path: 'listingId', select: 'title brand price imageUrls' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all offers on a specific listing (seller only)
// @route   GET /api/offers/listing/:listingId
// @access  Private
export const getOffersForListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.sellerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const offers = await Offer.find({ listingId: req.params.listingId })
      .populate('buyerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get offers made by logged-in buyer
// @route   GET /api/offers/mine
// @access  Private
export const getMyOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ buyerId: req.user._id, deletedBy: { $ne: req.user._id } })
      .populate('listingId', 'title brand price imageUrls status')
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update offer status (seller accepts or rejects)
// @route   PATCH /api/offers/:id
// @access  Private
export const updateOfferStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    const offer = await Offer.findById(req.params.id).populate('listingId');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.listingId.sellerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])].map(id => id.toString());
    if (excludedUserIds.includes(offer.buyerId.toString())) {
      return res.status(403).json({ message: 'You are blocked from interacting with this user' });
    }

    offer.status = status;
    await offer.save();

    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get offers received on listings I own
// @route   GET /api/offers/received
// @access  Private
export const getReceivedOffers = async (req, res) => {
  try {
    // Find all listings owned by the user
    const listings = await Listing.find({ sellerId: req.user._id }).select('_id');
    const listingIds = listings.map(l => l._id);

    const offers = await Offer.find({ listingId: { $in: listingIds }, deletedBy: { $ne: req.user._id } })
      .populate('buyerId', 'name email avatar')
      .populate('listingId', 'title brand price imageUrls status')
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single offer by id with messages
// @route   GET /api/offers/:id
// @access  Private
export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('buyerId', 'name email avatar')
      .populate({
        path: 'listingId',
        select: 'title brand price imageUrls status sellerId location',
        populate: { path: 'sellerId', select: 'name email avatar' }
      })
      .populate('messages.senderId', 'name avatar');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check authorization: must be buyer or seller
    if (
      offer.buyerId._id.toString() !== req.user._id.toString() &&
      offer.listingId.sellerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Send a message in an offer thread
// @route   POST /api/offers/:id/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const offer = await Offer.findById(req.params.id).populate('listingId');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check authorization
    if (
      offer.buyerId.toString() !== req.user._id.toString() &&
      offer.listingId.sellerId.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (offer.deletedBy?.length > 0 || offer.blockedBy?.length > 0) {
      return res.status(403).json({ message: 'This conversation has been closed.' });
    }

    const isBuyer = offer.buyerId.toString() === req.user._id.toString();
    const otherPartyId = isBuyer ? offer.listingId.sellerId.toString() : offer.buyerId.toString();
    const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])].map(id => id.toString());
    
    if (excludedUserIds.includes(otherPartyId)) {
      return res.status(403).json({ message: 'You are blocked from interacting with this user' });
    }

    offer.messages.push({
      senderId: req.user._id,
      text: text.trim(),
    });

    await offer.save();

    const populatedOffer = await Offer.findById(offer._id)
      .populate('messages.senderId', 'name avatar');

    res.status(200).json(populatedOffer.messages[populatedOffer.messages.length - 1]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
