import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { nanoid } from 'nanoid';

// Configure ed25519 to use sha512 from @noble/hashes
(ed.etc as any).sha512Sync = (...m: Uint8Array[]) => {
  const h = sha512.create();
  m.forEach(msg => h.update(msg));
  return h.digest();
};
import type { 
  VerifiableCredential, 
  CredentialProof, 
  CredentialSchema,
  MerkleProof 
} from '@/types';
import { hashCredential } from './merkle';

// ===========================================
// CONFIGURATION
// ===========================================

const ISSUER_DID = process.env.ISSUER_DID || 'did:web:localhost';
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY || '';

// ===========================================
// CREDENTIAL BUILDING
// ===========================================

/**
 * Build an unsigned verifiable credential
 */
export function buildCredential(
  schema: CredentialSchema,
  subjectData: Record<string, any>,
  recipientDID: string,
  options: {
    expirationDate?: string;
    issuanceDate?: string;
  } = {}
): Omit<VerifiableCredential, 'proof'> {
  const credentialId = `urn:uuid:${nanoid(32)}`;
  const issuanceDate = options.issuanceDate || new Date().toISOString();

  const credential: Omit<VerifiableCredential, 'proof'> = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: credentialId,
    type: ['VerifiableCredential', schema.id.replace(/-/g, '')],
    issuer: ISSUER_DID,
    issuanceDate,
    credentialSubject: {
      id: recipientDID,
      ...subjectData,
    },
  };

  if (options.expirationDate) {
    credential.expirationDate = options.expirationDate;
  }

  return credential;
}

/**
 * Add proof to a credential (merkle proof + signature)
 */
export async function signCredential(
  credential: Omit<VerifiableCredential, 'proof'>,
  merkleProof: MerkleProof,
  anchorData: {
    txHash: string;
    chain: string;
    contract: string;
  }
): Promise<VerifiableCredential> {
  // Create the data to sign (credential hash + merkle root)
  const credentialHash = hashCredential(credential);
  const dataToSign = `${credentialHash}:${merkleProof.root}`;
  
  // Sign with Ed25519
  const signature = await signData(dataToSign);

  const proof: CredentialProof = {
    type: 'MerkleProof2019',
    created: new Date().toISOString(),
    verificationMethod: `${ISSUER_DID}#key-1`,
    proofPurpose: 'assertionMethod',
    merkleRoot: merkleProof.root,
    leafIndex: merkleProof.leafIndex,
    merkleProof: merkleProof.proof,
    proofDirections: merkleProof.directions,
    anchorTransactionHash: anchorData.txHash,
    anchorChain: anchorData.chain,
    anchorContract: anchorData.contract,
    signatureValue: signature,
  };

  return {
    ...credential,
    proof,
  };
}

/**
 * Sign data with issuer's Ed25519 private key
 */
async function signData(data: string): Promise<string> {
  if (!ISSUER_PRIVATE_KEY) {
    throw new Error('ISSUER_PRIVATE_KEY not configured');
  }

  const privateKey = hexToBytes(ISSUER_PRIVATE_KEY);
  const message = new TextEncoder().encode(data);
  const signature = await ed.signAsync(message, privateKey);
  
  return bytesToHex(signature);
}

/**
 * Validate credential data against schema
 */
export function validateCredentialData(
  schema: CredentialSchema,
  data: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of schema.fields) {
    const value = data[field.key];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${field.label}" is required`);
      continue;
    }

    // Skip validation for optional empty fields
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type validation
    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field "${field.label}" must be a string`);
        } else if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors.push(`Field "${field.label}" has invalid format`);
          }
        }
        break;

      case 'number': {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numValue !== 'number' || isNaN(numValue)) {
          errors.push(`Field "${field.label}" must be a number`);
        } else {
          // Store coerced value back
          data[field.key] = numValue;
          if (field.validation?.min !== undefined && numValue < field.validation.min) {
            errors.push(`Field "${field.label}" must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && numValue > field.validation.max) {
            errors.push(`Field "${field.label}" must be at most ${field.validation.max}`);
          }
        }
        break;
      }

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`Field "${field.label}" must be a valid date`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field "${field.label}" must be true or false`);
        }
        break;

      case 'select':
        if (field.options && !field.options.includes(value)) {
          errors.push(`Field "${field.label}" must be one of: ${field.options.join(', ')}`);
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create DID from wallet address (did:pkh format)
 */
export function createDIDFromAddress(address: string, chainId: number = 137): string {
  const normalizedAddress = address.toLowerCase();
  return `did:pkh:eip155:${chainId}:${normalizedAddress}`;
}

/**
 * Extract wallet address from did:pkh DID
 */
export function extractAddressFromDID(did: string): string | null {
  const match = did.match(/did:pkh:eip155:\d+:(0x[a-fA-F0-9]{40})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Generate unique credential ID
 */
export function generateCredentialId(): string {
  return `cred_${nanoid(16)}`;
}

/**
 * Generate unique batch ID
 */
export function generateBatchId(): string {
  return `batch_${nanoid(12)}`;
}
