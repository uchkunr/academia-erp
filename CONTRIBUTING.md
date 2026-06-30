# Contributing to Academia ERP

Thank you for your interest in contributing to Academia ERP! To maintain a clean and structured git history, we follow standard guidelines for contributions and commits.

## Conventional Commits

We enforce Conventional Commits for all commit messages. A commit message must follow this structure:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types

Please use one of the following commit types:

- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation changes only
- `style` - Changes that do not affect the meaning of the code (white-space, formatting, semi-colons, etc.)
- `refactor` - A code change that neither fixes a bug nor adds a feature
- `perf` - A code change that improves performance
- `test` - Adding missing tests or correcting existing tests
- `build` - Changes that affect the build system or external dependencies
- `ci` - Changes to our CI configuration files and scripts
- `chore` - Other changes that do not modify src or test files
- `revert` - Reverting a previous commit

### Examples

- `feat(auth): add JWT-based authentication`
- `fix(attendance): resolve null pointer exception in daily log check`
- `docs(readme): update installation instructions for local setup`

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Ensure you run the linter and format checker:
   ```bash
   bun run lint
   ```
3. Ensure all tests pass:
   ```bash
   bun run test
   ```
4. Write clear commit messages using the Conventional Commit structure.
5. Submit a pull request targeting the `main` branch.
