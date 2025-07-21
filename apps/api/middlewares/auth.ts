import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface UserPayload {
  id: string;
  username: string;
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload | JwtPayload;
  token?: string;
}

// Generate token middleware
export function generateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = req.user as UserPayload;

  const payload: UserPayload = {
    id: user.id,
    username: user.username,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });

  req.token = token;
  next();
}

// Middleware to verify token on protected routes
export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return; // ✅ Ensure the function returns here
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err) {
      console.log("Token verification error:", err.message);
      res.status(401).json({ message: "Unauthorized", error: err.message });
      return; // ✅ Return to satisfy the 'void' return type
    }

    req.user = decoded as JwtPayload;
    next();
  });
}

