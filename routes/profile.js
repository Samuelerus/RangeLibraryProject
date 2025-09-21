const express = require('express');
const route = express.Router();
const bcrypt = require('bcryptjs');
const check_jwt_token = require('../middleware/user_auth');
const cloudinary = require('../utils/cloudinary');
const uploader = require('../utils/multer');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const User = require('../models/user');

//to view your profile
route.get('/view', check_jwt_token, async (req, res) => {
    const { user_id } = req.user;
    try {
        //find the user's profile by the id
        const profile = await User.findById(user_id, { password: 0, is_online: 0, is_verified: 0, timestamp: 0, __v: 0 }).lean();
        let msg = "Success";
        if (!profile) {
            msg = "Not found"
            return res.status(404).send({ msg })
        }
        return res.status(200).send({ msg, profile });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to add a profile picture
route.post('/add_pic', check_jwt_token, uploader.single("image"), async (req, res) => {
    const { user_id } = req.user;
    try {
        let img_url = "";
        let img_id = "";
        //check if an image was sent
        if (req.file) {
            //upload image to cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "range_user_profile_pics"
            });
            img_url = result.secure_url;
            img_id = result.public_id;
            console.log(result);
        }

        await User.findByIdAndUpdate(user_id, { profile_img_url: img_url, profile_img_id: img_id }, { new: true, password: 0 });
        return res.status(200).send({ status: 'ok', msg: "Succesfully added" }, img_id)
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
})

//to edit your profile
route.put('/edit_profile', check_jwt_token, uploader.single("image"), async (req, res) => {
    const { user_id } = req.user;
    const { fullname, phone_no } = req.body;

    try {
        //replace profile picture if sent
        if (req.file) {
            //find the public id and url for the old profile picture
            let p_user = User.findById(user_id);

            let img_id = p_user.profile_img_id;
            //upload replacement profile pic to cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "range_user_profile_pics",
                public_id: img_id,
                overwrite: true,
            });
            let img_url = result.secure_url;
            //update img_url
            await User.findByIdAndUpdate(user_id, { profile_img_url: img_url })
        }
        //find the user to get current details
        let existing_user = await User.findById(user_id).lean();
        
        //find the user by their id and update their info
        let user = await User.findByIdAndUpdate(user_id, {
            fullname: fullname || existing_user.fullname,
            phone_no: phone_no || existing_user.phone_no

        }, { new: true, password: 0, __v: 0 }).lean();
        return res.status(200).send({ status: 'ok', msg: "Use profile updated successfully", user })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to change your password
route.put('/change_password', check_jwt_token, async (req, res) => {
    const { user_id } = req.user;
    const { oldpass, newpass, confirm } = req.body;

    //check if all fields are entered
    if (!oldpass || !newpass || !confirm)
        return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' });

    //check for the user
    const user = await User.findById(user_id).lean();
    if (!user) { return res.status(404).send({ 'status': 'error', msg: "Not found" }) };

    //check if the old password matches
    if (await bcrypt.compare(oldpass, user.password) !== true) {
        return res.status(400).send({ 'status': 'error', msg: "Incorrect Password" })
    }

    //check if the new password entered matches
    if (newpass !== confirm)
        return res.status(400).send({ 'status': 'error', msg: 'Passwords must match' });

    try {
        //to change password
        const en_pass = await bcrypt.hash(newpass, 10);
        await User.updateOne({ _id: user_id }, { password: en_pass }, { password: 0 });

        return res.status(200).send({ status: 'ok', msg: 'Password successfully reset', user })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }

});

//to delete your account
route.delete('/delete', check_jwt_token, async (req, res) => {
    const { user_id } = req.user;
    try {
        //check for the user's account
        const account = await User.findById(user_id, { password: 0 }).lean();
        let count = account.length;
        if (count === 0) {
            return res.status(404).send({ 'status': 'error', msg: 'User not found' });
        }
        //check if the user still owes books, in which case, deny deletion
        if (account.num_due > 0) {
            return res.status(403).send({ 'status': 'error', msg: 'User still has book(s) due. Return books before account deletion' });
        }
        //to delete the account
        await User.findByIdAndDelete(user_id);
        return res.status(200).send({ status: 'ok', msg: "Successfully deleted", account });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    };
});


module.exports = route;