import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from "../models/User.models";

export const verifyJwt = asyncHandler(async(req,res,next)=>{

   try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
 
     if (!token) {
         throw new ApiError(401,"unauthorized request")
     }
 
     const decodedToken =  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
 
      const user =  User.findById(decodedToken?._id).select("-passsword -refreshToken")
      
      if(!user){
         throw new ApiError(401,"invalid access token")
      }
 
     req.user =user;
     next()
   } catch (error) {
    throw new ApiError(401,error?.message,"invalid access token")
    
   }
    })