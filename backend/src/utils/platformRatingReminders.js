const Booking = require('../tables/booking');
const Property = require('../tables/property');
const Notification = require('../tables/notification');
const PlatformRating = require('../tables/platformRating');

function toDateSafe(v) {
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function nightsBetween(checkIn, checkOut) {
  const ci = toDateSafe(checkIn);
  const co = toDateSafe(checkOut);
  if (!ci || !co) return 0;
  const ms = co.getTime() - ci.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

async function ensurePlatformRatingReminder(userId, userType) {
  try {
    if (!userId) return;

    const existingRating = await PlatformRating.findOne({ user: userId }).select('_id').lean();
    if (existingRating) return;

    const existingNotif = await Notification.findOne({
      recipientUser: userId,
      type: 'platform_rating_reminder'
    })
      .select('_id createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (existingNotif) return;

    const now = new Date();
    let totalNights = 0;

    if (userType === 'host') {
      const props = await Property.find({ host: userId }).select('_id').lean();
      const propIds = (props || []).map(p => p._id).filter(Boolean);
      if (!propIds.length) return;

      const bookings = await Booking.find({
        property: { $in: propIds },
        checkOut: { $lte: now },
        status: { $nin: ['cancelled'] }
      })
        .select('checkIn checkOut')
        .lean();

      for (const b of bookings || []) {
        totalNights += nightsBetween(b.checkIn, b.checkOut);
        if (totalNights >= 14) break;
      }
    } else {
      const bookings = await Booking.find({
        guest: userId,
        checkOut: { $lte: now },
        status: { $nin: ['cancelled'] }
      })
        .select('checkIn checkOut')
        .lean();

      for (const b of bookings || []) {
        totalNights += nightsBetween(b.checkIn, b.checkOut);
        if (totalNights >= 14) break;
      }
    }

    if (totalNights < 14) return;

    await Notification.create({
      type: 'platform_rating_reminder',
      title: 'Rate Akwanda',
      message: 'You have been using Akwanda for a while. Please rate your experience to help improve the platform.',
      recipientUser: userId,
      audience: 'both'
    });
  } catch (e) {
    console.error('ensurePlatformRatingReminder error:', e);
  }
}

module.exports = { ensurePlatformRatingReminder };
