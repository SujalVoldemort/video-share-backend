import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        //better for searching
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, //cloudnary url
        required: true
    },
    coverImage: {
        type: String,
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        //you can give a custom error message for required user
        required: [true, "Password is required"]
    },
    refreshToken: {
        type: String,
    },
    // New fields for enhanced authentication
    // isEmailVerified: {
    //     type: Boolean,
    //     default: false
    // },
    // emailVerificationToken: {
    //     type: String,
    // },
    // emailVerificationExpires: {
    //     type: Date,
    // },
    // passwordResetToken: {
    //     type: String,
    // },
    // passwordResetExpires: {
    //     type: Date,
    // },
    // twoFactorEnabled: {
    //     type: Boolean,
    //     default: false
    // },
    // twoFactorSecret: {
    //     type: String,
    // },
    // twoFactorRecoveryCodes: [{
    //     type: String
    // }]
}, {
    timestamps: true
})

//this are some middlewares given by mongoose

//don't use arrow function here in the callback function because it does not have the THIS context so
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}


// JWT IS A BEARER TOKEN : whoever has it will get the access

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        //payload
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        })
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

// the word User is transformed to users in mongo
export const User = mongoose.model("User", userSchema)