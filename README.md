# Smash Web Client

A modern, mobile-first web application implementing the Smash Protocol - a decentralized, 1:N messaging and social discovery protocol. Built with React, TypeScript, and cutting-edge web technologies, this PWA serves as both a reference implementation and a fully functional chat application.

## Overview

Smashchats is inspired by the best features of Snapchat, Telegram, and Signal, but built on a truly decentralized foundation: the **Smash Protocol**.

This web client demonstrates:

- **Decentralized Identity**: DID-based peer identities with cryptographic security
- **End-to-End Encryption**: Signal protocol for message encryption
- **Modern Architecture**: Clean, modular React codebase following best practices
- **Mobile-First PWA**: Optimized for mobile devices with native app-like experience
- **Real-time Messaging**: Instant message delivery and status updates

This implementation serves as:

- A reference for developers building Smash clients
- A fully functional messaging app for end users
- A testing ground for new Smash Protocol features

## Happy path

### Smashchats web app 0.1 alpha

> Like a simple Snapchat/Telegram

- [x] quick welcome path (local DID doc)
- [x] send messages to a peer
- [-] _propagate meta profile updates_
- [ ] scan QR code to chat with peer
- [ ] scan to join alpha NBH , adds to list once joined
- [ ] discover peer in alpha NBH and message them
- [ ] pass/smash/trust(with name) and share trust endorsements
- [ ] keep messages
- [x] share media
- [ ] keep media
- [-] offline and reloads works – keep queues and data
- [ ] PWA – *no backups for now* – ship to alpha testers
- [ ] simple mobile/browser/pwa notifications
- [ ] unless kept , all exchanged data is deleted after 7 days
- [ ] hide or remove unused feats to ship alpha

### Neighborhood 0.1 alpha

> Like a simple Snapchat/Telegram/Grindr

NBH

- NBH onboarding + username (DNS) allocation
- Link with Smash identity
- Sync profile artefacts with connected Smash user
- Profile public link (alt to LinkTree) – IG-like
- Join NBH in Smash app (explain + explain referals)
- Send Welcome message from NBH and Waitlist (referals) instructions
- Once in, Discover – on profile "Send a message" link to Waitlist

Smashchats

- Backup & Sync service for profile & kept data & last-7-days events thread (simple hardcoded service)
- Document protocol & vision (notes & blog posts)
- _set up automations, background agents, Sonar auto fixes etc in web and lib code repos_

### Neighborhood 1.0 alpha

NBH

- User-based Relationships

Smashchats

- Web of trust
- Badges & Badge endorsements
- Document protocol & vision (notes & blog posts)

### Neighborhood 1.0 beta

NBH

- NBH onboarding (improved UX and Smarter)
- Link BlueSky to Smash identity & show public posts and media on public profile
- "Send a message" link to smash:// registered App link (or smashchats.com whatever)
- Crowdfund & Premium options (+ free premium for referals)

Smashchats

- Link ATProto/BlueSky
- Support App Links (eg, smash://)
- Document protocol & vision (notes & blog posts)
- Fundraise

## TODO/Issues/Known Bugs and Gaps

- smoke tests

## Features

- [x] generating a peer identity / DID
- [x] exporting a peer identity / DID
- [x] connecting to SME

- [x] sending a text message to a peer
- [x] receiving a text message from a peer
- [x] handling message status updates
- [x] marking messages as read
- [x] add total badge count to navbar

- [x] offline storage and app reload
- [ ] **reload message queues & buffers/parts**
- [ ] message deduplication and re-ordering/sorting

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
- [ ] allow downloading–including for all other unsupported media types
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

- [ ] import backed-up identity and data

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

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- **[Smash Node Library](https://github.com/smashchats/smash-node-lib)** - Core protocol implementation
- **[Smash Mobile App](https://github.com/smashchats/smashchats)** - Official mobile client (project currently on hold)

---

**Built with ❤️ by the Smashchats team**
