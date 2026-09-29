// Full shareable URL for an in-app path, e.g. appUrl('/opportunity/cmp_sili').
// Works with normal paths on the live site and with #/ paths in single-file previews.
export function appUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  if (import.meta.env.VITE_HASH) return `${window.location.origin}${window.location.pathname}#${path}`;
  return `${window.location.origin}${base.replace(/\/$/, '')}${path}`;
}
