Output evidence/gifs/text-stream-scroll.gif
Set Shell "bash"
Set Width 1400
Set Height 900
Set FontSize 18
Set Theme "Builtin Solarized Dark"

Type "cd packages/clayterm"
Enter
Type "deno task demo:scroll"
Enter
Sleep 1500ms
PageDown
Sleep 900ms
PageDown
Sleep 900ms
PageDown
Sleep 900ms
PageUp
Sleep 1200ms
PageUp
Sleep 1200ms
Type "q"
