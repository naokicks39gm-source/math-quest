#!/bin/bash

set -e

echo "===== MATH QUEST SYNC START ====="

echo "commit math-quest"
cd /Users/awakawanaoki/work/dev/math-quest
git add .
git commit -m "sync math-quest" || echo "no changes"

echo "commit elementary"
cd /Users/awakawanaoki/work/dev/math-quest-elementary
git add .
git commit -m "sync elementary" || echo "no changes"

echo "commit junior"
cd /Users/awakawanaoki/work/dev/math-quest-junior
git add .
git commit -m "sync junior" || echo "no changes"

echo "commit highschool"
cd /Users/awakawanaoki/work/dev/math-quest-highschool
git add .
git commit -m "sync highschool" || echo "no changes"

echo "merge branches into main"
cd /Users/awakawanaoki/work/dev/math-quest-main
git merge codex/integration-main
git merge elementary
git merge junior
git merge highschool

echo "push main"
git push origin main

echo "===== SYNC COMPLETE ====="

