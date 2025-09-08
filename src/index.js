import dotenv from "dotenv"

//more professional level of doing it
dotenv.config({
    path:'./.env'
})
// another way
// dotenv.config()

import express from "express";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import { DB_NAME } from "./constants.js";
import { app } from "./app.js";

const port = process.env.PORT;


connectDB().then(()=>{

    //for listening to any errors we use
    app.on("error",(error)=>{
        console.log("Error occured in app: ", error)
        throw error
    })

    app.listen(port,()=>{
        console.log(`Server running on port ${port}.`)
    })

}).catch((err)=>{
    console.log("Mongodb connection failed:", err)

})








//iife way to connect db and start app instantly with try catch
// this way you can setup the app and connect db for smaller projects
// (async ()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error)=>{
//             console.log("Error: ", error)
//             throw error
//         })

//         app.get("/",(req,res)=>{
//             res.send("Hello world sujal here")
//         });
        
//         app.listen(port, ()=>{
//             console.log(`Server running on ${port}.`)
//         })
//     } catch (error) {
//         console.log(error)
//         throw error
//     }
// })()



