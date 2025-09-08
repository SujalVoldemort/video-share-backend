import ApiResponse from './../utils/ApiResponse.js';
import ApiError from './../utils/ApiError.js';
import asyncHandler from './../utils/asyncHandler.js';
import jwt  from 'jsonwebtoken';
import { User } from '../models/user.model.js';


// here _ is the alternative for res
const verifyJWT = asyncHandler(async (req,_,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!token){
            throw new ApiError(401, "Unauthorized request")   
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "User does not exist")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})

export {verifyJWT};
