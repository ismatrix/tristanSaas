/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const isKa = currentUser?.name === 'ka';
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    canWelcome: !isKa,
    canIboss: !isKa,
  };
}
