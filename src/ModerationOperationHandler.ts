import {
  OperationHandler,
  OperationHandlerInput,
  ResponseDescription,
  getLoggerFor,
  BadRequestHttpError,
  RepresentationMetadata,
} from '@solid/community-server';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

// SightEngine moderation result interfaces
interface SightEngineNudity {
  sexual_activity: number;
  sexual_display: number;
  erotica: number;
  very_suggestive: number;
  suggestive: number;
  mildly_suggestive: number;
  none: number;
}

interface SightEngineWeapon {
  classes: Record<string, number>;
}

interface SightEngineOffensive {
  prob: number;
}

// SightEngine text moderation result interface
interface SightEngineTextResult {
  status: string;
  request: { id: string };
  // Text moderation categories
  sexual?: { prob: number };
  discriminatory?: { prob: number };
  insulting?: { prob: number };
  violent?: { prob: number };
  toxic?: { prob: number };
  'self-harm'?: { prob: number };
  // Link detection
  link?: { prob: number; type?: string; url?: string };
  // Personal info detection
  personal?: {
    phone_number?: Array<{ match: string }>;
    email?: Array<{ match: string }>;
    ip_address?: Array<{ match: string }>;
    ssn?: Array<{ match: string }>;
    credit_card?: Array<{ match: string }>;
  };
  // Error info
  error?: { message: string; code: number };
}

interface SightEngineResult {
  status: string;
  request: { id: string };
  // Nudity detection
  nudity?: SightEngineNudity;
  // Violence/gore detection
  gore?: { prob: number };
  // Weapon detection (wad model)
  weapon?: number;
  weapon_firearm?: number;
  weapon_knife?: number;
  // Alcohol detection (wad model)
  alcohol?: number;
  // Drugs detection (wad model)
  drugs?: number;
  medical_drugs?: number;
  recreational_drugs?: number;
  // Offensive symbols detection
  offensive?: SightEngineOffensive;
  // Self-harm detection
  'self-harm'?: number;
  // Gambling detection
  gambling?: number;
  // Text moderation (profanity, personal info)
  text?: {
    profanity?: Array<{ type: string; match: string }>;
    personal?: Array<{ type: string; match: string }>;
    link?: Array<{ type: string; match: string }>;
  };
  // Error info
  error?: { message: string; code: number };
}

interface SightEngineVideoResult {
  status: string;
  request: { id: string };
  media: {
    id: string;
    uri: string;
  };
  // Summary contains max values across all frames
  summary?: {
    nudity?: SightEngineNudity;
    gore?: { prob: number };
    weapon?: number;
    weapon_firearm?: number;
    weapon_knife?: number;
    alcohol?: number;
    drugs?: number;
    recreational_drugs?: number;
    medical_drugs?: number;
    offensive?: SightEngineOffensive;
    'self-harm'?: number;
    gambling?: number;
    tobacco?: number;
  };
  // Frame-by-frame results
  data?: {
    frames?: Array<{
      info?: { position: number };
      // Nudity detection per frame
      nudity?: SightEngineNudity;
      // Violence/gore detection per frame
      gore?: { prob: number };
      // Weapon detection per frame
      weapon?: number;
      weapon_firearm?: number;
      weapon_knife?: number;
      // Alcohol detection per frame
      alcohol?: number;
      // Drugs detection per frame
      drugs?: number;
      recreational_drugs?: number;
      medical_drugs?: number;
      // Offensive symbols per frame
      offensive?: SightEngineOffensive;
      // Self-harm detection per frame
      'self-harm'?: number;
      // Gambling detection per frame
      gambling?: number;
      // Tobacco detection per frame
      tobacco?: number;
    }>;
  };
  // Error info
  error?: { message: string; code: number };
}

// Type alias for a single video frame
type VideoFrame = NonNullable<NonNullable<SightEngineVideoResult['data']>['frames']>[number];

interface ModerationConfig {
  apiUser: string;
  apiSecret: string;
  thresholds: {
    // Image thresholds
    nudity: number;      // Threshold for nudity detection (0-1)
    violence: number;    // Threshold for violence/gore detection (0-1)
    weapon: number;      // Threshold for weapon detection (0-1)
    alcohol: number;     // Threshold for alcohol detection (0-1)
    drugs: number;       // Threshold for drugs detection (0-1)
    offensive: number;   // Threshold for offensive symbols (0-1)
    selfharm: number;    // Threshold for self-harm detection (0-1)
    gambling: number;    // Threshold for gambling detection (0-1)
    tobacco: number;     // Threshold for tobacco detection (0-1)
    // Text thresholds
    textSexual: number;       // Threshold for sexual text content (0-1)
    textDiscriminatory: number; // Threshold for discriminatory text (0-1)
    textInsulting: number;    // Threshold for insulting text (0-1)
    textViolent: number;      // Threshold for violent text (0-1)
    textToxic: number;        // Threshold for toxic text (0-1)
    textSelfharm: number;     // Threshold for self-harm text (0-1)
  };
  // Image models: nudity, gore, wad (weapon/alcohol/drugs), offensive, self-harm, gambling, text
  enabledChecks: string[];
  // Text moderation: sexual, discriminatory, insulting, violent, toxic, self-harm, link, personal
  enabledTextChecks: string[];
  // Video models: nudity, gore, wad (weapon/alcohol/drugs), offensive, self-harm, gambling, tobacco
  enabledVideoChecks: string[];
}

/**
 * A moderation operation handler that integrates with SightEngine API.
 * This handler intercepts PUT/POST operations for images and moderates them
 * before allowing them to be stored in the Solid pod.
 */
export class ModerationOperationHandler extends OperationHandler {
  private readonly logger = getLoggerFor(this);
  private readonly source: OperationHandler;
  private readonly config: ModerationConfig;

  // Image MIME types that can be moderated
  private readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
  ];

  // Text MIME types that can be moderated
  private readonly SUPPORTED_TEXT_TYPES = [
    'text/plain',
    'text/html',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
  ];

  // Video MIME types that can be moderated
  private readonly SUPPORTED_VIDEO_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/ogg',
    'video/3gpp',
    'video/3gpp2',
  ];

  // Audit log file path
  private readonly auditLogPath: string;
  private readonly auditLogEnabled: boolean;

  /**
   * Configuration options that can be passed via Components.js
   */
  public static readonly ConfigurableOptions = {
    nudityThreshold: 'nudityThreshold',
    violenceThreshold: 'violenceThreshold',
    weaponThreshold: 'weaponThreshold',
    alcoholThreshold: 'alcoholThreshold',
    drugsThreshold: 'drugsThreshold',
    offensiveThreshold: 'offensiveThreshold',
    selfharmThreshold: 'selfharmThreshold',
    gamblingThreshold: 'gamblingThreshold',
    tobaccoThreshold: 'tobaccoThreshold',
    textSexualThreshold: 'textSexualThreshold',
    textDiscriminatoryThreshold: 'textDiscriminatoryThreshold',
    textInsultingThreshold: 'textInsultingThreshold',
    textViolentThreshold: 'textViolentThreshold',
    textToxicThreshold: 'textToxicThreshold',
    textSelfharmThreshold: 'textSelfharmThreshold',
    enabledChecks: 'enabledChecks',
    enabledTextChecks: 'enabledTextChecks',
    enabledVideoChecks: 'enabledVideoChecks',
    auditLogEnabled: 'auditLogEnabled',
    auditLogPath: 'auditLogPath',
  } as const;

  /**
   * Log a message with timestamp in Components.js style
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [Moderation] ${level}: ${message}`);
  }

  /**
   * Extract pod name from a resource path
   * e.g., "http://localhost:3009/alice/photos/image.jpg" -> "alice"
   */
  private extractPodName(resourcePath: string): string | undefined {
    try {
      const url = new URL(resourcePath);
      const pathParts = url.pathname.split('/').filter(p => p.length > 0);
      // First path segment is typically the pod name
      return pathParts.length > 0 ? pathParts[0] : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Write an audit log entry to file
   */
  private writeAuditLog(entry: {
    timestamp: string;
    action: 'ALLOW' | 'REJECT' | 'ERROR';
    contentType: 'image' | 'text' | 'video';
    path: string;
    pod?: string;
    agent?: string;
    mimeType: string;
    reason?: string;
    scores?: Record<string, number>;
    requestId?: string;
  }): void {
    if (!this.auditLogEnabled) return;

    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.auditLogPath, logLine, 'utf8');
    } catch (error) {
      this.log('error', `Failed to write audit log: ${error}`);
    }
  }

  /**
   * Constructor with configurable thresholds via Components.js
   * @param source - The source operation handler to wrap
   * @param options - Optional configuration from Components.js (thresholds, enabled checks, audit settings)
   */
  public constructor(
    source: OperationHandler,
    options?: {
      nudityThreshold?: number;
      violenceThreshold?: number;
      weaponThreshold?: number;
      alcoholThreshold?: number;
      drugsThreshold?: number;
      offensiveThreshold?: number;
      selfharmThreshold?: number;
      gamblingThreshold?: number;
      tobaccoThreshold?: number;
      textSexualThreshold?: number;
      textDiscriminatoryThreshold?: number;
      textInsultingThreshold?: number;
      textViolentThreshold?: number;
      textToxicThreshold?: number;
      textSelfharmThreshold?: number;
      enabledChecks?: string;
      enabledTextChecks?: string;
      enabledVideoChecks?: string;
      auditLogEnabled?: boolean;
      auditLogPath?: string;
    }
  ) {
    super();
    this.source = source;
    
    // Load configuration with priority: Components.js options > environment variables > defaults
    // Image moderation (MODERATION_CHECKS): nudity, gore, wad, offensive, self-harm, gambling
    // Text moderation (MODERATION_TEXT_CHECKS): sexual, discriminatory, insulting, violent, toxic, self-harm, link, personal
    // Video moderation (MODERATION_VIDEO_CHECKS): nudity, gore, wad, offensive, self-harm, gambling, tobacco
    this.config = {
      apiUser: process.env.SIGHTENGINE_API_USER || '',
      apiSecret: process.env.SIGHTENGINE_API_SECRET || '',
      thresholds: {
        // Image/Video thresholds - Components.js takes priority over env vars
        nudity: options?.nudityThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_NUDITY || '0.5'),
        violence: options?.violenceThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_VIOLENCE || '0.5'),
        weapon: options?.weaponThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_WEAPON || '0.5'),
        alcohol: options?.alcoholThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_ALCOHOL || '0.8'),
        drugs: options?.drugsThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_DRUGS || '0.5'),
        offensive: options?.offensiveThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_OFFENSIVE || '0.5'),
        selfharm: options?.selfharmThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_SELFHARM || '0.3'),
        gambling: options?.gamblingThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_GAMBLING || '0.5'),
        tobacco: options?.tobaccoThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_TOBACCO || '0.5'),
        // Text thresholds - Components.js takes priority over env vars
        textSexual: options?.textSexualThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_TEXT_SEXUAL || '0.5'),
        textDiscriminatory: options?.textDiscriminatoryThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_TEXT_DISCRIMINATORY || '0.5'),
        textInsulting: options?.textInsultingThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_TEXT_INSULTING || '0.5'),
        textViolent: options?.textViolentThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_TEXT_VIOLENT || '0.5'),
        textToxic: options?.textToxicThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_TEXT_TOXIC || '0.5'),
        textSelfharm: options?.textSelfharmThreshold ?? parseFloat(process.env.MODERATION_THRESHOLD_TEXT_SELFHARM || '0.3'),
      },
      // Enabled checks - Components.js takes priority over env vars
      enabledChecks: (options?.enabledChecks ?? process.env.MODERATION_CHECKS ?? 'nudity,gore,wad,offensive').split(','),
      enabledTextChecks: (options?.enabledTextChecks ?? process.env.MODERATION_TEXT_CHECKS ?? 'sexual,discriminatory,insulting,violent,toxic,self-harm,personal').split(','),
      enabledVideoChecks: (options?.enabledVideoChecks ?? process.env.MODERATION_VIDEO_CHECKS ?? 'nudity,gore,wad,offensive,self-harm,gambling,tobacco').split(','),
    };

    if (!this.config.apiUser || !this.config.apiSecret) {
      // Log after a small delay to ensure timestamp format is visible on startup
      setTimeout(() => this.log('warn', 'SightEngine API credentials not configured. Moderation will be skipped.'), 100);
    }

    // Configure audit logging - Components.js takes priority over env vars
    this.auditLogEnabled = options?.auditLogEnabled ?? (process.env.MODERATION_AUDIT_LOG !== 'false');
    this.auditLogPath = options?.auditLogPath ?? process.env.MODERATION_AUDIT_LOG_PATH ?? path.join(process.cwd(), 'moderation-audit.log');
    
    if (this.auditLogEnabled) {
      // Ensure audit log directory exists
      const logDir = path.dirname(this.auditLogPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      setTimeout(() => this.log('info', `Audit logging enabled: ${this.auditLogPath}`), 100);
    }

    // Log configured thresholds at startup
    setTimeout(() => {
      this.log('info', `Configured thresholds: nudity=${this.config.thresholds.nudity}, violence=${this.config.thresholds.violence}, weapon=${this.config.thresholds.weapon}`);
      this.log('info', `Enabled image checks: ${this.config.enabledChecks.join(', ')}`);
      this.log('info', `Enabled text checks: ${this.config.enabledTextChecks.join(', ')}`);
      this.log('info', `Enabled video checks: ${this.config.enabledVideoChecks.join(', ')}`);
    }, 150);
  }

  public async canHandle(input: OperationHandlerInput): Promise<void> {
    return this.source.canHandle(input);
  }

  public async handle(input: OperationHandlerInput): Promise<ResponseDescription> {
    const { operation } = input;
    const method = operation.method;
    const path = operation.target.path;

    this.log('info', `Intercepted: ${method} ${path}`);

    // Extract pod name from path and agent (WebID) from credentials if available
    const pod = this.extractPodName(path);
    // The agent WebID may be available in the operation after authorization
    // We need to safely extract it since it's not part of the standard Operation type
    let agent: string | undefined;
    try {
      const op = operation as unknown as { credentials?: { agent?: { webId?: string } } };
      agent = op.credentials?.agent?.webId;
    } catch {
      agent = undefined;
    }

    // Only moderate PUT, POST, and PATCH requests (content uploads/modifications)
    if (method === 'PUT' || method === 'POST' || method === 'PATCH') {
      const contentType = operation.body?.metadata?.contentType;
      this.log('debug', `ContentType: ${contentType}`);

      // Check if this is an image that can be moderated
      if (contentType && this.SUPPORTED_IMAGE_TYPES.includes(contentType)) {
        this.log('info', `Image detected: ${contentType} at ${path}`);
        
        try {
          const scores = await this.moderateImage(operation.body, contentType, path);
          this.log('info', `Image passed moderation: ${path}`);
          this.writeAuditLog({
            timestamp: new Date().toISOString(),
            action: 'ALLOW',
            contentType: 'image',
            path,
            pod,
            agent,
            mimeType: contentType,
            scores,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown moderation error';
          this.log('warn', `Image rejected: ${path} - ${errorMessage}`);
          this.writeAuditLog({
            timestamp: new Date().toISOString(),
            action: 'REJECT',
            contentType: 'image',
            path,
            pod,
            agent,
            mimeType: contentType,
            reason: errorMessage,
          });
          throw error;
        }
      }
      // Check if this is text that can be moderated
      else if (contentType && this.SUPPORTED_TEXT_TYPES.includes(contentType)) {
        this.log('info', `Text detected: ${contentType} at ${path}`);
        
        try {
          const scores = await this.moderateText(operation.body, path);
          this.log('info', `Text passed moderation: ${path}`);
          this.writeAuditLog({
            timestamp: new Date().toISOString(),
            action: 'ALLOW',
            contentType: 'text',
            path,
            pod,
            agent,
            mimeType: contentType,
            scores,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown moderation error';
          this.log('warn', `Text rejected: ${path} - ${errorMessage}`);
          this.writeAuditLog({
            timestamp: new Date().toISOString(),
            action: 'REJECT',
            contentType: 'text',
            path,
            pod,
            agent,
            mimeType: contentType,
            reason: errorMessage,
          });
          throw error;
        }
      }
      // Check if this is video that can be moderated
      else if (contentType && this.SUPPORTED_VIDEO_TYPES.includes(contentType)) {
        this.log('info', `Video detected: ${contentType} at ${path}`);
        
        try {
          const scores = await this.moderateVideo(operation.body, contentType, path);
          this.log('info', `Video passed moderation: ${path}`);
          this.writeAuditLog({
            timestamp: new Date().toISOString(),
            action: 'ALLOW',
            contentType: 'video',
            path,
            pod,
            agent,
            mimeType: contentType,
            scores,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown moderation error';
          this.log('warn', `Video rejected: ${path} - ${errorMessage}`);
          this.writeAuditLog({
            timestamp: new Date().toISOString(),
            action: 'REJECT',
            contentType: 'video',
            path,
            pod,
            agent,
            mimeType: contentType,
            reason: errorMessage,
          });
          throw error;
        }
      }
    }

    // Pass through to the source handler
    return this.source.handle(input);
  }

  /**
   * Moderate an image using SightEngine API
   */
  private async moderateImage(
    body: { data: Readable; metadata: RepresentationMetadata } | undefined,
    contentType: string,
    path: string,
  ): Promise<Record<string, number> | undefined> {
    this.log('debug', `moderateImage called for ${path}`);
    
    // Skip if API not configured
    if (!this.config.apiUser || !this.config.apiSecret) {
      this.log('warn', 'Skipping moderation - API credentials not configured');
      return undefined;
    }

    if (!body?.data) {
      this.log('warn', 'No body data to moderate');
      return undefined;
    }

    try {
      // Read the image data
      const chunks: Buffer[] = [];
      for await (const chunk of body.data) {
        chunks.push(Buffer.from(chunk));
      }
      const imageBuffer = Buffer.concat(chunks);

      // Create a new readable stream for the source handler
      // (since we consumed the original stream)
      const newStream = Readable.from(imageBuffer);
      body.data = newStream;

      // Call SightEngine API
      const result = await this.callSightEngine(imageBuffer, contentType);

      // Check the moderation result
      this.checkModerationResult(result, path);

      // Return scores for audit logging
      return this.extractImageScores(result);

    } catch (error: unknown) {
      if (error instanceof BadRequestHttpError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `API error: ${errorMessage}`);
      // On API error, allow the upload (fail-open policy)
      // Change to throw error for fail-closed policy
      this.log('warn', 'Allowing upload due to API error (fail-open policy)');
      return undefined;
    }
  }

  /**
   * Extract scores from image moderation result for audit logging
   */
  private extractImageScores(result: SightEngineResult): Record<string, number> {
    const scores: Record<string, number> = {};
    
    if (result.nudity) {
      scores.nudity = Math.max(
        result.nudity.sexual_activity || 0,
        result.nudity.sexual_display || 0,
        result.nudity.erotica || 0,
        result.nudity.very_suggestive || 0,
      );
    }
    if (result.gore) scores.gore = result.gore.prob;
    if (result.weapon !== undefined) scores.weapon = result.weapon;
    if (result.alcohol !== undefined) scores.alcohol = result.alcohol;
    if (result.drugs !== undefined) scores.drugs = result.drugs;
    if (result.offensive) scores.offensive = result.offensive.prob;
    if (result['self-harm'] !== undefined) scores.selfharm = result['self-harm'];
    if (result.gambling !== undefined) scores.gambling = result.gambling;
    
    return scores;
  }

  /**
   * Moderate text content using SightEngine Text API
   */
  private async moderateText(
    body: { data: Readable; metadata: RepresentationMetadata } | undefined,
    path: string,
  ): Promise<Record<string, number> | undefined> {
    this.log('debug', `moderateText called for ${path}`);
    
    // Skip if API not configured
    if (!this.config.apiUser || !this.config.apiSecret) {
      this.log('warn', 'Skipping text moderation - API credentials not configured');
      return undefined;
    }

    if (!body?.data) {
      this.log('warn', 'No body data to moderate');
      return undefined;
    }

    try {
      // Read the text data
      const chunks: Buffer[] = [];
      for await (const chunk of body.data) {
        chunks.push(Buffer.from(chunk));
      }
      const textBuffer = Buffer.concat(chunks);
      const text = textBuffer.toString('utf-8');

      // Create a new readable stream for the source handler
      // (since we consumed the original stream)
      const newStream = Readable.from(textBuffer);
      body.data = newStream;

      // Skip very short or empty text
      if (text.trim().length < 3) {
        this.log('debug', 'Skipping text moderation - text too short');
        return undefined;
      }

      // Call SightEngine Text API
      const result = await this.callSightEngineText(text);

      // Check the text moderation result
      this.checkTextModerationResult(result, path);

      // Return scores for audit logging
      return this.extractTextScores(result);

    } catch (error: unknown) {
      if (error instanceof BadRequestHttpError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Text API error: ${errorMessage}`);
      // On API error, allow the upload (fail-open policy)
      this.log('warn', 'Allowing upload due to API error (fail-open policy)');
      return undefined;
    }
  }

  /**
   * Extract scores from text moderation result for audit logging
   */
  private extractTextScores(result: SightEngineTextResult): Record<string, number> {
    const scores: Record<string, number> = {};
    
    if (result.sexual) scores.sexual = result.sexual.prob;
    if (result.discriminatory) scores.discriminatory = result.discriminatory.prob;
    if (result.insulting) scores.insulting = result.insulting.prob;
    if (result.violent) scores.violent = result.violent.prob;
    if (result.toxic) scores.toxic = result.toxic.prob;
    if (result['self-harm']) scores.selfharm = result['self-harm'].prob;
    
    return scores;
  }

  /**
   * Call the SightEngine Text API
   */
  private async callSightEngineText(text: string): Promise<SightEngineTextResult> {
    // SightEngine Text API uses 'mode' for ml/rules, not category names
    // The categories are returned automatically based on the mode
    const mode = 'ml'; // Use ML-based moderation
    
    // Use URL-encoded form data for text API
    const formData = new URLSearchParams();
    formData.append('api_user', this.config.apiUser);
    formData.append('api_secret', this.config.apiSecret);
    formData.append('text', text);
    formData.append('mode', mode);
    formData.append('lang', 'en'); // Default to English, can be made configurable

    this.log('info', `Calling SightEngine Text API with mode: ${mode}`);

    const response = await fetch('https://api.sightengine.com/1.0/text/check.json', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SightEngine Text API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as SightEngineTextResult;
    
    if (result.status !== 'success') {
      throw new Error(`SightEngine Text error: ${result.error?.message || 'Unknown error'}`);
    }

    this.log('info', `SightEngine Text response: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Check the text moderation result against configured thresholds
   */
  private checkTextModerationResult(result: SightEngineTextResult, path: string): void {
    const violations: string[] = [];

    // Check sexual content
    if (result.sexual && result.sexual.prob > this.config.thresholds.textSexual) {
      violations.push(`sexual content (score: ${result.sexual.prob.toFixed(2)})`);
    }

    // Check discriminatory content
    if (result.discriminatory && result.discriminatory.prob > this.config.thresholds.textDiscriminatory) {
      violations.push(`discriminatory content (score: ${result.discriminatory.prob.toFixed(2)})`);
    }

    // Check insulting content
    if (result.insulting && result.insulting.prob > this.config.thresholds.textInsulting) {
      violations.push(`insulting content (score: ${result.insulting.prob.toFixed(2)})`);
    }

    // Check violent content
    if (result.violent && result.violent.prob > this.config.thresholds.textViolent) {
      violations.push(`violent content (score: ${result.violent.prob.toFixed(2)})`);
    }

    // Check toxic content
    if (result.toxic && result.toxic.prob > this.config.thresholds.textToxic) {
      violations.push(`toxic content (score: ${result.toxic.prob.toFixed(2)})`);
    }

    // Check self-harm content
    if (result['self-harm'] && result['self-harm'].prob > this.config.thresholds.textSelfharm) {
      violations.push(`self-harm content (score: ${result['self-harm'].prob.toFixed(2)})`);
    }

    // Check personal info (any match is a violation if enabled)
    if (result.personal) {
      const personalTypes: string[] = [];
      if (result.personal.phone_number?.length) personalTypes.push('phone numbers');
      if (result.personal.email?.length) personalTypes.push('emails');
      if (result.personal.ip_address?.length) personalTypes.push('IP addresses');
      if (result.personal.ssn?.length) personalTypes.push('SSN');
      if (result.personal.credit_card?.length) personalTypes.push('credit cards');
      
      if (personalTypes.length > 0) {
        violations.push(`personal info detected: ${personalTypes.join(', ')}`);
      }
    }

    if (violations.length > 0) {
      const message = `Text content rejected due to policy violations: ${violations.join(', ')}`;
      this.log('warn', `${message} at ${path}`);
      throw new BadRequestHttpError(message);
    }
  }

  /**
   * Call the SightEngine API with image buffer
   */
  private async callSightEngine(imageBuffer: Buffer, contentType: string): Promise<SightEngineResult> {
    const models = this.config.enabledChecks.join(',');
    
    // Create multipart form data boundary
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    
    // Determine file extension from content type
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
    };
    const ext = extMap[contentType] || 'jpg';
    
    // Build multipart form data manually
    const parts: Buffer[] = [];
    
    // Add api_user field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_user"\r\n\r\n${this.config.apiUser}\r\n`));
    
    // Add api_secret field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_secret"\r\n\r\n${this.config.apiSecret}\r\n`));
    
    // Add models field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="models"\r\n\r\n${models}\r\n`));
    
    // Add media file
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="image.${ext}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    parts.push(imageBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    
    const body = Buffer.concat(parts);

    this.log('info', `Calling SightEngine with models: ${models}`);

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SightEngine API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as SightEngineResult;
    
    if (result.status !== 'success') {
      throw new Error(`SightEngine error: ${result.error?.message || 'Unknown error'}`);
    }

    this.log('info', `SightEngine response: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Check the moderation result against configured thresholds
   */
  private checkModerationResult(result: SightEngineResult, path: string): void {
    const violations: string[] = [];

    // Check nudity
    if (result.nudity) {
      const nudityScore = Math.max(
        result.nudity.sexual_activity || 0,
        result.nudity.sexual_display || 0,
        result.nudity.erotica || 0,
        result.nudity.very_suggestive || 0,
      );
      if (nudityScore > this.config.thresholds.nudity) {
        violations.push(`nudity (score: ${nudityScore.toFixed(2)})`);
      }
    }

    // Check violence/gore
    if (result.gore && result.gore.prob > this.config.thresholds.violence) {
      violations.push(`violence/gore (score: ${result.gore.prob.toFixed(2)})`);
    }

    // Check weapons
    if (result.weapon !== undefined && result.weapon > this.config.thresholds.weapon) {
      violations.push(`weapons (score: ${result.weapon.toFixed(2)})`);
    }

    // Check alcohol
    if (result.alcohol !== undefined && result.alcohol > this.config.thresholds.alcohol) {
      violations.push(`alcohol (score: ${result.alcohol.toFixed(2)})`);
    }

    // Check drugs
    if (result.drugs !== undefined && result.drugs > this.config.thresholds.drugs) {
      violations.push(`drugs (score: ${result.drugs.toFixed(2)})`);
    }

    // Check offensive symbols
    if (result.offensive && result.offensive.prob > this.config.thresholds.offensive) {
      violations.push(`offensive symbols (score: ${result.offensive.prob.toFixed(2)})`);
    }

    // Check self-harm
    if (result['self-harm'] !== undefined && result['self-harm'] > this.config.thresholds.selfharm) {
      violations.push(`self-harm (score: ${result['self-harm'].toFixed(2)})`);
    }

    // Check gambling
    if (result.gambling !== undefined && result.gambling > this.config.thresholds.gambling) {
      violations.push(`gambling (score: ${result.gambling.toFixed(2)})`);
    }

    // Check profanity in text (from text model)
    if (result.text?.profanity && result.text.profanity.length > 0) {
      const profanityMatches = result.text.profanity.map(p => p.match).join(', ');
      violations.push(`profanity detected: ${profanityMatches}`);
    }

    // Check personal info in text (from text model)
    if (result.text?.personal && result.text.personal.length > 0) {
      const personalTypes = result.text.personal.map(p => p.type).join(', ');
      violations.push(`personal info detected: ${personalTypes}`);
    }

    if (violations.length > 0) {
      const message = `Content rejected due to policy violations: ${violations.join(', ')}`;
      this.log('warn', `${message} at ${path}`);
      throw new BadRequestHttpError(message);
    }
  }

  /**
   * Moderate a video using SightEngine Video API
   */
  private async moderateVideo(
    body: { data: Readable; metadata: RepresentationMetadata } | undefined,
    contentType: string,
    path: string,
  ): Promise<Record<string, number> | undefined> {
    this.log('debug', `moderateVideo called for ${path}`);
    
    // Skip if API not configured
    if (!this.config.apiUser || !this.config.apiSecret) {
      this.log('warn', 'Skipping video moderation - API credentials not configured');
      return undefined;
    }

    if (!body?.data) {
      this.log('warn', 'No body data to moderate');
      return undefined;
    }

    try {
      // Read the video data
      const chunks: Buffer[] = [];
      for await (const chunk of body.data) {
        chunks.push(Buffer.from(chunk));
      }
      const videoBuffer = Buffer.concat(chunks);

      // Create a new readable stream for the source handler
      // (since we consumed the original stream)
      const newStream = Readable.from(videoBuffer);
      body.data = newStream;

      // Call SightEngine Video API
      const result = await this.callSightEngineVideo(videoBuffer, contentType);

      // Check the video moderation result
      this.checkVideoModerationResult(result, path);

      // Return scores for audit logging
      return this.extractVideoScores(result);

    } catch (error: unknown) {
      if (error instanceof BadRequestHttpError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Video API error: ${errorMessage}`);
      // On API error, allow the upload (fail-open policy)
      this.log('warn', 'Allowing upload due to API error (fail-open policy)');
      return undefined;
    }
  }

  /**
   * Extract scores from video moderation result for audit logging
   */
  private extractVideoScores(result: SightEngineVideoResult): Record<string, number> {
    const scores: Record<string, number> = {};
    
    if (result.summary) {
      if (result.summary.nudity) {
        scores.nudity = Math.max(
          result.summary.nudity.sexual_activity || 0,
          result.summary.nudity.sexual_display || 0,
          result.summary.nudity.erotica || 0,
          result.summary.nudity.very_suggestive || 0,
        );
      }
      if (result.summary.gore) scores.gore = result.summary.gore.prob;
      if (result.summary.weapon !== undefined) scores.weapon = result.summary.weapon;
      if (result.summary.alcohol !== undefined) scores.alcohol = result.summary.alcohol;
      if (result.summary.drugs !== undefined) scores.drugs = result.summary.drugs;
      if (result.summary.offensive) scores.offensive = result.summary.offensive.prob;
      if (result.summary['self-harm'] !== undefined) scores.selfharm = result.summary['self-harm'];
      if (result.summary.gambling !== undefined) scores.gambling = result.summary.gambling;
      if (result.summary.tobacco !== undefined) scores.tobacco = result.summary.tobacco;
    }
    
    return scores;
  }

  /**
   * Call the SightEngine Video API with video buffer
   */
  private async callSightEngineVideo(videoBuffer: Buffer, contentType: string): Promise<SightEngineVideoResult> {
    const models = this.config.enabledVideoChecks.join(',');
    
    // Create multipart form data boundary
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    
    // Determine file extension from content type
    const extMap: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/mpeg': 'mpeg',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/x-ms-wmv': 'wmv',
      'video/webm': 'webm',
      'video/ogg': 'ogv',
      'video/3gpp': '3gp',
      'video/3gpp2': '3g2',
    };
    const ext = extMap[contentType] || 'mp4';
    
    // Build multipart form data manually
    const parts: Buffer[] = [];
    
    // Add api_user field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_user"\r\n\r\n${this.config.apiUser}\r\n`));
    
    // Add api_secret field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="api_secret"\r\n\r\n${this.config.apiSecret}\r\n`));
    
    // Add models field
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="models"\r\n\r\n${models}\r\n`));
    
    // Add media file
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="video.${ext}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    parts.push(videoBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    
    const body = Buffer.concat(parts);

    this.log('info', `Calling SightEngine Video API with models: ${models}`);

    const response = await fetch('https://api.sightengine.com/1.0/video/check-sync.json', {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SightEngine Video API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as SightEngineVideoResult;
    
    if (result.status !== 'success') {
      throw new Error(`SightEngine Video error: ${result.error?.message || 'Unknown error'}`);
    }

    this.log('info', `SightEngine Video response received`);
    return result;
  }

  /**
   * Check the video moderation result against configured thresholds
   * Uses the summary field which contains the max scores across all frames
   */
  private checkVideoModerationResult(result: SightEngineVideoResult, path: string): void {
    const violations: string[] = [];
    const summary = result.summary;

    if (!summary) {
      this.log('debug', 'No summary in video result, checking frames');
      // If no summary, check individual frames
      if (result.data?.frames) {
        for (const frame of result.data.frames) {
          this.checkVideoFrame(frame, violations);
        }
      }
    } else {
      // Check summary (max values across all frames)
      
      // Check nudity
      if (summary.nudity) {
        const nudityScore = Math.max(
          summary.nudity.sexual_activity || 0,
          summary.nudity.sexual_display || 0,
          summary.nudity.erotica || 0,
          summary.nudity.very_suggestive || 0
        );
        if (nudityScore > this.config.thresholds.nudity) {
          violations.push(`nudity (score: ${nudityScore.toFixed(2)})`);
        }
      }

      // Check violence/gore
      if (summary.gore && summary.gore.prob > this.config.thresholds.violence) {
        violations.push(`violence/gore (score: ${summary.gore.prob.toFixed(2)})`);
      }

      // Check weapons
      if (summary.weapon !== undefined && summary.weapon > this.config.thresholds.weapon) {
        violations.push(`weapons (score: ${summary.weapon.toFixed(2)})`);
      }

      // Check alcohol
      if (summary.alcohol !== undefined && summary.alcohol > this.config.thresholds.alcohol) {
        violations.push(`alcohol (score: ${summary.alcohol.toFixed(2)})`);
      }

      // Check drugs
      if (summary.drugs !== undefined && summary.drugs > this.config.thresholds.drugs) {
        violations.push(`drugs (score: ${summary.drugs.toFixed(2)})`);
      }

      // Check offensive symbols
      if (summary.offensive && summary.offensive.prob > this.config.thresholds.offensive) {
        violations.push(`offensive symbols (score: ${summary.offensive.prob.toFixed(2)})`);
      }

      // Check self-harm
      if (summary['self-harm'] !== undefined && summary['self-harm'] > this.config.thresholds.selfharm) {
        violations.push(`self-harm (score: ${summary['self-harm'].toFixed(2)})`);
      }

      // Check gambling
      if (summary.gambling !== undefined && summary.gambling > this.config.thresholds.gambling) {
        violations.push(`gambling (score: ${summary.gambling.toFixed(2)})`);
      }

      // Check tobacco
      if (summary.tobacco !== undefined && summary.tobacco > this.config.thresholds.tobacco) {
        violations.push(`tobacco (score: ${summary.tobacco.toFixed(2)})`);
      }
    }

    if (violations.length > 0) {
      const message = `Video content rejected due to policy violations: ${violations.join(', ')}`;
      this.log('warn', `${message} at ${path}`);
      throw new BadRequestHttpError(message);
    }
  }

  /**
   * Check a single video frame for violations
   */
  private checkVideoFrame(frame: VideoFrame, violations: string[]): void {
    // Check nudity
    if (frame.nudity) {
      const nudityScore = Math.max(
        frame.nudity.sexual_activity || 0,
        frame.nudity.sexual_display || 0,
        frame.nudity.erotica || 0,
        frame.nudity.very_suggestive || 0
      );
      if (nudityScore > this.config.thresholds.nudity) {
        const position = frame.info?.position || 0;
        violations.push(`nudity at ${position}s (score: ${nudityScore.toFixed(2)})`);
      }
    }

    // Check gore
    if (frame.gore && frame.gore.prob > this.config.thresholds.violence) {
      const position = frame.info?.position || 0;
      violations.push(`violence/gore at ${position}s (score: ${frame.gore.prob.toFixed(2)})`);
    }

    // Check weapons
    if (frame.weapon !== undefined && frame.weapon > this.config.thresholds.weapon) {
      const position = frame.info?.position || 0;
      violations.push(`weapons at ${position}s (score: ${frame.weapon.toFixed(2)})`);
    }

    // Check alcohol
    if (frame.alcohol !== undefined && frame.alcohol > this.config.thresholds.alcohol) {
      const position = frame.info?.position || 0;
      violations.push(`alcohol at ${position}s (score: ${frame.alcohol.toFixed(2)})`);
    }

    // Check drugs
    if (frame.drugs !== undefined && frame.drugs > this.config.thresholds.drugs) {
      const position = frame.info?.position || 0;
      violations.push(`drugs at ${position}s (score: ${frame.drugs.toFixed(2)})`);
    }

    // Check offensive
    if (frame.offensive && frame.offensive.prob > this.config.thresholds.offensive) {
      const position = frame.info?.position || 0;
      violations.push(`offensive at ${position}s (score: ${frame.offensive.prob.toFixed(2)})`);
    }

    // Check self-harm
    if (frame['self-harm'] !== undefined && frame['self-harm'] > this.config.thresholds.selfharm) {
      const position = frame.info?.position || 0;
      violations.push(`self-harm at ${position}s (score: ${frame['self-harm'].toFixed(2)})`);
    }

    // Check gambling
    if (frame.gambling !== undefined && frame.gambling > this.config.thresholds.gambling) {
      const position = frame.info?.position || 0;
      violations.push(`gambling at ${position}s (score: ${frame.gambling.toFixed(2)})`);
    }

    // Check tobacco
    if (frame.tobacco !== undefined && frame.tobacco > this.config.thresholds.tobacco) {
      const position = frame.info?.position || 0;
      violations.push(`tobacco at ${position}s (score: ${frame.tobacco.toFixed(2)})`);
    }
  }
}
