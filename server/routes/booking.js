const express = require('express');
const router = express.Router();
const { bookEvent, confirmBooking, getMyBookings, cancelBooking, sendBookingOtp } = require('../controllers/bookingController.js');
const { protect, admin } = require('../middlewares/auth.js');

router.post('/send-otp', protect, sendBookingOtp);
router.post('/', protect, bookEvent);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.get('/my', protect, getMyBookings);
router.delete('/:id', protect, cancelBooking);

module.exports = router;