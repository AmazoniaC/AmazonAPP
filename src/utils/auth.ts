// Reads the JWT stored by the login flow and turns it into a fetch-ready
// Authorization header. Shared by every module that calls the API outside
// the store's own apiFetch (which needs its own copy for retry/offline
// handling) — duplicating this used to drift silently across files.
export function getAuthHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem('erp_auth')
    if (!raw) return {}
    const user = JSON.parse(raw)
    return user.token ? { 'Authorization': `Bearer ${user.token}` } : {}
  } catch { return {} }
}
