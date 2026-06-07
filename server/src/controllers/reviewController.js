import Review from '../models/Review.js';
import Offer from '../models/Offer.js';
import Listing from '../models/Listing.js';

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { sellerId, listingId, rating, comment } = req.body;

    if (!sellerId || !rating || !comment) {
      return res.status(400).json({ message: 'Please provide sellerId, rating, and comment' });
    }

    if (sellerId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot review yourself' });
    }

    // Verify that the user has a transaction with the seller
    let offerQuery = {
      buyerId: req.user._id,
      status: 'accepted'
    };
    if (listingId) {
      offerQuery.listingId = listingId;
    }

    // Find all accepted offers by this buyer
    const offers = await Offer.find(offerQuery).populate('listingId');
    // Filter to find an offer where the seller matches
    const validOffer = offers.find(o => o.listingId && o.listingId.sellerId.toString() === sellerId);

    if (!validOffer) {
      return res.status(403).json({ message: 'You can only review after an accepted transaction with this seller' });
    }

    const finalListingId = listingId || validOffer.listingId._id;

    // Create review
    const review = await Review.create({
      sellerId,
      buyerId: req.user._id,
      listingId: finalListingId,
      rating: Number(rating),
      comment
    });

    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this transaction' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all reviews for a seller
// @route   GET /api/reviews/seller/:sellerId
// @access  Public
export const getSellerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ sellerId: req.params.sellerId })
      .populate('buyerId', 'name avatar')
      .populate('listingId', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
