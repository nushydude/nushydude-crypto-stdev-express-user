import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import Sentry from "@sentry/node";
import isEmail from "validator/lib/isEmail.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendEmail } from "./notification.js";

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

export const signUpWithEmail = async (
  firstname: string,
  lastname: string,
  email: string,
  password: string
) => {
  if (!firstname) {
    // TODO: define custom error
    throw new Error("First name is required");
  }

  if (!lastname.length) {
    // TODO: define custom error
    throw new Error("Last name is required");
  }

  // TODO: find out why
  // @ts-expect-error
  if (isEmail(email) === false) {
    // TODO: define custom error
    throw new Error("Invalid email address");
  }

  if (password.length < 8) {
    // TODO: define custom error
    throw new Error("Password must be at least 8 characters");
  }

  const client = new MongoClient(process.env.DB_CONNECTION_STRING, {
    serverApi: ServerApiVersion.v1
  });

  let accessToken;
  let refreshToken;
  let errorMessage;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.connect();

    const usersCollection = client.db(process.env.DB_NAME).collection("users");

    // insert user to users collection
    const result = await usersCollection.insertOne({
      firstname,
      lastname,
      email: email.toLowerCase(),
      hashedPassword,
      createdAt: new Date()
    });

    const userId = result.insertedId;

    // generate access token
    accessToken = jwt.sign(
      { userId: userId.toString() },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // generate refresh token
    refreshToken = jwt.sign(
      { userId: userId.toString() },
      process.env.JWT_SECRET_REFRESH_TOKEN,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // store the refresh token in refreshtokens collection with userId
    const refreshtokensCollection = client
      .db(process.env.DB_NAME)
      .collection("refreshtokens");

    await refreshtokensCollection.insertOne({
      userId,
      refreshToken
    });
  } catch (error) {
    Sentry.captureException(error);

    // extract to functions
    if (error.code === 11000) {
      errorMessage = "Email address already exists";
    } else if (error.message === "First name is required") {
      errorMessage = "First name is required";
    } else if (error.message === "Last name is required") {
      errorMessage = "Last name is required";
    } else if (error.message === "Invalid email address") {
      errorMessage = "Invalid email address";
    } else if (error.message === "Password must be at least 8 characters") {
      errorMessage = "Password must be at least 8 characters";
    } else {
      errorMessage = "Unknown error";
    }
  }

  client.close();

  return { accessToken, refreshToken, errorMessage };
};

export const logInWithEmail = async (email: string, password: string) => {
  const client = new MongoClient(process.env.DB_CONNECTION_STRING, {
    serverApi: ServerApiVersion.v1
  });

  let accessToken;
  let refreshToken;
  let errorMessage;

  try {
    // TODO: find out why
    // @ts-expect-error
    if (!isEmail(email)) {
      throw new Error("Invalid email address");
    } else if (!password || password.length < 8) {
      throw new Error("Invalid password");
    }

    await client.connect();

    const usersCollection = client.db(process.env.DB_NAME).collection("users");

    // find user in users collection
    const user = await usersCollection.findOne({
      email: email.toLowerCase()
    });

    if (user === null) {
      // TODO: define custom error
      throw new Error("User not found");
    }

    if (!(await bcrypt.compare(password, user.hashedPassword))) {
      throw new Error("Invalid password");
    }

    // generate access token
    accessToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET_ACCESS_TOKEN,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // generate refresh token
    refreshToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET_REFRESH_TOKEN,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // store the refresh token in refreshtokens collection with userId
    const refreshtokensCollection = client
      .db(process.env.DB_NAME)
      .collection("refreshtokens");

    await refreshtokensCollection.insertOne({
      userId: user._id.toString(),
      refreshToken
    });
  } catch (error) {
    Sentry.captureException(error);

    // TODO: define custom errors
    if (error.message === "User not found") {
      errorMessage = "Invalid email or password";
    } else if (error.message === "Invalid email address") {
      errorMessage = "Invalid email or password";
    } else if (error.message === "Invalid password") {
      errorMessage = "Invalid email or password";
    } else {
      errorMessage = "Unknown error";
    }
  }

  client.close();

  return { accessToken, refreshToken, errorMessage };
};

export const generateNewAccessTokenFromRefreshToken = async (
  refreshToken: string
) => {
  let accessToken;
  let errorMessage;

  // check if the refresh token is in the refreshtokens collection
  const client = new MongoClient(process.env.DB_CONNECTION_STRING, {
    serverApi: ServerApiVersion.v1
  });

  const refreshtokensCollection = client
    .db(process.env.DB_NAME)
    .collection("refreshtokens");

  try {
    const refreshTokenRecord = await refreshtokensCollection.findOne({
      refreshToken
    });

    if (refreshTokenRecord === null) {
      // TODO: define custom error
      throw new Error("Refresh token not found");
    }

    const { userId } = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET_REFRESH_TOKEN
    ) as { userId: string };

    accessToken = jwt.sign({ userId }, process.env.JWT_SECRET_ACCESS_TOKEN, {
      expiresIn: "1h"
    });
  } catch (error) {
    Sentry.captureException(error);

    if (error.name === "TokenExpiredError") {
      errorMessage = "Refresh token expired";
    } else if (
      error.name === "JsonWebTokenError" ||
      error.message === "Refresh token not found"
    ) {
      errorMessage = "Invalid refresh token";
    } else {
      errorMessage = "Unknown error";
    }
  }

  return { accessToken, errorMessage };
};

export const deleteRefreshToken = async (refreshToken: string) => {
  let errorMessage;

  // check if the refresh token is in the refreshtokens collection
  const client = new MongoClient(process.env.DB_CONNECTION_STRING, {
    serverApi: ServerApiVersion.v1
  });

  const refreshtokensCollection = client
    .db(process.env.DB_NAME)
    .collection("refreshtokens");

  try {
    const refreshTokenRecord = await refreshtokensCollection.findOne({
      refreshToken
    });

    if (refreshTokenRecord === null) {
      // TODO: define custom error
      throw new Error("Refresh token not found");
    }

    // delete the refresh token from refreshtokens collection
    await refreshtokensCollection.deleteOne({ refreshToken });
  } catch (error) {
    Sentry.captureException(error);

    if (error.message === "Refresh token not found") {
      errorMessage = "Invalid refresh token";
    } else {
      errorMessage = "Unknown error";
    }
  }

  return { errorMessage };
};

export const sendResetPasswordEmailToUser = async (email: string) => {
  // find user from DB
  const client = new MongoClient(process.env.DB_CONNECTION_STRING, {
    serverApi: ServerApiVersion.v1
  });

  const usersCollection = client.db(process.env.DB_NAME).collection("users");

  try {
    const user = await usersCollection.findOne({ email });

    if (user === null) {
      throw new Error("User not found");
    }

    // generate reset password token
    const resetPasswordToken = jwt.sign(
      { email: user._id.toString() },
      process.env.JWT_SECRET_RESET_PASSWORD_TOKEN,
      { expiresIn: "1h" }
    );

    // send email to user
    await sendEmail(user.email, "Reset password", [
      `Hello ${user.firstname},`,
      "We received a request to reset your password.",
      "Please click the link below to reset your password.",
      `https://crypto-stdev-cra.vercel.app/auth/reset?token=${resetPasswordToken}`,
      "If you did not request to reset your password, please ignore this email.",
      "Warm regards,",
      "Crypto DCA Plan using Statistics App team"
    ]);
  } catch (error) {
    Sentry.captureException(error);
  }
};

export const getUserByUserId = async (userId: string) => {
  const client = new MongoClient(process.env.DB_CONNECTION_STRING, {
    serverApi: ServerApiVersion.v1
  });

  let user;

  try {
    await client.connect();

    const usersCollection = client.db(process.env.DB_NAME).collection("users");

    user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  } catch (error) {
    Sentry.captureException(error);
  }

  client.close();

  return user;
};

export const updateUserById = async (userId: string, payload: Object) => {
  const client = new MongoClient(process.env.DB_CONNECTION_STRING, {
    serverApi: ServerApiVersion.v1
  });

  let user;

  try {
    await client.connect();

    const usersCollection = client.db(process.env.DB_NAME).collection("users");

    user = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: payload }
    );
  } catch (error) {
    Sentry.captureException(error);
  }

  client.close();

  return user;
};
