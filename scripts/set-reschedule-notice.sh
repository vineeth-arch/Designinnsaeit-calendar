#!/usr/bin/env bash
# Set the minimum reschedule notice on event types via the v2 API.
# Usage: scripts/set-reschedule-notice.sh <minutes> <slug> [<slug>...]
# Requires CAL_API_KEY. CAL_API_URL defaults to the production v2 API.
# Maps to `disableRescheduling.minutesBefore` (stored as minimumRescheduleNotice).
set -euo pipefail

[ $# -ge 2 ] || { echo "usage: $0 <minutes> <slug>..." >&2; exit 2; }
[ -n "${CAL_API_KEY:-}" ] || { echo "CAL_API_KEY not set" >&2; exit 2; }
MINUTES="$1"; shift
case "$MINUTES" in ''|*[!0-9]*|0) echo "minutes must be a positive integer" >&2; exit 2;; esac

API="${CAL_API_URL:-https://designinnsaeit-calendar-production.up.railway.app/api/v2}"
H=(-H "Authorization: Bearer $CAL_API_KEY" -H "cal-api-version: 2024-06-14" -H "Content-Type: application/json")

req() { # method url [body] -> prints body; non-zero exit on HTTP >= 400
  local out code body
  out=$(curl -s --max-time 30 -w '\n%{http_code}' "${H[@]}" -X "$1" "$2" ${3:+-d "$3"})
  code=${out##*$'\n'}; body=${out%$'\n'*}
  [ "$code" -lt 400 ] || { echo "HTTP $code from $1 $2: $body" >&2; return 1; }
  printf '%s' "$body"
}

LIST=$(req GET "$API/event-types")
for SLUG in "$@"; do
  ID=$(printf '%s' "$LIST" | jq -r --arg s "$SLUG" '.data[] | select(.slug==$s) | .id')
  [ -n "$ID" ] && [ "$ID" != "null" ] || { echo "no event type with slug '$SLUG'" >&2; exit 1; }
  req PATCH "$API/event-types/$ID" "{\"disableRescheduling\":{\"minutesBefore\":$MINUTES}}" >/dev/null
  GOT=$(req GET "$API/event-types/$ID" | jq -r '.data.disableRescheduling.minutesBefore')
  echo "$SLUG (id $ID): reschedule notice = ${GOT} min"
  [ "$GOT" = "$MINUTES" ] || { echo "verify failed for $SLUG (got $GOT)" >&2; exit 1; }
done
