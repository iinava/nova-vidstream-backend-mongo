class ApiError extends Error {
    constructor(
        statuscode,
        message="something went wrong",
        errors=[],
        stack=""
    ){
        super(message)
        this.statuscode= statuscode
        this.data=null,
        this.message=message
        this.success=false;
        this.errors=errors

        //if else part aint imp

        if (stack) {
            this.stack=stack
            
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}