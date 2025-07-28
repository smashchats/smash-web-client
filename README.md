# Smashchats Web Client

A modern, mobile-first web application implementing the Smash Protocol - a decentralized, 1:N messaging and social discovery protocol. Built with React, TypeScript, and cutting-edge web technologies, this PWA serves as both a reference implementation and a fully functional chat application.

## 🚀 Overview

Smashchats is inspired by the best features of Snapchat, Telegram, and Signal, but built on a decentralized foundation. This web client demonstrates:

- **Decentralized Identity**: DID-based peer identities with cryptographic security
- **End-to-End Encryption**: Signal protocol for message encryption
- **Modern Architecture**: Clean, modular React codebase following best practices
- **Mobile-First PWA**: Optimized for mobile devices with native app-like experience
- **Real-time Messaging**: Instant message delivery and status updates

This implementation serves as:

- A reference for developers building Smash clients
- A fully functional messaging app for end users
- A testing ground for new Smash Protocol features

## ✨ Features

### Core Messaging

- ✅ **Identity Management**: Generate, import, and manage DID-based identities
- ✅ **End-to-End Encryption**: Signal protocol implementation for secure messaging
- ✅ **Real-time Chat**: Send and receive text messages instantly
- ✅ **Media Sharing**: Share images, videos, and audio messages
- ✅ **Message Status**: Delivery confirmations and read receipts
- ✅ **Offline Support**: Messages persist locally and sync when online

### Social Features

- ✅ **Profile Management**: Update and share user profiles automatically
- 🚧 **Neighborhoods**: Join communities for peer discovery
- 🚧 **Social Graph**: Build relationships with smash/pass/trust interactions
- 🚧 **Peer Discovery**: Find and connect with nearby users

### Technical Features

- ✅ **PWA Support**: Install as native app on mobile devices
- ✅ **Responsive Design**: Mobile-first UI that works everywhere
- ✅ **Dark/Light Mode**: Automatic theme switching based on system preference
- ✅ **Modern Architecture**: Clean, maintainable codebase
- ✅ **Type Safety**: Full TypeScript coverage

## 🏗️ Architecture

This project follows modern React best practices with a clean, modular architecture:

```
src/
├── app/                    # Application initialization and routing
│   ├── providers/         # React context providers
│   ├── config/           # App configuration
│   └── routes.tsx        # Route definitions
├── features/              # Feature-based organization
│   ├── identity/         # Identity management
│   ├── messaging/        # Message handling
│   ├── chat/            # Chat UI components
│   └── profile/         # Profile management
├── services/             # Business logic and API layer
│   ├── messageService.ts      # Message operations
│   ├── conversationService.ts # Conversation management
│   ├── smashOrchestrator.ts  # Service coordination
│   └── db.ts                 # Local storage
└── shared/               # Reusable components and utilities
    ├── components/       # UI components
    ├── hooks/           # Custom React hooks
    ├── utils/           # Utility functions
    ├── types/           # TypeScript definitions
    └── styles/          # Design system and styling
```

### Design Principles

- **Feature-First Organization**: Code is organized by feature, not by file type
- **Service Layer Pattern**: Business logic separated from UI components
- **Clean Architecture**: Clear separation of concerns with defined boundaries
- **Design System**: Consistent UI built with TailwindCSS and design tokens
- **Type Safety**: Comprehensive TypeScript coverage for better DX

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with WebCrypto support

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/smashchats/smash-web-client
    cd smash-web-client
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Start development server**

    ```bash
    npm run dev
    ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

### Production Build

```bash
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🛠️ Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier

### Code Organization

#### Path Aliases

The project uses clean import paths:

```typescript
import { useIdentity } from '@features/identity';
import { messageService } from '@services/messageService';
import { Button } from '@shared/components/Button';
```

#### Service Layer

Services handle all business logic and external API calls:

```typescript
// Message operations
await messageService.sendMessage(recipientId, 'Hello!');

// Conversation management
await conversationService.markAsRead(conversationId);

// Orchestrated operations
await smashOrchestrator.sendMessage(recipientId, content);
```

#### Component Patterns

Components use modern React patterns:

```typescript
// Proper TypeScript definitions
type ButtonProps = {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
} & ButtonHTMLAttributes<HTMLButtonElement>;

// Forward refs for better composition
const Button = forwardRef<HTMLButtonElement, ButtonProps>(...);

// Design system integration
<Button variant="primary" size="lg" className="custom-styles">
  Send Message
</Button>
```

### Styling and Design System

The app uses a custom design system built on TailwindCSS:

- **Design Tokens**: Consistent spacing, colors, and typography
- **Utility Classes**: Pre-built component styles (`.btn-primary`, `.input-base`)
- **Dark Mode**: Automatic theme switching with CSS custom properties
- **Mobile-First**: Responsive design optimized for mobile devices

### State Management

- **Zustand**: Lightweight state management for UI state
- **React Context**: Feature-specific state and dependency injection
- **Local Storage**: Persistent data with Dexie.js (IndexedDB wrapper)

## 🧪 Testing

The project includes comprehensive testing setup:

```bash
npm run test        # Run tests in Chromium (primary browser)
npm run test:ui     # Run tests with UI for debugging
npm run test:debug  # Run tests in debug mode
```

## 📱 PWA Features

Smashchats is built as a Progressive Web App:

- **Installable**: Add to home screen on mobile devices
- **Offline Ready**: Core functionality works without internet
- **App-like Experience**: Native navigation and interactions
- **Background Sync**: Messages sync when connection returns

## 🔒 Security

- **End-to-End Encryption**: All messages encrypted using Signal protocol
- **Identity Verification**: Cryptographic proof of identity ownership
- **Local Storage**: Sensitive data encrypted locally
- **No Server Dependencies**: Decentralized architecture reduces attack surface

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch** from `main`
3. **Make your changes** following our coding standards
4. **Test thoroughly** - run tests and manual testing
5. **Submit a pull request** with clear description

### Coding Standards

- **TypeScript**: All code must be properly typed
- **ESLint + Prettier**: Automated formatting and linting
- **Component Design**: Follow existing patterns and design system
- **Performance**: Consider bundle size and runtime performance
- **Accessibility**: Ensure components are accessible

### Using Radicle

We use Radicle for decentralized collaboration:

```bash
# Install Radicle
curl -sSf https://radicle.xyz/install | sh

# Create identity and clone
rad auth
rad clone rad:z2F3vmWnoazdMPmrdfEw3ANT6r1py

# Submit changes
git push rad HEAD:refs/patches
```

### Getting Help

- **Issues**: [Browse and create issues](https://app.radicle.xyz/nodes/seed.radicle.garden/rad:z2F3vmWnoazdMPmrdfEw3ANT6r1py/issues)
- **Documentation**: Check `/docs` for detailed guides
- **Community**: Join our development discussions

## 📚 Learning Resources

### Understanding the Codebase

1. **Start with the Tutorial**: Check `smash-node-lib/tests/tutorial.spec.ts` for protocol usage
2. **Explore Features**: Each feature in `/src/features` is self-contained
3. **Service Layer**: `/src/services` contains all business logic
4. **Design System**: `/src/shared/styles/design-system` for UI patterns

### Key Concepts

- **DID (Decentralized Identifiers)**: W3C standard for decentralized identity
- **Signal Protocol**: End-to-end encryption for messaging
- **Neighborhoods**: Communities for peer discovery and social graphs
- **PWA**: Progressive Web App for native-like experience

## 🔧 Troubleshooting

### Common Issues

**Build fails with crypto errors**

- Ensure you're using Node.js 18+ with WebCrypto support

**Messages not sending**

- Check browser console for WebCrypto or network errors
- Verify SME (Smash Messaging Endpoint) connectivity

**App won't install as PWA**

- Ensure you're using HTTPS or localhost
- Check PWA manifest in browser dev tools

### Performance

The app is optimized for performance:

- **Code Splitting**: Features loaded on demand
- **Bundle Analysis**: Use `npm run build` to check bundle size
- **Lazy Loading**: Non-critical features loaded asynchronously

## 📋 Roadmap

### Near Term (Q1 2024)

- 🚧 Multi-device backup and sync
- 🚧 Push notifications for PWA
- 🚧 Group messaging support
- 🚧 Enhanced media sharing

### Medium Term (Q2-Q3 2024)

- 🚧 Voice and video calling
- 🚧 Neighborhood discovery and joining
- 🚧 Social graph visualization
- 🚧 App link support (smash:// protocol)

### Long Term (Q4 2024+)

- 🚧 Cross-platform desktop app
- 🚧 Advanced privacy controls
- 🚧 Plugin system for extensions
- 🚧 Decentralized content distribution

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- **[Smash Node Library](https://github.com/smashchats/smash-node-lib)** - Core protocol implementation
- **[Smash Mobile App](https://github.com/smashchats/smashchats)** - Official mobile client

---

**Built with ❤️ by the Smashchats team**
