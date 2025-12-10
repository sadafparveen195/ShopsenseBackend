import jwt from "jsonwebtoken";
import { createTransport } from "nodemailer";

const GenerateAndSendVerificationEmail = async (user) => {
  try {
    const { _id, email, fullName } = user; // Extract necessary fields from the user object

    const verificationToken = jwt.sign({ id: _id }, process.env.EMAIL_VERIFICATION_SECRET, {
      expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY,
    });

    const verificationLink = `${process.env.DOMAIN}/api/v1/users/verify-email/${_id}/${verificationToken}`;

    const transporter = createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });

    // Define mail options
    const mailOptions = {
      from: process.env.MY_MAIL,
      to: email,
      subject: "✅ Verify Your Email Address",
      html: `
    <div style="
      max-width: 600px;
      margin: 0 auto;
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f9f9f9;
      padding: 20px;
      color: #333;
    ">
      <div style="
        background-color: #ffffff;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.08);
      ">
        <h2 style="color: #4f46e5; text-align: center;">
          Email Verification
        </h2>

        <p>Hi <strong>${fullName}</strong>,</p>

        <p>
          Thank you for signing up! 🎉  
          Please confirm your email address by clicking the button below.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}"
             style="
               background-color: #4f46e5;
               color: #ffffff;
               padding: 12px 24px;
               text-decoration: none;
               border-radius: 6px;
               font-size: 16px;
               display: inline-block;
             ">
            Verify Email
          </a>
        </div>

        <p>
          If you didn’t create an account, you can safely ignore this email.
        </p>

        <p style="margin-top: 30px;">
          Thanks,<br/>
          <strong>SHOPIT Team</strong>
        </p>
      </div>

      <p style="
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 15px;
      ">
        © ${new Date().getFullYear()} Your App Name. All rights reserved.
      </p>
    </div>
  `,


    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending verification email: ${error.message}`);
  }
};

// Ensure proper export
export default GenerateAndSendVerificationEmail;
