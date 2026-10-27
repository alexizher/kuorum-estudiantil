import { describe, expect, it } from "vitest";
import { isGitHubRemote } from "../../src/steps/github-remote.js";

describe("isGitHubRemote", () => {
  it.each([
    "git@github.com:alguien/repo.git",
    "git@github.com-personal:alguien/repo.git",
    "github.com-udea:alguien/repo.git",
    "ssh://git@github.com/alguien/repo.git",
    "ssh://git@github.com:22/alguien/repo.git",
    "ssh://git@github.com-personal/alguien/repo.git",
    "https://github.com/alguien/repo.git",
    "https://usuario@github.com/alguien/repo",
    "HTTPS://GitHub.com/alguien/repo.git",
    "  https://github.com/alguien/repo.git\n",
  ])("acepta %s", (url) => {
    expect(isGitHubRemote(url)).toBe(true);
  });

  it.each([
    "https://github.com.otro.dominio/alguien/repo.git",
    "git@github.com.otro.dominio:alguien/repo.git",
    "ssh://git@github.com.otro.dominio/alguien/repo.git",
    "https://gitlab.com/github.com/repo.git",
    "git@gitlab.com:github.com/repo.git",
    "https://github.com-personal/alguien/repo.git",
    "https://notgithub.com/alguien/repo.git",
    "/home/ana/repos/github.com/repo.git",
    "",
  ])("rechaza %s", (url) => {
    expect(isGitHubRemote(url)).toBe(false);
  });
});
