#!/usr/bin/env bash
# Copy only the files that make up the public website into _site/.
# Anything not listed here (README, AGENTS.md, workflows, ...) is never deployed.
set -euo pipefail

rm -rf _site
mkdir -p _site
cp index.html _site/
cp -R static _site/
find _site -name '.gitkeep' -delete
