import mongoose, { Schema } from "mongoose";
import { Jwt } from "jsonwebtoken";
import bcrypt from "bcrypt"



const userSchema = new Schema(
    {
 username:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true
 },
 email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
 },
 fullname:{
    type:String,
    required:true,
    trim:true,
    index:true
 },
 avatar:{
    type:String, // cloudinary url will be used
    required:true,
   
 },
 coverimage:{
    type:String, // cloudinary url will be used
 },

 watchhistory:[
    {type:Schema.Types.ObjectId,
    ref:"video"}
 ],
 password:{
    type:String,
    required:[true,'password is required']
 },
 refreshtoken:{
    type:String
 },


}
,{timestamps:true})


userSchema.pre("save", async function(next)
{
    if (this.isModified("password")) return next(); //makes sure password is encrpyted only when password field is modified 
    this.password= await bcrypt.hash(this.password,10)   //bcrypt encryts the password  while saving
    next();
}
)

userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password,this.password)                 //for checking password , return true if both are same
}


userSchema.methods.generateaccesstoken =  function(){
  return  jwt.sign(
        {
        _id:this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
   }
    )
 }
userSchema.methods.generaterefreshtoken =  function(){
   return  jwt.sign(
      {
      _id:this._id,
      email:this.email,
      username:this.username,
      fullname:this.fullname

  },
  process.env.REFRESH_TOKEN_SECRET,
  {
    expiresIn:process.env.REFRESH_TOKEN_EXPIRY
 }
  )
 }

export const User = mongoose.model("User",userSchema)