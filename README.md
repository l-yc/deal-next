# deal-next
The successor to deal.

## Goal
The previous version was written in vanilla JS and consisted of a web server as well as a few web pages. This version is (currently) purely client-based, using Svelte for better performance and simplicity, avoiding the boilerplate common with other JS frameworks.

The other main distinguishing factor is the use of pure markdown instead of pug as the main slide creation language to mimic a plaintext appearance instead of code.

## Features Overview and Roadmap
Checked boxes mark temporarily completed features
- [x] Editor (currently just a code editor, rich text editor is considered)
- [x] Live markdown preview
- [x] Code highlighting
- [x] LaTeX support
- [x] Import (`.deal` only)
- [x] Export (`.deal` and on Chrome, `.pdf`)
- [x] Present function
- [x] Help screen
- [x] Settings screen (aspect ratio)
- [ ] Theming (structure done but need to implement UI)
- [x] Keybindings
- [ ] Document custom commands in `Renderer.ts`

## Documentation
WIP
