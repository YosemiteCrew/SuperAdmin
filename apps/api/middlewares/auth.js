import jwt from 'jsonwebtoken';

// Generate token middleware
function generateToken(req, res, next) {
  const user = req.user; // Set earlier during login validation

  const payload = {
    id: user.id,
    username: user.username,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

  req.token = token;
  next();
}

// Middleware to verify token on protected routes
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Token verification error:", err.message);
      return res
        .status(401)
        .json({ message: "Unauthorized", error: err.message });
    } else { /* empty */ }

    req.user = decoded; // Attach the decoded user information to the request
    next(); // Proceed to the next middleware or route handler
  });
}





module.exports = {
  generateToken,
  verifyToken,
};