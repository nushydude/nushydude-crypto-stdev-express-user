import Sentry from "@sentry/node";
import { Request, Response } from "express";
import { updateUserById } from "../utils/db.js";

interface UpdateUserRequestBody {
  firstname?: string;
  lastname?: string;
  settings?: any;
}

interface RequestWithUser<T = any, U = any, V = any> extends Request<T, U, V> {
  userId?: string;
}

export const getPortfolio = (req: Request, res: Response) => {
  res.send([]);
};

export const updateUser = async (
  req: RequestWithUser<{}, {}, UpdateUserRequestBody>,
  res: Response
) => {
  console.log("update user");

  // Let's be explicit to ensure we don't accidentally modify critical fields
  const { firstname, lastname, settings } = req.body;

  const nonSanitisedPayload: Record<string, any> = {
    firstname,
    lastname,
    settings
  };
  try {
    const payloadWithNonExistingFieldsRemoved = Object.keys(
      nonSanitisedPayload
    ).reduce((acc, key) => {
      if (
        key in nonSanitisedPayload &&
        nonSanitisedPayload[key] !== undefined
      ) {
        acc[key] = nonSanitisedPayload[key];
      }

      return acc;
    }, {} as Record<string, any>);

    const updatedUser = await updateUserById(
      req.userId,
      payloadWithNonExistingFieldsRemoved
    );

    if (!updatedUser) {
      // We are capturing this as an error because this should not have happened in the first place.
      Sentry.captureException(new Error(`User with ${req.userId} not found`));
      return res.status(404).send();
    }

    res.json(updatedUser);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).send();
  }
};
