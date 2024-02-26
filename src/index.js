import mongoose  from "mongoose";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`server is runnig at :${process.env.PORT}`);
    })
})
.catch((err)=>{

    console.log("MONGO db connection failed !!!",err);
})








/*
import express from "express"
const app = express()

(async()=>{
    
try {
    mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
    app.on("error",(error)=>{
        console.log("error",error);
        throw error
    })
    app.listen(process.env.PORT,()=>{
        console.log(`app is listening on port ${process.env.PORT}`);
    })
} catch (error) {
    console.error("error",error)
    throw error
}
})()

*/