import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

//configuration for data from json,forms and URLs

app.use(express.json({limit:"16kb"}))

app.use(express.urlencoded({extended:true,limit:"16kb"}))

//to keep files,images ,folders in local
app.use(express.static("public"))

//server performs "crud" operations on cookies on users browser
app.use(cookieParser())

export {app}