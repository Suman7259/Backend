import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessandRefreshTokens=async(userId)=>{
    try {
       const user= await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
       
       user.refreshToken=refreshToken
       await user.save({validateBeforeSave:false})

       return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating Access and refresh tokens")
    }
}

//1-here we extracted data points
const registerUser = asyncHandler(async(req,res)=>{
    const{fullName,username,email,password} = req.body
    //console.log('email',email);
    //console.log('Request.Body: ',req.body);

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

    if(!username || !email){
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

    const {accessToken,refreshToken} = user.generateAccessandRefreshTokens(user._id)
     
    const loggedInUser= User.findById(user._id).select("-password -refreshToken")

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
export {registerUser,loginUser,logoutUser}