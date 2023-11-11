import mongoose from "mongoose";
import isEmail from "validator/lib/isEmail.js";

export const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    timestamp: { type: Date, required: true },
    type: { type: String, required: true, enum: ["buy", "sell"] },
    coin: { type: String, required: true },
    numCoins: { type: Number, required: true },
    currency: { type: String, required: true },
    totalAmountPaid: { type: Number, required: true },
    fee: { type: Number, required: true },
    notes: { type: String, default: "" },
    exchange: { type: String, required: true }
  },
  {
    timestamps: false
  }
);

const schema = new mongoose.Schema(
  {
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    email: {
      required: true,
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      // @ts-expect-error - bad types with isEmail
      validate: {
        validator: isEmail,
        message: "`{VALUE}` is not a valid email"
      }
    },
    hashedPassword: { type: String, select: false },
    watchPairs: { type: [String], default: [] },
    transactions: { type: [transactionSchema], default: [] }
  },
  {
    timestamps: true
  }
);

const name = "User";

export const UserConnector =
  mongoose.models[name] || mongoose.model(name, schema);
