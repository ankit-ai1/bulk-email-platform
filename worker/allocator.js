const DEGRADED_AFTER = 3;
export const PAUSE_AFTER = 5;

/**
 * Picks the next sending account. Rotation only spreads mail across limits the tenant
 * configured: when every account is at quota this returns null and the campaign waits
 * for the next window, rather than pushing past a provider's limit.
 *
 * accounts: smtp_accounts rows, optionally with campaign_daily_limit and priority.
 * usage: { [accountId]: { hour, day, month } }.
 */
export function pickAccount(accounts, usage) {
  const eligible = accounts
    .filter((a) => a.status !== 'paused')
    .map((a) => {
      const u = usage[a.id] || { hour: 0, day: 0, month: 0 };
      const dailyCap = Math.min(a.daily_limit, a.campaign_daily_limit ?? Infinity);
      return { account: a, u, dailyCap };
    })
    .filter(({ account, u, dailyCap }) =>
      u.hour < account.hourly_limit && u.day < dailyCap && u.month < account.monthly_limit);

  if (eligible.length === 0) return null;

  eligible.sort((x, y) => {
    const healthX = x.account.consecutive_failures >= DEGRADED_AFTER ? 1 : 0;
    const healthY = y.account.consecutive_failures >= DEGRADED_AFTER ? 1 : 0;
    if (healthX !== healthY) return healthX - healthY;
    const load = x.u.day / x.dailyCap - y.u.day / y.dailyCap;
    if (load !== 0) return load;
    return (y.account.priority || 0) - (x.account.priority || 0);
  });
  return eligible[0].account;
}

export function recordUse(usage, accountId) {
  const u = usage[accountId] || (usage[accountId] = { hour: 0, day: 0, month: 0 });
  u.hour += 1; u.day += 1; u.month += 1;
}

/** hard = permanent (suppress the address); soft = temporary; null = not recipient-related. */
export function classifySmtpError(err) {
  const code = err?.responseCode;
  if (!code) return null;
  if (code >= 500 && code < 600 && /recipient|user|mailbox|address|5\.1\.[0-9]/i.test(err.response || err.message || '')) return 'hard';
  if (code >= 400 && code < 500) return 'soft';
  return null;
}
