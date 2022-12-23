import { validationResult } from 'express-validator';
import { decryptData } from '../utils/encryption-utils.js';
import { sendCongregationRequest } from '../utils/sendEmail.js';
import { congregationRequests } from '../classes/CongregationRequests.js';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';

export const requestCongregation = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      let msg = '';
      errors.array().forEach((error) => {
        msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
      });

      res.locals.type = 'warn';
      res.locals.message = `invalid input: ${msg}`;

      res.status(400).json({
        message: 'Bad request: provided inputs are invalid.',
      });

      return;
    }

    const { email, cong_name, cong_number, app_requestor } = req.body;

    if (app_requestor !== 'lmmo') {
      res.locals.type = 'warn';
      res.locals.message = `invalid input: ${app_requestor}`;

      res.status(400).json({
        message: 'Bad request: provided inputs are invalid.',
      });

      return;
    }

    const userRequest = await congregationRequests.findRequestByEmail(email);

    if (userRequest) {
      res.locals.type = 'warn';
      res.locals.message = 'user can only make one request';
      res.status(405).json({ message: 'REQUEST_EXIST' });

      return;
    }

    const data = {
      email: email,
      cong_name: cong_name,
      cong_number: +cong_number,
      cong_role: app_requestor,
      request_date: new Date(),
      approved: false,
      request_open: true,
    };

    await congregationRequests.create(data);

    const userInfo = users.findUserByEmail(email);
    sendCongregationRequest(cong_name, cong_number, userInfo.username);

    res.locals.type = 'info';
    res.locals.message = 'congregation request sent for approval';
    res.status(200).json({ message: 'OK' });
  } catch (err) {
    next(err);
  }
};

export const getLastCongregationBackup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    if (id) {
      const cong = congregations.findCongregationById(id);
      if (cong) {
        const isValid = cong.isMember(email);

        if (isValid) {
          if (cong.last_backup) {
            res.locals.type = 'info';
            res.locals.message = 'user get the latest backup info for the congregation';
            res.status(200).json(cong.last_backup);
          } else {
            res.locals.type = 'info';
            res.locals.message = 'no backup has been made yet for the congregation';
            res.status(200).json({ message: 'NO_BACKUP' });
          }
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation id params is undefined';
    res.status(400).json({ message: 'CONG_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const saveCongregationBackup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    if (id) {
      const cong = congregations.findCongregationById(id);
      if (cong) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          let msg = '';
          errors.array().forEach((error) => {
            msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
          });

          res.locals.type = 'warn';
          res.locals.message = `invalid input: ${msg}`;

          res.status(400).json({
            message: 'Bad request: provided inputs are invalid.',
          });

          return;
        }

        const isValid = cong.isMember(email);

        if (isValid) {
          const { cong_persons, cong_schedule, cong_sourceMaterial, cong_swsPocket, cong_settings } = req.body;

          await cong.saveBackup(cong_persons, cong_schedule, cong_sourceMaterial, cong_swsPocket, cong_settings, email);

          res.locals.type = 'info';
          res.locals.message = 'user send backup for congregation successfully';
          res.status(200).json({ message: 'BACKUP_SENT' });

          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
      } else {
        res.locals.type = 'warn';
        res.locals.message = 'no congregation could not be found with the provided id';
        res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      }
    } else {
      res.locals.type = 'warn';
      res.locals.message = 'the congregation request id params is undefined';
      res.status(400).json({ message: 'REQUEST_ID_INVALID' });
    }
  } catch (err) {
    next(err);
  }
};

export const getCongregationBackup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    if (id) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const obj = cong.retrieveBackup();

          res.locals.type = 'info';
          res.locals.message = 'user retrieve backup for congregation successfully';
          res.status(200).json(obj);
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
      } else {
        res.locals.type = 'warn';
        res.locals.message = 'no congregation could not be found with the provided id';
        res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      }
    } else {
      res.locals.type = 'warn';
      res.locals.message = 'the congregation request id params is undefined';
      res.status(400).json({ message: 'REQUEST_ID_INVALID' });
    }
  } catch (err) {
    next(err);
  }
};

export const getCongregationMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    if (id) {
      const cong = congregations.findCongregationById(id);
      if (cong) {
        const isValid = cong.isMember(email);

        if (isValid) {
          res.locals.type = 'info';
          res.locals.message = 'user fetched congregation members';
          res.status(200).json(cong.cong_members);
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation id params is undefined';
    res.status(400).json({ message: 'CONG_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const removeCongregationUser = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user) {
      const cong = congregations.findCongregationById(id);
      if (cong) {
        const isValid = cong.isMember(email);

        if (isValid) {
          const findUser = users.findUserById(user);

          if (findUser.cong_id === id) {
            const members = cong.removeUser(id);

            res.locals.type = 'info';
            res.locals.message = 'member removed from the congregation';
            res.status(200).json(members);
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'member is no longer found in the congregation';
          res.status(404).json({ message: 'MEMBER_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const findUserByCongregation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    const search = req.query.search;

    if (id) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          if (search && search.length > 0) {
            const userData = await users.findUserByEmail(search);

            if (userData && !userData.disabled && userData.mfaEnabled) {
              if (userData.cong_id === id) {
                res.locals.type = 'info';
                res.locals.message = 'user is already member of the congregation';
                res.status(200).json({ message: 'ALREADY_MEMBER' });
                return;
              }

              if (userData.cong_id !== '') {
                res.locals.type = 'warn';
                res.locals.message = 'user could not be found';
                res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
                return;
              }

              res.locals.type = 'info';
              res.locals.message = 'user details fetched successfully';
              res.status(200).json(userData);
              return;
            }

            res.locals.type = 'warn';
            res.locals.message = 'user could not be found';
            res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'the search parameter is not correct';
          res.status(400).json({ message: 'SEARCH_INVALID' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation id params is undefined';
    res.status(400).json({ message: 'CONG_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const addCongregationUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    if (id) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const errors = validationResult(req);

          if (!errors.isEmpty()) {
            let msg = '';
            errors.array().forEach((error) => {
              msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
            });

            res.locals.type = 'warn';
            res.locals.message = `invalid input: ${msg}`;

            res.status(400).json({
              message: 'Bad request: provided inputs are invalid.',
            });

            return;
          }

          const user = req.body.user_id;
          const findUser = await users.findUserById(user);

          if (findUser.cong_id === '') {
            await cong.addUser(user);

            res.locals.type = 'info';
            res.locals.message = 'member added to the congregation';
            res.status(200).json({ message: 'MEMBER_ADDED' });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'member already has a congregation';
          res.status(400).json({ message: 'ALREADY_MEMBER' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const updateCongregationRole = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const findUser = await users.findUserById(user);

          if (findUser.cong_id === id) {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
              let msg = '';
              errors.array().forEach((error) => {
                msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
              });

              res.locals.type = 'warn';
              res.locals.message = `invalid input: ${msg}`;

              res.status(400).json({
                message: 'Bad request: provided inputs are invalid.',
              });

              return;
            }

            const { user_role } = req.body;

            // validate provided role
            let isRoleValid = true;
            const allowedRoles = ['admin', 'lmmo', 'lmmo-backup'];
            if (user_role > 0) {
              for (let i = 0; i < user_role.length; i++) {
                const role = user_role[i];
                if (!allowedRoles.includes(role)) {
                  isRoleValid = false;
                  break;
                }
              }
            }

            if (!isRoleValid) {
              res.locals.type = 'warn';
              res.locals.message = `invalid role provided`;

              res.status(400).json({
                message: 'Bad request: provided inputs are invalid.',
              });

              return;
            }

            await cong.updateUserRole(user, user_role);

            res.locals.type = 'info';
            res.locals.message = 'member role in congregation updated';
            res.status(200).json({ message: 'ROLE_UPDATED' });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'member is no longer found in the congregation';
          res.status(404).json({ message: 'MEMBER_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const getCongregationUser = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = await users.findUserById(user);

          if (userData) {
            res.locals.type = 'info';
            res.locals.message = 'user details fetched successfully';
            res.status(200).json(userData);
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'user could not be found';
          res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const getCongregationPockerUser = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user && user !== 'undefined') {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = users.findPocketUser(user);

          if (userData) {
            const otpCode = userData.pocket_oCode;
            let pocket_oCode = '';

            if (otpCode && otpCode !== '') {
              pocket_oCode = decryptData(userData.pocket_oCode);
            }

            res.locals.type = 'info';
            res.locals.message = 'pocket user details fetched successfully';
            res.status(200).json({ ...userData, pocket_oCode });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'pocket user could not be found';
          res.status(404).json({ message: 'POCKET_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const createNewPocketUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    if (id) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const errors = validationResult(req);

          if (!errors.isEmpty()) {
            let msg = '';
            errors.array().forEach((error) => {
              msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
            });

            res.locals.type = 'warn';
            res.locals.message = `invalid input: ${msg}`;

            res.status(400).json({
              message: 'Bad request: provided inputs are invalid.',
            });

            return;
          }

          const { pocket_local_id, username } = req.body;

          await cong.createPocketUser(username, pocket_local_id);

          res.locals.type = 'info';
          res.locals.message = 'pocket user created successfully';
          res.status(200).json({ message: 'POCKET_CREATED' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const updatePocketDetails = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = await users.findUserById(user);

          if (userData) {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
              let msg = '';
              errors.array().forEach((error) => {
                msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
              });

              res.locals.type = 'warn';
              res.locals.message = `invalid input: ${msg}`;

              res.status(400).json({
                message: 'Bad request: provided inputs are invalid.',
              });

              return;
            }

            const { cong_role, pocket_members } = req.body;

            await userData.updatePocketDetails({ cong_role, pocket_members });

            res.locals.type = 'info';
            res.locals.message = 'pocket details updated';
            res.status(200).json({ message: 'POCKET_USER_UPDATED' });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'pocket user could not be found';
          res.status(404).json({ message: 'POCKET_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const updatePocketUsername = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = await users.findPocketUser(user);

          if (userData) {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
              let msg = '';
              errors.array().forEach((error) => {
                msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
              });

              res.locals.type = 'warn';
              res.locals.message = `invalid input: ${msg}`;

              res.status(400).json({
                message: 'Bad request: provided inputs are invalid.',
              });

              return;
            }

            const { username } = req.body;
            await userData.updateFullname(username);

            res.locals.type = 'info';
            res.locals.message = 'pocket username updated';
            res.status(200).json({ username });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'pocket user could not be found';
          res.status(404).json({ message: 'POCKET_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const updatePocketMembers = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = await users.findPocketUser(user);

          if (userData) {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
              let msg = '';
              errors.array().forEach((error) => {
                msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
              });

              res.locals.type = 'warn';
              res.locals.message = `invalid input: ${msg}`;

              res.status(400).json({
                message: 'Bad request: provided inputs are invalid.',
              });

              return;
            }

            const { members } = req.body;
            await userData.updatePocketMembers(members);

            res.locals.type = 'info';
            res.locals.message = 'pocket members updated';
            res.status(200).json({ pocket_members: members });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'pocket user could not be found';
          res.status(404).json({ message: 'POCKET_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const generatePocketOTPCode = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = await users.findUserById(user);

          if (userData) {
            const code = await userData.generatePocketCode();

            res.locals.type = 'info';
            res.locals.message = 'pocket otp code generated';
            res.status(200).json({ code });
            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'pocket user could not be found';
          res.status(404).json({ message: 'POCKET_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const deletePocketOTPCode = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      let msg = '';
      errors.array().forEach((error) => {
        msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
      });

      res.locals.type = 'warn';
      res.locals.message = `invalid input: ${msg}`;

      res.status(400).json({
        message: 'Bad request: provided inputs are invalid.',
      });

      return;
    }

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = await users.findUserById(user);

          if (userData) {
            await userData.removePocketCode();

            // if no device, delete pocket user
            let devices = userData.pocket_devices || [];
            if (devices.length === 0) {
              await cong.deletePocketUser(userData.id);

              res.locals.type = 'info';
              res.locals.message = 'pocket code removed, and pocket user deleted';
              res.status(200).json({ message: 'POCKET_USER_DELETED' });
            } else {
              res.locals.type = 'info';
              res.locals.message = 'pocket code successfully removed';
              res.status(200).json({ message: 'POCKET_CODE_REMOVED' });
            }

            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'pocket user could not be found';
          res.status(404).json({ message: 'POCKET_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const deletePocketDevice = async (req, res, next) => {
  try {
    const { id, user } = req.params;
    const { email } = req.headers;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      let msg = '';
      errors.array().forEach((error) => {
        msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
      });

      res.locals.type = 'warn';
      res.locals.message = `invalid input: ${msg}`;

      res.status(400).json({
        message: 'Bad request: provided inputs are invalid.',
      });

      return;
    }

    const { pocket_visitorid } = req.body;

    if (id && user) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const userData = await users.findUserById(user);

          if (userData) {
            // remove device
            let devices = userData.pocket_devices || [];
            let newDevices = devices.filter((device) => device.visitorid !== pocket_visitorid);

            if (newDevices.length > 0) {
              await userData.removePocketDevice(newDevices);

              res.locals.type = 'info';
              res.locals.message = 'pocket device successfully removed';
              res.status(200).json({ devices: newDevices });
            }

            // if no device, delete pocket user
            if (newDevices.length === 0) {
              await cong.deletePocketUser(userData.id);

              res.locals.type = 'info';
              res.locals.message = 'pocket device removed, and pocket user deleted';
              res.status(200).json({ message: 'POCKET_USER_DELETED' });
            }

            return;
          }

          res.locals.type = 'warn';
          res.locals.message = 'pocket user could not be found';
          res.status(404).json({ message: 'POCKET_NOT_FOUND' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation and user ids params are undefined';
    res.status(400).json({ message: 'CONG_USER_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};

export const sendPocketSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.headers;

    if (id) {
      const cong = await congregations.findCongregationById(id);
      if (cong) {
        const isValid = await cong.isMember(email);

        if (isValid) {
          const errors = validationResult(req);

          if (!errors.isEmpty()) {
            let msg = '';
            errors.array().forEach((error) => {
              msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
            });

            res.locals.type = 'warn';
            res.locals.message = `invalid input: ${msg}`;

            res.status(400).json({
              message: 'Bad request: provided inputs are invalid.',
            });

            return;
          }

          const { schedules } = req.body;

          await cong.sendPocketSchedule(schedules);

          res.locals.type = 'info';
          res.locals.message = 'schedule save for sws pocket application';
          res.status(200).json({ message: 'SCHEDULE_SENT' });
          return;
        }

        res.locals.type = 'warn';
        res.locals.message = 'user not authorized to access the provided congregation';
        res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
        return;
      }

      res.locals.type = 'warn';
      res.locals.message = 'no congregation could not be found with the provided id';
      res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
      return;
    }

    res.locals.type = 'warn';
    res.locals.message = 'the congregation id params is undefined';
    res.status(400).json({ message: 'CONG_ID_INVALID' });
  } catch (err) {
    next(err);
  }
};
