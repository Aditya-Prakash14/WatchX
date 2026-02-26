# Contributing to WatchX

Thank you for your interest in contributing to WatchX! We welcome contributions from everyone. This document provides guidelines to help make the contribution process smooth and productive.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/WatchX.git
   cd WatchX
   ```
3. **Add upstream** remote:
   ```bash
   git remote add upstream https://github.com/Aditya-Prakash14/WatchX.git
   ```
4. **Create** a new feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Or start individually
npm run dev:server    # Terminal 1
npm run dev:agent     # Terminal 2
npm run dev:frontend  # Terminal 3
```

## Making Changes

### Code Standards

- Follow existing code style and formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Write clean, DRY code

### Commit Messages

Use semantic commit messages:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for code style changes
- `refactor:` for code refactoring
- `test:` for test additions/modifications
- `chore:` for build/dependency updates

Example:
```
feat(agent): add CPU temperature monitoring

Add support for tracking CPU temperature metrics
using systeminformation library.
```

## Testing

- Test your changes locally before submitting
- Verify all three components (server, agent, frontend) work together
- Test on different platforms if possible (Linux, macOS, Windows)

## Submitting Changes

1. **Update** your branch with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push** your changes:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create** a Pull Request on GitHub with:
   - Clear title describing the change
   - Detailed description of what and why
   - Reference to any related issues (#issue-number)
   - Screenshots for UI changes

4. **Address** feedback and respond to review comments promptly

## Pull Request Guidelines

- One feature or fix per pull request
- Rebase before submitting to keep history clean
- Write clear commit messages
- Update documentation if needed
- Add tests for new functionality
- Ensure all tests pass

## Reporting Issues

When reporting bugs, please include:
- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, etc.)
- Relevant logs or error messages
- Screenshots if applicable

## Feature Requests

For feature requests:
- Provide clear use case and motivation
- Explain how it benefits users
- Suggest implementation approach if possible
- Be open to discussion and iteration

## Code Review Process

1. Pull requests will be reviewed by maintainers
2. Changes may be requested for alignment with project goals
3. Once approved, your PR will be merged
4. You'll be credited in the release notes

## Community Guidelines

- Be respectful and professional
- Assume good intent
- Provide constructive feedback
- Help other contributors when you can
- Focus on ideas, not individuals

## License

By contributing to WatchX, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to:
- Open an issue for clarification
- Start a discussion on GitHub
- Check existing issues and pull requests

---

**Thank you for contributing to WatchX! Together we build better monitoring tools. ❤️**
