#!/bin/sh
input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // "unknown"')
model=$(echo "$input" | jq -r '.model.display_name // "unknown"')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_out=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
model_id=$(echo "$input" | jq -r '.model.id // ""')

folder=$(basename "$cwd")

branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)

# Build context bar (10 chars wide)
ctx_bar=""
if [ -n "$used" ]; then
  pct=$(printf '%.0f' "$used")
  filled=$(( pct / 10 ))
  empty=$(( 10 - filled ))
  bar=""
  i=0
  while [ $i -lt $filled ]; do bar="${bar}#"; i=$(( i + 1 )); done
  i=0
  while [ $i -lt $empty ]; do bar="${bar}-"; i=$(( i + 1 )); done
  ctx_bar="[${bar}] ${pct}%"
fi

# Estimate session cost (rough per-token pricing based on model family)
cost_str=""
if [ "$total_in" -gt 0 ] || [ "$total_out" -gt 0 ] 2>/dev/null; then
  # Default to claude-sonnet-4 pricing: $3/M in, $15/M out
  in_price="3"
  out_price="15"
  case "$model_id" in
    *haiku*)   in_price="1";  out_price="5"  ;;
    *opus*)    in_price="15"; out_price="75" ;;
    *sonnet*)  in_price="3";  out_price="15" ;;
  esac
  cost=$(awk -v in_tok="$total_in" -v out_tok="$total_out" \
             -v in_p="$in_price" -v out_p="$out_price" \
         'BEGIN { printf "%.4f", (in_tok * in_p / 1000000) + (out_tok * out_p / 1000000) }')
  cost_str="\$${cost}"
fi

# Assemble status line
parts="$folder"
[ -n "$branch" ] && parts="$parts | $branch"
parts="$parts | $model"
[ -n "$ctx_bar" ] && parts="$parts | ctx: $ctx_bar"
[ -n "$cost_str" ] && parts="$parts | $cost_str"

printf "%s" "$parts"
