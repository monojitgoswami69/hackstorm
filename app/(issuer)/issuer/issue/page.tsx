'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, type SelectOption } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Award,
  User,
  FileText,
  Send,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(json => json.data || json);

const steps = [
  { id: 1, title: 'Select Schema', icon: FileText },
  { id: 2, title: 'Recipient Info', icon: User },
  { id: 3, title: 'Credential Data', icon: Award },
  { id: 4, title: 'Review & Issue', icon: Send },
];

const degreeOptions: SelectOption[] = [
  { value: 'Bachelor', label: 'Bachelor' },
  { value: 'Master', label: 'Master' },
  { value: 'Doctoral', label: 'Doctoral' },
  { value: 'Associate', label: 'Associate' },
  { value: 'Professional', label: 'Professional' },
];

export default function IssueSinglePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Fetch schemas from API
  const { data: schemasData } = useSWR('/api/issuer/schemas', fetcher);
  const schemas = schemasData?.schemas || [];
  
  // Form state
  const [selectedSchema, setSelectedSchema] = React.useState('');
  const [recipientEmail, setRecipientEmail] = React.useState('');
  const [recipientName, setRecipientName] = React.useState('');
  const [credentialData, setCredentialData] = React.useState<Record<string, string>>({});

  const schemaOptions: SelectOption[] = schemas.map((s: any) => ({
    value: s.id,
    label: s.name,
    description: s.description,
  }));

  const currentSchema = schemas.find((s: any) => s.id === selectedSchema);
  const fields = currentSchema?.fields || [];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setCredentialData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Add recipient name to credential data
      const finalCredentialData = {
        ...credentialData,
        name: recipientName,
      };

      const response = await fetch('/api/issuer/issue/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId: selectedSchema,
          recipientEmail,
          credentialData: finalCredentialData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errMsg = result.error?.message || result.error || 'Failed to issue credential';
        const details = result.error?.details;
        const detailStr = Array.isArray(details) ? details.join(', ') : (typeof details === 'string' ? details : JSON.stringify(details));
        throw new Error(details ? `${errMsg}: ${detailStr}` : errMsg);
      }
      
      toast.success('Credential issued successfully!', {
        description: `Credential sent to ${recipientEmail}`,
      });
      
      router.push('/issuer/credentials');
    } catch (error: any) {
      console.error('Issue error:', error);
      toast.error('Failed to issue credential', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedSchema;
      case 2:
        return !!recipientEmail && !!recipientName;
      case 3:
        return fields.filter((f: any) => f.required && f.key !== 'name').every((f: any) => !!credentialData[f.key]);
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Issue Credential"
        description="Create and issue a new verifiable credential to a recipient."
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                </div>
                <span
                  className={`hidden sm:block text-sm font-medium ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-4 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Select Schema */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Credential Type</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the type of credential you want to issue.
                </p>
              </div>
              <Select
                value={selectedSchema}
                onValueChange={setSelectedSchema}
                options={schemaOptions}
                placeholder="Select a credential schema"
              />
              {selectedSchema && currentSchema && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm font-medium mb-2">Fields in this schema:</p>
                  <div className="flex flex-wrap gap-2">
                    {fields.map((field: any) => (
                      <Badge key={field.key} variant={field.required ? 'default' : 'muted'}>
                        {field.label}
                        {field.required && '*'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Recipient Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Recipient Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the recipient&apos;s details. Their wallet address will be automatically derived from their email.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName" required>Full Name</Label>
                  <Input
                    id="recipientName"
                    placeholder="Enter recipient's full name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail" required>Email Address</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="Enter recipient's email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The credential will be bound to a wallet address derived from this email.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Credential Data */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Credential Details</h3>
                <p className="text-sm text-muted-foreground">
                  Fill in the credential information. Fields marked with * are required.
                </p>
              </div>
              <div className="space-y-4">
                {fields.filter((f: any) => f.key !== 'name').map((field: any) => (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.key} required={field.required}>
                        {field.label}
                      </Label>
                      {field.hideable && (
                        <Badge variant="muted" className="text-xs">
                          Hideable
                        </Badge>
                      )}
                    </div>
                    {field.type === 'select' ? (
                      <Select
                        value={credentialData[field.key] || ''}
                        onValueChange={(value) => handleFieldChange(field.key, value)}
                        options={(field.options || []).map((opt: string) => ({ value: opt, label: opt }))}
                        placeholder={`Select ${field.label.toLowerCase()}`}
                      />
                    ) : field.type === 'date' ? (
                      <Input
                        id={field.key}
                        type="date"
                        value={credentialData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      />
                    ) : field.type === 'number' ? (
                      <Input
                        id={field.key}
                        type="number"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={credentialData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        min={field.validation?.min}
                        max={field.validation?.max}
                        step={field.validation?.max === 4 ? '0.01' : '1'}
                      />
                    ) : (
                      <Input
                        id={field.key}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={credentialData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Review & Issue</h3>
                <p className="text-sm text-muted-foreground">
                  Review the credential details before issuing.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Credential Type</p>
                  <p className="font-medium">
                    {currentSchema?.name || selectedSchema}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Recipient</p>
                  <p className="font-medium">{recipientName}</p>
                  <p className="text-sm text-muted-foreground">{recipientEmail}</p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-3">Credential Data</p>
                  <div className="space-y-2">
                    {fields.filter((f: any) => f.key !== 'name').map((field: any) => (
                      <div key={field.key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{field.label}</span>
                        <span className="font-medium">
                          {credentialData[field.key] || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary mb-1">What happens next?</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Credential will be signed with your issuer key</li>
                    <li>2. Merkle root will be anchored on Polygon</li>
                    <li>3. Credential will be stored on IPFS</li>
                    <li>4. Recipient will receive a notification</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? () => router.back() : handleBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Issuing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Issue Credential
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
