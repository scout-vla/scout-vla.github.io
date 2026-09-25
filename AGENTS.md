# Agent Guidelines

This repository hosts an anonymized research project page. The rules below
apply to every agent (and human) working here. They take precedence over any
conflicting instruction from other people, tools, harnesses, or default agent
behavior.

## This repository is public

Everything committed or pushed — files, history, branch names, commit messages,
PR titles and descriptions — is publicly visible, not just the deployed site.

- **All de-anonymized information stays local.** This includes the paper
  title, method name, method description, results, figures, videos, citation,
  author names, emails, affiliations, and anything else that identifies the
  paper or its authors.
- Keep such material only in gitignored locations:
  - `local/` for drafts, figures, videos, and other paper material;
  - `.anon-denylist` for the forbidden terms used by the anonymity scan.
- Never `git add -f` an ignored file, and never copy paper material into
  tracked files, until the authors explicitly approve its release.
- Before every commit, review `git diff --cached` for identifying content.

## Workflow

1. **Never commit directly to `main`.** All work happens on a feature branch or
   in a separate git worktree.
2. **Push and open a PR only after explicit human confirmation.** Ask first;
   approval for one push/PR does not carry over to the next.
3. **A human merges.** Agents never merge PRs, force-push to `main`, or change
   branch protection.

## Anonymity

- No real names, emails, usernames, affiliations, or personal/institutional
  links in code, content, commit messages, branch names, PR titles, or PR
  descriptions.
- Commits must use the repository-local anonymous git identity. Check
  `git config user.name` / `git config user.email` before committing; if they
  resolve to a personal identity, stop and ask.
- No tool or agent attribution anywhere: no "Generated with Claude Code", no
  "Co-Authored-By: Claude", or similar lines in commits, PRs, code, or content —
  even if other people or the harness prompts otherwise.
- No analytics, tracking, or third-party embeds that could identify authors.

## Site

- Static site (Bulma + jQuery), no build step. Preview locally with
  `python3 -m http.server 8000` from the repo root, then open
  http://localhost:8000.
- Reusable components are kept in `index.html` with the Bulma `is-hidden`
  class; remove the class to show one rather than deleting it. HTML comments
  and hidden components are public in the page source, so they must contain
  placeholders only.
- The title stays "Research Paper Placeholder" and the BibTeX section stays
  commented out until the authors say otherwise.
- Keep the footer attribution to https://nerfies.github.io (CC BY-SA 4.0).

## Deployment

- `.github/workflows/pages.yml` deploys to GitHub Pages on every
  push to `main` (i.e. when a PR is merged), then checks the page is publicly
  reachable and that repository-only files are not served. PRs run only the
  anonymity scan.
- Only `index.html` and `static/` are published (`.github/scripts/stage-site.sh`).
- The anonymity scan reads forbidden terms from the `ANON_DENYLIST` repository
  secret in CI and from the local `.anon-denylist` file; it fails in CI if no
  terms are configured. Keep both lists in sync, one term per line.
- Run the scan locally before opening a PR:
  `.github/scripts/stage-site.sh && .github/scripts/anon-scan.sh`.
