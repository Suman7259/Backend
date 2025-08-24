const asyncHandler=(requestHandler)=>{
    //requestHandler(req, res, next) → runs your route handler
    //Promise.resolve(...) → makes sure it’s treated like a Promise, whether it’s async or not
    //.catch((err) => next(err)) → if the handler throws or rejects, the error is passed to Express’s error-handling middleware
    //In Express, a middleware is just a function that has this shape : (req, res, next) => { ... } 
    //req → the request object (data coming from client)
    //res → the response object (used to send data back)
    //next → a function that passes control to the next middleware in the chain

   return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=>next(err)) 
        //If the promise rejects (error happens), it calls next(err).In Express, calling next(err) sends the error to your global error-handling middleware.


    }
}

export {asyncHandler}

//const asyncHandler=()=>{}
// const asyncHandler=(func)=>{}
// const asyncHandler=(func)=>{ ()=>{} }
// const asyncHandler=(func)=>{ async()=>{} }
// const asyncHandler = (func) => () => {} 

// const asyncHandler = (fn) => async(req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success:false,
//             message:error.message
//         })
//     }
// } 