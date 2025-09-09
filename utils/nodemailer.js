const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
});


const welcome_mail_admin = async (email, fullname, department) => {
    const mail_options = {
        from: `"Range Library" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Admin Welcome Email",
        html: `<div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; color: #333; border-radius
        <h2 style="text-align; center; color: #28a745; margin bottom: 20px;"> Welcome to Range Library!</h2>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hello ${fullname},<br><br>
            We are thrilled to have you on board as a new member of our ${department} department!
            View your profile using the following link:<br><br>
            <strong>Profile link:</strong> http://127.0.0.1/profile/view <br><br>
            Regards,<br>
            Administration, Range Library
        </p>
        <div style="text-align: center;">
            <img alt="Range Library Logo" src="https://" style="height: 60px; width: 60px; margin-top:
        </div>
        </div>`,
    }
    try {
        const info = await transporter.sendMail(mail_options);
        console.log("OTP Email sent:", info.response);
    } catch (e) {
        console.log('Error sending email:', e);
        throw new Error('failed to send email');
    }
}


const welcome_mail_member = (email, fullname) => {
    transport
    .sendMail({
        from: `Range Library <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Welcome to Range Library!",
        html: `<p>
        Hello ${fullname}! <br/>
        Welcome!! <br/><br/>
        
        Your registration was successful. You can now access your account.<br/>
        
        Range Library
        <p/>`
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

const forgot_password_mail = (email) => {
    transport
    .sendMail({
        from: `Pennysense Tracker App <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Reset Password",
        html: `<p>
        Hello ${email}. <br/>
        We recieved a request that you wished to reset your password. <br/><br/>
        
        Find attached a link to do so: <br/>
        http://localhost:5000/auth/reset_password <br/>
        
        Thank you for using Pennysense! <br/>
        <p/>`
    })
    .then((res) => console.log("email sent successfully"))
    .catch((err) => console.log(err));
};

module.exports = {
    welcome_mail_member,
    forgot_password_mail
};