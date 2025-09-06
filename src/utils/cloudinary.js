import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret:  process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async(localFilePath)=>{
    try {
        if(!localFilePath) return null;

        //upload in cloudinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:'auto'//detect the type of file by cloudinary itself
        })
        //console.log("Cloudinary Response:", response);
        //uploaded successfully
        //console.log("file uploaded",response.url);
        fs.unlinkSync(localFilePath)
        return response
        
        
    
    } catch (error) {
        fs.unlinkSync(localFilePath)// removes the local saves temp file,as upload fails
    }
}

export {uploadOnCloudinary}