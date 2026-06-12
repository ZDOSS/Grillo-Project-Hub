# Contributing to Grillo Project Hub

Thank you for helping improve Grillo Project Hub.

## License

By contributing to this repository, you agree that your contributions will be
licensed under the same terms as the project: **GNU General Public License
v3.0 or later (GPL-3.0-or-later)**.

See [LICENSE](LICENSE) for the full license text and [COPYING](COPYING) for the
standard short copyright notice.

## Developer Certificate of Origin (DCO)

This project uses the [Developer Certificate of Origin 1.1](DCO). The
[DCO GitHub App](https://github.com/apps/dco) checks that every commit in a
pull request includes a sign-off line.

Add a sign-off to each commit:

```bash
git commit -s -m "Your commit message"
```

That appends a line like:

```text
Signed-off-by: Your Name <your.email@example.com>
```

Use the same name and email as your Git author identity (`git config user.name`
and `git config user.email`).

### Fixing commits that are missing a sign-off

If DCO fails on an open pull request, amend or rebase your branch so every
commit is signed off:

```bash
# last commit only
git commit --amend -s --no-edit

# every commit on the branch (replace N with commit count)
git rebase HEAD~N --signoff
git push --force-with-lease
```

## How to contribute

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with tests where behavior changes.
3. Commit with `git commit -s` so the DCO check passes.
4. Run the local checks before opening a pull request:

   ```bash
   npm install
   npm test
   npm run typecheck
   npm run build:web
   ```

5. Open a pull request against `main` with a clear summary and test notes.
6. Wait for CI and required checks (including DCO) to pass before merging.

Direct pushes to `main` are discouraged; use pull requests so CI and review
can run first.

## Source file notices

New source files should include the short GPL header from [COPYING](COPYING)
or this minimal form at the top of the file:

```text
// Grillo Project Hub — Copyright (C) 2026 ZDOSS
// SPDX-License-Identifier: GPL-3.0-or-later
```

## Questions

Open a GitHub issue for bugs, feature requests, or licensing questions before
starting large changes.