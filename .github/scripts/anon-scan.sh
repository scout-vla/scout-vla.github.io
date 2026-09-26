#!/usr/bin/env bash
# Fail if the staged site (default: _site/) contains author-identifying text.
#
# Forbidden terms are read, one per line (case-insensitive), from:
#   - $ANON_DENYLIST (in CI: the ANON_DENYLIST repository secret)
#   - .anon-denylist in the repo root (local only, gitignored)
# The terms themselves must never be committed: this repository is public.
set -euo pipefail

SITE_DIR="${1:-_site}"
LOCAL_DENYLIST="$(dirname "$0")/../../.anon-denylist"

# Tool attribution (not paper-identifying, safe to keep in the codebase).
terms=(
  "Claude Code"
  "Co-Authored-By"
  "noreply@anthropic.com"
)
num_builtin=${#terms[@]}

add_terms() {
  while IFS= read -r line; do
    line="${line%$'\r'}"
    [[ -n "${line// }" && "${line:0:1}" != "#" ]] && terms+=("$line")
  done
}

[[ -n "${ANON_DENYLIST:-}" ]] && add_terms <<< "$ANON_DENYLIST"
[[ -f "$LOCAL_DENYLIST" ]] && add_terms < "$LOCAL_DENYLIST"

if [[ ${#terms[@]} -eq $num_builtin ]]; then
  if [[ -n "${CI:-}" ]]; then
    echo "::error::No denylist terms: set the ANON_DENYLIST repository secret."
    exit 1
  fi
  echo "warning: no denylist terms (create .anon-denylist locally)." >&2
fi

status=0
for term in "${terms[@]}"; do
  if grep -rIiF -- "$term" "$SITE_DIR" >/dev/null; then
    # Do not echo the term itself: denylist terms must stay out of logs.
    echo "::error::Forbidden term found in:"
    grep -rIliF -- "$term" "$SITE_DIR"
    status=1
  fi
done

# Email addresses anywhere in the site.
if grep -rIEo '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' "$SITE_DIR"; then
  echo "::error::Email address found in the site (listed above)."
  status=1
fi

# Camera metadata in media files (GPS location, device, capture time).
for marker in "com.apple.quicktime" "ISO6709" "Exif"; do
  if grep -rlaF --include='*.mp4' --include='*.mov' --include='*.webm' \
       --include='*.jpg' --include='*.jpeg' --include='*.png' -- "$marker" "$SITE_DIR"; then
    echo "::error::Camera metadata ($marker) found in the media files listed above."
    status=1
  fi
done

if [[ $status -eq 0 ]]; then
  echo "Anonymity scan passed (${#terms[@]} terms checked)."
fi
exit $status
