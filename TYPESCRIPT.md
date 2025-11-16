# TypeScript Support

This project now includes TypeScript support to improve developer experience, code quality, and integration with AI tools like GitHub Copilot.

## Overview

The Maps Express uses a hybrid approach with TypeScript:
- Existing JavaScript code remains as-is for stability
- TypeScript type checking is enabled via `checkJs` in `tsconfig.json`
- Comprehensive type definitions in `types/index.d.ts` provide IntelliSense
- JSDoc annotations enhance type information for JavaScript files
- Chrome extension APIs are fully typed via `@types/chrome`

## Benefits

### For Developers
- **Better IntelliSense**: Get autocomplete suggestions for Chrome APIs, functions, and data structures
- **Catch Errors Early**: TypeScript finds potential bugs at development time
- **Self-Documenting Code**: Type annotations serve as inline documentation
- **Easier Refactoring**: Rename symbols with confidence, find all usages easily

### For AI Tools (GitHub Copilot)
- **More Accurate Suggestions**: Type information helps Copilot understand context
- **Better Code Generation**: Copilot generates code that matches your types
- **Fewer Errors**: Type-aware suggestions reduce bugs in generated code
- **Enhanced Documentation**: Copilot uses type information to explain code

## Running Type Checks

Check your code for type errors:

```bash
npm run type-check
```

This command runs TypeScript's compiler in check-only mode without generating output files. It will report any type inconsistencies in your JavaScript code.

## Using TypeScript in VS Code

### Enabling Type Checking in JavaScript Files

VS Code automatically recognizes the `tsconfig.json` file and provides:
- Inline type errors (red squiggly lines)
- Hover information showing types
- Go to definition for functions and types
- Find all references

### Copilot Integration

With TypeScript configured, GitHub Copilot will:
- Suggest more accurate completions based on types
- Generate functions with correct parameter types
- Provide better inline documentation
- Understand your data structures and APIs

## Type Definitions

### Global Types

See `types/index.d.ts` for comprehensive type definitions including:
- Chrome extension message types
- Storage data structures
- Component interfaces
- ExtPay payment gateway types
- Gemini API types

### Adding JSDoc to JavaScript Files

You can add type information to existing JavaScript files using JSDoc:

```javascript
/**
 * Encrypt an API key for secure storage
 * @param {string} apiKey - The API key to encrypt
 * @returns {Promise<string>} Encrypted key in format "iv.data"
 */
export async function encryptApiKey(apiKey) {
  // implementation
}
```

## Testing with TypeScript

Jest is configured to work with TypeScript. Tests can be written in either JavaScript or TypeScript:

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

## Configuration Files

- **`tsconfig.json`**: TypeScript compiler configuration
- **`.babelrc`**: Babel configuration with TypeScript preset
- **`jest.config.js`**: Jest configuration with TypeScript support
- **`types/index.d.ts`**: Global type definitions

## Best Practices

1. **Add JSDoc to Public APIs**: Document exported functions with JSDoc comments
2. **Use Type Definitions**: Reference types from `types/index.d.ts` when possible
3. **Run Type Checks Regularly**: Check types before committing code
4. **Let Copilot Help**: Use Copilot to generate JSDoc comments and type annotations

## Future Enhancements

As the codebase evolves, consider:
- Gradually migrating JavaScript files to TypeScript (.ts)
- Enabling stricter type checking options
- Adding more specific type definitions
- Creating interfaces for complex data structures

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [JSDoc Reference](https://jsdoc.app/)
- [Chrome Extension Types](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/chrome)
- [GitHub Copilot Best Practices](https://docs.github.com/en/copilot)
