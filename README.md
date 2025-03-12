# Smash Web Client

A minimal web client implementation of the Smash Protocol using React, TypeScript, and Vite. This project serves as a reference implementation and MVP (Minimum Viable Product) for building web-based Smash Protocol clients.

## Overview

This web client demonstrates the core functionality of the [Smash Protocol](https://github.com/smashchats/smash-node-lib) - a modular, 1:N social messaging and curated content-sharing protocol. While the [official Smash mobile app](https://github.com/smashchats/smashchats) is recommended for general use, this implementation serves as:

- A reference for developers building web-based Smash clients
- An MVP showcasing basic Smash Protocol features
- A foundation for derived Smash-based solutions

## Features

- Basic messaging functionality
- Message deduplication and ordering
- Secure communication using the Signal Protocol
- Neighborhood-based organization
- Integration with AT Protocol for decentralized identity

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Development

- `npm run lint` - Run ESLint
- `npm run format` - Format code using Prettier
- `npm run lint:fix` - Fix linting issues automatically

## Contributing

We welcome contributions to the Smash Web Client! All code you contribute is owned by YOU and contributed under the terms of our MIT License.

### Using Radicle

We use Radicle—a decentralized Git collaboration network—for code management and contributions:

1. Install Radicle:

```bash
curl -sSf https://radicle.xyz/install | sh
```

2. Create a Radicle identity:

```bash
rad auth
```

3. Clone the repository:

```bash
rad clone rad:z2F3vmWnoazdMPmrdfEw3ANT6r1py
```

### Making Changes

We use Radicle Patches instead of GitHub Pull Requests:

1. Create a branch:

```bash
git checkout -b feat/my-feature
```

2. Make your changes and commit:

```bash
git add .
git commit -m "Description of changes"
```

3. Propose a patch:

```bash
git push rad HEAD:refs/patches
```

### Issues

Browse and manage issues through Radicle:

- [Browse open issues](https://app.radicle.xyz/nodes/seed.radicle.garden/rad:z2F3vmWnoazdMPmrdfEw3ANT6r1py/issues)
- Create new issues: `rad issue open`
- Comment on issues: `rad issue comment <id>`

For more detailed contribution guidelines, please read our [Contributing Guide](https://github.com/smashchats/smash-node-lib/blob/main/docs/CONTRIBUTING.md).

## License

MIT License - See LICENSE file for details.

## Related Projects

- [Smash Node Library](https://github.com/smashchats/smash-node-lib) - Core protocol implementation
- [Smash Mobile App](https://github.com/smashchats/smashchats) - Official mobile client (recommended)
