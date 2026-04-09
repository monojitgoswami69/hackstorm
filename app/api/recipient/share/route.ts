import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { 
  successResponse, 
  badRequest, 
  notFound,
  forbidden,
  handleError 
} from '@/lib/response';
import { 
  getCredentialsCollection, 
  getShareTokensCollection,
  generateId,
} from '@/lib/db';
import { getSchema, getHideableFields, getNonHideableFields } from '@/lib/schemas';
import type { CreateShareRequest, DBShareToken } from '@/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://credvault-one.vercel.app';

/**
 * POST /api/recipient/share
 * Create a share token for a credential
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { credentialId, disclosedFields, expiresAt, expiresInDays, maxViews } = body as CreateShareRequest & { expiresInDays?: number };

    if (!credentialId) {
      return badRequest('Credential ID is required');
    }
    if (!disclosedFields || !Array.isArray(disclosedFields)) {
      return badRequest('Disclosed fields must be an array');
    }

    // Get credential
    const credentialsCollection = await getCredentialsCollection();
    const credential = await credentialsCollection.findOne({ _id: credentialId });

    if (!credential) {
      return notFound('Credential');
    }

    // Verify ownership (by wallet address or email)
    const isOwner = 
      credential.recipientAddress?.toLowerCase() === session.address.toLowerCase() ||
      (session.email && credential.recipientEmail?.toLowerCase() === session.email.toLowerCase());
    if (!isOwner) {
      return forbidden('This credential does not belong to you');
    }

    // Check if revoked
    if (credential.revoked) {
      return badRequest('Cannot share a revoked credential');
    }

    // Get schema and validate fields
    const schema = getSchema(credential.schemaId);
    if (!schema) {
      return badRequest('Invalid credential schema');
    }

    const hideableFields = getHideableFields(credential.schemaId);
    const nonHideableFields = getNonHideableFields(credential.schemaId);

    // Disclosed fields must include all non-hideable fields
    const allFields = schema.fields.map(f => f.key);
    const invalidFields = disclosedFields.filter(f => !allFields.includes(f));
    if (invalidFields.length > 0) {
      return badRequest(`Invalid fields: ${invalidFields.join(', ')}`);
    }

    // Calculate hidden fields (hideable fields that are not disclosed)
    const hiddenFields = hideableFields.filter(f => !disclosedFields.includes(f));

    // Ensure non-hideable fields are always included
    const finalDisclosedFields = [...new Set([...nonHideableFields, ...disclosedFields])];

    // Create share token
    const shareToken = generateId('share');
    const shareTokensCollection = await getShareTokensCollection();

    // Calculate expiry date
    let expiryDate: Date | null = null;
    if (expiresAt) {
      expiryDate = new Date(expiresAt);
    } else if (expiresInDays && expiresInDays > 0) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiresInDays);
    }

    const dbShareToken: DBShareToken = {
      _id: shareToken,
      credentialId,
      createdBy: session.address.toLowerCase(),
      disclosedFields: finalDisclosedFields,
      hiddenFields,
      expiresAt: expiryDate,
      maxViews: maxViews || null,
      currentViews: 0,
      createdAt: new Date(),
    };

    await shareTokensCollection.insertOne(dbShareToken);

    const shareLink = `${APP_URL}/verify/${shareToken}`;

    return successResponse({
      shareToken,
      shareLink,
      expiresAt: dbShareToken.expiresAt?.toISOString() || null,
      maxViews: dbShareToken.maxViews,
      disclosedFields: finalDisclosedFields,
      hiddenFields,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/recipient/share
 * Get all share tokens created by the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const credentialId = searchParams.get('credentialId');

    // Build filter
    const filter: any = { createdBy: session.address.toLowerCase() };
    if (credentialId) {
      filter.credentialId = credentialId;
    }

    const shareTokensCollection = await getShareTokensCollection();
    const shareTokens = await shareTokensCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedTokens = shareTokens.map(token => ({
      id: token._id,
      credentialId: token.credentialId,
      shareLink: `${APP_URL}/verify/${token._id}`,
      disclosedFields: token.disclosedFields,
      hiddenFields: token.hiddenFields,
      expiresAt: token.expiresAt?.toISOString() || null,
      maxViews: token.maxViews,
      currentViews: token.currentViews,
      isExpired: token.expiresAt ? new Date() > token.expiresAt : false,
      isExhausted: token.maxViews ? token.currentViews >= token.maxViews : false,
      createdAt: token.createdAt,
    }));

    return successResponse({ shareTokens: enrichedTokens });
  } catch (error) {
    return handleError(error);
  }
}
