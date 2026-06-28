// PreToolUse(Bash) gate for `git commit` — runs the repo quality checks and
// BLOCKS the commit (exit 2) if typecheck or lint fail. Wired in
// .claude/settings.local.json with `if: "Bash(git commit *)"`, so it only runs
// for commits, not every Bash call. Skips itself when there is nothing to commit.
import { execSync } from "node:child_process";

function sh(cmd) {
  execSync(cmd, { stdio: "inherit" }); // inherits output; throws on non-zero exit
}

try {
  // Nothing staged → let `git commit` produce its own "nothing to commit" message.
  const staged = execSync("git diff --cached --name-only", { encoding: "utf8" }).trim();
  if (!staged) process.exit(0);

  sh("bun run typecheck");
  sh("bun run lint");
  process.exit(0);
} catch {
  process.stderr.write(
    "\n[pre-commit] typecheck/lint FAILED — commit blocked. Fix the errors (or run /check) and retry.\n",
  );
  process.exit(2);
}
