/**
 * T186 + T191: Cloudflare Stream Webhook Handler (Enhanced)
 *
 * Receives webhook notifications from Cloudflare Stream when video processing
 * status changes. Updates video metadata in database accordingly.
 *
 * POST /api/webhooks/cloudflare
 *
 * Webhook payload from Cloudflare:
 * - uid: Video ID
 * - readyToStream: Boolean indicating if video is ready
 * - status: { state, pctComplete, errorReasonCode, errorReasonText }
 * - duration: Video duration in seconds
 * - thumbnail: Thumbnail URL
 * - playback: { hls, dash } playback URLs
 * - meta: Custom metadata object
 *
 * Security: Verifies webhook signature using Cloudflare webhook secret
 *
 * T191 Enhancements:
 * - Email notifications when video is ready
 * - Admin notifications for failed transcoding
 * - Detailed error logging
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendVideoReadyEmail, sendVideoFailedEmail } from '@/lib/email';
import type { VideoReadyData, VideoFailedData } from '@/lib/email';

// Web Crypto API compatible HMAC function
async function computeHmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataBytes = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataBytes);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify Cloudflare webhook signature
 *
 * Cloudflare signs webhooks using HMAC-SHA256 with your webhook secret.
 * The signature is sent in the Webhook-Signature header.
 * (Cloudflare Workers compatible - uses Web Crypto API)
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  try {
    // Cloudflare sends signature in format: "t=<timestamp>,v1=<signature>"
    const parts = signature.split(',');
    const signaturePart = parts.find(part => part.startsWith('v1='));

    if (!signaturePart) {
      return false;
    }

    const expectedSignature = signaturePart.substring(3); // Remove 'v1='

    // Compute HMAC-SHA256 signature using Web Crypto API
    const computedSignature = await computeHmacSha256(secret, payload);

    // Compare signatures using timing-safe comparison
    return timingSafeEqual(computedSignature, expectedSignature);
  } catch (error) {
    logger.error('Webhook signature verification error:', error as Error);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.CLOUDFLARE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn('CLOUDFLARE_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    }

    // Read request body as text for signature verification
    const body = await request.text();

    // Verify webhook signature (if secret is configured)
    if (webhookSecret) {
      const signature = request.headers.get('Webhook-Signature');

      if (!(await verifyWebhookSignature(body, signature, webhookSecret))) {
        logger.warn('Invalid webhook signature - rejecting request');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Parse webhook payload
    const webhook = JSON.parse(body);
    const videoId = webhook.uid;

    if (!videoId) {
      logger.error('Webhook missing video UID');
      return new Response(
        JSON.stringify({ error: 'Missing video UID' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    logger.info(`Received Cloudflare webhook for video: ${videoId}, status: ${webhook.status?.state}`);

    // Extract data from webhook
    const status = webhook.status?.state || 'queued';
    const processingProgress = webhook.status?.pctComplete
      ? parseInt(webhook.status.pctComplete)
      : null;
    const duration = webhook.duration || null;
    const thumbnailUrl = webhook.thumbnail || null;
    const playbackHls = webhook.playback?.hls || null;
    const playbackDash = webhook.playback?.dash || null;
    const readyToStream = webhook.readyToStream || false;

    // Update database
    const pool = getPool();
    const result = await pool.query(
      `
      UPDATE course_videos
      SET
        status = $1,
        processing_progress = $2,
        duration = COALESCE($3, duration),
        thumbnail_url = COALESCE($4, thumbnail_url),
        playback_hls_url = COALESCE($5, playback_hls_url),
        playback_dash_url = COALESCE($6, playback_dash_url),
        updated_at = NOW()
      WHERE cloudflare_video_id = $7
      RETURNING id, title
      `,
      [
        status,
        processingProgress,
        duration,
        thumbnailUrl,
        playbackHls,
        playbackDash,
        videoId,
      ]
    );

    if (result.rowCount === 0) {
      logger.warn(`No video record found for Cloudflare ID: ${videoId}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Video not found in database'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const video = result.rows[0];
    logger.info(`Updated video ${video.id} (${video.title}) to status: ${status}`);

    // T191: Send email notification when video is ready
    if (status === 'ready' && readyToStream) {
      try {
        // Get course details for notification
        const courseResult = await pool.query(
          `SELECT
            c.title as course_title,
            c.id as course_id
          FROM courses c
          WHERE c.id = (SELECT course_id FROM course_videos WHERE id = $1)`,
          [video.id]
        );

        if (courseResult.rows.length > 0) {
          const courseData = courseResult.rows[0];
          const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;

          // Send notification to admin (or configure to send to course owner)
          if (adminEmail) {
            const videoUrl = `${process.env.BASE_URL || 'http://localhost:4321'}/courses/${courseData.course_id}`;

            const emailData: VideoReadyData = {
              userName: 'Admin',
              userEmail: adminEmail,
              videoTitle: video.title,
              courseTitle: courseData.course_title,
              videoUrl,
              duration: duration || 0,
            };

            await sendVideoReadyEmail(emailData);
            logger.info(`Sent video ready notification to ${adminEmail}`);
          } else {
            logger.warn('ADMIN_EMAIL not configured - video ready notification not sent');
          }
        }
      } catch (emailError) {
        // Log but don't fail the webhook if email fails
        logger.warn(`Failed to send video ready email for ${video.id}:`, emailError);
      }
    }

    // T191: Send admin notification if video processing failed
    if (status === 'error') {
      const errorCode = webhook.status?.errorReasonCode;
      const errorMessage = webhook.status?.errorReasonText;

      logger.error(
        `Video processing failed: ${videoId}`,
        new Error(`${errorCode}: ${errorMessage}`)
      );

      try {
        // Get admin email and course details
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;

        if (adminEmail) {
          const courseResult = await pool.query(
            `SELECT
              c.title as course_title,
              cv.created_at as uploaded_at
            FROM course_videos cv
            JOIN courses c ON cv.course_id = c.id
            WHERE cv.id = $1`,
            [video.id]
          );

          if (courseResult.rows.length > 0) {
            const courseData = courseResult.rows[0];
            const adminDashboardUrl = `${process.env.BASE_URL || 'http://localhost:4321'}/admin/videos/${video.id}`;

            const emailData: VideoFailedData = {
              adminEmail,
              videoId: video.id,
              videoTitle: video.title,
              courseTitle: courseData.course_title,
              cloudflareVideoId: videoId,
              errorCode,
              errorMessage,
              uploadedAt: courseData.uploaded_at,
              adminDashboardUrl,
            };

            await sendVideoFailedEmail(emailData);
            logger.info(`Sent video failed notification to admin: ${adminEmail}`);
          }
        } else {
          logger.warn('ADMIN_EMAIL not configured - failed video notification not sent');
        }
      } catch (emailError) {
        // Log but don't fail the webhook if email fails
        logger.warn(`Failed to send admin notification for failed video ${video.id}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        videoId: video.id,
        status,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    logger.error('Webhook processing error:', err as Error);

    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
