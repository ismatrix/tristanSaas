/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const isKa = currentUser?.name === 'ka';
  const isReadOnly = (currentUser as any)?.role === 'readonly' || (currentUser as any)?.isReadOnly === true;
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    canWelcome: !isKa,
    canIboss: !isKa,
    canEdit: !isReadOnly && !isKa,
    canManageUsers: !isReadOnly && !isKa,
    isReadOnly: !!isReadOnly,
  };
}
