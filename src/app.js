import express from  "express"
import cors from "cors"
import cookieParser from "cookie-parser"


//same cors(in env)

const app =express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true

}))
//express configuarations

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"20kb"}))
app.use(express.static("public"))
app.use(cookieParser())  //cookie parse to acces broweser cookies of user


//routes  import

import userRouter from './routes/user.routes.js'

//routes declaration

app.use("/api/v1/users",userRouter)

export {app}