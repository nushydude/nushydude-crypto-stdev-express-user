import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import Sentry from "@sentry/node";
import Tracing from "@sentry/tracing";
import dotenv from "dotenv";
import {
  gatewayKeyMiddleware,
  validateBearerToken
} from "./middleware/index.js";
import { connectMongoose } from "./core/mongoose.js";
import {
  getProfile,
  getPortfolio,
  getUserProfile,
  updateUserProfile,
  getWatchPairs,
  setWatchPairs,
  createTransaction,
  getTransactions,
  getTransaction,
  setTransaction,
  deleteTransaction
} from "./routes/user.js";

dotenv.config();

const PORT = process.env.PORT || 3002;

const app = express();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app })
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0
});

connectMongoose();

// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(cors());
app.use(express.json());

// Only allow requests is the X-API-KEY header is set to correct secret
app.use(gatewayKeyMiddleware);

app.get("/api/status", (_req, res) => res.send({ status: "ok" }));

app.get("/api/users/:userId/profile", getUserProfile);
app.patch("/api/users/:userId/profile", updateUserProfile);

app.get("/api/users/:userId/watch_pairs", getWatchPairs);
app.put("/api/users/:userId/watch_pairs", setWatchPairs);

app.post("/api/users/:userId/transactions", createTransaction);
app.get("/api/users/:userId/transactions", getTransactions);
app.get("/api/users/:userId/transactions/:transactionId", getTransaction);
app.put("/api/users/:userId/transactions/:transactionId", setTransaction);
app.delete("/api/users/:userId/transactions/:transactionId", deleteTransaction);

// DEPRECATED: delete once frontend is updated
app.get("/api/profile", validateBearerToken, getProfile);
app.get("/api/user/", validateBearerToken, getPortfolio);

app.use(Sentry.Handlers.errorHandler());

interface ResponseWithSentry extends Response {
  sentry?: string;
}

app.use(function onError(
  _err: any,
  req: Request,
  res: ResponseWithSentry,
  next: NextFunction
) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

export default app;
