# E2E Testing for Smashchats

This directory contains the end-to-end (E2E) testing infrastructure for Smashchats, built with Playwright to test real user flows against mock SME and NAB servers.

## Overview

Our E2E testing strategy focuses on **smoke tests** that verify core functionality works end-to-end:
- ✅ **No unit tests** - only E2E flows that exercise the real application
- ✅ **Real crypto** - no short-circuiting of encryption/decryption
- ✅ **SME relay transport** - deterministic message delivery via mock servers
- ✅ **Stable selectors** - `data-testid` attributes for reliable element targeting
- ✅ **Low flakiness** - robust waits and error handling

## Directory Structure

```
tests/
├── e2e/                      # Playwright E2E tests
│   ├── fixtures/             # Test fixtures and utilities
│   │   ├── servers.ts        # Mock server lifecycle management
│   │   └── users.ts          # User context and helper functions
│   ├── identity.spec.ts      # Identity creation and persistence tests
│   └── relay-text-message.spec.ts  # Text messaging via SME relay
├── mocks/                    # Mock server implementations
│   ├── dev.ts               # Development script to run all mocks
│   ├── sme-server.ts        # Mock SME (Smash Message Exchange) server
│   └── nab-server.ts        # Mock NAB (Neighborhood Admin Bot) server
└── README.md                # This file
```

## Environment Variables

### Test Mode Configuration

The application supports test mode via environment variables:

| Variable | Purpose | Test Value | Production Value |
|----------|---------|------------|------------------|
| `VITE_TEST_MODE` | Enable test mode | `true` | `false` (default) |
| `VITE_DISABLE_SW` | Disable service worker | `true` | `false` (default) |
| `VITE_TEST_TRANSPORT` | Force transport method | `relay` | `auto` (default) |
| `VITE_SME_URL` | SME server endpoint | `http://localhost:12345/valid` | Production URL |
| `VITE_SME_PUBLIC_KEY` | SME server public key | Mock server key | Production key |
| `VITE_NAB_URL` | NAB server endpoint | `http://localhost:12346` | Production URL |

### Environment Files

- `.env.test` - Test environment configuration
- `.env.local` - Local development overrides (gitignored)

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install --with-deps
```

### Local Development

#### Option 1: Full E2E Suite (Recommended)
```bash
# Starts mock servers, test app, and runs all tests
npm run e2e
```

#### Option 2: Headed Mode (for debugging)
```bash
# Run tests with browser UI visible
npm run e2e:headed
```

#### Option 3: Interactive Mode
```bash
# Open Playwright UI for interactive testing
npm run e2e:ui
```

#### Option 4: Manual Setup
```bash
# Terminal 1: Start mock servers
npm run dev:mocks

# Terminal 2: Start app in test mode  
npm run dev:test

# Terminal 3: Run tests (once servers are ready)
npm run test:e2e
```

### CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

View test reports at: `https://[owner].github.io/[repo]/e2e-reports/[run-number]`

## Mock Servers

### SME (Smash Message Exchange) Server

**Port:** 12345  
**Endpoints:**
- `GET /api/health` - Health check
- `GET /api/server-info` - Connection statistics
- Socket.IO namespace: `/valid`

The mock SME server implements the WebSocket-based message relay protocol used by the Smash library for peer-to-peer communication when direct connections aren't available.

### NAB (Neighborhood Admin Bot) Server

**Port:** 12346  
**Endpoints:**
- `GET /health` - Health check
- `POST /join` - Handle neighborhood join requests
- `GET /discover` - Return list of neighborhood members
- `POST /profile` - Handle profile updates
- `POST /relationship` - Handle smash/pass/clear actions

The mock NAB server simulates a neighborhood admin bot for peer discovery and social graph management.

## Test Browser Configurations

### chromium-mobile (Default)
- **Device:** Pixel 7 (mobile viewport)
- **Special flags:** Fake media streams for camera/microphone
- **Use for:** Primary mobile user flow testing

### webkit-ui  
- **Device:** Desktop Safari
- **Use for:** WebKit compatibility testing
- **Note:** WebRTC tests are skipped on this browser

### firefox-ui
- **Device:** Desktop Firefox  
- **Special config:** Fake media permissions
- **Use for:** Firefox compatibility testing
- **Note:** WebRTC tests are skipped on this browser

## Writing Tests

### Test Structure

```typescript
import { test, expect } from './fixtures/users.js';
import { completeOnboarding, getDIDDocument, startNewChat, sendTextMessage } from './fixtures/users.js';

test.describe('Feature Name', () => {
  test('should do something', async ({ alice, bob }) => {
    // Setup
    await completeOnboarding(alice.page, 'Alice');
    await completeOnboarding(bob.page, 'Bob');
    
    // Action
    const bobDID = await getDIDDocument(bob.page);
    await startNewChat(alice.page, bobDID);
    await sendTextMessage(alice.page, 'Hello!');
    
    // Assertion
    await expect(alice.page.getByTestId('chat-message-outgoing')).toContainText('Hello!');
  });
});
```

### Helper Functions

| Function | Purpose |
|----------|---------|
| `completeOnboarding(page, name)` | Complete welcome flow and create identity |
| `getDIDDocument(page)` | Navigate to settings and copy DID document |
| `startNewChat(page, didDoc)` | Start new conversation with DID document |
| `sendTextMessage(page, text)` | Send a text message in active chat |

### Selector Conventions

Use `data-testid` attributes for stable element selection:

| Pattern | Example | Purpose |
|---------|---------|---------|
| `nav-{section}` | `nav-chats` | Navigation buttons |
| `side-nav-{section}` | `side-nav-settings` | Desktop sidebar navigation |
| `welcome-{action}` | `welcome-create-identity` | Onboarding flow actions |
| `chat-{element}` | `chat-input`, `chat-send-button` | Chat interface elements |
| `chat-message-{type}` | `chat-message-outgoing` | Message bubbles |
| `new-chat-{action}` | `new-chat-start` | New conversation dialog |
| `copy-{resource}` | `copy-did-document` | Copy actions |

### Test Data Management

- **Isolated contexts:** Each user gets their own browser context with isolated storage
- **Fresh identities:** New DID generated for each test run
- **Clean slate:** No persistent data between test runs
- **Mock endpoints:** All external communication goes through mock servers

## Debugging Tests

### Local Debugging

1. **Run with headed browsers:**
```bash
npm run e2e:headed
```

2. **Use Playwright UI:**
```bash
npm run e2e:ui
```

3. **Debug specific test:**
```bash
npx playwright test identity.spec.ts --debug
```

### CI Debugging

1. **Check test artifacts:** Download from GitHub Actions run
2. **View test videos:** Available for failed tests
3. **Inspect traces:** Available on first retry
4. **Review logs:** Mock server and application logs in CI output

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout, check mock server health |
| Element not found | Verify `data-testid` exists and is unique |
| Mock server connection failed | Check port conflicts, firewall settings |
| Browser not launching | Run `npx playwright install --with-deps` |

## Browser Compatibility

### Supported Features by Browser

| Feature | Chromium | WebKit | Firefox |
|---------|----------|---------|---------|
| Text messaging | ✅ | ✅ | ✅ |
| Media upload | ✅ | ✅ | ✅ |
| Camera capture | ✅ | ⚠️ | ⚠️ |
| Audio recording | ✅ | ⚠️ | ⚠️ |
| WebRTC (future) | ✅ | ❌ | ❌ |

**Legend:**
- ✅ Fully supported and tested
- ⚠️ Supported but may have limitations
- ❌ Not supported/skipped in tests

## Performance Considerations

- Tests run in parallel by default (except in CI)
- Mock servers are shared across tests in the same worker
- Browser contexts are isolated per user
- Videos/traces only captured on failure to save space

## Contributing

### Adding New Tests

1. **Follow existing patterns** in `identity.spec.ts` and `relay-text-message.spec.ts`
2. **Use helper functions** from `fixtures/users.ts` when possible
3. **Add `data-testid` attributes** to new UI elements you need to interact with
4. **Test both mobile and desktop** viewports when relevant
5. **Keep tests focused** on happy path flows (smoke tests, not exhaustive testing)

### Adding New Mock Endpoints

1. **SME server:** Add endpoints to `mocks/sme-server.ts`
2. **NAB server:** Add endpoints to `mocks/nab-server.ts`
3. **Update health checks** to verify new functionality
4. **Document new endpoints** in this README

### Test ID Guidelines

- Use kebab-case: `data-testid="new-chat-start"`
- Be specific but not overly verbose: `chat-input` not `chat-input-textarea-element`
- Group related elements: `nav-chats`, `nav-camera`, `nav-gallery`
- Include action context: `welcome-create-identity`, `copy-did-document`

## Architecture Notes

### Why Mock Servers?

- **Deterministic:** Consistent behavior across test runs
- **Fast:** No network delays or external dependencies
- **Isolated:** Tests don't interfere with production services
- **Controllable:** Can simulate various server states and responses

### Why No Unit Tests?

- **Real integration:** E2E tests catch issues unit tests miss
- **User-focused:** Tests match actual user workflows
- **Fewer mocks:** Less complex test setup and maintenance
- **Confidence:** Higher confidence in release readiness

### Test Isolation Strategy

- **Browser contexts:** Each user gets isolated storage and state
- **Mock server state:** Cleaned between test suites
- **No shared state:** Tests can run in any order
- **Fresh identities:** New DID generated per test execution

## Troubleshooting

### Mock Server Issues

```bash
# Check if ports are in use
lsof -i :12345
lsof -i :12346

# Kill processes using ports
npx kill-port 12345 12346

# Test mock server health
curl http://localhost:12345/api/health
curl http://localhost:12346/health
```

### Playwright Issues

```bash
# Reinstall browsers
npx playwright install --force

# Clear browser cache
rm -rf ~/.cache/ms-playwright

# Check Playwright info
npx playwright --version
npx playwright list
```

### Application Issues

```bash
# Verify test environment is loaded
# Check browser devtools localStorage for VITE_TEST_MODE=true

# Test application health
curl http://localhost:5173
curl http://localhost:4173  # for preview mode
```

## Performance Metrics

Target test execution times:
- **Identity creation:** < 10 seconds
- **Text message exchange:** < 15 seconds
- **Full E2E suite:** < 5 minutes (all browsers)

## Security Considerations

- Mock servers use real cryptographic operations
- Test keys are publicly known (not for production)
- Isolated test environments prevent data leakage
- No production credentials in test code