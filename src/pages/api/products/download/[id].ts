/**
 * Product Download API Endpoint
 * Provides secure, token-based downloads for purchased digital products
 */

import type { APIRoute } from 'astro';
import {
  getProductById,
  hasUserPurchasedProduct,
  verifyDownloadToken,
  hasExceededDownloadLimit,
  logDownload
} from '@/lib/products';
import { getSessionFromRequest } from '@/lib/auth/session';

export const GET: APIRoute = async ({ params, request, url, cookies }) => {
  const { id: productId } = params;
  
  if (!productId) {
    return new Response(
      JSON.stringify({ error: 'Product ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check authentication
    const session = await getSessionFromRequest(cookies);

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters
    const token = url.searchParams.get('token');
    const orderId = url.searchParams.get('order');
    const expires = url.searchParams.get('expires');

    if (!token || !orderId || !expires) {
      return new Response(
        JSON.stringify({ error: 'Invalid download link' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the product exists
    const product = await getProductById(productId);
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has purchased the product
    const purchaseInfo = await hasUserPurchasedProduct(session.userId, productId);
    if (!purchaseInfo || purchaseInfo.order_id !== orderId) {
      return new Response(
        JSON.stringify({ error: 'You have not purchased this product or access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the download token
    const isValidToken = verifyDownloadToken(
      productId,
      orderId,
      session.userId,
      token,
      parseInt(expires)
    );

    if (!isValidToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired download link' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check download limit
    const limitExceeded = await hasExceededDownloadLimit(session.userId, productId, orderId);
    if (limitExceeded) {
      return new Response(
        JSON.stringify({ 
          error: 'Download limit exceeded', 
          message: `You have reached the maximum number of downloads (${product.download_limit}) for this product.` 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log the download
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    await logDownload(session.userId, productId, orderId, ipAddress, userAgent);

    // In a real application, you would:
    // 1. Stream the file from cloud storage (S3, etc.)
    // 2. Set appropriate Content-Type headers
    // 3. Handle file streaming for large files
    
    // For now, redirect to the file URL
    // In production, this should be a signed URL from your cloud storage
    return Response.redirect(product.file_url, 302);

    // Alternative: Stream file directly (pseudo-code)
    /*
    const fileStream = await fetchFileFromStorage(product.file_url);
    
    return new Response(fileStream, {
      status: 200,
      headers: {
        'Content-Type': getContentType(product.product_type),
        'Content-Disposition': `attachment; filename="${sanitizeFilename(product.title)}.${getExtension(product.product_type)}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
    */

  } catch (error) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your download' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Helper function to get content type by product type
 */
function getContentType(productType: string): string {
  switch (productType) {
    case 'pdf':
      return 'application/pdf';
    case 'audio':
      return 'audio/mpeg';
    case 'video':
      return 'video/mp4';
    case 'ebook':
      return 'application/epub+zip';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Helper function to get file extension
 */
function getExtension(productType: string): string {
  switch (productType) {
    case 'pdf':
      return 'pdf';
    case 'audio':
      return 'mp3';
    case 'video':
      return 'mp4';
    case 'ebook':
      return 'epub';
    default:
      return 'bin';
  }
}

/**
 * Helper function to sanitize filename
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}
