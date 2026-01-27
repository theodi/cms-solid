/**
 * Mock SightEngine API responses for testing
 */

/** Safe image response - all scores below thresholds */
export const mockSafeImageResponse = {
  status: 'success',
  request: { id: 'test-req-safe-123', timestamp: 1706300000, operations: 1 },
  nudity: {
    sexual_activity: 0.01,
    sexual_display: 0.01,
    erotica: 0.02,
    very_suggestive: 0.02,
    suggestive: 0.03,
    mildly_suggestive: 0.05,
    suggestive_classes: {},
    none: 0.95,
    raw: 0.02,
    partial: 0.03,
  },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.01 },
  'self-harm': { prob: 0.01 },
  gambling: 0.01,
  tobacco: 0.01,
  money: 0.01,
  skull: 0.01,
  qr: { prob: 0.01 },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe image response - nudity above threshold */
export const mockUnsafeNudityImageResponse = {
  status: 'success',
  request: { id: 'test-req-nudity-456', timestamp: 1706300001, operations: 1 },
  nudity: {
    sexual_activity: 0.92,   // Above default 0.5 threshold
    sexual_display: 0.85,    // Above default 0.5 threshold
    erotica: 0.75,           // Above default 0.5 threshold
    very_suggestive: 0.80,   // Above default 0.5 threshold
    suggestive: 0.85,
    mildly_suggestive: 0.9,
    suggestive_classes: {},
    none: 0.05,
    raw: 0.88,
    partial: 0.82,
  },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.01 },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe image response - violence/gore above threshold */
export const mockUnsafeViolenceImageResponse = {
  status: 'success',
  request: { id: 'test-req-violence-789', timestamp: 1706300002, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.05,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.85 },  // Above default 0.5 threshold
  offensive: { prob: 0.02 },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe image response - weapon above threshold */
export const mockUnsafeWeaponImageResponse = {
  status: 'success',
  request: { id: 'test-req-weapon-abc', timestamp: 1706300003, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.85,  // Above default 0.5 threshold
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.02 },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Safe text response - all moderation classes below thresholds */
export const mockSafeTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-safe-123', timestamp: 1706300010, operations: 1 },
  sexual: { prob: 0.01 },
  discriminatory: { prob: 0.01 },
  insulting: { prob: 0.02 },
  violent: { prob: 0.01 },
  toxic: { prob: 0.01 },
  'self-harm': { prob: 0.01 },
  personal: {},
  link: {},
};

/** Unsafe text response - toxic content above threshold */
export const mockToxicTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-toxic-456', timestamp: 1706300011, operations: 1 },
  sexual: { prob: 0.01 },
  discriminatory: { prob: 0.02 },
  insulting: { prob: 0.75 },  // Above default 0.5 threshold
  violent: { prob: 0.02 },
  toxic: { prob: 0.82 },      // Above default 0.5 threshold
  'self-harm': { prob: 0.01 },
  personal: {},
  link: {},
};

/** Unsafe text response - sexual content above threshold */
export const mockSexualTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-sexual-789', timestamp: 1706300012, operations: 1 },
  sexual: { prob: 0.88 },     // Above default 0.5 threshold
  discriminatory: { prob: 0.01 },
  insulting: { prob: 0.02 },
  violent: { prob: 0.01 },
  toxic: { prob: 0.03 },
  'self-harm': { prob: 0.01 },
  personal: {},
  link: {},
};

/** Unsafe text response - personal info detected */
export const mockPersonalInfoTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-pii-abc', timestamp: 1706300013, operations: 1 },
  sexual: { prob: 0.01 },
  discriminatory: { prob: 0.01 },
  insulting: { prob: 0.02 },
  violent: { prob: 0.01 },
  toxic: { prob: 0.01 },
  personal: {
    email: [{ match: 'test@example.com' }],
    phone_number: [{ match: '555-123-4567' }],
  },
  link: {},
};

/** Unsafe image response - drugs above threshold */
export const mockUnsafeDrugsImageResponse = {
  status: 'success',
  request: { id: 'test-req-drugs-def', timestamp: 1706300004, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.85,  // Above default 0.5 threshold
  gore: { prob: 0.01 },
  offensive: { prob: 0.02 },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe image response - alcohol above threshold */
export const mockUnsafeAlcoholImageResponse = {
  status: 'success',
  request: { id: 'test-req-alcohol-ghi', timestamp: 1706300005, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.01,
  alcohol: 0.85,  // Above default 0.5 threshold
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.02 },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe image response - offensive symbols above threshold */
export const mockUnsafeOffensiveImageResponse = {
  status: 'success',
  request: { id: 'test-req-offensive-jkl', timestamp: 1706300006, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.85 },  // Above default 0.5 threshold
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe image response - self-harm above threshold */
export const mockUnsafeSelfHarmImageResponse = {
  status: 'success',
  request: { id: 'test-req-selfharm-mno', timestamp: 1706300007, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.01 },
  'self-harm': 0.85,  // Above default 0.5 threshold
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe image response - gambling above threshold */
export const mockUnsafeGamblingImageResponse = {
  status: 'success',
  request: { id: 'test-req-gambling-pqr', timestamp: 1706300008, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.01 },
  gambling: 0.85,  // Above default 0.5 threshold
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Unsafe text response - discriminatory content above threshold */
export const mockDiscriminatoryTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-discrim-stu', timestamp: 1706300014, operations: 1 },
  sexual: { prob: 0.01 },
  discriminatory: { prob: 0.88 },  // Above default 0.5 threshold
  insulting: { prob: 0.02 },
  violent: { prob: 0.01 },
  toxic: { prob: 0.03 },
  'self-harm': { prob: 0.01 },
  personal: {},
  link: {},
};

/** Unsafe text response - violent content above threshold */
export const mockViolentTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-violent-vwx', timestamp: 1706300015, operations: 1 },
  sexual: { prob: 0.01 },
  discriminatory: { prob: 0.01 },
  insulting: { prob: 0.02 },
  violent: { prob: 0.88 },  // Above default 0.5 threshold
  toxic: { prob: 0.03 },
  'self-harm': { prob: 0.01 },
  personal: {},
  link: {},
};

/** Unsafe text response - self-harm content above threshold */
export const mockSelfHarmTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-selfharm-yza', timestamp: 1706300016, operations: 1 },
  sexual: { prob: 0.01 },
  discriminatory: { prob: 0.01 },
  insulting: { prob: 0.02 },
  violent: { prob: 0.01 },
  toxic: { prob: 0.03 },
  'self-harm': { prob: 0.88 },  // Above default 0.5 threshold
  personal: {},
  link: {},
};

/** Safe video response - video moderation all below thresholds */
export const mockSafeVideoResponse = {
  status: 'success',
  request: { id: 'test-req-video-safe-001', timestamp: 1706300020, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 0, timestamp: 0 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
        'self-harm': 0.01,
        gambling: 0.01,
        tobacco: 0.01,
      },
      {
        info: { position: 1, timestamp: 1000 },
        nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
        'self-harm': 0.01,
        gambling: 0.01,
        tobacco: 0.01,
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - nudity in frames above threshold */
export const mockUnsafeVideoNudityResponse = {
  status: 'success',
  request: { id: 'test-req-video-nudity-002', timestamp: 1706300021, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 0, timestamp: 0 },
        nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
      },
      {
        info: { position: 1, timestamp: 1000 },
        nudity: { 
          sexual_activity: 0.85, // Above threshold
          sexual_display: 0.75,
          raw: 0.88, 
          partial: 0.82, 
          none: 0.05 
        },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - violence in frames above threshold */
export const mockUnsafeVideoViolenceResponse = {
  status: 'success',
  request: { id: 'test-req-video-violence-003', timestamp: 1706300022, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 2, timestamp: 2000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.85 }, // Above threshold
        offensive: { prob: 0.01 },
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - weapon in frames above threshold */
export const mockUnsafeVideoWeaponResponse = {
  status: 'success',
  request: { id: 'test-req-video-weapon-004', timestamp: 1706300023, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 3, timestamp: 3000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.85, // Above threshold
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - alcohol in frames above threshold */
export const mockUnsafeVideoAlcoholResponse = {
  status: 'success',
  request: { id: 'test-req-video-alcohol-005', timestamp: 1706300024, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 4, timestamp: 4000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.85, // Above threshold
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - drugs in frames above threshold */
export const mockUnsafeVideoDrugsResponse = {
  status: 'success',
  request: { id: 'test-req-video-drugs-006', timestamp: 1706300025, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 5, timestamp: 5000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.85, // Above threshold
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - offensive in frames above threshold */
export const mockUnsafeVideoOffensiveResponse = {
  status: 'success',
  request: { id: 'test-req-video-offensive-007', timestamp: 1706300026, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 6, timestamp: 6000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.85 }, // Above threshold
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - self-harm in frames above threshold */
export const mockUnsafeVideoSelfHarmResponse = {
  status: 'success',
  request: { id: 'test-req-video-selfharm-008', timestamp: 1706300027, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 7, timestamp: 7000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
        'self-harm': 0.85, // Above threshold
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - gambling in frames above threshold */
export const mockUnsafeVideoGamblingResponse = {
  status: 'success',
  request: { id: 'test-req-video-gambling-009', timestamp: 1706300028, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 8, timestamp: 8000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
        gambling: 0.85, // Above threshold
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response - tobacco in frames above threshold */
export const mockUnsafeVideoTobaccoResponse = {
  status: 'success',
  request: { id: 'test-req-video-tobacco-010', timestamp: 1706300029, operations: 1 },
  data: {
    frames: [
      {
        info: { position: 9, timestamp: 9000 },
        nudity: { raw: 0.01, partial: 0.02, none: 0.97 },
        weapon: 0.01,
        alcohol: 0.01,
        drugs: 0.01,
        gore: { prob: 0.01 },
        offensive: { prob: 0.01 },
        tobacco: 0.85, // Above threshold
      },
    ],
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe text response - insulting content above threshold */
export const mockInsultingTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-insult-bcd', timestamp: 1706300017, operations: 1 },
  sexual: { prob: 0.01 },
  discriminatory: { prob: 0.01 },
  insulting: { prob: 0.88 },  // Above default 0.5 threshold
  violent: { prob: 0.01 },
  toxic: { prob: 0.65 },
  'self-harm': { prob: 0.01 },
  personal: {},
  link: {},
};

// ============================================
// Video Summary Responses (uses summary field instead of frames)
// ============================================

/** Safe video response with summary - all below thresholds */
export const mockSafeVideoSummaryResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-safe-001', timestamp: 1706300030, operations: 1 },
  summary: {
    nudity: {
      sexual_activity: 0.01,
      sexual_display: 0.02,
      erotica: 0.01,
      very_suggestive: 0.02,
      none: 0.95,
    },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - nudity above threshold */
export const mockUnsafeVideoSummaryNudityResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-nudity-002', timestamp: 1706300031, operations: 1 },
  summary: {
    nudity: {
      sexual_activity: 0.85, // Above threshold
      sexual_display: 0.75,
      erotica: 0.70,
      very_suggestive: 0.65,
      none: 0.05,
    },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - gore above threshold */
export const mockUnsafeVideoSummaryGoreResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-gore-003', timestamp: 1706300032, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.85 }, // Above threshold
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - weapon above threshold */
export const mockUnsafeVideoSummaryWeaponResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-weapon-004', timestamp: 1706300033, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.01 },
    weapon: 0.85, // Above threshold
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - alcohol above threshold */
export const mockUnsafeVideoSummaryAlcoholResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-alcohol-005', timestamp: 1706300034, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.85, // Above threshold
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - drugs above threshold */
export const mockUnsafeVideoSummaryDrugsResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-drugs-006', timestamp: 1706300035, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.85, // Above threshold
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - offensive above threshold */
export const mockUnsafeVideoSummaryOffensiveResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-offensive-007', timestamp: 1706300036, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.85 }, // Above threshold
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - self-harm above threshold */
export const mockUnsafeVideoSummarySelfHarmResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-selfharm-008', timestamp: 1706300037, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.85, // Above threshold
    gambling: 0.01,
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - gambling above threshold */
export const mockUnsafeVideoSummaryGamblingResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-gambling-009', timestamp: 1706300038, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.85, // Above threshold
    tobacco: 0.01,
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** Unsafe video response with summary - tobacco above threshold */
export const mockUnsafeVideoSummaryTobaccoResponse = {
  status: 'success',
  request: { id: 'test-req-video-summary-tobacco-010', timestamp: 1706300039, operations: 1 },
  summary: {
    nudity: { none: 0.95 },
    gore: { prob: 0.01 },
    weapon: 0.01,
    alcohol: 0.01,
    drugs: 0.01,
    offensive: { prob: 0.01 },
    'self-harm': 0.01,
    gambling: 0.01,
    tobacco: 0.85, // Above threshold
  },
  media: { id: 'test-video-id', uri: 'data:video/mp4;base64,...' },
};

/** API error response */
export const mockApiErrorResponse = {
  status: 'failure',
  error: {
    type: 'api_error',
    code: 1001,
    message: 'Rate limit exceeded',
  },
};

/** Image with profanity in text overlay */
export const mockImageWithProfanityResponse = {
  status: 'success',
  request: { id: 'test-req-img-profanity-011', timestamp: 1706300040, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.01 },
  text: {
    profanity: [
      { match: 'badword1', intensity: 'high', start: 0, end: 8 },
      { match: 'badword2', intensity: 'medium', start: 15, end: 22 }
    ],
    personal: []
  },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Image with personal info in text overlay */
export const mockImageWithPersonalInfoResponse = {
  status: 'success',
  request: { id: 'test-req-img-personal-012', timestamp: 1706300041, operations: 1 },
  nudity: { raw: 0.02, partial: 0.03, none: 0.95 },
  weapon: 0.01,
  alcohol: 0.01,
  drugs: 0.01,
  gore: { prob: 0.01 },
  offensive: { prob: 0.01 },
  text: {
    profanity: [],
    personal: [
      { type: 'email', match: 'test@example.com', start: 0, end: 16 },
      { type: 'phone', match: '555-123-4567', start: 20, end: 32 }
    ]
  },
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Text response with personal info - IP address, SSN, credit card */
export const mockUnsafePersonalInfoTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-personal-013', timestamp: 1706300042, operations: 1 },
  profanity: { matches: [] },
  personal: {
    ip_address: ['192.168.1.1', '10.0.0.1'],
    ssn: ['123-45-6789'],
    credit_card: ['4111111111111111'],
    phone_number: [],
    email: [],
  },
  link: { matches: [] },
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

/** Minimal image response - missing optional fields to test extractImageScores branches */
export const mockMinimalImageResponse = {
  status: 'success',
  request: { id: 'test-req-minimal-014', timestamp: 1706300043, operations: 1 },
  // Only include required fields, omit optional ones
  media: { id: 'test-media-id', uri: 'data:image/jpeg;base64,...' },
};

/** Minimal text response - missing optional fields to test extractTextScores branches */
export const mockMinimalTextResponse = {
  status: 'success',
  request: { id: 'test-req-minimal-text-015', timestamp: 1706300044, operations: 1 },
  // Minimal response without optional score fields
  media: { id: 'test-text-id' },
};

/** Text response with link detected */
export const mockUnsafeLinkTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-link-016', timestamp: 1706300045, operations: 1 },
  profanity: { matches: [] },
  link: {
    matches: [
      { type: 'url', match: 'http://malicious-site.com', start: 0, end: 25 }
    ]
  },
  // Include a real violation to trigger rejection
  sexual: { prob: 0.95 },
  'self-harm': { prob: 0.01 },
  moderation_classes: {
    sexual: 0.95,
    discriminatory: 0.01,
    insulting: 0.01,
    violent: 0.01,
    toxic: 0.01,
  },
  media: { id: 'test-text-id' },
};

/** Text response with drug content - using toxic as proxy */
export const mockUnsafeDrugTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-drug-017', timestamp: 1706300046, operations: 1 },
  profanity: { matches: [] },
  'self-harm': { prob: 0.01 },
  toxic: { prob: 0.95 }, // High toxic score as proxy for drug content
  moderation_classes: {
    sexual: 0.01,
    discriminatory: 0.01,
    insulting: 0.01,
    violent: 0.01,
    toxic: 0.95,
  },
  media: { id: 'test-text-id' },
};

/** Text response with weapon content - using violent as proxy */
export const mockUnsafeWeaponTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-weapon-018', timestamp: 1706300047, operations: 1 },
  profanity: { matches: [] },
  'self-harm': { prob: 0.01 },
  violent: { prob: 0.95 }, // High violent score
  moderation_classes: {
    sexual: 0.01,
    discriminatory: 0.01,
    insulting: 0.01,
    violent: 0.95,
    toxic: 0.01,
  },
  media: { id: 'test-text-id' },
};

/** Text response with spam content - using insulting as proxy */
export const mockUnsafeSpamTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-spam-019', timestamp: 1706300048, operations: 1 },
  profanity: { matches: [] },
  'self-harm': { prob: 0.01 },
  insulting: { prob: 0.95 }, // High insulting score
  moderation_classes: {
    sexual: 0.01,
    discriminatory: 0.01,
    insulting: 0.95,
    violent: 0.01,
    toxic: 0.01,
  },
  media: { id: 'test-text-id' },
};

/** Text response with extremism content - using discriminatory as proxy */
export const mockUnsafeExtremismTextResponse = {
  status: 'success',
  request: { id: 'test-req-text-extremism-020', timestamp: 1706300049, operations: 1 },
  profanity: { matches: [] },
  'self-harm': { prob: 0.01 },
  discriminatory: { prob: 0.95 }, // High discriminatory score
  moderation_classes: {
    sexual: 0.01,
    discriminatory: 0.95,
    insulting: 0.01,
    violent: 0.01,
    toxic: 0.01,
  },
  media: { id: 'test-text-id' },
};

/** Network error for fetch failures */
export class MockNetworkError extends Error {
  constructor() {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

/**
 * Create a mock fetch function that returns the specified response
 */
export function createMockFetch(response: object, ok = true): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
}

/**
 * Create a mock fetch that rejects with a network error
 */
export function createFailingFetch(): jest.Mock {
  return jest.fn().mockRejectedValue(new MockNetworkError());
}
