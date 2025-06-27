# forge-utils

A modern utility toolkit designed for maximum ownership, modularity, and clarity. Instead of installing opaque dependencies, forge-utils helps you **copy clean, well-documented utilities directly into your codebase**—so you're in charge.

## What is forge-utils?

`forge-utils` is not a typical utility library. It’s a **code injection toolkit** that integrates curated utilities into your codebase, giving you **100% control** and **zero coupling**.

## Why forge-utils?

- 🎯 **Code Ownership by Design**: Every utility is copied to your local project for full transparency and flexibility.
- 🛠️ **Tailored to You**: Utilities are fully editable from the start. No monkey-patching, just your own code.
- ⚖️ **No Runtime Overhead**: Zero external runtime dependencies. Use what you need, and nothing else.
- 🧠 **Typed by Default**: Fully typed in TypeScript with smooth JS compatibility.
- 🚀 **CLI-Driven UX**: Install, list, or remove utilities in seconds with the simple `forge-utils` CLI.
- 📚 **Modular by Nature**: Organized by domain (DOM, async, validation, etc.), with docs and usage patterns included.

## Quick Start

### Installation

```bash
# Install globally
npm install -g forge-utils

# Or use directly with npx
npx forge-utils init
```

### Initialize in your project

```bash
# Initialize with default settings (JavaScript, lib/utils directory)
forge-utils init

# Initialize with TypeScript
forge-utils init --typescript

# Initialize with custom directory
forge-utils init --directory src/utils
```

### Add utilities to your project

```bash
# Add specific utilities
forge-utils add dataURItoFile validateEmail

# Add all utilities from a category
forge-utils add data-conversion

# Overwrite existing files
forge-utils add dataURItoFile --overwrite
```

### List available utilities

```bash
# List all categories
forge-utils list

# List utilities in specific categories
forge-utils list --category data-conversion file-handling

# List everything
forge-utils list --all
```

### Remove utilities

```bash
# Remove specific utilities
forge-utils remove dataURItoFile validateEmail
```

## Available Utility Categories

- **async-helpers**: Promise utilities, retry logic, debouncing, throttling
- **data-conversion**: Data transformation, encoding/decoding, format conversion
- **dom-manipulation**: DOM utilities, element creation, event handling
- **file-handling**: File operations, blob handling, download utilities
- **image-processing**: Image manipulation, canvas utilities, format conversion
- **validation**: Input validation, schema validation, type checking

## Usage Examples

After adding utilities to your project, import and use them like any other module:

```javascript
// JavaScript
import { dataURItoFile } from './lib/utils/file-handling/dataURItoFile';

const file = dataURItoFile('data:text/plain;base64,SGVsbG8gV29ybGQ=', 'hello.txt');
```

```typescript
// TypeScript
import { dataURItoFile } from './lib/utils/file-handling/dataURItoFile';

const file: File = dataURItoFile('data:text/plain;base64,SGVsbG8gV29ybGQ=', 'hello.txt');
```

## Configuration

After running `forge-utils init`, a configuration file is created in your project:

```json
{
  "typescript": true,
  "directory": "lib/utils",
  "style": "default"
}
```

## Philosophy

forge-utils follows the principle of **"copy, don't import"**. Instead of adding another dependency to your project, we copy the source code directly into your codebase. This approach offers several advantages:

1. **Full Control**: You own the code and can modify it as needed
2. **No Version Conflicts**: No dependency hell or version conflicts
3. **Better Performance**: No runtime overhead from external dependencies
4. **Easier Debugging**: You can see and debug the actual implementation
5. **Customization**: Adapt functions to your specific use cases

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Adding New Utilities

1. Create your utility function in the appropriate category folder
2. Add comprehensive JSDoc documentation
3. Include TypeScript types
4. Add tests in the `tests` directory
5. Update the registry in `registry/index.json`

## CLI Commands Reference

### `forge-utils init`

Initialize forge-utils in your project.

**Options:**

- `-t, --typescript`: Use TypeScript (default: false)
- `-d, --directory <dir>`: Installation directory (default: 'lib/utils')

### `forge-utils add <utilities...>`

Add utility functions to your project.

**Options:**

- `-o, --overwrite`: Overwrite existing files

**Examples:**

```bash
forge-utils add dataURItoFile
forge-utils add data-conversion --overwrite
```

### `forge-utils list`

List available utilities and categories.

**Options:**

- `-c, --category <category...>`: List utilities in specific categories
- `-a, --all`: List all categories and utilities

### `forge-utils remove <utilities...>`

Remove utility functions from your project.

**Examples:**

```bash
forge-utils remove dataURItoFile validateEmail
```

## License

MIT © Muhammed Abdelnaser <mohamedelreety2014@gmail.com>

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for details.

---

### Made with ❤️ for developers who want to own their code
