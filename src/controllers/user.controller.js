import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async(req,res)=>{
    const{fullName,username,email,password} = req.body
    console.log('email',email);
    
})

export {registerUser}