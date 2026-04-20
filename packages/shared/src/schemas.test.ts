import { describe, it, expect } from 'vitest';
import {
  signUpSchema,
  characterCreateSchema,
  generateVideoSchema,
  trendSourceCreateSchema,
  presignedUploadSchema,
} from './schemas';

describe('signup schema', () => {
  it('rejects weak passwords', () => {
    const res = signUpSchema.safeParse({
      email: 'a@b.co',
      name: 'Jo',
      password: 'short',
      acceptTerms: true,
    });
    expect(res.success).toBe(false);
  });

  it('rejects when terms not accepted', () => {
    const res = signUpSchema.safeParse({
      email: 'a@b.co',
      name: 'Jo',
      password: 'StrongPass1',
      acceptTerms: false,
    });
    expect(res.success).toBe(false);
  });

  it('accepts valid signup', () => {
    const res = signUpSchema.safeParse({
      email: 'A@b.Co',
      name: 'Jo',
      password: 'StrongPass1',
      acceptTerms: true,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe('a@b.co');
    }
  });
});

describe('character create schema', () => {
  it('requires 10 reference images', () => {
    const res = characterCreateSchema.safeParse({
      name: 'Selene',
      faceImageKey: 'x/1.jpg',
      referenceImageKeys: Array.from({ length: 9 }, (_, i) => `x/${i}.jpg`),
    });
    expect(res.success).toBe(false);
  });
  it('allows up to 20', () => {
    const res = characterCreateSchema.safeParse({
      name: 'Selene',
      faceImageKey: 'x/1.jpg',
      referenceImageKeys: Array.from({ length: 20 }, (_, i) => `x/${i}.jpg`),
    });
    expect(res.success).toBe(true);
  });
});

describe('generate video schema', () => {
  it('defaults duration and resolution', () => {
    const res = generateVideoSchema.parse({
      character_id: '00000000-0000-0000-0000-000000000000',
      reference_video_url: 'https://tiktok.com/x',
      confirm_credit_cost: 40,
    });
    expect(res.duration_seconds).toBe(5);
    expect(res.resolution).toBe('720p');
  });
});

describe('trend source schema', () => {
  it('rejects unknown kind', () => {
    const res = trendSourceCreateSchema.safeParse({ kind: 'unknown', handle: 'x' });
    expect(res.success).toBe(false);
  });
});

describe('presigned upload schema', () => {
  it('rejects non-image/video content', () => {
    const res = presignedUploadSchema.safeParse({
      bucket: 'uploads',
      content_type: 'application/pdf',
      size_bytes: 1000,
      purpose: 'face_image',
    });
    expect(res.success).toBe(false);
  });
  it('caps file size at 200MB', () => {
    const res = presignedUploadSchema.safeParse({
      bucket: 'uploads',
      content_type: 'video/mp4',
      size_bytes: 400 * 1024 * 1024,
      purpose: 'reference_video',
    });
    expect(res.success).toBe(false);
  });
});
