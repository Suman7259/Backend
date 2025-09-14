import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!videoId){
        throw new ApiError(401,"Video not available")
    }
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content} = req.body

    if(!videoId){
        throw new ApiError(401,"Video not available")
    }
    if(!content || content.trim()===""){
        throw new ApiError(401,"comment not available")
    }

    const comment=await Comment.create({
        content,
        video:videoId,
        owner:req.user?._id
    })

    return res.status(200)
        .json(new ApiResponse(200),
        comment,
        "comment added successfully")
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {content} = req.body

    if(!commentId){
        throw new ApiError(404,"comment not found")
    }
    if(!content || content.trim()===""){
        throw new ApiError(401,"comment cannot be updated")
    }

    const comment = await Comment.findOneAndUpdate({
        _id:commentId,
        owner:req.user?._id,    
    },
    {$set:{content}},
    {
        new:true
    })

    if (!comment) {
        throw new ApiError(404, "Comment not found or not authorized");
    }

    return res.status(200)
    .json(new ApiResponse(200),comment,"comment updated succesfully")


})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId}=req.params

    if(!commentId){
        throw new ApiError(404,"comment not found")
    }

    const comment=await Comment.findOneAndDelete({
        _id:commentId,
        owner:req.user?._id
    })

     if (!comment) {
        throw new ApiError(404, "Comment not found or not authorized");
    }

    return res.status(200)
    .json(new ApiResponse(200,comment,"comment deleted successfully"))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }