import isOnline from "is-online";
import { formatLog } from "../utils/format-log.js";
import { logger } from "../utils/logger.js";

export const internetChecker = () => {
  return async (req, res, next) => {
    try {
      isOnline().then((result) => {
        if (result) {
          next();
        } else {
          res.status(500).json({ message: "INTERNAL_ERROR" });
          logger("warn", formatLog("the server could not make request to the internet", req, res));
        }
      });
    } catch (err) {
      next(err);
    }
  };
};
