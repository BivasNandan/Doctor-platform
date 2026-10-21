/**
 * Resolves an image path to a URL the browser can load.
 * Full URLs, data: URLs and server paths ("/api/v1/photos/…") are used as they are. A relative path such as
 * "images/doctors/nusrat.karim.jpg" is a file in /public, so it is prefixed with the website's base URL
 * (which differs between local development, GitHub Pages and other hosts).
 */
export function assetUrl(path) {
  if (!path || /^([a-z][a-z0-9+.-]*:|\/)/i.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path}`;
}
