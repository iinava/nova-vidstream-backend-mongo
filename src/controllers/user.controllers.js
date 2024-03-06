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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
