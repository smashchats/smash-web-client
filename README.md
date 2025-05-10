# Smash Web Client

A minimal web client implementation of the Smash Protocol using React, TypeScript, and Vite. This project serves as a reference implementation and MVP (Minimum Viable Product) for building web-based Smash Protocol clients.

## Overview

This web client demonstrates the core functionality of the [Smash Protocol](https://github.com/smashchats/smash-node-lib) - a modular, 1:N social messaging and curated content-sharing protocol. While the [official Smash mobile app](https://github.com/smashchats/smashchats) is recommended for general use, this implementation serves as:

- A reference for developers building web-based Smash clients
- An MVP showcasing basic Smash Protocol features
- A foundation for derived Smash-based solutions

## Features

- [x] generating a peer identity / DID
- [x] exporting a peer identity / DID
- [x] connecting to SME

- [x] sending a text message to a peer
- [x] receiving a text message from a peer
- [x] handling message status updates
- [x] marking messages as read
- [ ] add total badge count to navbar

- [x] offline storage and app reload
- [ ] **reload message queues & buffers/parts**
- [ ] message deduplication and re-ordering/sorting

- [ ] quick adjustments for responsive design

- [x] receiving a profile message from a peer
- [x] updating the peer's profile

- [x] share embedded media
- [x] share embedded media in parts (limit any message size at protocol level)
- [ ] **show loader when sending/receiving media parts + preview available info** -> only make sense with CDN or P2P uploads
- [ ] **use thumbnail in chat! (avoids loading 100%)**
- [x] implement support for all browser mime types
- [x] implement support for video mime types
- [x] implement support for vocal mime types
- [x] add an easy mic recorder option
- [x] allow downloading all other unsupported media types
- [ ] livestream embedded media with postponed decryption (snap)
- [ ] CDN-hosted media

- [ ] refactor styles with Tailwind

- [ ] **DEBUG SME deconnects at times**

- [ ] **PDS to store data, backup and settings (+ allow for multi device and recovery)**

- [ ] **joining a Neighborhood**
- [ ] **discovering other peers in the neighborhood (NBH_PROFILE_LIST)**
- [ ] **smashing another user from the neighborhood**
- [ ] **passing another user from the neighborhood**
- [ ] **clearing another user from the neighborhood**

- [ ] blocking/unblocking another peer

- [ ] update message status more granular (sending, delivered, received, read, failed, retrying)
- [ ] report peer to admins
- [ ] P2P communication upgrade

- [ ] privacy/trust: more granular profile sharing

- [ ] P2P calls
- [ ] P2P calls with relay server
- [ ] privacy settings

### bugs

- error toast not handling close event
- unhandled duplicate connection to SME

## Other todos

- [ ] input field in welcome guide doesn't populate name in meta
- [ ] "Start New Conversation" dialog doesn't have the same colours as the app
- [ ] long "loading identity"
- [ ] chatinput blurs after sending message, shouldn't be like this
- [ ] chatmessagesScreen should scroll to bottom / keep scrolled at bottom

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
- `npm run test` - Run tests in Chromium (primary browser for testing)
- `npm run test:ui` - Run tests with UI mode for debugging
- `npm run test:debug` - Run tests in debug mode

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
