import { validationResult } from "express-validator";
import { getFirestore } from "firebase-admin/firestore";
import { CongregationRequests } from "../classes/CongregationRequests.js";
import { Congregations } from "../classes/Congregations.js";
import { Users } from "../classes/Users.js";
import { sendCongregationAccountCreated, sendCongregationAccountDisapproved } from "../utils/sendEmail.js";

const db = getFirestore();

export const getAllCongregations = async (req, res, next) => {
  try {
    const congsList = Congregations.list;

    res.locals.type = "info";
    res.locals.message = "admin fetched all congregation";
    res.status(200).json(congsList);
  } catch (err) {
    next(err);
  }
};

export const getCongregationRequests = async (req, res, next) => {
  try {
    const finalResult = CongregationRequests.list;

    res.locals.type = "info";
    res.locals.message = "admin fetched pending requests";
    res.status(200).json(finalResult);
  } catch (err) {
    next(err);
  }
};

export const approveCongregationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id) {
      const request = CongregationRequests.findRequestById(id);
      if (request) {
        if (request.approved) {
          res.locals.type = "warn";
          res.locals.message = "this congregation request was already approved";
          res.status(405).json({ message: "REQUEST_APPROVED" });
        } else {
          // create congregation data
          const congData = {
            cong_name: request.cong_name,
            cong_number: request.cong_number,
          };

          const cong = await Congregations.create(congData);

          // update requestor info
          const user = Users.findUserById(request.user_id);
          const userData = {
            congregation: { id: cong.id, role: request.cong_role },
          };
          await user.assignCongregation(userData);

          // update request props
          await request.approve();

          // send email to user
          sendCongregationAccountCreated(request.email, request.username, request.cong_name, request.cong_number);

          res.locals.type = "info";
          res.locals.message = "congregation created";
          res.status(200).json({ message: "OK" });
        }
      } else {
        res.locals.type = "warn";
        res.locals.message = "no congregation request could not be found with the provided id";
        res.status(404).json({ message: "REQUEST_NOT_FOUND" });
      }
    } else {
      res.locals.type = "warn";
      res.locals.message = "the congregation request id params is undefined";
      res.status(400).json({ message: "REQUEST_ID_INVALID" });
    }
  } catch (err) {
    next(err);
  }
};

export const disapproveCongregationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id) {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        let msg = "";
        errors.array().forEach((error) => {
          msg += `${msg === "" ? "" : ", "}${error.param}: ${error.msg}`;
        });

        res.locals.type = "warn";
        res.locals.message = `invalid input: ${msg}`;

        res.status(400).json({
          message: "Bad request: provided inputs are invalid.",
        });

        return;
      }

      const request = await CongregationRequests.findRequestById(id);
      if (request) {
        if (!request.approved && !request.request_open) {
          res.locals.type = "warn";
          res.locals.message = "this congregation request was already disapproved";
          res.status(405).json({ message: "REQUEST_DISAPPROVED" });
        } else {
          // update request props
          await request.disapprove();

          // send email to user
          const { reason } = req.body;
          sendCongregationAccountDisapproved(request.email, request.username, request.cong_name, request.cong_number, reason);

          res.locals.type = "info";
          res.locals.message = "congregation request disapproved";
          res.status(200).json({ message: "OK" });
        }
      } else {
        res.locals.type = "warn";
        res.locals.message = "no congregation request could not be found with the provided id";
        res.status(404).json({ message: "REQUEST_NOT_FOUND" });
      }
    } else {
      res.locals.type = "warn";
      res.locals.message = "the congregation request id params is undefined";
      res.status(400).json({ message: "REQUEST_ID_INVALID" });
    }
  } catch (err) {
    next(err);
  }
};

export const deleteCongregation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id) {
      const cong = Congregations.findCongregationById(id);
      if (cong) {
        if (cong.cong_members.length > 0) {
          res.locals.type = "warn";
          res.locals.message = "congregation could not be deleted since there are still users inside";
          res.status(405).json({ message: "CONG_ACTIVE" });
        } else {
          // remove from firestore
          await Congregations.delete(id);

          res.locals.type = "info";
          res.locals.message = "congregation deleted";
          res.status(200).json({ message: "OK" });
        }
      } else {
        res.locals.type = "warn";
        res.locals.message = "no congregation could not be found with the provided id";
        res.status(404).json({ message: "CONGREGATION_NOT_FOUND" });
      }
    } else {
      res.locals.type = "warn";
      res.locals.message = "the congregation request id params is undefined";
      res.status(400).json({ message: "REQUEST_ID_INVALID" });
    }
  } catch (err) {
    next(err);
  }
};

export const addCongregationUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id) {
      const cong = Congregations.findCongregationById(id);

      if (cong) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          let msg = "";
          errors.array().forEach((error) => {
            msg += `${msg === "" ? "" : ", "}${error.param}: ${error.msg}`;
          });

          res.locals.type = "warn";
          res.locals.message = `invalid input: ${msg}`;

          res.status(400).json({
            message: "Bad request: provided inputs are invalid.",
          });

          return;
        }

        const { user_uid } = req.body;
        const user = Users.findUserByEmail(user_uid);

        if (user) {
          if (user.cong_id === id) {
            res.locals.type = "warn";
            res.locals.message = "action not allowed since the user is already member of congregation";
            res.status(405).json({ message: "USER_ALREADY_MEMBER" });
          } else {
            await cong.addUser(user.id);

            const congsList = await Congregations.loadAll();

            res.locals.type = "info";
            res.locals.message = "member added to congregation";
            res.status(200).json(congsList);
          }
        } else {
          res.locals.type = "warn";
          res.locals.message = "user could not be found";
          res.status(404).json({ message: "ACCOUNT_NOT_FOUND" });
        }
      } else {
        res.locals.type = "warn";
        res.locals.message = "no congregation could not be found with the provided id";
        res.status(404).json({ message: "CONGREGATION_NOT_FOUND" });
      }
    } else {
      res.locals.type = "warn";
      res.locals.message = "the congregation request id params is undefined";
      res.status(400).json({ message: "REQUEST_ID_INVALID" });
    }
  } catch (err) {
    next(err);
  }
};

export const removeCongregationUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id) {
      const cong = Congregations.findCongregationById(id);

      if (cong) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          let msg = "";
          errors.array().forEach((error) => {
            msg += `${msg === "" ? "" : ", "}${error.param}: ${error.msg}`;
          });

          res.locals.type = "warn";
          res.locals.message = `invalid input: ${msg}`;

          res.status(400).json({
            message: "Bad request: provided inputs are invalid.",
          });

          return;
        }

        const { user_uid } = req.body;
        const user = Users.findUserByEmail(user_uid);

        if (user) {
          if (user.cong_id === id) {
            cong.removeUser(user.id);

            const congsList = await Congregations.loadAll();

            res.locals.type = "info";
            res.locals.message = "member removed to congregation";
            res.status(200).json(congsList);
          } else {
            res.locals.type = "warn";
            res.locals.message = "action not allowed since the user is no longer member of congregation";
            res.status(405).json({ message: "USER_NOT_FOUND" });
          }
        } else {
          res.locals.type = "warn";
          res.locals.message = "user could not be found";
          res.status(404).json({ message: "ACCOUNT_NOT_FOUND" });
        }
      } else {
        res.locals.type = "warn";
        res.locals.message = "no congregation could not be found with the provided id";
        res.status(404).json({ message: "CONGREGATION_NOT_FOUND" });
      }
    } else {
      res.locals.type = "warn";
      res.locals.message = "the congregation request id params is undefined";
      res.status(400).json({ message: "REQUEST_ID_INVALID" });
    }
  } catch (err) {
    next(err);
  }
};

export const updateCongregationUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id) {
      const cong = Congregations.findCongregationById(id);
      if (cong) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          let msg = "";
          errors.array().forEach((error) => {
            msg += `${msg === "" ? "" : ", "}${error.param}: ${error.msg}`;
          });

          res.locals.type = "warn";
          res.locals.message = `invalid input: ${msg}`;

          res.status(400).json({
            message: "Bad request: provided inputs are invalid.",
          });

          return;
        }

        const { user_uid, user_role } = req.body;

        // validate provided role
        let isValid = true;
        const allowedRoles = ["admin", "lmmo", "view-schedule-meeting"];
        if (user_role > 0) {
          for (let i = 0; i < user_role.length; i++) {
            const role = user_role[i];
            if (!allowedRoles.includes(role)) {
              isValid = false;
              break;
            }
          }
        }

        if (!isValid) {
          res.locals.type = "warn";
          res.locals.message = `invalid role provided`;

          res.status(400).json({
            message: "Bad request: provided inputs are invalid.",
          });

          return;
        }

        const user = Users.findUserByEmail(user_uid);

        if (user) {
          cong.updateUserRole(user.id, user_role);

          const congsList = await Congregations.loadAll();

          res.locals.type = "info";
          res.locals.message = "user role saved successfully";
          res.status(200).json(congsList);
        } else {
          res.locals.type = "warn";
          res.locals.message = "user could not be found";
          res.status(404).json({ message: "ACCOUNT_NOT_FOUND" });
        }
      } else {
        res.locals.type = "warn";
        res.locals.message = "no congregation could not be found with the provided id";
        res.status(404).json({ message: "CONGREGATION_NOT_FOUND" });
      }
    } else {
      res.locals.type = "warn";
      res.locals.message = "the congregation request id params is undefined";
      res.status(400).json({ message: "REQUEST_ID_INVALID" });
    }
  } catch (err) {
    next(err);
  }
};
