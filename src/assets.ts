/** Keep stored content portable between local previews and GitHub Pages. */
export function assetUrl(path: string) {
  return path.startsWith('/images/') ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path;
}
