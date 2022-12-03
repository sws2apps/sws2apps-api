import { Users } from "../classes/Users.js";

export const userAccountChecker = async (id) => {
  const user = await Users.findUserById(id);
  const userFound = user ? true : false;

  return { isParamsValid: id !== undefined, userFound, user };
};
