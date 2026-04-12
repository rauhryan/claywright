Output evidence/gifs/virtual-viewport-track.gif
Set Shell "bash"
Set Width 1400
Set Height 900
Set FontSize 18
Set Theme "Builtin Solarized Dark"

Type "bun ./packages/solid-bindings/test/fixtures/virtual-viewport-track.tsx"
Enter
Sleep 2200ms

# Tab to focus the viewport
Tab
Sleep 600ms

# PageDown — content and thumb should move together
PageDown
Sleep 1400ms
PageDown
Sleep 1400ms
PageDown
Sleep 1400ms

# PageUp back
PageUp
Sleep 1400ms
PageUp
Sleep 1400ms
PageUp
Sleep 1400ms

Ctrl+C
