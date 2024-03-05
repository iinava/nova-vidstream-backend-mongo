import { Router } from "express";
import { registerUser,loginUser, logoutUser} from "../controllers/user.controllers.js";
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

router.route("/logut").post(verifyJwt,logoutUser)
// /54.21
export default router