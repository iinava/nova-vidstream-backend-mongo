import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { json } from "express";
import jwt from "jsonwebtoken";

//method to run both token creations together

const generateAccesAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend

  const { username, fullname, email, password } = req.body;

  //validation

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are compulsory");
  }

  //check wether user aldready exit or not

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  console.log(existedUser, "existeduser");

  if (existedUser) {
    throw new ApiError(409, "User with email or username aldready exist");
  }

  //check for images

  const avatarlocalpath = req.files?.avatar[0]?.path;
  // const coverimagelocalpath = req.files?.coverimage[0]?.path

  let coverimagelocalpath;

  if (
    req.files &&
    Array.isArray(req.files.coverimage) &&
    req.files.coverimage.length > 0
  ) {
    coverimagelocalpath = req.files.coverimage[0].path;
  }

  if (!avatarlocalpath) {
    throw new ApiError(400, "avatar file is mandatory /no path");
  }

  //upload to cloudinary ,get link
  const avatar = await uploadOnCloudinary(avatarlocalpath);
  const coverimage = await uploadOnCloudinary(coverimagelocalpath);

  console.log(avatar, coverimage, "uploaded");

  if (!avatar) {
    throw new ApiError(400, "avatar file is mandatory");
  }

  //create user object with all datas - create entry in DB

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  await user.save(); //triggers save => bcrypt

  // checking creation + remove password and refresh toke from response

  const createdUser = await User.findById(user._id).select(
    "-password -refreshtoken" //all are selected by defualt we are passing what to remove here
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering user");
  }

  //return responsezzz

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registerd succesfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //take body->data

  const { email, username, password } = req.body;

  //username or email

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }
  //finding user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  //checking passwords using custom method by becrypt

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  //accces and refresh token generation

  const { accessToken, refreshToken } = await generateAccesAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );

  //sent cookies
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, " refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } = await generateAccesAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        ApiResponse(
          200,
          { accessToken, newrefreshToken },
          "accessToken refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refreshToken");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldpassword, newpassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldpassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old [assword");
  }

  user.password = newpassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed succesfully"));
});

//solely on middleware
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetch successfully"));
});

const accountUpdatedetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//file updation

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarlocalpath = req.file?.path;

  if (!avatarlocalpath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarlocalpath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar to cloudinary");
  }

  const user = User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url, //we got object we want url only
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverimagelocalpath = req.file?.path;

  if (!coverimagelocalpath) {
    throw new ApiError(400, "coverimage file is missing");
  }
  const coverimage = await uploadOnCloudinary(coverimagelocalpath);

  if (!coverimage.url) {
    throw new ApiError(400, "Error while uploading coverimage to cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverimage: coverimage.url, //we got object we want url only
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"));
});

const getuserchannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim) {
    throw new ApiError(400, "username is misssing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTO",
      },
    },
    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
      },
      channelsSubscribedToCount: { $size: "$subscribedTo" },
      isSubscribed: {
        $cond: {
          if: { $in: [req.user?._id, "$subscribers.subscriber"] },
          then: true,
          else: false,
        },
      },
    },
    {
      $project:{
        fullname:1,
        username:1,
        channelsSubscribedToCount:1,
        subscriberCount:1,
        isSubscribed:1,
        avatar:1,
        coverimage:1,
        email:1,



      }
    }
  ]);
  if (!channel?.length) {
    throw new ApiError(404,"channel does not exist")
    
  }
  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  accountUpdatedetails,
  updateUserAvatar,
  updateUserCoverImage,
  getuserchannelProfile,
};
