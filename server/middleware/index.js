const paginate = (req, res, next) => {
  req.page = parseInt(req.query.page) || 1;
  req.pageSize = parseInt(req.query.pageSize) || 10;
  next();
};

export { paginate };
