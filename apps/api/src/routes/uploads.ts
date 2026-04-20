import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { presignedUploadSchema } from '@remy/shared/schemas';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { signedUpload } from '../services/storage.js';

export const uploadRoutes = new Hono<AppEnv>();

uploadRoutes.post('/presign', zValidator('json', presignedUploadSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const body = c.req.valid('json');
  const extension = body.content_type.split('/')[1] ?? 'bin';
  const filename = `${body.purpose}.${extension}`;

  const result = await signedUpload({
    bucket: body.bucket,
    userId: user.id,
    filename,
    contentType: body.content_type,
  });

  return c.json({
    key: result.key,
    upload_url: result.uploadUrl,
    token: result.token,
    public_url: result.publicUrl,
    expires_in: 300,
  });
});
