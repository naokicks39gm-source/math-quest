#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  echo 'Usage: make push MSG="your commit message"'
  exit 1
fi

# ロックが残ってたら邪魔なので保険で消す
rm -f .git/index.lock || true

# 変更がなければ何もしない
if git diff --quiet && git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

# 簡易チェックはスキップ（必要なら後で戻す）

git add -A
git commit -m "$MSG"
git push

echo "Pushed successfully."
