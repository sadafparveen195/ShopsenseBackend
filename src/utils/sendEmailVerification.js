import jwt from "jsonwebtoken";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const GenerateAndSendVerificationEmail = async (user) => {
  try {
    const { _id, email, fullName } = user;

    const verificationToken = jwt.sign(
      { id: _id },
      process.env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY }
    );

    const verificationLink = `${process.env.DOMAIN}/api/v1/users/verify-email/${_id}/${verificationToken}`;

    await resend.emails.send({
     from: "ShopSence <noreply@shopsence.com>"
,
      to: email,
      subject: "Email Verification",
      html: `
         
        <h3>Hello ${fullName},</h3>
        <p>Please verify your email by clicking below:</p>
        <a href="${verificationLink}">Verify Email</a>
      `,
    });

    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending verification email: ${error.message}`);
  }
};

export default GenerateAndSendVerificationEmail;
