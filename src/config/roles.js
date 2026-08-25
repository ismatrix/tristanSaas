const allRoles = {
  readonly: [],
  user: ['editData'],
  admin: ['getUsers', 'manageUsers', 'editData'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
