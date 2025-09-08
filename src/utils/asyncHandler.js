// const asyncHandler = () =>{}
// const asyncHandler = (func) => { ()=>{} }
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () =>{}

// Try catch version
const asyncHandler = (fn) => async (req,res,next) => {
    try {
        await fn(req,res,next)
    } catch (error) {
        console.log(error)
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })
    }
}

// Promise based handler
const asyncHandler1 = (requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).
        catch((err)=> next(err))
    }
}

export default asyncHandler;