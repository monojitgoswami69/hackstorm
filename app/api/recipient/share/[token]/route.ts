import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { 
  successResponse, 
  notFound,
  forbidden,
  handleError 
} from '@/lib/response';
import { getShareTokensCollection } from '@/lib/db';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * DELETE /api/recipient/share/[token]
 * Revoke/delete a share token
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { token } = await params;

    const shareTokensCollection = await getShareTokensCollection();
    const shareToken = await shareTokensCollection.findOne({ _id: token });

    if (!shareToken) {
      return notFound('Share token');
    }

    // Verify ownership
    if (shareToken.createdBy.toLowerCase() !== session.address.toLowerCase()) {
      return forbidden('This share token does not belong to you');
    }

    // Delete the token
    await shareTokensCollection.deleteOne({ _id: token });

    return successResponse({
      success: true,
      message: 'Share token revoked successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/recipient/share/[token]
 * Get share token details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { token } = await params;

    const shareTokensCollection = await getShareTokensCollection();
    const shareToken = await shareTokensCollection.findOne({ _id: token });

    if (!shareToken) {
      return notFound('Share token');
    }

    // Verify ownership
    if (shareToken.createdBy.toLowerCase() !== session.address.toLowerCase()) {
      return forbidden('This share token does not belong to you');
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://credvault-one.vercel.app';

    return successResponse({
      id: shareToken._id,
      credentialId: shareToken.credentialId,
      shareLink: `${APP_URL}/verify/${shareToken._id}`,
      disclosedFields: shareToken.disclosedFields,
      hiddenFields: shareToken.hiddenFields,
      expiresAt: shareToken.expiresAt?.toISOString() || null,
      maxViews: shareToken.maxViews,
      currentViews: shareToken.currentViews,
      isExpired: shareToken.expiresAt ? new Date() > shareToken.expiresAt : false,
      isExhausted: shareToken.maxViews ? shareToken.currentViews >= shareToken.maxViews : false,
      createdAt: shareToken.createdAt,
    });
  } catch (error) {
    return handleError(error);
  }
}
