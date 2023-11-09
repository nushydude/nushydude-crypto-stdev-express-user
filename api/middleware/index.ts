import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface RequestWithUser extends Request {
  userId?: string;
}

export const validateBearerToken = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res
      .status(401)
      .json({ errorMessage: "Authorization header is missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token || authHeader.split(" ")[0] !== "Bearer") {
    return res.status(401).json({
      errorMessage: "Invalid authorization format. Expected: Bearer [token]",
    });
  }

  try {
    const { userId } = jwt.verify(
      token,
      process.env.JWT_SECRET_ACCESS_TOKEN
    ) as {
      userId: string;
    };

    if (!userId) {
      return res
        .status(401)
        .json({ errorMessage: "Invalid authorization token" });
    }

    req.userId = userId;
  } catch (err) {
    return res
      .status(401)
      .json({ errorMessage: "Invalid authorization token" });
  }

  next();
};
