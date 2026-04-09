'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Eye,
  XCircle,
  CheckCircle2,
  Clock,
  Award,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(json => json.data || json);

interface Credential {
  _id: string;
  schemaId: string;
  schemaName: string;
  recipientEmail: string;
  recipientAddress: string;
  issuedAt: string;
  claimed: boolean;
  claimedAt?: string;
  revoked: boolean;
  revokedAt?: string;
}

export default function CredentialsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');
  const [selectedCredential, setSelectedCredential] = React.useState<Credential | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = React.useState(false);
  const [isRevoking, setIsRevoking] = React.useState(false);

  const statusParam = activeTab !== 'all' ? `&status=${activeTab}` : '';
  const { data, error, isLoading, mutate } = useSWR(`/api/issuer/credentials?pageSize=50${statusParam}`, fetcher);

  const credentials: Credential[] = data?.credentials || [];
  const total = data?.total || 0;

  const filteredCredentials = React.useMemo(() => {
    if (!searchQuery) return credentials;
    const query = searchQuery.toLowerCase();
    return credentials.filter(
      c =>
        c.recipientEmail?.toLowerCase().includes(query) ||
        c.schemaName?.toLowerCase().includes(query) ||
        c.recipientAddress?.toLowerCase().includes(query)
    );
  }, [credentials, searchQuery]);

  const getStatusBadge = (credential: Credential) => {
    if (credential.revoked) {
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Revoked
        </Badge>
      );
    }
    if (credential.claimed) {
      return (
        <Badge variant="success">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Claimed
        </Badge>
      );
    }
    return (
      <Badge variant="warning">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const columns: Column<Credential>[] = [
    {
      key: 'credential',
      header: 'Credential',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.schemaName}</p>
            <p className="text-xs text-muted-foreground">ID: {row._id.slice(0, 12)}...</p>
          </div>
        </div>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.recipientEmail || 'No email'}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {row.recipientAddress?.slice(0, 8)}...{row.recipientAddress?.slice(-6)}
          </p>
        </div>
      ),
    },
    {
      key: 'issuedAt',
      header: 'Issued',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.issuedAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => getStatusBadge(row),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[100px]',
      cell: (row) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/issuer/credentials/${row._id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!row.revoked && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCredential(row);
                setShowRevokeDialog(true);
              }}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleRevoke = async () => {
    if (!selectedCredential) return;
    
    setIsRevoking(true);
    try {
      const response = await fetch('/api/issuer/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: selectedCredential._id,
          reason: 'Revoked by issuer',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke credential');
      }

      toast.success('Credential revoked successfully');
      mutate();
      setShowRevokeDialog(false);
      setSelectedCredential(null);
    } catch (error: any) {
      toast.error('Failed to revoke credential', {
        description: error.message,
      });
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issued Credentials"
        description="View and manage all credentials you have issued."
        action={
          <Button asChild>
            <Link href="/issuer/issue">
              <Plus className="mr-2 h-4 w-4" />
              Issue Credential
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by recipient or credential type..."
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="claimed">Claimed</TabsTrigger>
            <TabsTrigger value="unclaimed">Pending</TabsTrigger>
            <TabsTrigger value="revoked">Revoked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Failed to load credentials. Please try again.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCredentials}
          keyExtractor={(row) => row._id}
          onRowClick={(row) => setSelectedCredential(row)}
        />
      )}

      {/* Revoke Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Credential</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this credential? This action will permanently mark the credential as invalid and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedCredential && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="font-medium">{selectedCredential.schemaName}</p>
              <p className="text-sm text-muted-foreground">
                Issued to {selectedCredential.recipientEmail || selectedCredential.recipientAddress}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Credential'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
