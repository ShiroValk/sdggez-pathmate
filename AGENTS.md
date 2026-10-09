# Project Git workflow

Use the official Spec Kit Git extension together with the Git pre-commit hook.
See [docs/git-workflow.md](docs/git-workflow.md) for setup and examples.

- Configure and use the real workflow directly. Do not run demonstrations or
  create placeholder specs, sample feature branches, or persistent test fixtures.
  Remove temporary verification artifacts after focused checks.

- Before changing files, inspect the current branch, `git status`, and the active
  Spec Kit feature (`SPECIFY_FEATURE_DIRECTORY`, then `.specify/feature.json`).
  Preserve existing changes; never commit unrelated user work.
- Implement new specs on `feat/<number>-<short-name>`. The enabled
  `before_specify` hook creates the branch; do not create a second branch for the
  same spec. Begin from the agreed base, normally an up-to-date main with a clean
  working tree. Small fixes and maintenance may use `fix/...` or `chore/...`.
- Branch selection and Spec Kit feature selection are independent. Verify both
  before plan, tasks, implement, or converge; use the existing spec for follow-up
  work rather than allocating a new number accidentally.
- After specify, clarify, plan, tasks, and each bounded implementation phase,
  review the diff and make a logically scoped checkpoint commit through the
  configured Git extension. These checkpoints are authorized as part of feature
  work; do not ask for confirmation for every commit.
- The official auto-commit script runs `git add .`. Invoke it only when ALL
  tracked and untracked non-ignored changes belong to the checkpoint and existing
  staged changes have been reviewed. If work is mixed, skip that auto-commit and
  use explicit file staging and a normal commit of only the relevant changes.
- Use Conventional Commit messages based on the actual diff. For extension
  commits, write generated messages to a temporary file and use `-MessageFile`.
- Run validation appropriate to the phase before committing. Main app changes
  require relevant tests and lint/type checks; documentation-only commits need
  diff/link review, not application tests. Git pre-commit checks main app types
  when relevant files are staged. Do not bypass failed checks or set
  `SKIP_GIT_HOOKS` to hide failures; report environment limitations accurately.
- Commit implementation together with its relevant tests. Keep evidence and
  affected spec/tasks/docs current. Converge is a completeness assessment, not a
  replacement for runtime, UI, or database validation. Record accepted exceptions
  and unverified requirements explicitly.
- After converge, review and commit any appended tasks/evidence with explicit
  file staging: the installed Git extension has no after_converge registration.
- Push feature branches when requested or already authorized. Use PRs for
  feature integration; do not merge into main unless the user authorizes it.
- Do not use reset --hard, clean -fd, force push, or rewrite shared history
  without explicit authorization. Published regressions normally use revert;
  database changes also require their documented recovery plan.
