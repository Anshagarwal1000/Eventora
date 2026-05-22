const express=require('express');
const dotenv=require('dotenv');
const cors=require('cors');
const mongoose=require('mongoose');
const authRoutes=require('./routes/auth.js')
const eventRoutes=require('./routes/events.js')
const bookingRoutes=require('./routes/booking.js')
dotenv.config();

const app=express();
app.use(cors());
app.use(express.json());

//All the routes will Be wirtten Here

app.use('/api/auth',authRoutes);
app.use('/api/events',eventRoutes)
app.use('/api/bookings',bookingRoutes)

mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    console.log("Connected to DataBase MongoDB");
}).catch((error)=>{
    console.error("Error connecting to DataBase",error)
})

const PORT=process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server listening at PORT ${PORT}`);
});

