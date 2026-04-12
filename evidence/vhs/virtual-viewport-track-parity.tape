Output evidence/gifs/virtual-viewport-track-parity.gif
Set Shell "bash"
Set Width 1400
Set Height 900
Set FontSize 18
Set Theme "Builtin Solarized Dark"

Type "bun ./packages/solid-bindings/test/fixtures/virtual-viewport-track-parity.tsx"
Enter
Sleep 2200ms

# Tab to focus left viewport
Tab
Sleep 600ms

# PageDown on left — no track, content scrolls
PageDown
Sleep 1200ms
PageDown
Sleep 1200ms

# Tab to focus right viewport
Tab
Sleep 600ms

# PageDown on right — content and track thumb move together
PageDown
Sleep 1200ms
PageDown
Sleep 1200ms
PageDown
Sleep 1200ms

# PageUp on right — content and track thumb move back
PageUp
Sleep 1200ms
PageUp
Sleep 1200ms

Ctrl+C
