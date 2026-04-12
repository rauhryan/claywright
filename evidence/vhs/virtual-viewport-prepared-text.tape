Output evidence/gifs/virtual-viewport-prepared-text.gif
Set Shell "bash"
Set Width 1400
Set Height 900
Set FontSize 18
Set Theme "Builtin Solarized Dark"

Type "bun ./packages/solid-bindings/test/fixtures/virtual-viewport-prepared-text.tsx"
Enter
Sleep 2200ms
Tab
Sleep 400ms
PageDown
Sleep 1200ms
PageDown
Sleep 1200ms
PageUp
Sleep 1200ms
Ctrl+C
