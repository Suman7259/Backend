class ApiError extends Error{
    constructor(
        //parameters
        statusCode,
        message="something went wrong",
        errors=[],
        stack=""
    ){
        stack(message)
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=false
        this.errors=errors

        if (stack) {
            this.stack=stack
        } else {
            Error.captureStackTrace(this,this.constructor)
        }
    }

}

export {ApiError}