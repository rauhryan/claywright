Output evidence/gifs/virtual-viewport-transcript-collapse.gif
Set Shell "bash"
Set Width 1400
Set Height 900
Set FontSize 18
Set Theme "Builtin Solarized Dark"

Type "bun ./packages/solid-bindings/test/fixtures/virtual-viewport-transcript-collapse.tsx"
Enter
Sleep 2500ms

# Tab to toggle button, press Enter to collapse
Tab
Sleep 600ms
Enter
Sleep 1800ms

# Press Enter to expand again
Enter
Sleep 1800ms

# Tab to viewport, scroll down
Tab
Sleep 600ms
PageDown
Sleep 1200ms
PageDown
Sleep 1200ms

# Scroll back up
PageUp
Sleep 1200ms

Ctrl+C
