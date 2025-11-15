# TypeScript Migration Guide

## Overview

This project is now set up to support TypeScript development alongside the existing JavaScript codebase. TypeScript provides type safety, better IDE support, and improved developer experience, especially when working with GitHub Copilot.

## Project Structure

```
.
├── src/                      # TypeScript source files
│   ├── utils/               # Utility modules (TypeScript)
│   ├── hooks/               # State management hooks (TypeScript)
│   ├── components/          # UI components (TypeScript)
│   └── ...                  # Other source files
├── Package/dist/            # Compiled JavaScript output
│   ├── utils/
│   ├── hooks/
│   ├── components/
│   └── ...
└── tests/                   # Test files (JavaScript/Jest)
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm

### Installation

```bash
npm install
```

### Building TypeScript

To compile TypeScript files to JavaScript:

```bash
npm run build
```

To watch for changes and rebuild automatically:

```bash
npm run build:watch
```

### Running Tests

All existing tests continue to work without modification:

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

## TypeScript Configuration

The project uses the following TypeScript configuration (`tsconfig.json`):

- **Target**: ES2020
- **Module**: ES2020 (ESM modules)
- **Output Directory**: `Package/dist/`
- **Source Directory**: `src/`
- **Strict Mode**: Enabled for maximum type safety
- **Types**: Chrome Extension APIs and Jest

## Migrated Files

The following files have been migrated to TypeScript:

- ✅ `src/utils/crypto.ts` - API key encryption/decryption
- ✅ `src/utils/appSecret.ts` - Map link attachment functionality  
- ✅ `src/utils/prompt.ts` - Gemini AI prompts
- ✅ `src/utils/payment.ts` - Payment/subscription management

## Benefits of TypeScript

### 1. Type Safety
TypeScript catches errors at compile time, reducing runtime bugs:

```typescript
// JavaScript - no error until runtime
function greet(name) {
  return "Hello, " + name.toUpperCase();
}
greet(42); // Runtime error!

// TypeScript - error caught during development
function greet(name: string): string {
  return "Hello, " + name.toUpperCase();
}
greet(42); // ❌ Compile error: Argument of type 'number' is not assignable to parameter of type 'string'
```

### 2. Better IDE Support
With TypeScript, IDEs and GitHub Copilot can provide:
- Intelligent autocomplete
- Inline documentation
- Refactoring tools
- Navigate to definition

### 3. Self-Documenting Code
Type definitions serve as inline documentation:

```typescript
interface PaymentStage {
  isTrial?: boolean;
  isPremium?: boolean;
  isFirst?: boolean;
  isFree?: boolean;
  trialEnd?: number;
}
```

### 4. Enhanced Copilot Experience
GitHub Copilot generates more accurate suggestions when it has type information:

```typescript
// With types, Copilot knows exactly what properties are available
function updatePayment(stage: PaymentStage) {
  if (stage.isTrial) {
    // Copilot can suggest trial-specific logic
  }
}
```

## Migration Strategy

The migration is being done incrementally:

1. **Phase 1**: Set up TypeScript infrastructure ✅
   - Add TypeScript compiler and dependencies
   - Configure build pipeline
   - Update Jest configuration
   
2. **Phase 2**: Migrate utility files ✅
   - Start with small, self-contained modules
   - Add type definitions
   
3. **Phase 3**: Migrate state management and hooks (In Progress)
   - Add interfaces for state objects
   - Type message passing between components
   
4. **Phase 4**: Migrate components
   - Add types for DOM elements
   - Type event handlers
   
5. **Phase 5**: Migrate main scripts
   - Complete the transition
   - Remove JavaScript source files

## Development Workflow

### Creating New TypeScript Files

1. Create your TypeScript file in the `src/` directory:
   ```typescript
   // src/utils/myutil.ts
   export function myFunction(param: string): number {
     return param.length;
   }
   ```

2. Build the TypeScript:
   ```bash
   npm run build
   ```

3. The compiled JavaScript will be in `Package/dist/utils/myutil.js`

### Working with Chrome Extension APIs

The project includes `@types/chrome` for Chrome Extension API types:

```typescript
chrome.storage.local.get("key", (result) => {
  // TypeScript knows the structure of result
});
```

### Testing

Tests continue to use JavaScript and run against the compiled JavaScript in `Package/dist/`:

```javascript
// tests/myutil.test.js
const { myFunction } = require('../Package/dist/utils/myutil.js');

test('myFunction returns string length', () => {
  expect(myFunction('hello')).toBe(5);
});
```

## Troubleshooting

### Build Errors

If you encounter TypeScript compilation errors:

1. Check that all type definitions are correct
2. Make sure `@types/chrome` is installed
3. Review the error message for specific guidance

### Test Failures

If tests fail after migration:

1. Ensure you've run `npm run build` to compile the latest changes
2. Check that the compiled JavaScript matches expected behavior
3. Verify that exported functions/classes match the test expectations

## Contributing

When adding new features:

1. Write new code in TypeScript (in `src/`)
2. Add appropriate type definitions
3. Build and test your changes
4. Ensure all existing tests pass

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Chrome Extension Types](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/chrome)
- [TypeScript with Jest](https://jestjs.io/docs/getting-started#using-typescript)
