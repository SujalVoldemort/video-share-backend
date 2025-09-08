import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


//DB is in another continent
// always use a try catch block hand print the errors
const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        //Done to print the url, so that we know which db we have connected
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host} \n`)
    } catch (error) {
        console.log("Mongodb connection error: ", error)
        process.exit(1)
    }
}

export default connectDB;