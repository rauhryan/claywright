#!/usr/bin/env bash
set -euo pipefail

sleep_short() { sleep 0.45; }
sleep_med() { sleep 0.8; }
sleep_long() { sleep 1.2; }

clear
printf '\033[38;5;111m'
cat <<'EOF'
   ________                _       __     _       __    __
  / ____/ /___ ___  ______(_)___ _/ /_   / |     / /___/ /_
 / /   / / __ `/ / / / __/ / __ `/ __ \ /  | /| / / __  / __/
/ /___/ / /_/ / /_/ / /_/ / /_/ / / / // /| |/ |/ / /_/ / /_
\____/_/\__,_/\__, /\__/_/\__, /_/ /_//_/ |__/|__/\__,_/\__/
             /____/      /____/
EOF
printf '\033[0m\n'

printf '\033[38;5;152mbeautiful, testable terminal interfaces for coding agents\033[0m\n\n'
sleep_med

printf '\033[38;5;67m➜\033[0m \033[1magent\033[0m open workspace \033[38;5;117mclaywright\033[0m\n'
sleep_short
printf '  ↳ loaded repo, evidence gallery, virtual viewport fixtures\n\n'
sleep_short

printf '\033[38;5;67m➜\033[0m \033[1magent\033[0m plan\n'
sleep_short
printf '  • inspect viewport track parity fixture\n'
printf '  • regenerate reviewer GIF evidence\n'
printf '  • publish GitHub Pages gallery\n\n'
sleep_med

printf '\033[38;5;67m➜\033[0m \033[1magent\033[0m run blackbox --filter track-parity\n'
sleep_short
printf '\033[38;5;108m✓\033[0m left viewport keeps focus, keyboard, wheel, quit\n'
sleep_short
printf '\033[38;5;108m✓\033[0m right viewport keeps focus, keyboard, wheel, track sync, quit\n'
sleep_med
printf '\033[38;5;108m✓\033[0m 2 passing tests in 1.96s\n\n'
sleep_med

printf '\033[38;5;67m➜\033[0m \033[1magent\033[0m render viewport snapshot\n'
sleep_short
printf '┌─ transcript viewport ───────────────────────────────────────────────┐\n'
printf '│ user      Can we publish the reviewer evidence to GitHub Pages?     │\n'
printf '│ agent     Yep — added workflow, OG tags, social card, demo GIF.     │\n'
printf '│ thinking  collapsed summary: track parity + Pages deploy verified    │\n'
printf '│                                                                        │\n'
printf '│ rows 2142..2168 visible                         thumb ████░░░░░░░░    │\n'
printf '└──────────────────────────────────────────────────────────────────────┘\n\n'
sleep_long

printf '\033[38;5;67m➜\033[0m \033[1magent\033[0m ship\n'
sleep_short
printf '  ↳ commit: evidence: add social previews for GitHub Pages\n'
sleep_short
printf '  ↳ pages : \033[38;5;117mhttps://rauhryan.github.io/claywright/\033[0m\n\n'
sleep_long
