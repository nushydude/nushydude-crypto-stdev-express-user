import { v4 as uuidv4 } from "uuid";
import Sentry from "@sentry/node";
import { UserConnector, transactionSchema } from "../schema/user.js";
import mongoose from "mongoose";

export const getUserByUserId = async (userId: string) => {
  try {
    const user = await UserConnector.findById(userId);

    return user;
  } catch (error) {
    Sentry.captureException(error);

    throw error;
  }
};

export const updateUserById = async (userId: string, payload: Object) => {
  try {
    const updatedUser = await UserConnector.findByIdAndUpdate(
      userId,
      { $set: payload },
      { new: true, runValidators: true }
    );

    return updatedUser;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

export const appendTransaction = async (userId: string, transaction: any) => {
  const transactionId = uuidv4();

  transaction.id = transactionId;

  // Since mongoose doesn't run the validators on the subdocument when updating the parent,
  // we need to manually validate the transaction before saving it.
  const TransactionModel = mongoose.model("Transaction", transactionSchema);
  const transactionInstance = new TransactionModel(transaction);

  try {
    // Manually validate the transaction
    await transactionInstance.validate();

    await UserConnector.updateOne(
      { _id: userId },
      { $push: { transactions: transactionInstance } }
    );

    return transaction;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

export const removeTransaction = async (
  userId: string,
  transactionId: string
) => {
  try {
    await UserConnector.updateOne(
      { _id: userId },
      { $pull: { transactions: { id: transactionId } } }
    );
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};
