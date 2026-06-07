import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Listing from '../models/Listing.js';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, passwordHash });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        phone: user.phone,
        wishlist: user.wishlist,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        phone: user.phone,
        wishlist: user.wishlist,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user data
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

// @desc    Update current user profile
// @route   PATCH /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, location, avatar } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, location, avatar },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user profile (public)
// @route   GET /api/auth/users/:id
// @access  Public
export const getPublicUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user) {
      const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])].map(id => id.toString());
      if (excludedUserIds.includes(user._id.toString())) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    const listings = await Listing.find({ sellerId: user._id, status: 'active' }).sort({ createdAt: -1 });

    // Try to get reviews if the Review model exists
    let rating = 0;
    let reviewsCount = 0;
    try {
      const Review = (await import('../models/Review.js')).default;
      const reviews = await Review.find({ sellerId: user._id });
      reviewsCount = reviews.length;
      if (reviewsCount > 0) {
        rating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewsCount;
      }
    } catch (err) {
      // Review model might not be initialized yet during early dev, ignore
    }

    res.status(200).json({
      user: {
        ...user.toObject(),
        rating,
        reviewsCount
      },
      listings,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Toggle wishlist item
// @route   POST /api/auth/wishlist/:listingId
// @access  Private
export const toggleWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const listingId = req.params.listingId;
    const index = user.wishlist.indexOf(listingId);

    if (index === -1) {
      // Add to wishlist
      user.wishlist.push(listingId);
    } else {
      // Remove from wishlist
      user.wishlist.splice(index, 1);
    }

    await user.save();
    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get populated wishlist
// @route   GET /api/auth/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: { path: 'sellerId', select: 'name location avatar' }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Block a user
// @route   POST /api/auth/block/:id
// @access  Private
export const blockUser = async (req, res) => {
  try {
    const userToBlock = await User.findById(req.params.id);
    if (!userToBlock) return res.status(404).json({ message: 'User not found' });

    if (req.user._id.toString() === userToBlock._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const me = await User.findById(req.user._id);

    if (!me.blockedUsers.includes(userToBlock._id)) {
      me.blockedUsers.push(userToBlock._id);
      await me.save();
    }
    
    if (!userToBlock.blockedBy.includes(me._id)) {
      userToBlock.blockedBy.push(me._id);
      await userToBlock.save();
    }

    res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Unblock a user
// @route   POST /api/auth/unblock/:id
// @access  Private
export const unblockUser = async (req, res) => {
  try {
    const userToUnblock = await User.findById(req.params.id);
    if (!userToUnblock) return res.status(404).json({ message: 'User not found' });

    const me = await User.findById(req.user._id);

    me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== userToUnblock._id.toString());
    await me.save();

    userToUnblock.blockedBy = userToUnblock.blockedBy.filter(id => id.toString() !== me._id.toString());
    await userToUnblock.save();

    res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
