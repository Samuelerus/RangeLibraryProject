const express = require('express');
const route = express.Router();
const bcrypt = require('bcryptjs');
const check_jwt_token = require('../middleware/user_auth');
const { generate_OTP, encrypt, decrypt } = require('../utils/otp');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { welcome_mail_admin, welcome_mail_member, forgot_password_mail, send_otp_email } = require("../utils/nodemailer")
const mongoose = require('mongoose');


const User = require('../models/user');
const { appendFile } = require('fs');


//endpoint for signing up
//admin
route.post('/sign_up_admin', async (req, res) => {
    const { fullname, phone_no, email, password, role, admin_token } = req.body;

    // check for required fields
    if (!fullname || !phone_no || !email || !password || !role || !admin_token)
        return res.status(400).send({ status: 'error', msg: 'All details must be inputed' });

    // Check if phone_no is exactly 11 digits
    if (!/^\d{11}$/.test(phone_no)) {
        return res.status(400).send({ status: 'error', msg: 'Phone number must be exactly 11 digits' });
    }

    // Check if email matches the correct format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).send({ status: 'error', msg: 'Invalid email format' });
    }

    if (password.length < 8) { return res.status(400).send({ 'status': 'error', msg: 'Password must be 8 characters long' }) };

    if (role === 'member' || admin_token !== process.env.ADMIN_SIGNUP_TOKEN) { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to sign up as admin' }) }


    try {
        // check if a user with this email already exists
        let match = await User.find({ email: email }).lean();
        if (match.length > 0) {
            return res.status(400).send({ status: 'error', msg: 'User with this email already exists' });
        }

        // create a user object
        const user = User();
        user.fullname = fullname;
        user.phone_no = phone_no;
        user.email = email;
        user.password = await bcrypt.hash(password, 10);
        user.num_due = 0;
        user.books_due = [];
        user.role = role;
        user.is_online = true;
        user.suspended = false;
        user.is_verified = false;
        user.otp = {};
        user.timestamp = Date.now();

        // save user document
        await user.save();
        delete user.password; // remove password from user object before sending response

        return res.status(201).send({ status: 'created', msg: 'Account created. Pending activation' });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


//member
route.post('/sign_up_member', async (req, res) => {
    const { fullname, phone_no, email, password } = req.body;

    // check for required fields
    if (!fullname || !phone_no || !email || !password) { return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' }) };

     // Check if phone_no is exactly 11 digits
    if (!/^\d{11}$/.test(phone_no)) {
        return res.status(400).send({ status: 'error', msg: 'Phone number must be exactly 11 digits' });
    }

    // Check if email matches the correct format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).send({ status: 'error', msg: 'Invalid email format' });
    }
    
    if (password.length < 8) { 
        return res.status(400).send({ status: 'error', msg: 'Password must be 8 characters long' }) 
    };


    try {
        // check if a user with this email already exists
        let match = await User.find({ email: email }).lean();
        if (match.length > 0) {
            return res.status(400).send({ status: 'error', msg: 'User with this email already exists' });
        }

        // create a user object
        const user = User();
        user.fullname = fullname;
        user.phone_no = phone_no;
        user.email = email;
        user.password = await bcrypt.hash(password, 10);
        user.num_due = 0;
        user.books_due = [];
        user.role = "member";
        user.is_online = true;
        user.suspended = false;
        user.is_verified = false;
        user.otp = {};
        user.timestamp = Date.now();

        // save user document
        await user.save();

        return res.status(201).send({ status: 'created', msg: 'Account created. Pending activation' });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});



//to generate the OTP and send it
route.post('/otp', async (req, res) => {
    const { email } = req.body;

    try {
        const otp = generate_OTP();
        const encrypted = encrypt(otp, process.env.OTP_PASSKEY);
        //store OTP with expiry(5 minutes)
        await User.updateOne({ email },
            {
                otp: {
                    code: encrypted,
                    expires_at: new Date(Date.now() + 5 * 60 * 1000)
                }
            });
        await send_otp_email(email, otp, "5", process.env.MAIL_USER);
        console.log("otp generated and email sent successfully")
        return res.status(201).send({ 'status': 'created', msg: "OTP generated and sent. Will expire in 5 minutes" });
    } catch (e) {
        console.error("OTP generation failed or email not sent ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


//to verify OTP and activate the account
route.post('/otp_verify', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email }).lean();

    try {
        if (!user || !user.otp) {
            return res.status(400).send({ status: 'error', msg: "Invalid email" });
        }

        const encrypted = user.otp.code;
        const decrypted = decrypt(encrypted, process.env.OTP_PASSKEY);

        if (otp !== decrypted) {
            return res.status(400).send({ status: 'error', msg: "Invalid OTP" });
        }

        if (user.otp.expires_at < Date.now()) {
            await User.updateOne({ email: email },
                {
                    $unset: { otp: "" }
                }
            )
            return res.status(400).send({ status: 'error', msg: "OTP expired" });
        }
        await User.findOneAndUpdate({ email: email },
            {
                is_verified: true,
                $unset: { otp: "" }
            }
        );
        if (user.role === "member") {
            await welcome_mail_member(email, user.fullname, "http://localhost:5000/profile/view");
        }

        if (user.role !== "member") {
            await welcome_mail_admin(email, user.fullname, "http://localhost:5000/profile/view")
        }

        const token = jwt.sign(
            { user_id: user._id, email: email, role: user.role, suspended: user.suspended, is_verified: true },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1d' }
        );

        return res.status(200).send({ status: 'ok', msg: 'Account activated', token });
    } catch (e) {
        console.error("OTP verification failed ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});



// endpoint to login
route.put('/login', async (req, res) => {
    const { email, password } = req.body;

    // check for required fields
    if (!email || !password) { return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' }) };

    try {
        // check if a user with this email exists
        let user = await User.findOne({ email: email }).select('fullname password role suspended is_verified').lean();
        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'no user with this email exists' });
        }


        // check for password mismatch
        if (await bcrypt.compare(password, user.password)) {
            // update user document
            await User.updateOne({ email: email }, { is_online: true }, { password: 0 }).lean();
            const token = jwt.sign(
                { user_id: user._id, email: email, role: user.role, suspended: user.suspended, is_verified: user.is_verified },
                process.env.JWT_SECRET_KEY,
                { expiresIn: '1d' }
            );
            return res.status(200).send({ status: 'ok', msg: 'Successful login', user, token });

        }

        return res.status(400).send({ status: 'error', msg: 'incorrect email or password' });

    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//endpoint for forgotten password
route.get('/forgot_password', async (req, res) => {
    const { email } = req.query;

    //check if email was sent
    if (!email)
        return res.status(400).send({ 'status': 'error', msg: 'No email' });

    await forgot_password_mail(email);
    return res.status(200).send({ status: 'ok', msg: 'Password reset link sent to email if it exists' });

});

//endpoint to reset password
route.put('/reset_password/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { newpass, confirm } = req.body;

    //check if an id was sent
    if (!user_id) {
        return res.status(400).send({ 'status': 'error', msg: 'No ID' })
    }
    
    //check if the id format is valid
        if (!mongoose.Types.ObjectId.isValid(user_id)) { return res.status(400).send({ 'status': 'error', msg: 'Invalid ID format' }) }

    //check if both passwords were sent
    if (!newpass || !confirm)
        return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' });

    //check if the new password is at least 8 characters
    if (newpass.length < 8)
        return res.status(400).send({ 'status': 'error', msg: 'Password must be at least 8 characters long' });

    //check if the passwords entered match
    if (newpass !== confirm)
        return res.status(400).send({ 'status': 'error', msg: 'Passwords must match' });

    try {
        //check if a user with that id exists
        let user = await User.findById(user_id).select('fullname').lean();
        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'no such user found' });
        }

        //to change password
        const en_pass = await bcrypt.hash(newpass, 10);
        await User.updateOne({ _id: user_id }, { password: en_pass });

        return res.status(200).send({ status: 'ok', msg: 'Password successfully reset', user })

    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to logout
route.put('/logout', check_jwt_token, async (req, res) => {
    const { user_id } = req.user;
    try {
        //check if a user with the id exists and log them out
        await User.updateOne({ _id: user_id }, { is_online: false });
        return res.status(200).send({ status: 'ok', msg: 'Successful logout' });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


module.exports = route;