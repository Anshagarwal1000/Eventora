const User=require('../models/User.js')
const OTP=require('../models/OTP.js')
const bcrypt=require('bcryptjs');
const { sendOtpEmail }=require('../utils/email.js');
const jwt = require('jsonwebtoken');


const generateToken=(id,role)=>{
    return jwt.sign({id,role},process.env.JWT_SECRET,{expiresIn:'7d'})
}

const registerUser=async(req,res)=>{
        
    try{
        const {name,email,password,role}=req.body;
        let userExist=await User.findOne({email});
        if(userExist){
            return res.status(400).json({error:"User already exist with this Email"});
        }
        const salt=await bcrypt.genSalt(10);
        const hashPassword=await bcrypt.hash(password,salt)
        const user=await User.create({name,email,password:hashPassword,role:role,isVerified:false});

        const otp=Math.floor(100000+Math.random()*900000).toString();
        console.log(`Otp for ${email}: ${otp}`);
        await OTP.create({email,otp,action:'account-verification'})
        await sendOtpEmail(email,otp,'account-verification'); 
        
        res.status(201).json({
            message: 'OTP sent to email. Please verify.',
            email: user.email
        });

         


    }
    catch(error){
        res.status(400).json({error:error.message});
    }
};

const loginUser=async(req,res)=>{
    try {
        const {email,password}=req.body;
        const user=await User.findOne({email});
        if(!user) return res.status(400).json({message:"User Doesn't exist with this email"});
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch)    return res.status(400).json({message:"Invalid Credentials"});

        if(!user.isVerified && user.role=='user'){
            const otp=Math.floor(100000+Math.random()*900000).toString();
            console.log(`Otp for ${email}: ${otp}`);
            await OTP.deleteMany({email,action:'account-verification'})
            await OTP.create({email,otp,action:'account-verification'})
            await sendOtpEmail(email,otp,'account-verification');
            return res.status(400).json({error:'Account not verified. An Otp has been sent to your registered email'});
        }

        res.status(201).json({
            message:"Login Successful",            
            _id:user._id,
            name:user.name,
            email:user.email,
            role:user.role,
            token:generateToken(user.id,user.role)
            
        })
        

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }

}

const verifyOtp=async(req,res)=>{
    const {email,otp}=req.body;
    const otpRecord=await OTP.findOne({email,otp,action:'account-verification'})

    if(!otpRecord)  {
        return res.status(400).json({error:"Invalid or expired Otp"})
    }

    const user=await User.findOneAndUpdate({email},{isVerified:true});
    await OTP.deleteMany({email,action:'account-verification'});
    res.json({
        message:"Account Verified Successfully. Now you can log in",
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)    
    
    });
}

module.exports = {
    registerUser,
    loginUser,
    verifyOtp
};