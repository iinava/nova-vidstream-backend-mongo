import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/User.models.js"
import  {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser=asyncHandler(async(req,res)=>{

    //get user details from frontend

  const {username,fullname,email,password} = req.body

   //validation

  if (
    [fullname,email,username,password].some((field)=>
    field?.trim()==="")
  ) {
    throw new ApiError(400,"All fields are compulsory")
  }

   
  //check wether user aldready exit or not

  const existedUser= await User.findOne({
    $or:[{username},{email}]
  })
  console.log(existedUser,"existeduser");
  
  if (existedUser) {
    throw new ApiError(409,"User with email or username aldready exist")
    
  }
   
    //check for images
     
    const avatarlocalpath = req.files?.avatar[0]?.path
    // const coverimagelocalpath = req.files?.coverimage[0]?.path

    let coverimagelocalpath;
     
    if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
      coverimagelocalpath=req.files.coverimage[0].path
    }



    if (!avatarlocalpath) {
      throw new ApiError(400,"avatar file is mandatory /no path")
      
    }

    //upload to cloudinary ,get link
    const avatar = await  uploadOnCloudinary(avatarlocalpath)
    const coverimage = await  uploadOnCloudinary(coverimagelocalpath)

    console.log(avatar,coverimage,"uploaded")

    if (!avatar) {
      throw new ApiError(400,"avatar file is mandatory")
     }
     
    //create user object with all datas - create entry in DB

   const user =await User.create({
      fullname,
      avatar:avatar.url,
      coverimage:coverimage?.url || "",
      email,
      password,
      username:username.toLowerCase()

    })
  await user.save()   //triggers save => bcrypt
    
    // checking creation + remove password and refresh toke from response 

    const createdUser = await User.findById(user._id).select(
      "-password -refreshtoken"    //all are selected by defualt we are passing what to remove here
    )
    
    if (!createdUser) {
      throw new ApiError(500,"something went wrong while registering user")
      
    }
    

    //return response
    


    return res.status(201).json(
      new ApiResponse(200,createdUser,"user registerd succesfully")
    )






   
}) 


export {registerUser}