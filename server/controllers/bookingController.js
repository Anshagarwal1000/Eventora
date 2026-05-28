const Booking=require('../models/Booking.js')
const OTP=require('../models/OTP.js')
const Event=require('../models/Event.js')
const {sendOtpEmail,sendBookingEmail} =require('../utils/email.js')

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


exports.sendBookingOtp=async (req,res)=>{
    try {
        const otp = generateOTP();
        await OTP.findOneAndDelete({email:req.user.email,action:'event-booking'});
        await OTP.create({ email: req.user.email, otp, action: 'event_booking' });
        await sendOTPEmail(req.user.email, otp, 'event_booking');
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending Booking OTP', error: error.message });
    }
}   

exports.bookEvent = async (req, res) =>{
    try {
        const {eventId,otp}=req.body;
        const validOtp=await OTP.findOne({email:req.user.email,otp,action:'event-booking'});
        if(!validOtp){
            return res.status(400).json({ message: 'Invalid or expired OTP for booking' });
        }
        const event=await Event.findById(eventId);
        if(!event)  return res.status(404).json({message:'Event not found'});
        const existingBooking=await Booking.findOne({userId:req.user.id,eventId});
        if(existingBooking && !existingBooking.status!=='cancelled'){
            return res.status(400).json({message:'Already booked or pending'});
        }
        const booking =await Booking.create({
            userId:req.user.id,
            eventId,
            status:'pending',
            paymentStatus:'not_paid',
            amount: event.ticketPrice
        })
        await OTP.deleteOne({_id:validOtp._id});
        return res.status(201).json({message:'Booking request submitted',booking});
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


exports.confirmBooking=async (req,res)=>{
    try {
        const {paymentStatus}=req.body;
        const booking=await Booking.findById(req.params.id).populate('userId').populate('eventId');
        if(!booking){
            return res.status(400).json({message:'Booking Not Found'});
        }
        if (booking.status === 'confirmed') return res.status(400).json({ message: 'Booking is already confirmed' });
        const event=await Event.findById(booking.eventId._id);
        if(event.availableSeats<=0){
            return res.status(400).json({message:'No seats availabe to confirm this booking.'});
        }
        booking.status='confirmed';
        if(paymentStatus){
            booking.paymentStatus=paymentStatus;
        }
        event.availableSeats-=1;
        await event.save();
        await sendBookingEmail(booking.userId.email, booking.userId.name, booking.eventId.title);

        res.json({ message: 'Booking confirmed successfully', booking })
    } catch (error) {
        res.status(500).json({message:'server error in confirm booking',error:error.message});
        
    }
}

exports.getMyBookings=async (req,res)=>{
    try{
        const booking=req.user.role==='admin'
        ?await Booking.find().populate('eventId').populate('userId','name email').sort({createdAt:-1})
        :(await Booking.find({userId:req.user.id}).populate('eventId')).sort({createdAt:-1});
        res.json(booking)
    }
    catch(error){
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

exports.cancelBooking=async (req,reas)=>{
    try {
        const booking=await Booking.findById(req.params.id);
        if(!booking)    return res.status(404).json({message:'Booking not found...'});
        if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });
        const wasConfirmed = booking.status === 'confirmed';
        booking.status = 'cancelled';
        await booking.save();
        if (wasConfirmed) {
            const event = await Event.findById(booking.eventId);
            if (event) {
                event.availableSeats += 1;
                await event.save();
            }
        }

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({message:'Server Error' ,error: error.message})
    }
}