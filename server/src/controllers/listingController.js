import Listing from '../models/Listing.js';

// @desc    Get all listings with optional search, category, price filters, sorting, and pagination
// @route   GET /api/listings?q=&category=&minPrice=&maxPrice=&status=&sort=&page=&limit=
// @access  Public
export const getListings = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, status, sort, page = 1, limit = 12 } = req.query;

    const match = {};
    if (category) match.category = category;
    if (status) match.status = status;
    if (minPrice || maxPrice) {
      match.price = {};
      if (minPrice) match.price.$gte = Number(minPrice);
      if (maxPrice) match.price.$lte = Number(maxPrice);
    }
    
    if (req.user) {
      const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])];
      if (excludedUserIds.length > 0) {
        match.sellerId = { $nin: excludedUserIds };
      }
    }

    let sortObj = { createdAt: -1 }; // default newest
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'most_viewed') sortObj = { views: -1 };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Advanced keyword search using Atlas Search aggregation
    if (q && q.trim()) {
      const pipeline = [
        {
          $search: {
            index: 'default',
            text: {
              query: q.trim(),
              path: ['title', 'brand', 'category', 'description'],
              fuzzy: { maxEdits: 1 },
            },
          },
        },
        ...(Object.keys(match).length ? [{ $match: match }] : []),
      ];

      // We need two pipelines: one for total count, one for paginated data
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await Listing.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      const dataPipeline = [
        ...pipeline,
        {
          $lookup: {
            from: 'users',
            localField: 'sellerId',
            foreignField: '_id',
            as: 'sellerId',
          },
        },
        { $unwind: { path: '$sellerId', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            'sellerId.passwordHash': 0,
            'sellerId.createdAt': 0,
            'sellerId.updatedAt': 0,
            'sellerId.__v': 0,
          },
        },
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limitNum }
      ];

      const listings = await Listing.aggregate(dataPipeline);
      return res.status(200).json({
        listings,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      });
    }

    const total = await Listing.countDocuments(match);
    const listings = await Listing.find(match)
      .populate('sellerId', 'name email location avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      listings,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Search listings (legacy, kept for backwards compat)
// @route   GET /api/listings/search
// @access  Public
export const searchListings = async (req, res) => {
  return getListings(req, res);
};

// @desc    Get listings by seller
// @route   GET /api/listings/user/:userId
// @access  Public
export const getListingsByUser = async (req, res) => {
  try {
    if (req.user) {
      const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])].map(id => id.toString());
      if (excludedUserIds.includes(req.params.userId)) {
        return res.status(200).json([]);
      }
    }

    const listings = await Listing.find({ sellerId: req.params.userId })
      .populate('sellerId', 'name email location avatar')
      .sort({ createdAt: -1 });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get listing by id (increments views)
// @route   GET /api/listings/:id
// @access  Public
export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('sellerId', 'name email location avatar bio');
    
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (req.user && listing.sellerId) {
      const excludedUserIds = [...(req.user.blockedUsers || []), ...(req.user.blockedBy || [])].map(id => id.toString());
      if (excludedUserIds.includes(listing.sellerId._id.toString())) {
        return res.status(404).json({ message: 'Listing not found' });
      }
    }

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get related listings
// @route   GET /api/listings/:id/related
// @access  Public
export const getRelatedListings = async (req, res) => {
  try {
    const currentListing = await Listing.findById(req.params.id);
    if (!currentListing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const related = await Listing.find({
      _id: { $ne: currentListing._id },
      category: currentListing.category,
      status: 'active'
    })
    .populate('sellerId', 'name avatar location')
    .limit(8);

    res.status(200).json(related);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a listing
// @route   POST /api/listings
// @access  Private
export const createListing = async (req, res) => {
  try {
    const { title, description, brand, size, price, condition, category, imageUrls, location, negotiable } = req.body;

    if (!title || !description || !brand || !size || !price || !condition || !category || !location) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const listing = await Listing.create({
      title,
      description,
      brand,
      size,
      price,
      condition,
      category,
      imageUrls: imageUrls || [],
      location,
      negotiable: negotiable !== undefined ? negotiable : true,
      sellerId: req.user.id,
    });

    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a listing
// @route   PATCH /api/listings/:id
// @access  Private
export const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this listing' });
    }

    const { imageUrl, ...updateData } = req.body;
    
    // Convert old single imageUrl to imageUrls if present
    if (imageUrl && !updateData.imageUrls) {
      updateData.imageUrls = [imageUrl];
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a listing
// @route   DELETE /api/listings/:id
// @access  Private
export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this listing' });
    }

    await listing.deleteOne();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Seed database with Indian hypewear listings
// @route   POST /api/listings/seed
// @access  Public (dev only)
export const seedListings = async (req, res) => {
  try {
    await Listing.deleteMany({});

    const User = (await import('../models/User.js')).default;
    let dummyUser = await User.findOne({ email: 'hype@vaultt.com' });
    if (!dummyUser) {
      dummyUser = await User.create({
        name: 'Vault Admin',
        email: 'hype@vaultt.com',
        passwordHash: 'seedhash_not_for_login',
        bio: 'Curating the best streetwear drops in India.',
        location: 'Mumbai',
      });
    }

    const seedItems = [
      {
        title: 'Supreme Box Logo Hoodie FW23',
        description: 'Heather Grey Box Logo Hoodie, FW23 drop. Never removed from plastic. Receipt included. Bought from a NYC trip.',
        brand: 'Supreme',
        size: 'L',
        price: 28000,
        condition: 'Deadstock',
        category: 'Tops',
        imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Mumbai',
        sellerId: dummyUser._id,
      },
      {
        title: 'Stüssy Sherpa Reversible Fleece Jacket',
        description: 'Two-tone cream and black reversible sherpa. Worn once for a photoshoot. Comes with original bag.',
        brand: 'Stüssy',
        size: 'M',
        price: 14500,
        condition: 'VNDS',
        category: 'Outerwear',
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Delhi',
        sellerId: dummyUser._id,
      },
      {
        title: 'Air Jordan 1 Retro High OG Chicago',
        description: 'Brand new, unworn, won from SNKRS. Ships double-boxed with extra laces and receipt.',
        brand: 'Jordan',
        size: '10 US',
        price: 75000,
        condition: 'Deadstock',
        category: 'Footwear',
        imageUrl: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Bengaluru',
        sellerId: dummyUser._id,
      },
      {
        title: 'Off-White Industrial Belt 200cm Yellow',
        description: '200cm yellow industrial belt. Minor wear on buckle, clip is fully functional. Authenticated.',
        brand: 'Off-White',
        size: 'OS',
        price: 9500,
        condition: 'Gently Used',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1528650630800-4b2aee0d1a7b?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Hyderabad',
        sellerId: dummyUser._id,
      },
      {
        title: 'BAPE Shark Full Zip Hoodie Green Camo',
        description: 'Green 1st Camo full zip shark hoodie. Worn 3 times, zero print cracking, all zips intact.',
        brand: 'BAPE',
        size: 'XL',
        price: 22000,
        condition: 'Gently Used',
        category: 'Tops',
        imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Pune',
        sellerId: dummyUser._id,
      },
      {
        title: 'Chrome Hearts Floral Cross Ring .925 Silver',
        description: 'Sterling silver floral cross ring, size 9. Minor patina adds character. Comes with original dust bag.',
        brand: 'Chrome Hearts',
        size: '9',
        price: 38000,
        condition: 'VNDS',
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b2548e?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Chennai',
        sellerId: dummyUser._id,
      },
      {
        title: 'Palace Tri-Ferg All-Over Print Tracksuit',
        description: 'Full tri-ferg print pants and jacket set. S/S22 drop. Excellent condition, worn twice.',
        brand: 'Palace',
        size: 'L',
        price: 18500,
        condition: 'VNDS',
        category: 'Bottoms',
        imageUrl: 'https://images.unsplash.com/photo-1543087903-1ac2364fd7aa?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Kolkata',
        sellerId: dummyUser._id,
      },
      {
        title: 'New Balance 9060 Sea Salt',
        description: 'Sea salt / mushroom colorway. Worn 5x, kept in box, light sole yellowing only.',
        brand: 'New Balance',
        size: '9 UK',
        price: 12000,
        condition: 'Gently Used',
        category: 'Footwear',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Ahmedabad',
        sellerId: dummyUser._id,
      },
      {
        title: 'Carhartt WIP OG Active Jacket Black',
        description: 'Classic black Carhartt active jacket. Size XL. Worn a full season, in great shape.',
        brand: 'Carhartt WIP',
        size: 'XL',
        price: 11000,
        condition: 'Gently Used',
        category: 'Outerwear',
        imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Chandigarh',
        sellerId: dummyUser._id,
      },
      {
        title: 'Corteiz Alcatraz Hoodie Blue',
        description: 'Corteiz RTW Alcatraz hoodie in blue, size M. Super rare India find — brand new.',
        brand: 'Corteiz',
        size: 'M',
        price: 19000,
        condition: 'Deadstock',
        category: 'Tops',
        imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Jaipur',
        sellerId: dummyUser._id,
      },
      {
        title: 'Yeezy Boost 350 V2 Zebra',
        description: 'Classic zebra colourway, size 10 US. Worn 3 times. Soles clean, no creasing. Box included.',
        brand: 'Adidas Yeezy',
        size: '10 US',
        price: 32000,
        condition: 'VNDS',
        category: 'Footwear',
        imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Mumbai',
        sellerId: dummyUser._id,
      },
      {
        title: 'Kapital Kountry Boro Patchwork Denim Jacket',
        description: 'Rare Kapital indigo boro patchwork denim jacket, size 3 (fits L/XL). One-of-a-kind piece.',
        brand: 'Kapital',
        size: '3 (L/XL)',
        price: 45000,
        condition: 'Gently Used',
        category: 'Outerwear',
        imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800',
        status: 'active',
        location: 'Delhi',
        sellerId: dummyUser._id,
      },
    ];

    const inserted = await Listing.insertMany(seedItems);

    res.status(201).json({
      message: `Successfully seeded ${inserted.length} hypewear listings`,
      count: inserted.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Seed failed', error: error.message });
  }
};
