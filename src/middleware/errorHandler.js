const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    data: null
  });
};

module.exports = errorHandler;
