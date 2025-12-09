import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ErrorHandler } from "../utils/ErrorHandler.js"; // ✅ Use default import unless you export named

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true, // ✅ Prevents duplicate key errors for null
      validate: {
        validator: function () {
          return this.email || this.phoneNo; // ✅ Either email or phoneNo required
        },
        message: "Either email or phone number is required.",
      },
    },

    phoneNo: {
      type: String,
      unique: true,
      sparse: true, // ✅ Allows multiple nulls
      validate: {
        validator: function () {
          return this.phoneNo || this.email;
        },
        message: "Either phone number or email is required.",
      },
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    avatar: {
      type: String,
      required: true,
    },

    avatarId: {
      type: String,
    },
    about: {
      type: String,
      trim: true,
      default: "",

    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    refreshToken: {
      type: String,
    },
  },
  { timestamps: true } // ✅ Automatically adds createdAt & updatedAt
);

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ Compare password method
userSchema.methods.isPasswordCorrect = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new ErrorHandler(500, "Error comparing passwords");
  }
};

// ✅ Generate Access Token
userSchema.methods.generateAccessToken = function () {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET not defined in environment variables");
  }

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m", // ✅ fallback
    }
  );
};

// ✅ Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET not defined in environment variables");
  }

  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d", // ✅ fallback
    }
  );
};

export const User = mongoose.model("User", userSchema);
