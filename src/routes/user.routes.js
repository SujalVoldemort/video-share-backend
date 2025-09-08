import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, updateUserAvatar, getCurrentUser, updateAccount, updateCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "cover", maxCount: 1 }
]), registerUser)

router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

//protected routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/update-password").post(verifyJWT, changeCurrentPassword)
router.route("/get-current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccount)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/get-channel-profile/:username").get(verifyJWT, getUserChannelProfile)
router.route("/get-watch-history").get(verifyJWT, getWatchHistory)

export default router