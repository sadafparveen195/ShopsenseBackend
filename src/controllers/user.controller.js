import { ErrorHandler } from "../utils/ErrorHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import GenerateAndSendVerificationEmail from "../utils/sendEmailVerification.js";
import { TryCatch } from "../middleware/error.js";

// 🔹 Generate access & refresh tokens
const generateAccessAndRefreshToken = async (userId, next) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        return next(new ErrorHandler(500, "Error generating access and refresh tokens"));
    }
};

// 🔹 Register User
const registerUser = TryCatch(async (req, res, next) => {
    const { fullName, email, username, password, phoneNo, about } = req.body;

    // 🔹 Required field validation (about removed)
    if (
        [fullName, username, password].some((field) => !field?.trim()) ||
        (!email && !phoneNo)
    ) {
        return next(new ErrorHandler(400, "Full name, username, and password are required"));
    }

    const queryConditions = [{ username }];
    if (email) queryConditions.push({ email });
    if (phoneNo) queryConditions.push({ phoneNo });

    const existingUser = await User.findOne({ $or: queryConditions });
    if (existingUser) {
        return next(new ErrorHandler(409, "User already exists"));
    }

    const localFilePathAvatar = req.files?.avatar?.[0]?.path;
    if (!localFilePathAvatar) {
        return next(new ErrorHandler(400, "Avatar file is required"));
    }

    const avatar = await uploadOnCloudinary(localFilePathAvatar);
    if (!avatar) {
        return next(new ErrorHandler(400, "Avatar upload failed"));
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        avatarId: avatar.public_id,
        email,
        phoneNo,
        password,
        username: username.toLowerCase(),
        about: about?.trim() || "", // ✅ optional field handled here
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        return next(new ErrorHandler(500, "Error creating user"));
    }

    if (email) {
        GenerateAndSendVerificationEmail(createdUser);
        return res.status(201).json({
            success: true,
            message: "Verification email sent to your email address",
        });
    }

    if (phoneNo) {
        return res.status(201).json({
            success: true,
            message: "Phone number registration successful",
        });
    }
});


// 🔹 Email Verification
const emailVerification = TryCatch(async (req, res, next) => {
    const { token, id } = req.params;

    try {
        const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
        if (!decoded) {
            return next(new ErrorHandler(400, "Invalid or expired token"));
        }

        const user = await User.findById(id);
        if (!user) {
            return next(new ErrorHandler(404, "User does not exist"));
        }

        if (user.isVerified) {
            return next(new ErrorHandler(400, "User is already verified"));
        }

        user.isVerified = true;
        await user.save({ validateBeforeSave: true });

        return res.status(200).json({
            success: true,
            message: "Email verification successful",
        });
    } catch (error) {
        return next(new ErrorHandler(500, `Verification failed: ${error.message}`));
    }
});

// 🔹 Login User
const loginUser = TryCatch(async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return next(new ErrorHandler(400, "Username and password are required"));
    }

    const user = await User.findOne({ username });
    if (!user) return next(new ErrorHandler(404, "User not found"));

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        return next(new ErrorHandler(400, "Incorrect password"));
    }

    if (!user.isVerified) {
        await GenerateAndSendVerificationEmail(user);
        return next(new ErrorHandler(403, "Account not verified. Verification email sent."));
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id, next);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const cookieOptions = {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json({
            success: true,
            message: "User logged in successfully",
            data: { loggedInUser, refreshToken, accessToken },
        });
});

// 🔹 Logout User
const logoutUser = TryCatch(async (req, res, next) => {
    if (!req.user?._id) {
        return next(new ErrorHandler(400, "User not found or already logged out"));
    }

    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: undefined } });

    const options = {
        httpOnly: true,
        sameSite: "none",
        secure: "none",
        path: "/",
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json({ success: true, message: "User logged out successfully" });
});

// 🔹 Refresh Token
const refreshAccessToken = TryCatch(async (req, res, next) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        return next(new ErrorHandler(401, "Unauthorized request"));
    }

    let decodedRefreshToken;
    try {
        decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        return next(new ErrorHandler(401, "Invalid or expired refresh token"));
    }

    const user = await User.findById(decodedRefreshToken._id);
    if (!user) {
        return next(new ErrorHandler(401, "Invalid refresh token"));
    }

    if (incomingRefreshToken !== user.refreshToken) {
        return next(new ErrorHandler(401, "Refresh token expired or used"));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id, next);

    const options = {
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
        path: "/",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json({
            success: true,
            data: { newAccessToken: accessToken, newRefreshToken: refreshToken },
            message: "Access token refreshed successfully",
        });
});

// 🔹 Change Password
const changeCurrentPassword = TryCatch(async (req, res, next) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if ([oldPassword, newPassword, confirmPassword].some((f) => !f)) {
        return next(new ErrorHandler(400, "Please fill all fields"));
    }

    if (newPassword !== confirmPassword) {
        return next(new ErrorHandler(400, "Passwords do not match"));
    }

    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        return next(new ErrorHandler(401, "Incorrect old password"));
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "Password changed successfully" });
});

// 🔹 Get Current User
const getCurrentUser = TryCatch(async (req, res, next) => {
    if (!req.user) return next(new ErrorHandler(401, "User not logged in"));

    return res.status(200).json({
        success: true,
        data: req.user,
        message: "Current user fetched successfully",
    });
});

// 🔹 Update Account
const updateAccountDetails = TryCatch(async (req, res, next) => {
    const { fullName } = req.body;
    if (!fullName) {
        return next(new ErrorHandler(400, "Full name is required"));
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { fullName } },
        { new: true }
    ).select("-password");

    return res.status(200).json({
        success: true,
        data: user,
        message: "Account details updated successfully",
    });
});

// 🔹 Delete Account
const deleteUserAccount = TryCatch(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.user._id);
    if (!user) return next(new ErrorHandler(404, "User not found"));

    await deleteFromCloudinary(user.avatarId);
    return res.status(200).json({ success: true, message: "Account deleted successfully" });
});

// 🔹 Update Profile Image
const updateProfileImage = TryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    const localFilePathAvatar = req.files?.avatar?.[0]?.path;

    if (!localFilePathAvatar) {
        return next(new ErrorHandler(400, "Avatar file is required"));
    }

    const newAvatar = await uploadOnCloudinary(localFilePathAvatar);
    if (!newAvatar) {
        return next(new ErrorHandler(400, "Avatar upload failed"));
    }

    await deleteFromCloudinary(user.avatarId);

    user.avatar = newAvatar.url;
    user.avatarId = newAvatar.public_id;
    await user.save({ validateBeforeSave: true });

    return res.status(200).json({
        success: true,
        data: user,
        message: "Profile image updated successfully",
    });
});

export {
    registerUser,
    emailVerification,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    deleteUserAccount,
    updateProfileImage,
};