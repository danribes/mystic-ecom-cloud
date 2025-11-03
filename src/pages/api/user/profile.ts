/**
 * T062: User Profile API Endpoint
 * 
 * Handles user profile updates including:
 * - Name updates
 * - Email updates (with re-verification)
 * - WhatsApp number updates
 * - Password changes (with current password verification)
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateVerificationToken, getTokenExpiration } from '@/lib/auth/verification';
import { sendEmail } from '@/lib/email';

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, email, whatsapp, currentPassword, newPassword } = body;

    // Validate required field for password change
    if (newPassword && !currentPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Current password is required to set a new password' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pool = getPool();
    const userId = session.userId;

    // Get current user data
    const userResult = await pool.query(
      'SELECT email, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found' 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentUser = userResult.rows[0];
    const updates: { [key: string]: any } = {};
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // Handle name update
    if (name !== undefined && name.trim() !== '') {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name.trim());
      paramIndex++;
      updates.name = name.trim();
    }

    // Handle WhatsApp update
    if (whatsapp !== undefined) {
      const cleanWhatsApp = whatsapp.trim() || null;
      updateFields.push(`whatsapp = $${paramIndex}`);
      updateValues.push(cleanWhatsApp);
      paramIndex++;
      updates.whatsapp = cleanWhatsApp;
    }

    // Handle email update (requires re-verification)
    if (email !== undefined && email.trim() !== '' && email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      const newEmail = email.trim().toLowerCase();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid email format' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if email is already taken
      const emailCheckResult = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
        [newEmail, userId]
      );

      if (emailCheckResult.rows.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Email is already in use by another account' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Generate new verification token for new email
      const verificationToken = generateVerificationToken();
      const verificationExpires = getTokenExpiration();

      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(newEmail);
      paramIndex++;

      updateFields.push(`email_verified = $${paramIndex}`);
      updateValues.push(false);
      paramIndex++;

      updateFields.push(`email_verification_token = $${paramIndex}`);
      updateValues.push(verificationToken);
      paramIndex++;

      updateFields.push(`email_verification_expires = $${paramIndex}`);
      updateValues.push(verificationExpires);
      paramIndex++;

      updates.email = newEmail;
      updates.emailVerificationRequired = true;

      // Send verification email to new address
      try {
        const verificationUrl = `${new URL(request.url).origin}/api/auth/verify-email?token=${verificationToken}`;
        
        await sendEmail({
          to: newEmail,
          subject: 'Verify Your New Email Address',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Email Address Change</h1>
              </div>
              <div style="background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #2d3748; font-size: 16px; line-height: 1.6;">Hi ${name || 'there'},</p>
                <p style="color: #2d3748; font-size: 16px; line-height: 1.6;">
                  You recently changed your email address. Please verify your new email by clicking the button below:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 15px 40px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            font-weight: bold;
                            display: inline-block;">
                    Verify New Email
                  </a>
                </div>
                <p style="color: #718096; font-size: 14px; line-height: 1.6;">
                  If you didn't request this change, please contact us immediately.
                </p>
                <p style="color: #718096; font-size: 14px; line-height: 1.6;">
                  This link will expire in 24 hours.
                </p>
              </div>
            </div>
          `,
          text: `
Hi ${name || 'there'},

You recently changed your email address. Please verify your new email by visiting:

${verificationUrl}

If you didn't request this change, please contact us immediately.

This link will expire in 24 hours.
          `.trim(),
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue with update, but notify user
        updates.emailSendError = true;
      }
    }

    // Handle password change
    if (newPassword) {
      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        currentUser.password_hash
      );

      if (!isCurrentPasswordValid) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Current password is incorrect' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Validate new password
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'New password must be at least 8 characters long' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);
      updateFields.push(`password_hash = $${paramIndex}`);
      updateValues.push(newPasswordHash);
      paramIndex++;
      updates.passwordChanged = true;
    }

    // If no updates were provided
    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No updates provided' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);

    // Add user ID as last parameter
    updateValues.push(userId);

    // Build and execute update query
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, whatsapp, email_verified
    `;

    const updateResult = await pool.query(updateQuery, updateValues);
    const updatedUser = updateResult.rows[0];

    // Build response message
    let message = 'Profile updated successfully';
    if (updates.emailVerificationRequired) {
      if (updates.emailSendError) {
        message += '. Email changed but verification email failed to send. Please use the resend option.';
      } else {
        message += '. Please check your new email to verify the change.';
      }
    }
    if (updates.passwordChanged) {
      message += updates.emailVerificationRequired ? ' Password also changed.' : '. Password changed successfully.';
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          whatsapp: updatedUser.whatsapp,
          emailVerified: updatedUser.email_verified,
        },
        updates,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred while updating your profile' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};

// Support PATCH as alias for PUT
export const PATCH = PUT;
