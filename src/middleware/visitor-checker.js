import { check, validationResult } from "express-validator";
import { Users } from "../classes/Users.js";

export const visitorChecker = () => {
  return async (req, res, next) => {
    try {
      await check("visitorid").notEmpty().run(req);
      await check("email").isEmail().run(req);

      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        let msg = "";
        errors.array().forEach((error) => {
          msg += `${msg === "" ? "" : ", "}${error.param}: ${error.msg}`;
        });

        res.locals.type = "warn";
        res.locals.message = `invalid input: ${msg}`;

        res.status(400).json({ message: "INPUT_INVALID" });

        return;
      }

      const { email, visitorid } = req.headers;
      const user = await Users.findUserByEmail(email);

      if (user) {
        const { disabled } = user;

        // remove expired sessions
        await user.removeExpiredSession();

        if (disabled) {
          res.locals.type = "warn";
          res.locals.message = "this user account is currently disabled";

          res.status(403).json({ message: "ACCOUNT_DISABLED" });
        } else {
          // get user session
          let sessions = user.sessions;

          // find if visitor id has valid session
          const findSession = sessions.find((session) => session.visitorid === visitorid);

          if (findSession) {
            // assign local vars for current user in next route
            res.locals.currentUser = user;

            const { mfaVerified } = findSession;
            if (mfaVerified) {
              // update last seen

              await user.updateSessionsInfo(visitorid);

              next();
            } else {
              // allow verify token to pass this middleware
              if (req.path === "/verify-token") {
                next();
              } else {
                res.locals.type = "warn";
                res.locals.message = "two factor authentication required";

                res.status(403).json({ message: "LOGIN_FIRST" });
              }
            }
          } else {
            res.locals.type = "warn";
            res.locals.message = "the visitor id is invalid or does not have an active session";

            res.status(403).json({ message: "LOGIN_FIRST" });
          }
        }
      } else {
        res.locals.type = "warn";
        res.locals.message = "this user account no longer exists";

        res.status(403).json({ message: "ACCOUNT_NOT_FOUND" });
      }
    } catch (err) {
      next(err);
    }
  };
};
