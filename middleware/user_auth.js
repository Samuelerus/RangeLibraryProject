const User = require('../models/user');
const jwt = require('jsonwebtoken');

const check_jwt_token =  async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).send({ status: 'error', msg: "No token provided" });
  }
  if (token.expiresIn < Date.now()) {
    return res.status(401).send({ status: 'error', msg: "Token expired" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const { suspended, is_verified } = req.user;
    if (is_verified === false) {
      return res.status(401).send({ status: 'error', msg: "Your account is not activated" })
    }
    if (suspended === true) {
      return res.status(401).send({ status: 'error', msg: "Your account is suspended. Contact admin" })
    }
    next();
  } catch (e) {
    console.error("Some error occurred ----->>>", e);
    if (e.name === 'TokenExpiredError') {
      // Decode token to get user_id
      const decoded = jwt.decode(token);
      if (decoded && decoded.user_id) {
        await User.findByIdAndUpdate(decoded.user_id, { is_online: false });
      }
      return res.status(401).send({ status: 'error', msg: "Token expired" });
    }
    return res.status(401).send({ status: "error", msg: "Invalid token", error: e.message });
  }
};

module.exports = check_jwt_token;