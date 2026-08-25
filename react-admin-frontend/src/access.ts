/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  // 提取用户角色（依次尝试 currentUser.role、currentUser.access 或 localStorage 兜底）
  let userRole = (currentUser as any)?.role || (currentUser as any)?.access;
  if (!userRole) {
    try {
      const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      userRole = localUser.role || localUser.access;
    } catch {}
  }
  userRole = String(userRole || 'readonly').toLowerCase();

  const isKa = currentUser?.name === 'ka';
  const isReadOnly = userRole === 'readonly';
  const isAdmin = userRole === 'admin';
  const isStandardUser = userRole === 'user';

  return {
    canAdmin: isAdmin,
    canWelcome: !isKa,
    canIboss: !isKa,
    // 只有非只读、非 ka 用户拥有编辑权限
    canEdit: !isReadOnly && !isKa,
    // 用户信息页面权限：超级管理员 (admin) 和标准用户 (user) 均可访问，只读用户 (readonly) 严格隐藏
    canManageUsers: !isReadOnly && (isAdmin || isStandardUser),
    isReadOnly: isReadOnly,
  };
}
