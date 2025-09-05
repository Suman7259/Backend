// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
import express from "express"
import connectDB from "./db/index.js";
import dotenv from "dotenv"

dotenv.config({
    path:'./env'
})

const app=express()
connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`server running at: ${process.env.PORT}`);
        
    })
})
.catch((err)=>{
    console.log("Mongodb connection failed!!!",err);
})

// const app=express()
// ( async ()=>{
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//        app.on('error',()=>{
//         console.log('error',error)
//         throw error

//     })
//     app.listen(process.env.PORT,()=>{
//         console.log(`app listening on ${process.env.PORT}`)
//     })
//     } catch (error) {
//         console.error("error",error)
//         throw error
//     }
// })()