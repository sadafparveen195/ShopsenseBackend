import { Router } from "express";
import { registerUser, emailVerification, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, deleteUserAccount, updateProfileImage } from "../controllers/user.controller.js"
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
const router = Router()

router.route("/").post((req, res) => {
    res.json({ message: "POST request received at /" });
});
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)
router.route("/verify-email/:id/:token").get(emailVerification)
router.route("/refresh-token").post(refreshAccessToken)
// //secured routes 
router.route("/logout").get(verifyJWT, logoutUser)
router.route("/update-password").post(verifyJWT, changeCurrentPassword)
router.route("/me").get(verifyJWT, getCurrentUser)
router.route("/update-account-details").post(verifyJWT, updateAccountDetails)
router.route("/delete-me").get(verifyJWT, deleteUserAccount)
router.route("/update-avatar").post(upload.fields([{ name: "avatar", maxCount: 1 }]), verifyJWT, updateProfileImage)

export default router;