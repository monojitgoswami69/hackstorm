'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  ArrowLeft,
  Eye,
  EyeOff,
  Building2,
  Calendar,
  Hash,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface VerificationResult {
  valid: boolean;
  credential?: {
    type: string;
    issuer: string;
    issuerName: string;
    issuedAt: string;
    subject: Record<string, string | number | boolean>;
  };
  verification?: {
    merkleProofValid: boolean;
    anchoredOnChain: boolean;
    anchorTxHash: string;
    revoked: boolean;
  };
  shareInfo?: {
    createdAt: string;
    expiresAt: string | null;
    viewCount: number;
    maxViews: number | null;
    disclosedFields: string[];
    hiddenFields: string[];
  };
  reason?: string;
}

export default function PublicVerifyPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyCredential() {
      try {
        const response = await fetch(`/api/verify/${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setResult(data);
        } else {
          setError(data.error || 'Verification failed');
        }
      } catch (err) {
        setError('Failed to verify credential');
      } finally {
        setLoading(false);
      }
    }

    verifyCredential();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            </div>
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldX className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl text-destructive">Verification Failed</CardTitle>
            <CardDescription className="text-base">
              {error || 'Unable to verify this credential'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              This share link may be invalid, expired, or the credential may have been revoked.
              Please contact the credential holder for a new verification link.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = result.valid && 
    result.verification?.merkleProofValid && 
    result.verification?.anchoredOnChain && 
    !result.verification?.revoked;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">CredChain</span>
          </Link>
          <Badge variant={isValid ? 'default' : 'destructive'} className="text-sm">
            {isValid ? 'Verified' : 'Invalid'}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Status Card */}
        <Card className={`mb-6 border-2 ${isValid ? 'border-primary/50 bg-primary/5' : 'border-destructive/50 bg-destructive/5'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isValid ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                {isValid ? (
                  <ShieldCheck className="w-8 h-8 text-primary" />
                ) : (
                  <ShieldX className="w-8 h-8 text-destructive" />
                )}
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isValid ? 'text-primary' : 'text-destructive'}`}>
                  {isValid ? 'Credential Verified' : 'Verification Failed'}
                </h1>
                <p className="text-muted-foreground">
                  {isValid 
                    ? 'This credential has been cryptographically verified on the blockchain.'
                    : result.reason || 'This credential could not be verified.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credential Details */}
        {result.credential && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                Credential Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Credential Type</p>
                  <p className="font-medium truncate">{result.credential.type}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Issuer</p>
                  <p className="font-medium truncate">{result.credential.issuerName}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Issued On</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    {new Date(result.credential.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Subject Fields */}
              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Credential Data</h3>
                <div className="space-y-3">
                  {Object.entries(result.credential.subject).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/50 last:border-0 gap-1 sm:gap-4 min-w-0">
                      <span className="text-muted-foreground capitalize shrink-0 text-sm">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {value === '••••••••' ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <EyeOff className="w-4 h-4 shrink-0" />
                          Hidden
                        </span>
                      ) : (
                        <span className="font-medium flex items-center gap-2 min-w-0">
                          <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{String(value)}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Checks */}
        {result.verification && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                Verification Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <VerificationCheck 
                  label="Merkle Proof Valid" 
                  passed={result.verification.merkleProofValid}
                  description="Credential integrity verified via Merkle tree"
                />
                <VerificationCheck 
                  label="Anchored On-Chain" 
                  passed={result.verification.anchoredOnChain}
                  description="Credential hash exists on Polygon blockchain"
                />
                <VerificationCheck 
                  label="Not Revoked" 
                  passed={!result.verification.revoked}
                  description="Credential has not been revoked by issuer"
                />
              </div>

              {result.verification.anchorTxHash && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Blockchain Transaction</p>
                  <a 
                    href={`https://amoy.polygonscan.com/tx/${result.verification.anchorTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline text-sm font-mono"
                  >
                    <Hash className="w-4 h-4" />
                    {result.verification.anchorTxHash.slice(0, 10)}...{result.verification.anchorTxHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Share Info */}
        {result.shareInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Share Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(result.shareInfo.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {result.shareInfo.expiresAt 
                      ? new Date(result.shareInfo.expiresAt).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Views</p>
                  <p className="font-medium">
                    {result.shareInfo.viewCount}
                    {result.shareInfo.maxViews && ` / ${result.shareInfo.maxViews}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Disclosed</p>
                  <p className="font-medium">{result.shareInfo.disclosedFields.length}</p>
                </div>
              </div>

              {result.shareInfo.hiddenFields.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Partial Disclosure</p>
                    <p className="text-muted-foreground">
                      {result.shareInfo.hiddenFields.length} field(s) are hidden by the credential holder.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Verified by CredChain - Decentralized Identity Platform</p>
          <p className="mt-1">
            Verification performed at {new Date().toLocaleString()}
          </p>
        </div>
      </main>
    </div>
  );
}

function VerificationCheck({ 
  label, 
  passed, 
  description 
}: { 
  label: string; 
  passed: boolean; 
  description: string;
}) {
  return (
    <div className="flex items-start sm:items-center justify-between py-2 gap-2">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        {passed ? (
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5 sm:mt-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm sm:text-base">{label}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Badge variant={passed ? 'default' : 'destructive'} className="text-xs shrink-0">
        {passed ? 'Passed' : 'Failed'}
      </Badge>
    </div>
  );
}
