import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadImageOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from './../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        console.log(user)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    /*
    Register new user 
    Route: POST /api/v1/users/register
    Access: Public
    steps involved are 
    get data from frontend
    validate data : not empty
    check if user already exists : username and email
    check for images, check for avatar
    upload them to cloudinary
    check if multer saved the image
    create user object - create entry in database
    remove password and refresh token from the response 
    check for user creation success or failure
    return response to frontend
    */

    const { fullName, username, email, password } = req.body;

    if ([fullName, username, email, password].some((field) => field?.trim() == "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] })
    if (existingUser) {
        throw new ApiError(400, "User already exists")
    }

    // console.log("Clear till here");


    //comes from multer middleware
    // console.log("Starting here",req.files, "ending here");
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.cover?.[0]?.path


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatarCloudinary = await uploadImageOnCloudinary(avatarLocalPath)
    const coverCloudinary = await uploadImageOnCloudinary(coverLocalPath)

    if (!avatarCloudinary) {
        throw new ApiError(400, "Failed to upload image to cloudinary")
    }

    console.log(coverCloudinary)

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatarCloudinary.url,
        coverImage: coverCloudinary?.url || "",
    })
    console.log(user)

    const checkUser = await User.findById(user._id).select("-password -refreshToken")
    if (!checkUser) {
        throw new ApiError(500, "User not created")
    }

    return res.status(201).json(
        new ApiResponse(200, checkUser, "User created successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {

    /* 
    1. Get the form data
    2. Apply validations on inputs
    3. Find user in DB
    4. Verify password
    5. Handle invalid credentials
    6. when valid generate tokens
    7. send secure cookies
    */

    const { username, email, password } = req.body

    // one is required
    //if(!username && !email)
    // both are required
    if (!username || !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Password is not correct")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)


    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1 //this removes the field from document
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                null,
                "User logged out successfully"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized access")
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "User does not exist")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token !!!")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, { accessToken: accessToken, refreshToken: refreshToken },
                    "AccessToken Refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token !!!")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    if(!oldPassword || !newPassword){
        throw new ApiError(401,"Send old password and new password")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, { user: req.user }, "Here is the user"))
})

const updateAccount = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName && !email) {
        throw new ApiError(400, "All fields are empty")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullName,
            email: email
        }
    }, { new: true }).select("-password")

    return res.status(200).json(new ApiResponse(200, { user }, "Account details updated successfully"))

})


//always create a seperate controller for updating files 
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(404, "Avatar file is missing")
    }

    const avatar = await uploadImageOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading to cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    //Delete old image

    return res.status(200).json(new ApiResponse(200, {}, "Avatar updated successfully"))

})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverLocalPath = req.file?.path

    if (!coverLocalPath) {
        throw new ApiError(401, "Cover image is missing")
    }

    const cover = await uploadImageOnCloudinary(coverLocalPath)
    if (!cover.url ) {
        throw new ApiError(500, "Error while uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            coverImage: cover.url
        },
        { new: true }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, {}, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim) {
        throw new ApiError(400, "Username is missing")
    }


    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist")
    }

    return res.status(200).json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                watchHistory: 1
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user, "Watch history fetched successfully"))
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    //protected routes
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccount,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
};