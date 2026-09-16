module.exports = function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400);
      return next(new Error(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")));
    }
    req.body = result.data;
    next();
  };
};
