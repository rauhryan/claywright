Output evidence/gifs/virtual-viewport-budget.gif
Set Shell "bash"
Set Width 1400
Set Height 900
Set FontSize 18
Set Theme "Builtin Solarized Dark"

Type "bun ./packages/solid-bindings/test/fixtures/virtual-viewport-budget.tsx"
Enter
Sleep 1600ms
Tab
Sleep 400ms
PageDown
Sleep 1000ms
PageUp
Sleep 1000ms
Ctrl+C
