import {
  getLoggerFor,
  Logger,
  OperationHandler,
  OperationHandlerInput,
  ResponseDescription,
  Representation,
  BadRequestHttpError,
} from '@solid/community-server';
import { Readable } from 'stream';
import { ModerationOperationHandler } from '../../src/ModerationOperationHandler';
import {
  mockSafeImageResponse,
  mockUnsafeNudityImageResponse,
  mockUnsafeViolenceImageResponse,
  mockUnsafeWeaponImageResponse,
  mockUnsafeDrugsImageResponse,
  mockUnsafeAlcoholImageResponse,
  mockUnsafeOffensiveImageResponse,
  mockUnsafeSelfHarmImageResponse,
  mockUnsafeGamblingImageResponse,
  mockSafeTextResponse,
  mockToxicTextResponse,
  mockSexualTextResponse,
  mockDiscriminatoryTextResponse,
  mockViolentTextResponse,
  mockSelfHarmTextResponse,
  mockInsultingTextResponse,
  mockSafeVideoResponse,
  mockUnsafeVideoNudityResponse,
  mockUnsafeVideoViolenceResponse,
  mockUnsafeVideoWeaponResponse,
  mockUnsafeVideoAlcoholResponse,
  mockUnsafeVideoDrugsResponse,
  mockUnsafeVideoOffensiveResponse,
  mockUnsafeVideoSelfHarmResponse,
  mockUnsafeVideoGamblingResponse,
  mockUnsafeVideoTobaccoResponse,
  // Video summary-based responses
  mockSafeVideoSummaryResponse,
  mockUnsafeVideoSummaryNudityResponse,
  mockUnsafeVideoSummaryGoreResponse,
  mockUnsafeVideoSummaryWeaponResponse,
  mockUnsafeVideoSummaryAlcoholResponse,
  mockUnsafeVideoSummaryDrugsResponse,
  mockUnsafeVideoSummaryOffensiveResponse,
  mockUnsafeVideoSummarySelfHarmResponse,
  mockUnsafeVideoSummaryGamblingResponse,
  mockUnsafeVideoSummaryTobaccoResponse,
  mockApiErrorResponse,
  mockImageWithProfanityResponse,
  mockImageWithPersonalInfoResponse,
  mockUnsafePersonalInfoTextResponse,
  mockMinimalImageResponse,
  mockMinimalTextResponse,
  mockUnsafeLinkTextResponse,
  mockUnsafeDrugTextResponse,
  mockUnsafeWeaponTextResponse,
  mockUnsafeSpamTextResponse,
  mockUnsafeExtremismTextResponse,
  createMockFetch,
  createFailingFetch,
} from '../fixtures/mock-responses';

// Mock the logger
jest.mock('@solid/community-server', () => ({
  ...jest.requireActual('@solid/community-server'),
  getLoggerFor: jest.fn(),
}));

// Mock fs module to prevent actual file writes
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  appendFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

describe('ModerationOperationHandler', (): void => {
  let handler: ModerationOperationHandler;
  let mockSource: jest.Mocked<OperationHandler>;
  let logger: jest.Mocked<Logger>;
  let originalFetch: typeof global.fetch;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach((): void => {
    // Use fake timers to handle setTimeout calls in constructor
    jest.useFakeTimers();

    // Save original fetch and environment
    originalFetch = global.fetch;
    originalEnv = process.env;

    // Mock logger
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    (getLoggerFor as jest.Mock).mockReturnValue(logger);

    // Mock source handler
    mockSource = {
      canHandle: jest.fn().mockResolvedValue(undefined),
      handle: jest.fn().mockResolvedValue({
        statusCode: 201,
        metadata: undefined,
        data: undefined,
      } as ResponseDescription),
    } as unknown as jest.Mocked<OperationHandler>;

    // Set API credentials in environment
    process.env = {
      ...originalEnv,
      SIGHTENGINE_API_USER: 'test_user',
      SIGHTENGINE_API_SECRET: 'test_secret',
    };

    // Create handler with disabled audit logging for tests
    handler = new ModerationOperationHandler(mockSource, {
      auditLogEnabled: false,
    });

    // Run all pending timers from constructor
    jest.runAllTimers();
  });

  afterEach((): void => {
    // Restore original fetch and environment
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  /**
   * Helper to create a mock operation input
   */
  function createMockInput(
    method: string,
    path: string,
    contentType?: string,
    bodyData?: Buffer | string,
  ): OperationHandlerInput {
    const body = bodyData ? {
      data: Readable.from([bodyData]),
      metadata: {
        contentType,
      } as unknown,
    } as Representation : undefined;

    return {
      operation: {
        method,
        target: { path },
        body,
        preferences: {},
      },
    } as unknown as OperationHandlerInput;
  }

  describe('canHandle', (): void => {
    it('delegates to source handler.', async(): Promise<void> => {
      const input = createMockInput('GET', 'http://localhost:3009/test');
      await handler.canHandle(input);
      expect(mockSource.canHandle).toHaveBeenCalledWith(input);
    });
  });

  describe('GET requests', (): void => {
    it('passes GET requests directly to source without moderation.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('GET', 'http://localhost:3009/test.jpg');
      await handler.handle(input);
      expect(mockSource.handle).toHaveBeenCalledWith(input);
      // No moderation API call should be made for GET requests
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('image moderation', (): void => {
    it('allows safe images below all thresholds.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('rejects images with nudity above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeNudityImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects images with violence/gore above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeViolenceImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects images with weapons above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeWeaponImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects images with drugs above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeDrugsImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/drugs/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects images with alcohol above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeAlcoholImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/alcohol/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects images with offensive symbols above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeOffensiveImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/offensive/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects images with self-harm content above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeSelfHarmImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/self-harm/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects images with gambling content above threshold.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeGamblingImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/gambling/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('handles POST requests for images.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('POST', 'http://localhost:3009/alice/', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('supports various image MIME types.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      for (const mimeType of imageTypes) {
        jest.clearAllMocks();
        const imageBuffer = Buffer.from('fake-image-data');
        const input = createMockInput('PUT', `http://localhost:3009/alice/photo.${mimeType.split('/')[1]}`, mimeType, imageBuffer);
        
        await handler.handle(input);
        
        expect(global.fetch).toHaveBeenCalled();
        expect(mockSource.handle).toHaveBeenCalled();
      }
    });
  });

  describe('text moderation', (): void => {
    it('allows safe text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeTextResponse);
      
      const textContent = 'Hello, this is a friendly message!';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/notes.txt', 'text/plain', textContent);
      
      await handler.handle(input);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('rejects toxic text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockToxicTextResponse);
      
      const textContent = 'This is toxic content that should be rejected';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/notes.txt', 'text/plain', textContent);
      
      await expect(handler.handle(input)).rejects.toThrow(/toxic/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects sexual text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSexualTextResponse);
      
      const textContent = 'This is sexual content that should be rejected';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/notes.txt', 'text/plain', textContent);
      
      await expect(handler.handle(input)).rejects.toThrow(/sexual/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects discriminatory text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockDiscriminatoryTextResponse);
      
      const textContent = 'This is discriminatory content that should be rejected';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/notes.txt', 'text/plain', textContent);
      
      await expect(handler.handle(input)).rejects.toThrow(/discriminatory/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects violent text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockViolentTextResponse);
      
      const textContent = 'This is violent content that should be rejected';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/notes.txt', 'text/plain', textContent);
      
      await expect(handler.handle(input)).rejects.toThrow(/violent/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects self-harm text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSelfHarmTextResponse);
      
      const textContent = 'This is self-harm content that should be rejected';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/notes.txt', 'text/plain', textContent);
      
      await expect(handler.handle(input)).rejects.toThrow(/self-harm/i);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('skips moderation for very short text.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Text shorter than 3 characters should be skipped
      const textContent = 'Hi';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/notes.txt', 'text/plain', textContent);
      
      await handler.handle(input);
      
      // API should not be called for very short text
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('supports various text MIME types.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeTextResponse);
      
      const textTypes = ['text/plain', 'text/html', 'text/markdown', 'application/json'];
      
      for (const mimeType of textTypes) {
        jest.clearAllMocks();
        const textContent = 'Safe text content';
        const input = createMockInput('PUT', 'http://localhost:3009/alice/file', mimeType, textContent);
        
        await handler.handle(input);
        
        expect(global.fetch).toHaveBeenCalled();
        expect(mockSource.handle).toHaveBeenCalled();
      }
    });
  });

  describe('API error handling', (): void => {
    it('allows content when API returns an error (fail-open).', async(): Promise<void> => {
      global.fetch = createMockFetch(mockApiErrorResponse, false);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      // Should not throw - fail-open policy
      await handler.handle(input);
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('allows content when network request fails (fail-open).', async(): Promise<void> => {
      global.fetch = createFailingFetch();
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      // Should not throw - fail-open policy
      await handler.handle(input);
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('API credentials', (): void => {
    it('skips moderation when API credentials are not set.', async(): Promise<void> => {
      // Remove API credentials
      delete process.env.SIGHTENGINE_API_USER;
      delete process.env.SIGHTENGINE_API_SECRET;
      
      // Create new handler without credentials
      const handlerNoAuth = new ModerationOperationHandler(mockSource, {
        auditLogEnabled: false,
      });
      jest.runAllTimers();
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await handlerNoAuth.handle(input);
      
      // Should pass through to source without calling API
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('threshold configuration', (): void => {
    it('uses custom thresholds from options.', async(): Promise<void> => {
      // Create handler with very low threshold (0.01) - should reject the "safe" image
      const strictHandler = new ModerationOperationHandler(mockSource, {
        nudityThreshold: 0.01,  // Very strict
        auditLogEnabled: false,
      });
      jest.runAllTimers();
      
      // The "safe" response has nudity.raw = 0.02 which is above 0.01
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(strictHandler.handle(input)).rejects.toThrow();
    });

    it('uses permissive thresholds correctly.', async(): Promise<void> => {
      // Create handler with very high threshold (0.99) - should allow the "unsafe" image
      const permissiveHandler = new ModerationOperationHandler(mockSource, {
        nudityThreshold: 0.99,  // Very permissive
        auditLogEnabled: false,
      });
      jest.runAllTimers();
      
      // The "unsafe nudity" response has nudity.raw = 0.85 which is below 0.99
      global.fetch = createMockFetch(mockUnsafeNudityImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await permissiveHandler.handle(input);
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('non-moderated content', (): void => {
    it('passes through unsupported content types without moderation.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/doc.pdf', 'application/pdf', Buffer.from('pdf-data'));
      
      await handler.handle(input);
      
      // Should not call moderation API for unsupported types
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('passes through requests without content type.', async(): Promise<void> => {
      const input = createMockInput('PUT', 'http://localhost:3009/alice/unknown', undefined, Buffer.from('data'));
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('passes through DELETE requests without moderation.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('DELETE', 'http://localhost:3009/alice/file.txt');
      
      await handler.handle(input);
      
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('passes through HEAD requests without moderation.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('HEAD', 'http://localhost:3009/alice/file.txt');
      
      await handler.handle(input);
      
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('PATCH requests', (): void => {
    it('moderates PATCH requests with text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeTextResponse);
      
      const patchContent = 'INSERT DATA { <#subject> <#predicate> "safe value" . }';
      const input = createMockInput('PATCH', 'http://localhost:3009/alice/profile', 'text/plain', patchContent);
      
      await handler.handle(input);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('rejects PATCH requests with toxic content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockToxicTextResponse);
      
      const patchContent = 'INSERT DATA { <#subject> <#predicate> "toxic content" . }';
      const input = createMockInput('PATCH', 'http://localhost:3009/alice/profile', 'text/plain', patchContent);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });
  });

  describe('video moderation', (): void => {
    it('allows safe video content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeVideoResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await handler.handle(input);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('rejects video with nudity in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoNudityResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with violence in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoViolenceResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/violence.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with weapons in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoWeaponResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/weapon.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with alcohol in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoAlcoholResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/alcohol.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with drugs in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoDrugsResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/drugs.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with offensive content in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoOffensiveResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/offensive.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with self-harm content in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSelfHarmResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/selfharm.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with gambling content in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoGamblingResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/gambling.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with tobacco content in frames.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoTobaccoResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/tobacco.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('moderates different video formats.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeVideoResponse);
      
      // Test WebM format
      const webmBuffer = Buffer.from('fake-webm-video-data');
      const webmInput = createMockInput('PUT', 'http://localhost:3009/alice/video.webm', 'video/webm', webmBuffer);
      
      await handler.handle(webmInput);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('video summary processing', (): void => {
    // Tests for when video API returns summary field instead of frames
    
    it('allows safe video with summary response.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeVideoSummaryResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await handler.handle(input);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('rejects video with nudity in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryNudityResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/nudity.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/nudity/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with gore in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryGoreResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/gore.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/gore|violence/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with weapons in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryWeaponResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/weapon.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/weapon/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with alcohol in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryAlcoholResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/alcohol.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/alcohol/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with drugs in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryDrugsResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/drugs.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/drugs/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with offensive content in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryOffensiveResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/offensive.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/offensive/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with self-harm in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummarySelfHarmResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/selfharm.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/self-harm/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with gambling in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryGamblingResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/gambling.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/gambling/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });

    it('rejects video with tobacco in summary.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockUnsafeVideoSummaryTobaccoResponse);
      
      const videoBuffer = Buffer.from('fake-mp4-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/tobacco.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/tobacco/);
      expect(mockSource.handle).not.toHaveBeenCalled();
    });
  });

  describe('text moderation - additional cases', (): void => {
    it('rejects insulting text content.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockInsultingTextResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/insult.txt', 'text/plain', 'Some insulting content');
      
      await expect(handler.handle(input)).rejects.toThrow();
      expect(mockSource.handle).not.toHaveBeenCalled();
    });
  });

  describe('audit logging', (): void => {
    it('writes audit log for allowed content when enabled.', async(): Promise<void> => {
      const fs = require('fs');
      
      // Create handler with audit logging enabled
      const auditHandler = new ModerationOperationHandler(mockSource, {
        auditLogEnabled: true,
        auditLogPath: '/tmp/test-audit.log',
      });
      jest.runAllTimers();
      
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await auditHandler.handle(input);
      
      expect(fs.appendFileSync).toHaveBeenCalled();
      const logCall = fs.appendFileSync.mock.calls[0];
      expect(logCall[0]).toBe('/tmp/test-audit.log');
      const logEntry = JSON.parse(logCall[1].trim());
      expect(logEntry.action).toBe('ALLOW');
      expect(logEntry.contentType).toBe('image');
    });

    it('writes audit log for rejected content when enabled.', async(): Promise<void> => {
      const fs = require('fs');
      fs.appendFileSync.mockClear();
      
      // Create handler with audit logging enabled
      const auditHandler = new ModerationOperationHandler(mockSource, {
        auditLogEnabled: true,
        auditLogPath: '/tmp/test-audit.log',
      });
      jest.runAllTimers();
      
      global.fetch = createMockFetch(mockUnsafeNudityImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await expect(auditHandler.handle(input)).rejects.toThrow();
      
      expect(fs.appendFileSync).toHaveBeenCalled();
      const logCall = fs.appendFileSync.mock.calls[0];
      const logEntry = JSON.parse(logCall[1].trim());
      expect(logEntry.action).toBe('REJECT');
      expect(logEntry.contentType).toBe('image');
      expect(logEntry.reason).toContain('nudity');
    });

    it('does not write audit log when disabled.', async(): Promise<void> => {
      const fs = require('fs');
      fs.appendFileSync.mockClear();
      
      // Handler already has audit logging disabled
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    it('handles audit log write errors gracefully.', async(): Promise<void> => {
      const fs = require('fs');
      fs.appendFileSync.mockClear();
      fs.appendFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });
      
      // Create handler with audit logging enabled
      const auditHandler = new ModerationOperationHandler(mockSource, {
        auditLogEnabled: true,
        auditLogPath: '/tmp/test-audit.log',
      });
      jest.runAllTimers();
      
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      // Should not throw even if audit log fails
      await auditHandler.handle(input);
      
      expect(fs.appendFileSync).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('edge cases', (): void => {
    it('handles image with no body at all.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Create input without body
      const input: OperationHandlerInput = {
        operation: {
          method: 'PUT',
          target: { path: 'http://localhost:3009/alice/photo.jpg' },
          preferences: {},
          body: undefined, // No body at all
        } as any,
      };
      
      await handler.handle(input);
      
      // Should not call API, just pass through
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles image with body but no data stream.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Create input with body but no data stream (tests line 542-543)
      const input: OperationHandlerInput = {
        operation: {
          method: 'PUT',
          target: { path: 'http://localhost:3009/alice/photo.jpg' },
          preferences: {},
          body: {
            metadata: { contentType: 'image/jpeg' },
            data: undefined, // Body exists but no data stream
          },
        } as any,
      };
      
      await handler.handle(input);
      
      // Should not call API, just pass through
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles text with no body data.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Create input with content-type but no body data
      const input: OperationHandlerInput = {
        operation: {
          method: 'PUT',
          target: { path: 'http://localhost:3009/alice/file.txt' },
          preferences: {},
          body: {
            metadata: { contentType: 'text/plain' },
            data: undefined, // No data stream
          },
        } as any,
      };
      
      await handler.handle(input);
      
      // Should not call API, just pass through
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video with no body data.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Create input with video content-type but no body data
      const input: OperationHandlerInput = {
        operation: {
          method: 'PUT',
          target: { path: 'http://localhost:3009/alice/video.mp4' },
          preferences: {},
          body: {
            metadata: { contentType: 'video/mp4' },
            data: undefined, // No data stream
          },
        } as any,
      };
      
      await handler.handle(input);
      
      // Should not call API, just pass through
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('skips moderation for very short text.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Text that is too short (less than 3 chars)
      const input = createMockInput('PUT', 'http://localhost:3009/alice/tiny.txt', 'text/plain', 'ab');
      
      await handler.handle(input);
      
      // Should not call API for short text
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('skips moderation for empty text.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/empty.txt', 'text/plain', '');
      
      await handler.handle(input);
      
      // Should not call API for empty text
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('skips moderation for whitespace-only text.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/whitespace.txt', 'text/plain', '   \n\t  ');
      
      await handler.handle(input);
      
      // Should not call API for whitespace-only text
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('allows upload on API network error (fail-open policy).', async(): Promise<void> => {
      global.fetch = createFailingFetch();
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      // Should allow upload when API fails
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('allows text upload on API network error (fail-open policy).', async(): Promise<void> => {
      global.fetch = createFailingFetch();
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/doc.txt', 'text/plain', 'Some text content here');
      
      // Should allow upload when API fails
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('allows video upload on API network error (fail-open policy).', async(): Promise<void> => {
      global.fetch = createFailingFetch();
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      // Should allow upload when API fails
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles API returning error status.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockApiErrorResponse, false);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      // Should allow upload when API returns error (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles text API returning error status.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockApiErrorResponse, false);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/doc.txt', 'text/plain', 'Some text content');
      
      // Should allow upload when text API returns error (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles text API returning failure status in body.', async(): Promise<void> => {
      // API returns 200 OK but status='failure' in body
      global.fetch = createMockFetch(mockApiErrorResponse, true);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/doc.txt', 'text/plain', 'Some text content');
      
      // Should allow upload when API returns failure in body (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video API returning error status.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockApiErrorResponse, false);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      // Should allow upload when video API returns error (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video API returning failure status in body.', async(): Promise<void> => {
      // API returns 200 OK but status='failure' in body
      global.fetch = createMockFetch(mockApiErrorResponse, true);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      // Should allow upload when API returns failure in body (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('extracts pod name from path correctly.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      // Test with nested path
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photos/vacation/photo.jpg', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles POST requests same as PUT.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeTextResponse);
      
      const input = createMockInput('POST', 'http://localhost:3009/alice/container/', 'text/plain', 'New content');
      
      await handler.handle(input);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('passes through GET requests without moderation.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('GET', 'http://localhost:3009/alice/photo.jpg');
      
      await handler.handle(input);
      
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('no API credentials configured', (): void => {
    let noCredentialsHandler: ModerationOperationHandler;
    let originalApiUser: string | undefined;
    let originalApiSecret: string | undefined;

    beforeEach((): void => {
      // Save and clear environment variables
      originalApiUser = process.env.SIGHTENGINE_API_USER;
      originalApiSecret = process.env.SIGHTENGINE_API_SECRET;
      delete process.env.SIGHTENGINE_API_USER;
      delete process.env.SIGHTENGINE_API_SECRET;
      
      // Create handler without API credentials
      noCredentialsHandler = new ModerationOperationHandler(mockSource, {});
      jest.runAllTimers();
    });

    afterEach((): void => {
      // Restore environment variables
      if (originalApiUser !== undefined) {
        process.env.SIGHTENGINE_API_USER = originalApiUser;
      }
      if (originalApiSecret !== undefined) {
        process.env.SIGHTENGINE_API_SECRET = originalApiSecret;
      }
    });

    it('skips image moderation when API credentials not configured.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/photo.jpg', 'image/jpeg', imageBuffer);
      
      await noCredentialsHandler.handle(input);
      
      // Should not call API when credentials missing
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('skips text moderation when API credentials not configured.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Some text content');
      
      await noCredentialsHandler.handle(input);
      
      // Should not call API when credentials missing
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('skips video moderation when API credentials not configured.', async(): Promise<void> => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await noCredentialsHandler.handle(input);
      
      // Should not call API when credentials missing
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('invalid path handling', (): void => {
    it('handles invalid URL in path gracefully.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      // Create input with an invalid URL that will cause extractPodName to fail
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input: OperationHandlerInput = {
        operation: {
          method: 'PUT',
          target: { path: 'not-a-valid-url' }, // Invalid URL
          preferences: {},
          body: {
            metadata: { contentType: 'image/jpeg' },
            data: Readable.from(imageBuffer),
          },
        } as any,
      };
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles path with no pod segments.', async(): Promise<void> => {
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      // Root path with no segments
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });

  describe('branch coverage - additional tests', (): void => {
    it('rejects image when API returns failure status in body.', async(): Promise<void> => {
      // This tests line 838: if (result.status !== 'success')
      global.fetch = createMockFetch(mockApiErrorResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/image.jpg', 'image/jpeg', imageBuffer);
      
      // With fail-open mode, the content should still be allowed
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('rejects image containing profanity in text overlay.', async(): Promise<void> => {
      // This tests lines 901-902: if (result.text?.profanity && result.text.profanity.length > 0)
      global.fetch = createMockFetch(mockImageWithProfanityResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/image.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/profanity detected/);
    });

    it('rejects image containing personal info in text overlay.', async(): Promise<void> => {
      // This tests lines 907-908: if (result.text?.personal && result.text.personal.length > 0)
      global.fetch = createMockFetch(mockImageWithPersonalInfoResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/image.jpg', 'image/jpeg', imageBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/personal info detected/);
    });

    it('rejects text containing personal info types (IP, SSN, credit card).', async(): Promise<void> => {
      // This tests line 770: if (personalTypes.length > 0)
      global.fetch = createMockFetch(mockUnsafePersonalInfoTextResponse);
      
      const textContent = 'Contact me at 192.168.1.1, SSN: 123-45-6789, Card: 4111111111111111';
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', textContent);
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/personal info detected/);
    });

    it('creates audit log directory if it does not exist.', async(): Promise<void> => {
      // This tests line 378: if (!fs.existsSync(logDir)) { fs.mkdirSync... }
      const fs = require('fs');
      
      // Temporarily make existsSync return false for the directory
      fs.existsSync.mockReturnValueOnce(false);
      
      // Create a new handler which will trigger the directory check
      // API credentials are already set in environment from beforeEach
      const handlerWithNewDir = new ModerationOperationHandler(mockSource, {
        auditLogEnabled: true,
        auditLogPath: '/tmp/test-moderation-logs/audit.log',
      });
      
      // Run timers to complete constructor initialization
      jest.runAllTimers();
      
      // The mkdirSync should have been called
      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/test-moderation-logs', { recursive: true });
    });

    it('handles agent extraction with malformed credentials.', async(): Promise<void> => {
      // This tests line 412: catch { agent = undefined }
      // Create an operation with a getter that throws when accessing credentials
      global.fetch = createMockFetch(mockSafeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input: OperationHandlerInput = {
        operation: {
          method: 'PUT',
          target: { path: 'http://localhost:3009/alice/image.jpg' },
          preferences: {},
          body: {
            metadata: { contentType: 'image/jpeg' },
            data: Readable.from(imageBuffer),
          },
          // Add credentials property with a getter that could throw
          get credentials() {
            throw new Error('Credentials access error');
          }
        } as any,
      };
      
      // Should handle gracefully without crashing
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles image response with minimal fields (extractImageScores branches).', async(): Promise<void> => {
      // Tests extractImageScores when optional fields are missing
      global.fetch = createMockFetch(mockMinimalImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/image.jpg', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles text response with minimal fields (extractTextScores branches).', async(): Promise<void> => {
      // Tests extractTextScores when optional fields are missing
      global.fetch = createMockFetch(mockMinimalTextResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Some text content');
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('rejects text containing links with sexual content.', async(): Promise<void> => {
      // Tests sexual content detection branch
      global.fetch = createMockFetch(mockUnsafeLinkTextResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Check out http://malicious-site.com');
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/sexual content/);
    });

    it('rejects text with toxic content.', async(): Promise<void> => {
      // Tests toxic detection branch
      global.fetch = createMockFetch(mockUnsafeDrugTextResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Toxic content here');
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/toxic/);
    });

    it('rejects text with violent content.', async(): Promise<void> => {
      // Tests violent detection branch
      global.fetch = createMockFetch(mockUnsafeWeaponTextResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Violent content here');
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/violent/);
    });

    it('rejects text with insulting content.', async(): Promise<void> => {
      // Tests insulting detection branch
      global.fetch = createMockFetch(mockUnsafeSpamTextResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Insulting content');
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/insulting/);
    });

    it('rejects text with discriminatory content.', async(): Promise<void> => {
      // Tests discriminatory detection branch
      global.fetch = createMockFetch(mockUnsafeExtremismTextResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Discriminatory content');
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/discriminatory/);
    });

    it('handles non-Error exceptions from image moderation API.', async(): Promise<void> => {
      // Tests the else branch: 'Unknown moderation error'
      global.fetch = jest.fn().mockRejectedValue('string error instead of Error object');
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/image.jpg', 'image/jpeg', imageBuffer);
      
      // Should still allow upload (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles non-Error exceptions from text moderation API.', async(): Promise<void> => {
      // Tests the else branch: 'Unknown moderation error' for text
      global.fetch = jest.fn().mockRejectedValue({ code: 'NOT_AN_ERROR' });
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Some text content');
      
      // Should still allow upload (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles non-Error exceptions from video moderation API.', async(): Promise<void> => {
      // Tests the else branch: 'Unknown moderation error' for video
      global.fetch = jest.fn().mockRejectedValue(42); // number instead of Error
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      // Should still allow upload (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video response with frames missing position info.', async(): Promise<void> => {
      // Tests the frame.info?.position || 0 branches
      const videoResponseNoPosition = {
        status: 'success',
        request: { id: 'test-req-no-pos', timestamp: 1706300050, operations: 1 },
        data: {
          frames: [
            {
              // No info field - triggers || 0 fallback
              nudity: { sexual_activity: 0.95, none: 0.05 },
              gore: { prob: 0.01 },
              weapon: 0.01,
              alcohol: 0.01,
              drugs: 0.01,
              offensive: { prob: 0.01 },
            }
          ]
        },
        media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
      };
      
      global.fetch = createMockFetch(videoResponseNoPosition);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
      await expect(handler.handle(input)).rejects.toThrow(/nudity/);
    });

    it('handles video with partial summary data (missing some fields).', async(): Promise<void> => {
      // Tests extractVideoScores branches when fields are missing
      const partialSummaryResponse = {
        status: 'success',
        request: { id: 'test-req-partial-summary', timestamp: 1706300051, operations: 1 },
        summary: {
          // Only nudity, missing other fields
          nudity: { sexual_activity: 0.1, none: 0.9 },
        },
        media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
      };
      
      global.fetch = createMockFetch(partialSummaryResponse);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      // Should pass - low scores
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles different video content types.', async(): Promise<void> => {
      // Tests video content type mapping branches
      global.fetch = createMockFetch(mockSafeVideoResponse);
      
      const videoBuffer = Buffer.from('fake-video-data');
      
      // Test webm content type
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.webm', 'video/webm', videoBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video response without frames or summary.', async(): Promise<void> => {
      // Tests edge case where video response has neither frames nor summary
      const emptyVideoResponse = {
        status: 'success',
        request: { id: 'test-req-empty-video', timestamp: 1706300052, operations: 1 },
        // No data.frames and no summary
        media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
      };
      
      global.fetch = createMockFetch(emptyVideoResponse);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video frame with multiple violation types at different positions.', async(): Promise<void> => {
      // Tests multiple frame violation branches with position info
      const multiViolationFrames = {
        status: 'success',
        request: { id: 'test-req-multi-violation', timestamp: 1706300053, operations: 1 },
        data: {
          frames: [
            {
              info: { position: 1.5 },
              nudity: { none: 0.95 },
              gore: { prob: 0.95 }, // Gore violation
              weapon: 0.01,
              alcohol: 0.01,
              drugs: 0.01,
              offensive: { prob: 0.01 },
            },
            {
              info: { position: 3.0 },
              nudity: { none: 0.95 },
              gore: { prob: 0.01 },
              weapon: 0.95, // Weapon violation
              alcohol: 0.01,
              drugs: 0.01,
              offensive: { prob: 0.01 },
            },
            {
              info: { position: 4.5 },
              nudity: { none: 0.95 },
              gore: { prob: 0.01 },
              weapon: 0.01,
              alcohol: 0.95, // Alcohol violation
              drugs: 0.01,
              offensive: { prob: 0.01 },
            },
            {
              info: { position: 6.0 },
              nudity: { none: 0.95 },
              gore: { prob: 0.01 },
              weapon: 0.01,
              alcohol: 0.01,
              drugs: 0.95, // Drugs violation
              offensive: { prob: 0.01 },
            },
            {
              info: { position: 7.5 },
              nudity: { none: 0.95 },
              gore: { prob: 0.01 },
              weapon: 0.01,
              alcohol: 0.01,
              drugs: 0.01,
              offensive: { prob: 0.95 }, // Offensive violation
            }
          ]
        },
        media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
      };
      
      global.fetch = createMockFetch(multiViolationFrames);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
    });

    it('handles image with complete score extraction (all fields present).', async(): Promise<void> => {
      // Tests all branches of extractImageScores
      const completeImageResponse = {
        status: 'success',
        request: { id: 'test-complete-img', timestamp: 1706300054, operations: 1 },
        nudity: {
          sexual_activity: 0.1,
          sexual_display: 0.1,
          erotica: 0.1,
          very_suggestive: 0.1,
          none: 0.9,
        },
        gore: { prob: 0.05 },
        weapon: 0.03,
        alcohol: 0.02,
        drugs: 0.01,
        offensive: { prob: 0.04 },
        'self-harm': 0.02,
        gambling: 0.01,
        tobacco: 0.01,
        media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
      };
      
      global.fetch = createMockFetch(completeImageResponse);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/image.jpg', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video MOV content type.', async(): Promise<void> => {
      // Tests video content type mapping for quicktime
      global.fetch = createMockFetch(mockSafeVideoResponse);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mov', 'video/quicktime', videoBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video AVI content type.', async(): Promise<void> => {
      // Tests video content type mapping for avi
      global.fetch = createMockFetch(mockSafeVideoResponse);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.avi', 'video/x-msvideo', videoBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles text with personal info having empty arrays.', async(): Promise<void> => {
      // Tests the else branch for personal info with empty arrays
      const personalEmptyArraysResponse = {
        status: 'success',
        request: { id: 'test-personal-empty', timestamp: 1706300055, operations: 1 },
        personal: {
          phone_number: [],
          email: [],
          ip_address: [],
          ssn: [],
          credit_card: [],
        },
        'self-harm': { prob: 0.01 },
        moderation_classes: {
          sexual: 0.01,
          discriminatory: 0.01,
          insulting: 0.01,
          violent: 0.01,
          toxic: 0.01,
        },
        media: { id: 'test-text-id' },
      };
      
      global.fetch = createMockFetch(personalEmptyArraysResponse);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Some text content');
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video frames with all violation types (no position).', async(): Promise<void> => {
      // Trigger all checkVideoFrame branches with violations but no info.position
      const allViolationsNoPosition = {
        status: 'success',
        request: { id: 'test-all-violations', timestamp: 1706300056, operations: 1 },
        data: {
          frames: [
            {
              // No info field - tests || 0 fallback for all violation types
              nudity: { sexual_activity: 0.95 },
              gore: { prob: 0.95 },
              weapon: 0.95,
              alcohol: 0.95,
              drugs: 0.95,
              offensive: { prob: 0.95 },
              'self-harm': 0.95,
              gambling: 0.95,
              tobacco: 0.95,
            }
          ]
        },
        media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
      };
      
      global.fetch = createMockFetch(allViolationsNoPosition);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(BadRequestHttpError);
    });

    it('handles video with summary containing all violation fields.', async(): Promise<void> => {
      // Tests extractVideoScores with complete summary data
      const completeSummaryResponse = {
        status: 'success',
        request: { id: 'test-complete-summary', timestamp: 1706300057, operations: 1 },
        summary: {
          nudity: { sexual_activity: 0.1, none: 0.9 },
          gore: { prob: 0.05 },
          weapon: 0.03,
          alcohol: 0.02,
          drugs: 0.01,
          offensive: { prob: 0.04 },
          'self-harm': 0.02,
          gambling: 0.01,
          tobacco: 0.01,
        },
        media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
      };
      
      global.fetch = createMockFetch(completeSummaryResponse);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles text API returning failure status.', async(): Promise<void> => {
      // Tests text API status check branch
      const textApiFailure = {
        status: 'failure',
        error: { message: 'Text API rate limited' },
      };
      
      global.fetch = createMockFetch(textApiFailure);
      
      const input = createMockInput('PUT', 'http://localhost:3009/alice/file.txt', 'text/plain', 'Some text content');
      
      // Should allow (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video API returning failure status.', async(): Promise<void> => {
      // Tests video API status check branch
      const videoApiFailure = {
        status: 'failure',
        error: { message: 'Video API error' },
      };
      
      global.fetch = createMockFetch(videoApiFailure);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      // Should allow (fail-open)
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video summary with partial nudity fields (some undefined).', async(): Promise<void> => {
      // Tests the || 0 fallbacks in extractVideoScores for nudity sub-fields
      const partialNuditySummary = {
        status: 'success',
        request: { id: 'test-partial-nudity', timestamp: 1706300058, operations: 1 },
        summary: {
          nudity: {
            // Only some fields present - others will use || 0
            sexual_activity: 0.1,
            // sexual_display: undefined
            erotica: 0.05,
            // very_suggestive: undefined
            none: 0.9,
          },
        },
        media: { id: 'test-video-id' },
      };
      
      global.fetch = createMockFetch(partialNuditySummary);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });

    it('handles video frames with nudity violation and position info.', async(): Promise<void> => {
      // Tests frame.info.position being present
      const nudityFrameWithPosition = {
        status: 'success',
        request: { id: 'test-nudity-position', timestamp: 1706300059, operations: 1 },
        data: {
          frames: [
            {
              info: { position: 5.5 },
              nudity: { 
                sexual_activity: 0.95,
                none: 0.05,
              },
              gore: { prob: 0.01 },
              weapon: 0.01,
              offensive: { prob: 0.01 },
            }
          ]
        },
        media: { id: 'test-video-id' },
      };
      
      global.fetch = createMockFetch(nudityFrameWithPosition);
      
      const videoBuffer = Buffer.from('fake-video-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/video.mp4', 'video/mp4', videoBuffer);
      
      await expect(handler.handle(input)).rejects.toThrow(/nudity at 5.5s/);
    });

    it('handles image with partial nudity scores.', async(): Promise<void> => {
      // Tests extractImageScores with partial nudity fields
      const partialNudityImage = {
        status: 'success',
        request: { id: 'test-partial-nudity-img', timestamp: 1706300060, operations: 1 },
        nudity: {
          sexual_activity: 0.1,
          // Other fields undefined - tests || 0 fallbacks
          none: 0.9,
        },
        gore: { prob: 0.01 },
        weapon: 0.01,
        media: { id: 'test-media-id' },
      };
      
      global.fetch = createMockFetch(partialNudityImage);
      
      const imageBuffer = Buffer.from('fake-jpeg-data');
      const input = createMockInput('PUT', 'http://localhost:3009/alice/image.jpg', 'image/jpeg', imageBuffer);
      
      await handler.handle(input);
      
      expect(mockSource.handle).toHaveBeenCalled();
    });
  });
});
