Output evidence/gifs/buffer-workspace-focus.gif
Set Shell "bash"
Set Width 1500
Set Height 900
Set FontSize 18
Set Theme "Builtin Solarized Dark"

Type "bun ./packages/solid-bindings/test/fixtures/buffer-workspace-focus.tsx"
Enter
Sleep 2200ms

# Tab focuses the workspace-managed main window
Tab
Sleep 700ms

# PageDown scrolls the active main window
PageDown
Sleep 1400ms

# Cycle active window to the floating preview
Type "]"
Sleep 700ms

# PageDown now scrolls the floating window instead
PageDown
Sleep 1400ms

# Quit cleanly
Type "q"
Sleep 400ms
