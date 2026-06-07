import Report from '../models/Report.js';

// @desc    Report a listing
// @route   POST /api/reports
// @access  Private
export const createReport = async (req, res) => {
  try {
    const { listingId, reportedUserId, reason, description } = req.body;

    if (!reason || (!listingId && !reportedUserId)) {
      return res.status(400).json({ message: 'Reason and either listingId or reportedUserId are required' });
    }

    const reportData = {
      reporterId: req.user.id,
      reason,
      description: description || ''
    };
    if (listingId) reportData.listingId = listingId;
    if (reportedUserId) reportData.reportedUserId = reportedUserId;

    const report = await Report.create(reportData);

    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
