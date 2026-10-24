const GITHUB_HOST = "github.com";
/** Alias de ~/.ssh/config como github.com-personal: solo existen en remotos SSH. */
const SSH_ALIAS = /^github\.com(?:-[a-z0-9_-]+)?$/;
const URL_WITH_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
/** Forma corta de SSH (scp): [usuario@]host:ruta. */
const SCP_LIKE = /^(?:[^@/\s]+@)?([^:/\s]+):/;

/** Dice si la URL del remoto apunta a GitHub comparando el host, no buscando texto. */
export function isGitHubRemote(remoteUrl: string): boolean {
  const url = remoteUrl.trim();
  if (URL_WITH_SCHEME.test(url)) return isGitHubUrl(url);
  const host = SCP_LIKE.exec(url)?.[1]?.toLowerCase();
  return host !== undefined && SSH_ALIAS.test(host);
}

function isGitHubUrl(text: string): boolean {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return url.protocol === "ssh:" ? SSH_ALIAS.test(host) : host === GITHUB_HOST;
}
