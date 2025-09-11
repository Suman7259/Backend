import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessandRefreshTokens =async(userId)=>{
    try {
       const user= await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
       
       user.refreshToken = refreshToken
       await user.save({validateBeforeSave:false})

       return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating Access and refresh tokens")
    }
}

//1-here we extracted data points
const registerUser = asyncHandler(async(req,res)=>{
    // console.log('Request.Body: ',req.body);
    const{fullName,username,email,password} = req.body
    //console.log('email',email);
    

    //2- is there any empty strings passed by user
    if([fullName,username,email,password].some((field)=>field?.trim()==="")){ //if field exists trim it,if not leave
        throw new ApiError(400,"All field are required")
    }

    //3-user email or username unique or not
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    //console.log(existedUser);
    

    if(existedUser){
        throw new ApiError(409,"email or username already exists")
    }
    //console.log(req.files);

    //4 - now upload avatar in cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path

    //5 - now upload coverImage in cloudinary,various ways discussed below.

    //const coverImageLocalPath = req.files?.coverImage[0]?.path //this just doesnot check coverImage exists or not ,so error comes like can't read properties of undefined.

    //const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    // this checks for cover image exists or not first ,that solves that error

    //{ req.file looks kie this:
    //   avatar: [
    //     { fieldname: 'avatar', path: 'public/temp/avatar123.png', ... }
    //   ],
    //   coverImage: [
    //     { fieldname: 'coverImage', path: 'public/temp/cover456.jpg', ... }
    //   ]
    // }

    //safest way to it
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) &&  req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required1")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required2")
    }

    //6-creating user object
   const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    //7-remove password and refreshtoken from recieved values
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering user")
    }

    //Now,send confirmation msg
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )
})

const loginUser= asyncHandler(async(req,res)=>{
    
    const {email,username,password}=req.body

    if(!username && !email){
        throw new ApiError(400,"username or email required")
    }

    const user = await User.findOne({
        $or:[{email}, {username}]
    })

    if(!user){
        throw new ApiError(404,"user doesn't exist ")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,'password entered is wrong')
    }

    const {accessToken,refreshToken} = await generateAccessandRefreshTokens(user._id)
     
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },
        "user loggedin successfully"
    ))
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    //jwt.verify() return value is just a plain JS object (the payload you signed, plus iat and exp).
    //here we will know that the token user has, was made from my secret code
    try {
        const decodedToken = jwt.verify( incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
             throw new ApiError(401,"Invalid refresh token")
        }
    
        //cheak incoming refresh token and stored refresh token in db
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"user token expired or used")
        }
    
        const {accessToken,newRefreshToken}=await generateAccessandRefreshTokens(user._id)
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"
    
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh token")
    }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    //we dont need to verify that user is signed it or not bcz we can use,verify jwt middleware to check if user is verified or not

    const {oldPassword,newPassword} = req.body

    //in auth middleware we have assigned req.user,we are accessing id from that 
    const user=await User.findById(req.user?._id)

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordCorrect){
        throw new ApiError(400,"inavlid password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200,{},"password changed successfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200)
        .json(new ApiResponse(200),
        {"current user":req.user},
        "Current user fetched successfully"
)
})

const updateUserDetails = asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullName,
            email
        }
    },
    {
        new:true
    }
).select("-password")

return res.status(200)
.json(new ApiResponse(
    200,
    user,
    "Account details updated"
))
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file missing")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar in cloudinary")
    }

     const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image file missing")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading coverImage in cloudinary")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"coverImage updated successfully"))
})

const userChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"
                }
        },
        {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
                }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                channelSubscribedToCount:{
                    $size:"subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        //it just checks that user is there in $subscribers.subscriber (subscribers is array,subscriber is the field)
                        then:true,
                        else:false
                    }
                }
                
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                isSubscribed:1,
                subscriberCount:1,
                channelSubscribedToCount:1,
                avatar:1,
                coverImage:1,
                email:1,
            
        }
            
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel doesnot exists")
    }
    return res.status(200)
    .json(new ApiResponse(200,
        channel[0],
        "User channel fetched successfully"
    ))
})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                               
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                 $first:"$owner"
                            }                
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200,
        user[0].watchHistory,
        "watch history fetched successfully"
    ))
})
export { registerUser,
         loginUser,
         logoutUser,
         refreshAccessToken,
         changeCurrentPassword,
         getCurrentUser,
         updateUserDetails,
         updateUserAvatar ,
         updateUserCoverImage,
         userChannelProfile }