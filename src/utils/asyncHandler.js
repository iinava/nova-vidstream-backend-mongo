// const asyncHandler=()=>{}

export {asyncHandler}



// try catch wrapper ie common code

const asyncHandler=(fn)=>async(req,res,next)=>{
    try {
        
        await fn(req,res,next)
    } catch (error) {

        res.status(err.code || 500).json({
            success:false,
            message:err.message
        })
        
    }
}


// ___________________________________________________________________________

//promises version either one of this used as utility function 


// const asyncHandler= (requestHandler)=>{
//     (req,res,next)=>{
//         Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
//     }
    
// }