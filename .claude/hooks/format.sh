#!/bin/sh
# PostToolUse hook: format a file with oxfmt right after Claude edits or writes it,
# so check:format doesn't fail on agent edits. Never blocks the tool call.
file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  *.ts | *.tsx | *.mts | *.cts | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.md | *.css | *.scss | *.yml | *.yaml | *.html | *.toml) ;;
  *) exit 0 ;;
esac
cd "${CLAUDE_PROJECT_DIR:-.}" && npx --no-install oxfmt "$file" >/dev/null 2>&1
exit 0
