import { requireIssuer } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/response';
import { getAllSchemas } from '@/lib/schemas';

/**
 * GET /api/issuer/schemas
 * Get all available credential schemas
 */
export async function GET() {
  try {
    await requireIssuer();
    
    const schemas = getAllSchemas();

    return successResponse({
      schemas: schemas.map(schema => ({
        id: schema.id,
        name: schema.name,
        description: schema.description,
        version: schema.version,
        fields: schema.fields,
        fieldCount: schema.fields.length,
        hideableFieldCount: schema.fields.filter(f => f.hideable).length,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
