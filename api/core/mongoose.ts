// database.js
import mongoose from "mongoose";
import Sentry from "@sentry/node";

export const connectMongoose = async () => {
  try {
    await mongoose.connect(process.env.MONGOOSE_CONNECTION_STRING);

    console.log("Connected to MongoDB");
  } catch (error) {
    Sentry.captureException(error);
    console.error("MongoDB connection error:", error);
  }
};

mongoose.connection.on("disconnected", connectMongoose);
