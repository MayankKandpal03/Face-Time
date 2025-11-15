// Custom error class
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);               
    this.status = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error handler 
// Async Wrap
export const asyncWrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

