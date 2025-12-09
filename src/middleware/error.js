
const errorMiddleware = (err, req, res, next) => {
  // Default message and status if the error doesn't have them
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;

  // Specific MongoDB error handling (duplicate key error)
  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(", ");
    err.message = `Duplicate field(s): ${error}`;
    err.statusCode = 400;
  }

  // Handle CastError for invalid object ids in MongoDB
  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid format of field: ${errorPath}`;
    err.statusCode = 400;
  }

  // Customize the response format based on environment
  const response = {
    success: false,
    message: err.message,
  };

  return res.status(err.statusCode).json(response);
};

const TryCatch = (passedFunc) => async (req, res, next) => {
  try {
    await passedFunc(req, res, next);
  } catch (error) {
    next(error);
  }
};

export { errorMiddleware, TryCatch };
