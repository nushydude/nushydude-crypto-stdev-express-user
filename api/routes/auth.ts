import Sentry from "@sentry/node";
import { Request, Response } from "express";
import {
  signUpWithEmail,
  logInWithEmail,
  generateNewAccessTokenFromRefreshToken,
  deleteRefreshToken,
  sendResetPasswordEmailToUser,
  getUserByUserId
} from "../utils/db.js";

interface SignUpRequestBody {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

interface LogInRequestBody {
  email: string;
  password: string;
}

interface GenerateNewAccessTokenBody {
  refreshToken: string;
}

interface LogOutRequestBody {
  refreshToken: string;
}

interface SendResetPasswordEmailReqestBody {
  email: string;
}

interface RequestWithUser extends Request {
  userId?: string;
}

export const signUp = async (
  req: Request<{}, {}, SignUpRequestBody>,
  res: Response
) => {
  console.log("signUp");

  const { firstname, lastname, email, password } = req.body;

  try {
    const { accessToken, refreshToken, errorMessage } = await signUpWithEmail(
      firstname,
      lastname,
      email,
      password
    );

    if (errorMessage) {
      return res.status(401).json({ errorMessage });
    }

    return res.json({ accessToken, refreshToken });
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};

export const logIn = async (
  req: Request<{}, {}, LogInRequestBody>,
  res: Response
) => {
  console.log("logIn");

  const { email, password } = req.body;

  try {
    const { accessToken, refreshToken, errorMessage } = await logInWithEmail(
      email,
      password
    );

    if (errorMessage) {
      return res.status(401).json({ errorMessage });
    }

    return res.json({ accessToken, refreshToken });
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};

export const generateNewAccessToken = async (
  req: Request<{}, {}, GenerateNewAccessTokenBody>,
  res: Response
) => {
  console.log("generateNewAccessToken");

  const { refreshToken } = req.body;

  try {
    const { accessToken, errorMessage } =
      await generateNewAccessTokenFromRefreshToken(refreshToken);

    if (errorMessage) {
      return res.status(401).json({ errorMessage });
    }

    return res.json({ accessToken });
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};

export const logOut = async (
  req: Request<{}, {}, LogOutRequestBody>,
  res: Response
) => {
  console.log("logOut");

  const { refreshToken } = req.body;

  try {
    const { errorMessage } = await deleteRefreshToken(refreshToken);

    if (errorMessage) {
      return res.status(400).json({ errorMessage });
    }

    return res.status(204).send();
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};

export const sendResetPasswordEmail = async (
  req: Request<{}, {}, SendResetPasswordEmailReqestBody>,
  res: Response
) => {
  console.log("sendResetPasswordEmail");

  const { email } = req.body;

  try {
    await sendResetPasswordEmailToUser(email);

    // We don't want to send a specfic message for security reasons.
    return res.status(204).send();
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};

export const getProfile = async (req: RequestWithUser, res: Response) => {
  console.log("getProfile");

  const { userId } = req;

  if (!userId) {
    return res.status(401).json({ errorMessage: "Unauthorized" });
  }

  try {
    const user = await getUserByUserId(userId);

    if (!user) {
      return res.status(401).json({ errorMessage: "Unauthorized" });
    }

    const transformedUser = {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      settings: user.settings || {}
    };

    return res.json(transformedUser);
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};
