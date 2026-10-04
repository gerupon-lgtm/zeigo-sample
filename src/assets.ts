// © 2026 SIKUMI LAB
import { SAMPLE_VERSION } from './version';
/** Keep stored content portable between local previews and GitHub Pages. */
export function assetUrl(path: string) {
  return path.startsWith('/images/') ? `${import.meta.env.BASE_URL}${path.slice(1)}?v=${SAMPLE_VERSION}` : path;
}
