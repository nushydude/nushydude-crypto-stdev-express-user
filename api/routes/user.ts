import { ParamsDictionary } from "express-serve-static-core";
import { Request, Response } from "express";
import Sentry from "@sentry/node";
import { pick, reject } from "ramda";
import {
  appendTransaction,
  getUserByUserId,
  removeTransaction,
  updateUserById
} from "../utils/db.js";
import mongoose from "mongoose";

interface UpdateUserRequestBody {
  firstname?: string;
  lastname?: string;
  email?: string;
}

interface UserUserParams extends ParamsDictionary {
  userId?: string;
}

interface RequestWithUser<T = any, U = any, V = any> extends Request<T, U, V> {
  userId?: string;
}

type Transaction = {
  id: string;
  timestamp: string; // ISO8601
  type: "buy" | "sell";
  coin: string;
  numCoins: number;
  currency: string;
  totalAmountPaid: number;
  fee: number;
  notes?: string;
  exchange: string;
};

export const getUserProfile = async (req: Request, res: Response) => {
  console.log("getUserProfile");

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  try {
    const user = await getUserByUserId(userId);

    if (!user) {
      return res.status(404).json({ errorMessage: "User not found" });
    }

    const transformedUser = pick(["firstname", "lastname", "email"], user);

    return res.json(transformedUser);
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};

export const updateUserProfile = async (
  req: Request<UserUserParams, {}, UpdateUserRequestBody>,
  res: Response
) => {
  console.log("updateUserProfile");

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  // Filter out any null or undefined values
  const payload = pick(["firstname", "lastname", "email"], req.body);

  try {
    const updatedUser = await updateUserById(userId, payload);

    const transformedUser = pick(
      ["firstname", "lastname", "email"],
      updatedUser
    );

    res.json(transformedUser);
    res.json({});
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).send();
  }
};

export const getWatchPairs = async (req: Request, res: Response) => {
  console.log("getWatchPairs");

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  try {
    const user = await getUserByUserId(userId);

    const watchPairs: Array<string> = user?.watchPairs || [];

    res.json(watchPairs);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).send();
  }
};

export const setWatchPairs = async (req: Request, res: Response) => {
  console.log("setWatchPairs");

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  const watchPairs = req.body.watchPairs;

  if (
    !Array.isArray(watchPairs) ||
    watchPairs.some((pair) => typeof pair !== "string")
  ) {
    return res.status(400).json({ errorMessage: "Invalid watchPairs" });
  }

  try {
    const user = await updateUserById(userId, { watchPairs });

    return res.json({ watchPairs: user?.watchPairs || [] });
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).send();
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  console.log("createTransaction");

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  const { transaction } = req.body;

  if (!transaction) {
    return res.status(400).json({ errorMessage: "Missing transaction" });
  }

  try {
    const payload = {
      timestamp: transaction.timestamp,
      type: transaction.type,
      coin: transaction.coin,
      numCoins: transaction.numCoins,
      currency: transaction.currency,
      totalAmountPaid: transaction.totalAmountPaid,
      fee: transaction.fee,
      notes: transaction.notes,
      exchange: transaction.exchange
    };

    const appendedTransaction = await appendTransaction(userId, payload);

    return res.status(201).json({ transaction: appendedTransaction });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ errorMessage: error.message });
    }

    Sentry.captureException(error);
    res.status(500).send();
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  console.log("getTransactions");

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  try {
    const user = await getUserByUserId(userId);

    const transactions: Array<Transaction> = user?.transactions || [];

    res.json(transactions);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).send();
  }
};

export const getTransaction = async (req: Request, res: Response) => {
  console.log("getTransaction");

  const { userId, transactionId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  if (!transactionId) {
    return res.status(400).json({ errorMessage: "Missing transactionId" });
  }

  try {
    const user = await getUserByUserId(userId);

    const transactions: Array<Transaction> = user?.transactions || [];

    const transaction = transactions.find(({ id }) => id === transactionId);

    if (!transaction) {
      return res.status(404).json({ errorMessage: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).send();
  }
};

export const setTransaction = async (req: Request, res: Response) => {
  console.log("setTransaction");

  const { userId, transactionId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  if (!transactionId) {
    return res.status(400).json({ errorMessage: "Missing transactionId" });
  }

  const { transaction } = req.body;

  if (!transaction) {
    return res.status(400).json({ errorMessage: "Missing transaction" });
  }

  try {
    const user = await getUserByUserId(userId);

    const transactions: Array<Transaction> = user?.transactions || [];

    const transactionIndex = transactions.findIndex(
      ({ id }) => id === transactionId
    );

    if (transactionIndex === -1) {
      return res.status(404).json({ errorMessage: "Transaction not found" });
    }

    transactions[transactionIndex] = {
      id: transactionId,
      timestamp: transaction.timestamp,
      type: transaction.type, // buy or sell
      coin: transaction.coin,
      numCoins: transaction.numCoins,
      currency: transaction.currency,
      totalAmountPaid: transaction.totalAmountPaid,
      fee: transaction.fee,
      notes: transaction.notes,
      exchange: transaction.exchange
    };

    const updatedUser = await updateUserById(userId, { transactions });

    res.json(updatedUser);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ errorMessage: error.message });
    }

    Sentry.captureException(error);
    res.status(500).send();
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  console.log("deleteTransaction");

  const { userId, transactionId } = req.params;

  if (!userId) {
    return res.status(400).json({ errorMessage: "Missing UserId" });
  }

  if (!transactionId) {
    return res.status(400).json({ errorMessage: "Missing transactionId" });
  }

  try {
    await removeTransaction(userId, transactionId);

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

export const getPortfolio = (req: Request, res: Response) => {
  res.send([]);
};
