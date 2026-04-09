'use client';

import * as React from 'react';
import useSWR from 'swr';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  Share2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  AlertCircle,
  Copy,
  ExternalLink,
  QrCode,
  X,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(json => json.data || json);

interface ShareToken {
  id: string;
  credentialId: string;
  shareLink: string;
  disclosedFields: string[];
  hiddenFields: string[];
  expiresAt: string | null;
  maxViews: number | null;
  currentViews: number;
  isExpired: boolean;
  isExhausted: boolean;
  createdAt: string;
}

export default function SharedPage() {
  const { data, error, isLoading } = useSWR('/api/recipient/share', fetcher);
  const [qrLink, setQrLink] = React.useState<string | null>(null);

  const shareTokens: ShareToken[] = data?.shareTokens || [];

  const getStatus = (token: ShareToken): 'active' | 'expired' | 'exhausted' => {
    if (token.isExpired) return 'expired';
    if (token.isExhausted) return 'exhausted';
    return 'active';
  };

  const getStatusBadge = (status: 'active' | 'expired' | 'exhausted') => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="muted">
            <Clock className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      case 'exhausted':
        return (
          <Badge variant="muted">
            <XCircle className="mr-1 h-3 w-3" />
            Views Exhausted
          </Badge>
        );
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const columns: Column<ShareToken>[] = [
    {
      key: 'credential',
      header: 'Credential',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium truncate max-w-[150px]">{row.credentialId}</span>
        </div>
      ),
    },
    {
      key: 'disclosed',
      header: 'Disclosed Fields',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.disclosedFields.length} fields
        </span>
      ),
    },
    {
      key: 'sharedAt',
      header: 'Created',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'expires',
      header: 'Expires',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.expiresAt ? formatDate(row.expiresAt) : 'Never'}
        </span>
      ),
    },
    {
      key: 'views',
      header: 'Views',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span>
            {row.currentViews}
            {row.maxViews ? ` / ${row.maxViews}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => getStatusBadge(getStatus(row)),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[140px]',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => copyLink(row.shareLink)}
            title="Copy link"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setQrLink(row.shareLink)}
            title="Show QR code"
          >
            <QrCode className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => window.open(row.shareLink, '_blank')}
            title="Open link"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = shareTokens.filter(t => getStatus(t) === 'active').length;
  const totalViews = shareTokens.reduce((acc, t) => acc + t.currentViews, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shared Credentials"
        description="View credentials you've shared with verifiers."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{shareTokens.length}</p>
              )}
              <p className="text-sm text-muted-foreground">Total Shares</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{activeCount}</p>
              )}
              <p className="text-sm text-muted-foreground">Active Links</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold">{totalViews}</p>
              )}
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Failed to load share tokens. Please try again.
          </CardContent>
        </Card>
      ) : shareTokens.length === 0 ? (
        <EmptyState
          icon={<Share2 className="h-8 w-8" />}
          title="No shared credentials"
          description="You haven't shared any credentials yet. Share credentials with verifiers from your wallet."
        />
      ) : (
        <DataTable
          columns={columns}
          data={shareTokens}
          keyExtractor={(row) => row.id}
        />
      )}

      {/* QR Code Modal */}
      {qrLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setQrLink(null)}
        >
          <div
            className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3"
              onClick={() => setQrLink(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="text-center space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Scan to Verify</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan this QR code to view the shared credential
                </p>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG
                    value={qrLink}
                    size={220}
                    level="H"
                    includeMargin={false}
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    copyLink(qrLink);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => window.open(qrLink, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Button>
              </div>
              <p className="text-xs text-muted-foreground break-all">{qrLink}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
