# Claude Code Rules

## Project Structure

```plaintext
index.html

css/
├─ main.css
├─ animations.css
├─ components.css

js/
├─ app.js
├─ background-neurons.js
├─ gravity-lens.js
├─ interactions.js

assets/
├─ images/
├─ icons/
```

## Token Efficiency

- Never place HTML, CSS, and JS in one file unless necessary.
- Read only files relevant to the requested change.
- Avoid scanning the entire project.
- Prefer targeted edits over broad refactors.

## Development Workflow

1. Plan feature
2. Implement feature
3. Test locally
4. Commit
5. Deploy
6. Move to next feature

## Git Workflow

```bash
git add .
git commit -m "Describe change"
git push origin master
```

## Editing Rules

- Modify only affected files.
- Preserve existing functionality.
- Do not rewrite working code unnecessarily.
- Keep components modular.
- Keep animations isolated.

## Before Major Changes

Create a checkpoint:

```bash
git add .
git commit -m "Checkpoint before changes"
```

## Golden Rule

Use the smallest possible context.

If changing an animation, inspect only the animation file.
If changing styling, inspect only the relevant CSS file.
If changing content, inspect only the relevant HTML section.