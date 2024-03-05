import { Router } from "express";
import { registerUser,loginUser, logoutUser, refreshAccessToken} from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { verifyJwt } from "../middlewares/Auth.middlewares.js";

const router = Router()


router.route("/register").post(
    upload.fields(
        [
            {

             name:"avatar",
             maxCount:1
        
            }
        ,{
            name:"coverimage",
            maxCount:1
        }
        ]
    ),
    registerUser)


router.route("/login").post(loginUser)   

// securedroutes

router.route("/logout").post(verifyJwt,logoutUser)
router.route("/refreshAccessToken").post(refreshAccessToken)
// /54.21
export default router