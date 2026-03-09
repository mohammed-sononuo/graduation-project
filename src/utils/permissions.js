/**
 * Role permissions: the user's role is stored in the database (app_users.role) and sent from the API.
 * The website reads user.role (and user.permissions derived from it) to decide what to show each user.
 * Values: admin, student, dean, supervisor, community_leader. Role 'user' is treated as Student in the UI.
 */
import { isAdminRole, isDeanRole, isSupervisorRole, isCommunityLeaderRole, isStudentRole } from '../../config/rules.js';

export {
  isAdminRole,
  ADMIN_ROLE,
  isDeanRole,
  DEAN_ROLE,
  DEAN_DISPLAY_NAME,
  isSupervisorRole,
  SUPERVISOR_ROLE,
  SUPERVISOR_DISPLAY_NAME,
  isCommunityLeaderRole,
  COMMUNITY_LEADER_ROLE,
  COMMUNITY_LEADER_DISPLAY_NAME,
  isStudentRole,
  STUDENT_ROLE,
  STUDENT_DISPLAY_NAME,
} from '../../config/rules.js';

/** True if user has full admin access (from API permissions or role). */
export function isAdmin(user) {
  if (!user) return false;
  if (user.permissions?.admin === true) return true;
  return isAdminRole(user.role);
}

/** True if user has the Dean Of A College role. */
export function isDean(user) {
  if (!user) return false;
  if (user.permissions?.dean === true) return true;
  return isDeanRole(user.role);
}

/** True if user has the Supervisor role. */
export function isSupervisor(user) {
  if (!user) return false;
  if (user.permissions?.supervisor === true) return true;
  return isSupervisorRole(user.role);
}

/** True if user has the Community Leader role. */
export function isCommunityLeader(user) {
  if (!user) return false;
  if (user.permissions?.communityLeader === true) return true;
  return isCommunityLeaderRole(user.role);
}

/** True if user has the Student role (or legacy 'user' role; both get the student UI and label). */
export function isStudent(user) {
  if (!user) return false;
  if (user.permissions?.student === true) return true;
  return isStudentRole(user.role) || user.role === 'user';
}
