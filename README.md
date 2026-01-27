# CSS Moderation Plugin

A Community Solid Server (CSS) plugin that provides content moderation for uploads using the SightEngine API. Supports image, text, and video moderation with configurable thresholds.

## Features

- **Image Moderation**: Detects nudity, violence/gore, weapons, alcohol, drugs, offensive symbols, self-harm, and gambling
- **Text Moderation**: Detects sexual, discriminatory, insulting, violent, toxic, and self-harm content, plus personal info (PII)
- **Video Moderation**: Frame-by-frame analysis for all image moderation categories plus tobacco
- **Configurable Thresholds**: Set custom thresholds via Components.js config or environment variables
- **Audit Logging**: JSON Lines audit log with pod name and agent (WebID) tracking
- **Fail-Open Policy**: API errors allow uploads to proceed (configurable)

## Project Structure

```
cms-solid/
├── src/
│   ├── ModerationOperationHandler.ts   # Main handler class with SightEngine integration
│   └── index.ts                        # Export barrel
├── components/
│   └── components.jsonld               # Component definition with configurable parameters
├── dist/                               # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## How It Works

The plugin wraps CSS's default `OperationHandler` with a `ModerationOperationHandler` that intercepts PUT/POST operations and moderates content before storage.

```
Request Flow:
┌─────────────┐    ┌──────────────────┐    ┌───────────────────────────┐    ┌──────────────────┐
│ HTTP Request │ → │ AuthorizingHandler│ → │ ModerationOperationHandler │ → │ WaterfallHandler │
└─────────────┘    └──────────────────┘    └───────────────────────────┘    └──────────────────┘
                                                      ↓
                                           [SightEngine API Moderation]
                                                      ↓
                                           [Audit Log Entry Written]
```

## Installation

1. **Build the plugin:**
   ```bash
   cd cms-solid
   npm install
   npm run build
   ```

2. **Link to CSS:**
   ```bash
   npm link
   cd /path/to/CommunitySolidServer
   npm link cms-solid
   ```

3. **Set up SightEngine API credentials:**
   ```bash
   export SIGHTENGINE_API_USER="your_api_user"
   export SIGHTENGINE_API_SECRET="your_api_secret"
   ```

4. **Create the moderation config in CSS:**
   
   Create `config/moderation.json` in your CSS directory (see Configuration section below).

5. **Start CSS with the moderation config:**
   ```bash
   cd /path/to/CommunitySolidServer
   SIGHTENGINE_API_USER="..." SIGHTENGINE_API_SECRET="..." \
     node bin/server.js -c config/moderation.json -f data/ -p 3009
   ```

## Configuration

### Basic Configuration (config/moderation.json)

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^5.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^7.0.0/components/context.jsonld",
    {
      "cms-solid": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/",
      "nudityThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#nudityThreshold" },
      "violenceThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#violenceThreshold" },
      "weaponThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#weaponThreshold" },
      "enabledChecks": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#enabledChecks" }
    }
  ],
  "import": [
    "css:config/app/init/initialize-intro.json",
    "css:config/app/main/default.json",
    "css:config/app/variables/default.json",
    "css:config/http/handler/default.json",
    "css:config/http/middleware/default.json",
    "css:config/http/notifications/all.json",
    "css:config/http/server-factory/http.json",
    "css:config/http/static/default.json",
    "css:config/identity/access/public.json",
    "css:config/identity/email/default.json",
    "css:config/identity/handler/default.json",
    "css:config/identity/oidc/default.json",
    "css:config/identity/ownership/token.json",
    "css:config/identity/pod/static.json",
    "css:config/ldp/authentication/dpop-bearer.json",
    "css:config/ldp/authorization/webacl.json",
    "css:config/ldp/handler/components/authorizer.json",
    "css:config/ldp/handler/components/error-handler.json",
    "css:config/ldp/handler/components/operation-handler.json",
    "css:config/ldp/handler/components/operation-metadata.json",
    "css:config/ldp/handler/components/preferences.json",
    "css:config/ldp/handler/components/request-parser.json",
    "css:config/ldp/handler/components/response-writer.json",
    "css:config/ldp/metadata-parser/default.json",
    "css:config/ldp/metadata-writer/default.json",
    "css:config/ldp/modes/default.json",
    "css:config/storage/backend/memory.json",
    "css:config/storage/key-value/resource-store.json",
    "css:config/storage/location/root.json",
    "css:config/storage/middleware/default.json",
    "css:config/util/auxiliary/acl.json",
    "css:config/util/identifiers/suffix.json",
    "css:config/util/index/default.json",
    "css:config/util/logging/winston.json",
    "css:config/util/representation-conversion/default.json",
    "css:config/util/resource-locker/memory.json",
    "css:config/util/variables/default.json"
  ],
  "@graph": [
    {
      "comment": "Create moderation handler with custom thresholds",
      "@id": "urn:solid-server:moderation:ModerationOperationHandler",
      "@type": "cms-solid:ModerationOperationHandler",
      "cms-solid:ModerationOperationHandler#source": {
        "@id": "urn:solid-server:default:OperationHandler"
      },
      "nudityThreshold": 0.7,
      "violenceThreshold": 0.6,
      "weaponThreshold": 0.4,
      "enabledChecks": "nudity,gore,wad,offensive,self-harm"
    },
    {
      "comment": "Wire moderation handler into the LDP handler chain",
      "@id": "urn:solid-server:default:LdpHandler",
      "@type": "ParsingHttpHandler",
      "args_requestParser": { "@id": "urn:solid-server:default:RequestParser" },
      "args_errorHandler": { "@id": "urn:solid-server:default:ErrorHandler" },
      "args_responseWriter": { "@id": "urn:solid-server:default:ResponseWriter" },
      "args_operationHandler": {
        "@type": "AuthorizingHttpHandler",
        "args_credentialsExtractor": { "@id": "urn:solid-server:default:CredentialsExtractor" },
        "args_modesExtractor": { "@id": "urn:solid-server:default:ModesExtractor" },
        "args_permissionReader": { "@id": "urn:solid-server:default:PermissionReader" },
        "args_authorizer": { "@id": "urn:solid-server:default:Authorizer" },
        "args_operationHandler": {
          "@type": "WacAllowHttpHandler",
          "args_credentialsExtractor": { "@id": "urn:solid-server:default:CredentialsExtractor" },
          "args_modesExtractor": { "@id": "urn:solid-server:default:ModesExtractor" },
          "args_permissionReader": { "@id": "urn:solid-server:default:PermissionReader" },
          "args_operationHandler": { "@id": "urn:solid-server:moderation:ModerationOperationHandler" }
        }
      }
    }
  ]
}
```

### Configurable Parameters

All thresholds are values between 0 and 1. Higher values = more permissive.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `nudityThreshold` | 0.5 | Threshold for nudity detection |
| `violenceThreshold` | 0.5 | Threshold for violence/gore detection |
| `weaponThreshold` | 0.5 | Threshold for weapon detection |
| `alcoholThreshold` | 0.8 | Threshold for alcohol detection |
| `drugsThreshold` | 0.5 | Threshold for drugs detection |
| `offensiveThreshold` | 0.5 | Threshold for offensive symbols |
| `selfharmThreshold` | 0.3 | Threshold for self-harm detection |
| `gamblingThreshold` | 0.5 | Threshold for gambling detection |
| `tobaccoThreshold` | 0.5 | Threshold for tobacco detection (video) |
| `textSexualThreshold` | 0.5 | Threshold for sexual text content |
| `textDiscriminatoryThreshold` | 0.5 | Threshold for discriminatory text |
| `textInsultingThreshold` | 0.5 | Threshold for insulting text |
| `textViolentThreshold` | 0.5 | Threshold for violent text |
| `textToxicThreshold` | 0.5 | Threshold for toxic text |
| `textSelfharmThreshold` | 0.3 | Threshold for self-harm text |
| `enabledChecks` | `nudity,gore,wad,offensive` | Comma-separated image checks |
| `enabledTextChecks` | `sexual,discriminatory,insulting,violent,toxic,self-harm,personal` | Comma-separated text checks |
| `enabledVideoChecks` | `nudity,gore,wad,offensive,self-harm,gambling,tobacco` | Comma-separated video checks |
| `auditLogEnabled` | `true` | Enable/disable audit logging |
| `auditLogPath` | `./moderation-audit.log` | Path to audit log file |

### Environment Variables

Environment variables can be used as fallbacks when Components.js parameters are not set:

```bash
# API Credentials (required)
SIGHTENGINE_API_USER=your_user_id
SIGHTENGINE_API_SECRET=your_secret

# Thresholds (optional, Components.js config takes priority)
MODERATION_THRESHOLD_NUDITY=0.5
MODERATION_THRESHOLD_VIOLENCE=0.5
MODERATION_THRESHOLD_WEAPON=0.5
MODERATION_THRESHOLD_ALCOHOL=0.8
MODERATION_THRESHOLD_DRUGS=0.5
MODERATION_THRESHOLD_OFFENSIVE=0.5
MODERATION_THRESHOLD_SELFHARM=0.3
MODERATION_THRESHOLD_GAMBLING=0.5
MODERATION_THRESHOLD_TOBACCO=0.5

# Text thresholds
MODERATION_THRESHOLD_TEXT_SEXUAL=0.5
MODERATION_THRESHOLD_TEXT_DISCRIMINATORY=0.5
MODERATION_THRESHOLD_TEXT_INSULTING=0.5
MODERATION_THRESHOLD_TEXT_VIOLENT=0.5
MODERATION_THRESHOLD_TEXT_TOXIC=0.5
MODERATION_THRESHOLD_TEXT_SELFHARM=0.3

# Enabled checks
MODERATION_CHECKS=nudity,gore,wad,offensive
MODERATION_TEXT_CHECKS=sexual,discriminatory,insulting,violent,toxic,self-harm,personal
MODERATION_VIDEO_CHECKS=nudity,gore,wad,offensive,self-harm,gambling,tobacco

# Audit logging
MODERATION_AUDIT_LOG=true
MODERATION_AUDIT_LOG_PATH=./moderation-audit.log
```

## Audit Logging

The plugin writes audit log entries in JSON Lines format:

```json
{"timestamp":"2026-01-26T20:27:00.834Z","action":"REJECT","contentType":"image","path":"http://localhost:3009/alice/photos/image.jpg","pod":"alice","agent":"https://alice.example.org/profile/card#me","mimeType":"image/jpeg","reason":"Content rejected due to policy violations: violence/gore (score: 0.65)","scores":{"gore":0.65},"requestId":"req_abc123"}
{"timestamp":"2026-01-26T20:28:15.123Z","action":"ALLOW","contentType":"image","path":"http://localhost:3009/bob/documents/photo.png","pod":"bob","mimeType":"image/png","scores":{"nudity":0.12,"gore":0.05}}
```

### Audit Log Fields

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 timestamp |
| `action` | `ALLOW`, `REJECT`, or `ERROR` |
| `contentType` | `image`, `text`, or `video` |
| `path` | Full resource URL |
| `pod` | Pod name extracted from path |
| `agent` | WebID of the authenticated user (if available) |
| `mimeType` | Content-Type of the upload |
| `reason` | Rejection reason (for REJECT actions) |
| `scores` | Object with moderation scores |
| `requestId` | SightEngine request ID |

### Querying the Audit Log

```bash
# View all rejections
cat moderation-audit.log | jq 'select(.action == "REJECT")'

# View rejections for a specific pod
cat moderation-audit.log | jq 'select(.action == "REJECT" and .pod == "alice")'

# Count by action type
cat moderation-audit.log | jq -s 'group_by(.action) | map({action: .[0].action, count: length})'
```

## Supported Content Types

### Images
- `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`, `image/bmp`

### Text
- `text/plain`, `text/html`, `text/markdown`, `text/csv`
- `application/json`, `application/xml`, `text/xml`

### Video
- `video/mp4`, `video/mpeg`, `video/quicktime`, `video/x-msvideo`
- `video/x-ms-wmv`, `video/webm`, `video/ogg`, `video/3gpp`, `video/3gpp2`

## Testing

### Manual Testing

```bash
# Test image upload
curl -X PUT -H "Content-Type: image/jpeg" \
  --data-binary @test-image.jpg \
  http://localhost:3009/test-image.jpg

# Test text upload
curl -X PUT -H "Content-Type: text/plain" \
  -d "Hello world, this is a test message" \
  http://localhost:3009/test.txt

# Check server logs
tail -f /path/to/css/server.log | grep Moderation

# Check audit log
tail -f moderation-audit.log | jq .
```

### Automated Testing

This project includes automated unit and integration tests using Jest and ts-jest:

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

#### Test Structure

```
test/
├── config/             # Test-specific CSS configurations
│   └── moderation-memory.json
├── fixtures/           # Mock SightEngine API responses
│   └── mock-responses.ts
├── integration/        # Integration tests (real CSS server)
│   └── Server.test.ts
└── unit/               # Unit tests (mocked dependencies)
    └── ModerationOperationHandler.test.ts
```

#### Test Categories

**Unit Tests** (18 tests) - Mock external dependencies:

1. **Request delegation** - verifies `canHandle()` delegates to source handler
2. **GET request passthrough** - ensures read operations bypass moderation
3. **Image moderation** - tests for nudity, violence, weapons detection with threshold checks
4. **Text moderation** - tests for toxic, sexual, discriminatory content detection
5. **API error handling** - verifies fail-open policy on API errors
6. **API credentials** - confirms moderation is skipped without credentials
7. **Threshold configuration** - validates custom threshold settings work correctly
8. **Non-moderated content** - ensures unsupported content types pass through

**Integration Tests** (8 tests) - Real CSS server with in-memory storage:

1. **Server startup** - verifies server responds correctly
2. **Text uploads** - tests PUT and GET for text content
3. **Resource operations** - tests DELETE and HEAD requests
4. **Content type handling** - tests JSON and HTML content types

#### Writing New Tests

Unit tests mock the global `fetch` function to simulate SightEngine API responses:

```typescript
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(mockSafeImageResponse),
})) as jest.Mock;
```

Use fake timers to handle the constructor's delayed warning:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
  // ... create handler
  jest.advanceTimersByTime(100);
});

afterEach(() => {
  jest.useRealTimers();
});
```

Integration tests use `AppRunner` to start a real CSS instance:

```typescript
import { App, AppRunner, joinFilePath } from '@solid/community-server';

let app: App;

beforeAll(async () => {
  app = await new AppRunner().create({
    config: joinFilePath(__dirname, '../config/moderation-memory.json'),
    loaderProperties: {
      mainModulePath: joinFilePath(__dirname, '../../'),
      dumpErrorState: false,
    },
    shorthand: { port: 3456, loggingLevel: 'off' },
  });
  await app.start();
});

afterAll(async () => {
  await app.stop();
});
```

## Full Configuration Example

The following is a complete working configuration with all image, text, and video thresholds configured:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^5.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^7.0.0/components/context.jsonld",
    {
      "cms-solid": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/",
      "nudityThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#nudityThreshold" },
      "violenceThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#violenceThreshold" },
      "weaponThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#weaponThreshold" },
      "alcoholThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#alcoholThreshold" },
      "drugsThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#drugsThreshold" },
      "offensiveThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#offensiveThreshold" },
      "selfharmThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#selfharmThreshold" },
      "gamblingThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#gamblingThreshold" },
      "tobaccoThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#tobaccoThreshold" },
      "textSexualThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#textSexualThreshold" },
      "textDiscriminatoryThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#textDiscriminatoryThreshold" },
      "textInsultingThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#textInsultingThreshold" },
      "textViolentThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#textViolentThreshold" },
      "textToxicThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#textToxicThreshold" },
      "textSelfharmThreshold": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#textSelfharmThreshold" },
      "enabledChecks": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#enabledChecks" },
      "enabledTextChecks": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#enabledTextChecks" },
      "enabledVideoChecks": { "@id": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/ModerationOperationHandler#enabledVideoChecks" }
    }
  ],
  "import": [
    "css:config/app/init/initialize-intro.json",
    "css:config/app/main/default.json",
    "css:config/app/variables/default.json",
    "css:config/http/handler/default.json",
    "css:config/http/middleware/default.json",
    "css:config/http/notifications/all.json",
    "css:config/http/server-factory/http.json",
    "css:config/http/static/default.json",
    "css:config/identity/access/public.json",
    "css:config/identity/email/default.json",
    "css:config/identity/handler/default.json",
    "css:config/identity/oidc/default.json",
    "css:config/identity/ownership/token.json",
    "css:config/identity/pod/static.json",
    "css:config/ldp/authentication/dpop-bearer.json",
    "css:config/ldp/authorization/webacl.json",
    "css:config/ldp/handler/components/authorizer.json",
    "css:config/ldp/handler/components/error-handler.json",
    "css:config/ldp/handler/components/operation-handler.json",
    "css:config/ldp/handler/components/operation-metadata.json",
    "css:config/ldp/handler/components/preferences.json",
    "css:config/ldp/handler/components/request-parser.json",
    "css:config/ldp/handler/components/response-writer.json",
    "css:config/ldp/metadata-parser/default.json",
    "css:config/ldp/metadata-writer/default.json",
    "css:config/ldp/modes/default.json",
    "css:config/storage/backend/memory.json",
    "css:config/storage/key-value/resource-store.json",
    "css:config/storage/location/root.json",
    "css:config/storage/middleware/default.json",
    "css:config/util/auxiliary/acl.json",
    "css:config/util/identifiers/suffix.json",
    "css:config/util/index/default.json",
    "css:config/util/logging/winston.json",
    "css:config/util/representation-conversion/default.json",
    "css:config/util/resource-locker/memory.json",
    "css:config/util/variables/default.json"
  ],
  "@graph": [
    {
      "comment": "Create moderation handler with custom thresholds",
      "@id": "urn:solid-server:moderation:ModerationOperationHandler",
      "@type": "cms-solid:ModerationOperationHandler",
      "cms-solid:ModerationOperationHandler#source": {
        "@id": "urn:solid-server:default:OperationHandler"
      },
      "nudityThreshold": 0.7,
      "violenceThreshold": 0.6,
      "weaponThreshold": 0.4,
      "alcoholThreshold": 0.9,
      "drugsThreshold": 0.6,
      "offensiveThreshold": 0.5,
      "selfharmThreshold": 0.2,
      "gamblingThreshold": 0.5,
      "tobaccoThreshold": 0.5,
      "textSexualThreshold": 0.5,
      "textDiscriminatoryThreshold": 0.5,
      "textInsultingThreshold": 0.5,
      "textViolentThreshold": 0.5,
      "textToxicThreshold": 0.5,
      "textSelfharmThreshold": 0.3,
      "enabledChecks": "nudity,gore,wad,offensive,self-harm",
      "enabledTextChecks": "sexual,discriminatory,insulting,violent,toxic,self-harm,personal",
      "enabledVideoChecks": "nudity,gore,wad,offensive,self-harm,gambling,tobacco"
    },
    {
      "comment": "Wire moderation handler into the LDP handler chain",
      "@id": "urn:solid-server:default:LdpHandler",
      "@type": "ParsingHttpHandler",
      "args_requestParser": { "@id": "urn:solid-server:default:RequestParser" },
      "args_errorHandler": { "@id": "urn:solid-server:default:ErrorHandler" },
      "args_responseWriter": { "@id": "urn:solid-server:default:ResponseWriter" },
      "args_operationHandler": {
        "@type": "AuthorizingHttpHandler",
        "args_credentialsExtractor": { "@id": "urn:solid-server:default:CredentialsExtractor" },
        "args_modesExtractor": { "@id": "urn:solid-server:default:ModesExtractor" },
        "args_permissionReader": { "@id": "urn:solid-server:default:PermissionReader" },
        "args_authorizer": { "@id": "urn:solid-server:default:Authorizer" },
        "args_operationHandler": {
          "@type": "WacAllowHttpHandler",
          "args_credentialsExtractor": { "@id": "urn:solid-server:default:CredentialsExtractor" },
          "args_modesExtractor": { "@id": "urn:solid-server:default:ModesExtractor" },
          "args_permissionReader": { "@id": "urn:solid-server:default:PermissionReader" },
          "args_operationHandler": { "@id": "urn:solid-server:moderation:ModerationOperationHandler" }
        }
      }
    }
  ]
}
```

### Configuration Breakdown

This configuration:

1. **Defines shorthand aliases** in `@context` for all threshold parameters, making them easier to use in the `@graph`
2. **Imports individual CSS component files** instead of `css:config/default.json` for precise control
3. **Creates a moderation handler** with custom thresholds for all content types
4. **Rewires the LdpHandler** to route requests through the moderation handler

### Threshold Values Explained

| Category | Parameter | Value | Meaning |
|----------|-----------|-------|---------|
| **Image** | `nudityThreshold` | 0.7 | More permissive - only blocks explicit nudity |
| **Image** | `violenceThreshold` | 0.6 | Moderate strictness for gore/violence |
| **Image** | `weaponThreshold` | 0.4 | Stricter - blocks most weapon imagery |
| **Image** | `alcoholThreshold` | 0.9 | Very permissive - allows most alcohol content |
| **Image** | `drugsThreshold` | 0.6 | Moderate strictness |
| **Image** | `selfharmThreshold` | 0.2 | Very strict - blocks most self-harm content |
| **Text** | `textSexualThreshold` | 0.5 | Default strictness |
| **Text** | `textDiscriminatoryThreshold` | 0.5 | Default strictness |
| **Text** | `textInsultingThreshold` | 0.5 | Default strictness |
| **Text** | `textViolentThreshold` | 0.5 | Default strictness |
| **Text** | `textToxicThreshold` | 0.5 | Default strictness |
| **Text** | `textSelfharmThreshold` | 0.3 | Stricter for self-harm text |

### Running with Full Configuration

```bash
cd /path/to/CommunitySolidServer
SIGHTENGINE_API_USER="your_user_id" \
SIGHTENGINE_API_SECRET="your_secret" \
node bin/server.js -c config/moderation.json -f ./data/ -p 3009
```

You should see output like:
```
[ModerationOperationHandler] SightEngine API configured
[ModerationOperationHandler] Configured thresholds: nudity=0.7, violence=0.6, weapon=0.4, alcohol=0.9, drugs=0.6, offensive=0.5, selfharm=0.2, gambling=0.5, tobacco=0.5
[ModerationOperationHandler] Enabled image checks: nudity, gore, wad, offensive, self-harm
[ModerationOperationHandler] Enabled text checks: sexual, discriminatory, insulting, violent, toxic, self-harm, personal
[ModerationOperationHandler] Enabled video checks: nudity, gore, wad, offensive, self-harm, gambling, tobacco
```

## Automated Testing

This project uses [Jest](https://jestjs.io/) for testing, following the same approach as the [hello-world-component](https://github.com/CommunitySolidServer/hello-world-component).

### Test Structure

```
test/
├── config/
│   └── moderation-memory.json    # In-memory server config for testing
├── unit/
│   └── ModerationOperationHandler.test.ts   # Unit tests with mocked API
├── integration/
│   └── Server.test.ts            # Integration tests with running server
└── fixtures/
    ├── safe-image.jpg            # Test image that should pass moderation
    ├── safe-text.txt             # Test text that should pass moderation
    └── mock-responses.ts         # Mock SightEngine API responses
```

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Unit Tests

Unit tests verify the `ModerationOperationHandler` logic in isolation by mocking:
- The SightEngine API responses
- The wrapped `OperationHandler`
- The CSS logger

**Key test scenarios:**

| Test Case | Description |
|-----------|-------------|
| Allow safe image | Image with scores below thresholds passes |
| Reject unsafe image | Image with nudity score above threshold is rejected |
| Allow safe text | Text without violations passes |
| Reject harmful text | Text with toxic content is rejected |
| Threshold configuration | Custom thresholds are applied correctly |
| API error handling | Fail-open policy allows content on API errors |
| Content type detection | Correct moderation type based on MIME type |
| Audit logging | Log entries are written correctly |
| Pass-through for GET | Non-mutating requests bypass moderation |

**Example unit test pattern:**

```typescript
import { getLoggerFor, Logger } from '@solid/community-server';
import { ModerationOperationHandler } from '../../src/ModerationOperationHandler';

// Mock the SightEngine API and CSS logger
jest.mock('@solid/community-server', () => ({
  ...jest.requireActual('@solid/community-server'),
  getLoggerFor: jest.fn(),
}));

// Mock fetch for SightEngine API calls
global.fetch = jest.fn();

describe('ModerationOperationHandler', (): void => {
  let handler: ModerationOperationHandler;
  let mockSource: jest.Mocked<OperationHandler>;
  let logger: jest.Mocked<Logger>;

  beforeEach((): void => {
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;
    (getLoggerFor as jest.Mock).mockReturnValue(logger);
    
    mockSource = { canHandle: jest.fn(), handle: jest.fn() } as any;
    handler = new ModerationOperationHandler(mockSource);
  });

  it('allows safe images below threshold.', async(): Promise<void> => {
    // Mock SightEngine response with safe scores
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'success',
        nudity: { raw: 0.1 },
        weapon: 0.05,
        alcohol: 0.02,
      }),
    });

    // Create mock operation with image content
    const operation = createMockPutOperation('image/jpeg', safeImageBuffer);
    
    await expect(handler.handle(operation)).resolves.toBeDefined();
    expect(mockSource.handle).toHaveBeenCalled();
  });

  it('rejects images above nudity threshold.', async(): Promise<void> => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'success',
        nudity: { raw: 0.85 },  // Above default 0.5 threshold
      }),
    });

    const operation = createMockPutOperation('image/jpeg', unsafeImageBuffer);
    
    await expect(handler.handle(operation)).rejects.toThrow('Content rejected');
    expect(mockSource.handle).not.toHaveBeenCalled();
  });
});
```

### Integration Tests

Integration tests verify the complete server behavior with the moderation plugin:

```typescript
import { App, AppRunner, joinFilePath } from '@solid/community-server';

describe('Moderation Server', (): void => {
  let app: App;

  beforeAll(async(): Promise<void> => {
    // Create server with in-memory config for testing
    app = await new AppRunner().create({
      config: joinFilePath(__dirname, '../config/moderation-memory.json'),
      loaderProperties: {
        mainModulePath: joinFilePath(__dirname, '../../'),
        dumpErrorState: false,
      },
      shorthand: {
        port: 3456,
        loggingLevel: 'off',
      },
      variableBindings: {}
    });
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('starts successfully.', async(): Promise<void> => {
    const response = await fetch('http://localhost:3456');
    expect(response.status).toBe(200);
  });

  it('accepts safe text uploads.', async(): Promise<void> => {
    const response = await fetch('http://localhost:3456/test.txt', {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: 'Hello, this is a safe message.',
    });
    expect(response.status).toBe(201);
  });

  it('rejects content that violates policy.', async(): Promise<void> => {
    // This test would require mocking the SightEngine API
    // or using test content known to trigger moderation
  });
});
```

### Test Configuration

**test/config/moderation-memory.json** - In-memory server config for testing:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^5.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^7.0.0/components/context.jsonld",
    {
      "cms-solid": "https://linkedsoftwaredependencies.org/bundles/npm/cms-solid/"
    }
  ],
  "import": [
    "css:config/app/init/initialize-root.json",
    "css:config/app/main/default.json",
    "css:config/app/variables/default.json",
    "css:config/http/handler/default.json",
    "css:config/http/middleware/default.json",
    "css:config/http/server-factory/http.json",
    "css:config/http/static/default.json",
    "css:config/identity/access/public.json",
    "css:config/identity/handler/default.json",
    "css:config/ldp/authentication/dpop-bearer.json",
    "css:config/ldp/authorization/allow-all.json",
    "css:config/ldp/handler/default.json",
    "css:config/ldp/metadata-parser/default.json",
    "css:config/ldp/metadata-writer/default.json",
    "css:config/ldp/modes/default.json",
    "css:config/storage/backend/memory.json",
    "css:config/storage/key-value/memory.json",
    "css:config/storage/middleware/default.json",
    "css:config/util/auxiliary/acl.json",
    "css:config/util/identifiers/suffix.json",
    "css:config/util/index/default.json",
    "css:config/util/logging/winston.json",
    "css:config/util/representation-conversion/default.json",
    "css:config/util/resource-locker/memory.json",
    "css:config/util/variables/default.json"
  ],
  "@graph": [
    {
      "comment": "Test moderation handler with low thresholds for testing",
      "@id": "urn:solid-server:test:ModerationHandler",
      "@type": "cms-solid:ModerationOperationHandler",
      "cms-solid:ModerationOperationHandler#source": {
        "@id": "urn:solid-server:default:OperationHandler"
      }
    }
  ]
}
```

### Jest Configuration

**jest.config.js**:

```javascript
module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  testRegex: '/test/(unit|integration)/.*\\.test\\.ts$',
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node',
  testTimeout: 60000,  // Allow time for server startup
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Mocking SightEngine API

For unit tests, mock the SightEngine API to avoid hitting the real API:

```typescript
// test/fixtures/mock-responses.ts

export const mockSafeImageResponse = {
  status: 'success',
  request: { id: 'test-req-123' },
  nudity: { raw: 0.01, partial: 0.02 },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.01 },
};

export const mockUnsafeImageResponse = {
  status: 'success',
  request: { id: 'test-req-456' },
  nudity: { raw: 0.95, partial: 0.85 },
  weapon: 0.02,
  alcohol: 0.01,
};

export const mockSafeTextResponse = {
  status: 'success',
  request: { id: 'test-req-789' },
  moderation_classes: {
    sexual: 0.01,
    discriminatory: 0.01,
    insulting: 0.02,
    violent: 0.01,
    toxic: 0.01,
  },
  personal: { matches: [] },
};

export const mockToxicTextResponse = {
  status: 'success',
  request: { id: 'test-req-abc' },
  moderation_classes: {
    sexual: 0.01,
    discriminatory: 0.01,
    insulting: 0.75,
    violent: 0.02,
    toxic: 0.82,
  },
};

export const mockApiError = {
  status: 'failure',
  error: { type: 'api_error', message: 'Rate limit exceeded' },
};
```

### Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=test/unit",
    "test:integration": "jest --testPathPattern=test/integration",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

### Test Coverage

The test suite provides comprehensive coverage of the moderation handler:

| Metric | Coverage |
|--------|----------|
| **Statements** | 99.49% |
| **Branches** | 96.53% |
| **Functions** | 100% |
| **Lines** | 100% |
| **Total Tests** | 121 |

**Coverage by Feature:**

| Feature | Tests | Description |
|---------|-------|-------------|
| Image Moderation | 15+ | All content types (JPEG, PNG, GIF, WebP, BMP) and violation categories |
| Text Moderation | 15+ | Toxic, sexual, discriminatory, insulting, violent, self-harm, personal info |
| Video Moderation | 20+ | Frame-based and summary-based processing, all video formats |
| Request Methods | 10+ | PUT, POST, PATCH handling, GET/HEAD pass-through |
| API Error Handling | 10+ | Fail-open policy, network errors, API failures |
| Audit Logging | 5+ | Log entry creation, directory creation |
| Edge Cases | 15+ | Missing data, partial responses, malformed inputs |
| Configuration | 5+ | Custom thresholds, disabled checks |

**Running Coverage Report:**

```bash
# Generate text coverage report
npm run test:coverage

# Generate HTML coverage report
npm run test:coverage -- --coverageReporters=html

# View detailed coverage
open coverage/lcov-report/index.html
```

## Key Lessons Learned

1. **Use regular dependencies, not peerDependencies** for `@solid/community-server`
2. **Use full IRIs** in components.jsonld for parameters
3. **Use `fields` with `keyRaw`/`value`** for passing object arguments to constructors
4. **Import individual component files** instead of aggregate configs when overriding components
5. **Configuration priority**: Components.js config > Environment variables > Defaults
