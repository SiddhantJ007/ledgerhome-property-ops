import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionLink } from '@/components/action-link';
import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatRepairStatusLabel, formatStatusLabel, rentStatusTone } from '@/components/status-badge';
import { TenantScoreCard } from '@/components/tenant-score-card';
import {
  contactRequestsBackendEnabled,
  fetchContactRequestsFromBackend,
  replyToContactRequestInBackend,
} from '@/lib/contact-requests-backend';
import {
  createNotificationInBackend,
  notificationsBackendEnabled,
} from '@/lib/notifications-backend';
import { DEMO_MODE } from '@/lib/demo-mode';
import {
  fetchLeaseContextFromBackend,
  leasesDocumentsBackendEnabled,
  uploadLeaseDocumentToBackend,
} from '@/lib/leases-documents-backend';
import { ensureTenantOperationalSetupInBackend } from '@/lib/master-data-backend';
import { fetchLedgerRowsFromBackend, fetchPaymentHistoryFromBackend, getRentReminderCopy } from '@/lib/payments-backend';
import {
  fetchTenantUserLinkFromBackend,
  linkTenantUserByEmailInBackend,
  unlinkTenantUserInBackend,
  userLinkingBackendEnabled,
} from '@/lib/user-linking-backend';
import { hasText } from '@/lib/form-utils';
import { formatCurrency, formatShortDate } from '@/lib/prototype-ledger';
import { getLeaseLengthLabel } from '@/lib/tenant-demo';
import { calculateTenantScore } from '@/lib/tenant-score';
import { commonStyles, palette } from '@/lib/theme';
import { useAuth } from '@/providers/auth-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { useNotifications } from '@/providers/notifications-provider';
import { usePrototype } from '@/providers/prototype-provider';
import type { ContactRequest, Document, Lease } from '@/types/domain';
import type { TenantUserLink } from '@/lib/user-linking-backend';

export default function TenantDetailScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data, masterDataMessage, deactivateTenant, removeTenantRecord } = useMasterData();
  const { refreshNotifications } = useNotifications();
  const { ledgerRows, notifyTenant, createDocument, replyToTenantInquiry } = usePrototype();
  const router = useRouter();
  const tenant = data.tenants.find((item) => item.id === tenantId) ?? data.tenants[0];
  const unit = data.units.find((item) => item.id === tenant.unitId);
  const [backendLedgerRows, setBackendLedgerRows] = useState<typeof ledgerRows | null>(null);
  const [backendPayments, setBackendPayments] = useState(data.rentPayments.filter((item) => item.tenantId === tenant.id));
  const ledger = (DEMO_MODE ? ledgerRows : backendLedgerRows ?? []).find((item) => item.unitId === tenant.unitId);
  const property = data.properties.find((item) => item.id === unit?.propertyId);
  const fallbackLease = data.leases.find((item) => item.tenantId === tenant.id);
  const fallbackDocuments = data.documents.filter((item) => item.tenantId === tenant.id);
  const profile = data.tenantProfiles.find((item) => item.tenantId === tenant.id);
  const maintenance = data.maintenanceRequests.filter((item) => item.tenantId === tenant.id);
  const concerns = data.contactRequests.filter((item) => item.tenantId === tenant.id);
  const payments = DEMO_MODE ? data.rentPayments.filter((item) => item.tenantId === tenant.id) : backendPayments;
  const charges = DEMO_MODE
    ? data.rentCharges.filter((item) => item.tenantId === tenant.id)
    : ledger
      ? [{ status: ledger.status }]
      : [];
  const notifications = data.notifications.filter((item) => item.tenantId === tenant.id);
  const missedPayments = charges.filter((item) => item.status === 'overdue').length;
  const regularPayer = charges.every((item) => item.status !== 'overdue');
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [backendLease, setBackendLease] = useState<Lease | null>(null);
  const [backendDocuments, setBackendDocuments] = useState<Document[] | null>(null);
  const [backendInquiries, setBackendInquiries] = useState<ContactRequest[] | null>(null);
  const [documentsMessage, setDocumentsMessage] = useState<string | null>(null);
  const [inquiriesMessage, setInquiriesMessage] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<Document['category']>('lease');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [tenantUserLink, setTenantUserLink] = useState<TenantUserLink | null>(null);
  const [tenantUserEmailDraft, setTenantUserEmailDraft] = useState(tenant.email);
  const [tenantUserLinkMessage, setTenantUserLinkMessage] = useState<string | null>(null);
  const [tenantRemovalMessage, setTenantRemovalMessage] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isDeactivatingTenant, setIsDeactivatingTenant] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemovingTenant, setIsRemovingTenant] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isLinkingTenantUser, setIsLinkingTenantUser] = useState(false);
  const [isUnlinkingTenantUser, setIsUnlinkingTenantUser] = useState(false);
  const [isSendingReplyId, setIsSendingReplyId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadBackendRentContext() {
      if (DEMO_MODE || isAuthLoading || !isAuthenticated) {
        return;
      }

      if (tenant.status === 'active' && property && unit) {
        await ensureTenantOperationalSetupInBackend({
          tenantId: tenant.id,
          propertyId: property.id,
          unitId: unit.id,
          moveInDate: tenant.moveInDate || null,
          leaseEndDate: tenant.leaseEndDate || null,
          monthlyRent: unit.monthlyRent,
        });
      }

      const [ledgerResult, paymentsResult] = await Promise.all([
        fetchLedgerRowsFromBackend(),
        fetchPaymentHistoryFromBackend({ tenantId: tenant.id }),
      ]);

      if (!isActive) {
        return;
      }

      if (!ledgerResult.error) {
        setBackendLedgerRows(ledgerResult.data);
      }

      if (!paymentsResult.error) {
        setBackendPayments(paymentsResult.data);
      }
    }

    void loadBackendRentContext();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAuthLoading, property, tenant.id, tenant.leaseEndDate, tenant.moveInDate, tenant.status, unit]);

  useEffect(() => {
    let isActive = true;

    async function loadLeaseContext() {
      if (!leasesDocumentsBackendEnabled()) {
        return;
      }

      const result = await fetchLeaseContextFromBackend({
        tenantId: tenant.id,
        unitId: unit?.id,
      });

      if (!isActive) {
        return;
      }

      if (result.error) {
        setBackendLease(null);
        setBackendDocuments([]);
        setDocumentsMessage(result.error);
        return;
      }

      if (result.lease) {
        setBackendLease(result.lease);
      }

      if (result.documents.length > 0) {
        setBackendDocuments(result.documents);
      }

      if (result.lease || result.documents.length > 0) {
        setDocumentsMessage(null);
      } else {
        setDocumentsMessage('No backend lease documents found yet.');
      }
    }

    void loadLeaseContext();

    return () => {
      isActive = false;
    };
  }, [tenant.id, unit?.id]);

  useEffect(() => {
    let isActive = true;

    async function loadInquiries() {
      if (!contactRequestsBackendEnabled()) {
        return;
      }

      const result = await fetchContactRequestsFromBackend({ tenantId: tenant.id });

      if (!isActive) {
        return;
      }

      if (result.error) {
        setBackendInquiries([]);
        setInquiriesMessage(result.error);
        return;
      }

      setBackendInquiries(result.data);
      setInquiriesMessage(
        result.data.length > 0
          ? null
          : 'No backend messages for this resident yet.'
      );
    }

    void loadInquiries();

    return () => {
      isActive = false;
    };
  }, [tenant.id]);

  useEffect(() => {
    let isActive = true;

    async function loadTenantUserLink() {
      if (!userLinkingBackendEnabled()) {
        return;
      }

      const result = await fetchTenantUserLinkFromBackend(tenant.id);

      if (!isActive) {
        return;
      }

      if (result.error) {
        setTenantUserLink(null);
        setTenantUserLinkMessage(result.error);
        return;
      }

      setTenantUserLink(result.link);
      setTenantUserLinkMessage(
        result.link
          ? 'This tenant record is linked to a live login.'
          : 'No login is linked yet. Create the auth user first, then link that email from this panel.'
      );
    }

    void loadTenantUserLink();

    return () => {
      isActive = false;
    };
  }, [tenant.id]);

  const lease = DEMO_MODE ? fallbackLease : backendLease;
  const documents = DEMO_MODE ? fallbackDocuments : backendDocuments ?? [];
  const inquiries = DEMO_MODE ? concerns : backendInquiries ?? [];
  const scoreRentRows = DEMO_MODE
    ? data.rentCharges.filter((item) => item.tenantId === tenant.id)
    : (backendLedgerRows ?? []).filter((item) => item.tenantId === tenant.id || item.unitId === tenant.unitId);
  const tenantScore = calculateTenantScore({
    tenantStatus: tenant.status,
    rentRows: scoreRentRows,
    repairItems: maintenance,
    messages: inquiries,
  });

  function documentCategoryLabel(category: Document['category']) {
    switch (category) {
      case 'maintenance':
        return 'Repair request';
      case 'move_in':
        return 'Other';
      case 'statement':
        return 'Statement';
      default:
        return formatStatusLabel(category);
    }
  }

  const handleDocumentUpload = async () => {
    if (!property) {
      setDocumentsMessage('Property context is missing for this tenant.');
      return;
    }

    setIsUploadingDocument(true);

    if (!leasesDocumentsBackendEnabled()) {
      if (!DEMO_MODE) {
        setDocumentsMessage('Document upload is not available right now.');
        setIsUploadingDocument(false);
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/pdf', 'image/*'],
      });

      if (result.canceled || !result.assets?.length) {
        setIsUploadingDocument(false);
        return;
      }

      const asset = result.assets[0];
      createDocument(tenant.id, property.id, unit?.id ?? null, lease?.id ?? null, uploadCategory, asset.name, {
        fileUrl: asset.uri,
        mimeType: asset.mimeType ?? null,
        sizeBytes: asset.size ?? null,
        uploadedBy: 'admin',
      });
      setBackendDocuments(null);
      setDocumentsMessage(`${asset.name} added to this tenant record.`);
      setIsUploadingDocument(false);
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['application/pdf', 'image/*'],
    });

    if (result.canceled || !result.assets?.length) {
      setIsUploadingDocument(false);
      return;
    }

    const asset = result.assets[0];
    const upload = await uploadLeaseDocumentToBackend({
      tenantId: tenant.id,
      propertyId: property.id,
      unitId: unit?.id ?? null,
      leaseId: lease?.id ?? null,
      category: uploadCategory,
      title: asset.name,
      asset,
      uploadedBy: 'admin',
    });

    if (upload.error) {
      if (!DEMO_MODE) {
        setDocumentsMessage(upload.error);
        setIsUploadingDocument(false);
        return;
      }

      createDocument(tenant.id, property.id, unit?.id ?? null, lease?.id ?? null, uploadCategory, asset.name, {
        fileUrl: asset.uri,
        mimeType: asset.mimeType ?? null,
        sizeBytes: asset.size ?? null,
        uploadedBy: 'admin',
      });
      setBackendDocuments(null);
      setDocumentsMessage(`${asset.name} added locally; live upload is unavailable right now.`);
      setIsUploadingDocument(false);
      return;
    }

    const refreshed = await fetchLeaseContextFromBackend({
      tenantId: tenant.id,
      unitId: unit?.id,
    });

    if (!refreshed.error) {
      setBackendLease(refreshed.lease);
      setBackendDocuments(refreshed.documents);
      setDocumentsMessage(`${asset.name} uploaded and saved to this tenant record.`);
    } else {
      setDocumentsMessage(`${asset.name} uploaded and saved. Reopen this screen if the refreshed document list does not appear yet.`);
    }

    setIsUploadingDocument(false);
  };

  const handleReply = async (request: ContactRequest) => {
    const reply = replyDrafts[request.id]?.trim() ?? '';

    if (!hasText(reply)) {
      setInquiriesMessage('Reply text is required before sending an admin response.');
      return;
    }

    setIsSendingReplyId(request.id);

    if (contactRequestsBackendEnabled()) {
      const result = await replyToContactRequestInBackend({
        requestId: request.id,
        reply,
      });

      if (!result.error && result.request) {
        setBackendInquiries((current) =>
          (current ?? inquiries).map((item) => (item.id === request.id ? result.request! : item))
        );
        setReplyDrafts((current) => ({ ...current, [request.id]: '' }));
        setInquiriesMessage('Admin reply saved.');
        await refreshNotifications();
        setIsSendingReplyId(null);
        return;
      }

      setInquiriesMessage(result.error ?? 'Unable to save the admin reply right now.');
      setIsSendingReplyId(null);
      return;
    }

    if (!DEMO_MODE) {
      setInquiriesMessage('Replies are not available right now.');
      setIsSendingReplyId(null);
      return;
    }

    replyToTenantInquiry(request.id, reply);
    setBackendInquiries(null);
    setReplyDrafts((current) => ({ ...current, [request.id]: '' }));
    setInquiriesMessage('Admin reply saved and visible to the tenant.');
    setIsSendingReplyId(null);
  };

  return (
    <ScreenContainer
      eyebrow="Tenant Record"
      title={tenant.fullName}
      subtitle={`${formatStatusLabel(tenant.status)} • ${tenant.phone}`}>
      {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
      <SectionCard title="Lease overview">
        <View style={styles.summaryRow}>
          <View style={styles.copy}>
            <Text style={commonStyles.bodyText}>{property?.name ?? 'Unknown property'}</Text>
            <Text style={commonStyles.helperText}>{unit?.label ?? 'Unknown unit'} • Move-in {formatShortDate(tenant.moveInDate)}</Text>
          </View>
          {ledger ? <StatusBadge label={formatStatusLabel(ledger.status)} tone={rentStatusTone(ledger.status)} /> : null}
        </View>
        <Text style={commonStyles.helperText}>Lease end: {formatShortDate(tenant.leaseEndDate)}</Text>
        <Text style={commonStyles.helperText}>Amount owed: {formatCurrency(ledger?.pendingAmount ?? 0)}</Text>
        <Text style={commonStyles.helperText}>Deposit: {formatCurrency(lease?.securityDeposit ?? 0)}</Text>
      </SectionCard>

      <SectionCard title="Resident score" subtitle="Derived from rent, repair, and message activity on this tenant record">
        <TenantScoreCard
          score={tenantScore}
          title="Resident score"
          subtitle="Tap a factor to see why it contributes to the score."
        />
      </SectionCard>

      <SectionCard title="Messages">
        {inquiriesMessage ? <Text style={commonStyles.helperText}>{inquiriesMessage}</Text> : null}
        {inquiries.length > 0 ? (
          <View style={styles.inquiryList}>
            {inquiries.map((inquiry) => (
              <View key={inquiry.id} style={styles.inquiryCard}>
                <View style={styles.inquiryHeader}>
                  <View style={styles.copy}>
                    <Text style={styles.documentTitle}>{inquiry.subject}</Text>
                    <Text style={commonStyles.helperText}>
                      {inquiry.category === 'maintenance' ? 'Repair' : formatStatusLabel(inquiry.category)} • {formatShortDate(inquiry.sentAt)}
                    </Text>
                  </View>
                  <StatusBadge label={formatStatusLabel(inquiry.status)} tone={inquiry.status === 'responded' ? 'success' : 'warning'} />
                </View>
                <Text style={commonStyles.helperText}>{inquiry.message}</Text>
                {inquiry.adminReply ? (
                  <View style={styles.replyCard}>
                    <Text style={styles.replyLabel}>Admin reply</Text>
                    <Text style={commonStyles.helperText}>{inquiry.adminReply}</Text>
                    <Text style={commonStyles.helperText}>Updated {formatShortDate(inquiry.respondedAt)}</Text>
                  </View>
                ) : (
                  <View style={styles.replyComposer}>
                    <Text style={styles.fieldLabel}>Admin reply</Text>
                    <TextInput
                      onChangeText={(value) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [inquiry.id]: value,
                        }))
                      }
                      placeholder="Share the next step for this resident."
                      placeholderTextColor={palette.mutedText}
                      style={styles.replyInput}
                      value={replyDrafts[inquiry.id] ?? ''}
                    />
                    <View style={styles.documentActionRow}>
                      <PrimaryButton
                        disabled={isSendingReplyId === inquiry.id}
                        label={isSendingReplyId === inquiry.id ? 'Sending...' : 'Send reply'}
                        loading={isSendingReplyId === inquiry.id}
                        onPress={() => void handleReply(inquiry)}
                        variant="secondary"
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={commonStyles.helperText}>No resident messages have been logged yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Lease documents">
        {documentsMessage ? <Text style={commonStyles.helperText}>{documentsMessage}</Text> : null}
        <Text style={commonStyles.helperText}>
          Lease term: {formatShortDate(lease?.startDate ?? tenant.moveInDate)} to {formatShortDate(lease?.endDate ?? tenant.leaseEndDate)}
        </Text>
        <Text style={commonStyles.helperText}>Renewal review: {formatShortDate(lease?.renewalDate ?? null)}</Text>
        <Text style={commonStyles.helperText}>Uploaded files are saved to the tenant record and remain available in Lease & Documents.</Text>
        <Text style={styles.fieldLabel}>Document type</Text>
        <OptionPillGroup
          onChange={(value) => setUploadCategory(value as Document['category'])}
          options={[
            { label: 'Lease', value: 'lease' },
            { label: 'Policy', value: 'policy' },
            { label: 'Repair request', value: 'maintenance' },
            { label: 'Other', value: 'move_in' },
          ]}
          selectedValue={uploadCategory}
        />
        <View style={styles.documentActionRow}>
          <PrimaryButton
            disabled={isUploadingDocument}
            label={isUploadingDocument ? 'Uploading...' : 'Upload document'}
            loading={isUploadingDocument}
            onPress={() => void handleDocumentUpload()}
            variant="secondary"
          />
        </View>
        <View style={styles.documentList}>
          {documents.map((document) => (
            <Pressable
              key={document.id}
              onPress={() => {
                if (document.fileUrl) {
                  void Linking.openURL(document.fileUrl);
                }
              }}
              style={styles.documentCard}>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <Text style={commonStyles.helperText}>
                {documentCategoryLabel(document.category)} • {document.fileUrl ? 'Saved file' : formatStatusLabel(document.status)}
              </Text>
              <Text style={commonStyles.helperText}>Saved {formatShortDate(document.uploadedAt)}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Resident record">
        <View style={styles.metricsRow}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{getLeaseLengthLabel(lease?.startDate ?? tenant.moveInDate)}</Text>
            <Text style={styles.metricLabel}>Length of stay</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{missedPayments}</Text>
            <Text style={styles.metricLabel}>Missed payments</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{maintenance.length}</Text>
            <Text style={styles.metricLabel}>Repair items</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{inquiries.length}</Text>
            <Text style={styles.metricLabel}>Messages</Text>
          </View>
        </View>
        <Text style={commonStyles.helperText}>
          {charges.length === 0
            ? 'No rent charge is posted for this resident yet.'
            : regularPayer
              ? 'Regular payer with no overdue charges on record.'
              : 'Collections follow-up recommended based on overdue activity.'}
        </Text>
        {profile?.notes ? <Text style={commonStyles.helperText}>{profile.notes}</Text> : null}
      </SectionCard>

      <SectionCard title="Login access">
        {tenantUserLinkMessage ? <Text style={commonStyles.helperText}>{tenantUserLinkMessage}</Text> : null}
        <View style={styles.loginAccessCard}>
          <Text style={styles.fieldLabel}>Linked auth email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setTenantUserEmailDraft}
            placeholder="resident@example.com"
            placeholderTextColor={palette.mutedText}
            style={styles.inlineInput}
            value={tenantUserEmailDraft}
          />
          {tenantUserLink ? (
            <>
              <Text style={commonStyles.helperText}>
                Currently linked to {tenantUserLink.email ?? 'an authenticated user'}.
              </Text>
              <Text style={commonStyles.helperText}>Display name: {tenantUserLink.displayName || 'Not set'}</Text>
              <Text style={commonStyles.helperText}>
                Unlinking removes app access only. It does not delete the linked auth user record.
              </Text>
            </>
          ) : (
            <Text style={commonStyles.helperText}>
              Create the auth user first, then link that email here so this tenant can sign in and see only their own data.
            </Text>
          )}

          <View style={styles.loginActionRow}>
            <PrimaryButton
              disabled={isLinkingTenantUser || isUnlinkingTenantUser}
              label={
                isLinkingTenantUser
                  ? 'Saving...'
                  : tenantUserLink
                    ? 'Re-link login'
                    : 'Link existing auth user'
              }
              loading={isLinkingTenantUser}
              onPress={async () => {
                if (!hasText(tenantUserEmailDraft)) {
                  setTenantUserLinkMessage('An auth email is required before linking.');
                  return;
                }

                if (!userLinkingBackendEnabled()) {
                  setTenantUserLinkMessage('Login linking is not available right now.');
                  return;
                }

                setIsLinkingTenantUser(true);
                const result = await linkTenantUserByEmailInBackend({
                  tenantId: tenant.id,
                  email: tenantUserEmailDraft,
                });
                setIsLinkingTenantUser(false);

                if (result.error || !result.link) {
                  setTenantUserLinkMessage(result.error ?? 'Unable to link this tenant to the auth user.');
                  return;
                }

                setTenantUserLink(result.link);
                setTenantUserEmailDraft(result.link.email ?? tenantUserEmailDraft);
                setTenantUserLinkMessage('Tenant login linked.');
              }}
              variant="secondary"
            />
            {tenantUserLink ? (
              <PrimaryButton
                disabled={isLinkingTenantUser || isUnlinkingTenantUser}
                label={isUnlinkingTenantUser ? 'Removing...' : 'Unlink app access'}
                loading={isUnlinkingTenantUser}
                onPress={async () => {
                  setIsUnlinkingTenantUser(true);
                  const result = await unlinkTenantUserInBackend(tenant.id);
                  setIsUnlinkingTenantUser(false);

                  if (result.error) {
                    setTenantUserLinkMessage(result.error);
                    return;
                  }

                  setTenantUserLink(null);
                  setTenantUserLinkMessage('Tenant app access removed. The linked auth user still exists and can be re-linked later.');
                }}
                variant="secondary"
              />
            ) : null}
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Latest resident activity">
        <Text style={commonStyles.helperText}>
          Last payment: {payments[0] ? `${formatCurrency(payments[0].amount)} on ${formatShortDate(payments[0].paymentDate)}` : 'No payment posted'}
        </Text>
        <Text style={commonStyles.helperText}>
          Latest repair: {maintenance[0] ? `${maintenance[0].title} • ${formatRepairStatusLabel(maintenance[0].status)}` : 'No repair history'}
        </Text>
        <Text style={commonStyles.helperText}>
          Latest message: {inquiries[0] ? `${inquiries[0].subject} on ${formatShortDate(inquiries[0].sentAt)}` : 'No resident messages logged'}
        </Text>
        <Text style={commonStyles.helperText}>
          Tenant notifications: {notifications.length}
        </Text>
      </SectionCard>

      <SectionCard title="Actions">
        <ActionLink href="/payments/record" label="Record rent update" variant="primary" />
        <ActionLink href="/payments/history" label="Open payment history" />
        <View style={styles.notifyRow}>
          <PrimaryButton
            label="Notify tenant"
            onPress={async () => {
              const reminderCopy = ledger
                ? getRentReminderCopy(ledger, 'tenant')
                : {
                    title: `Admin update for ${property?.name ?? 'your residence'}`,
                    body: 'Please review your resident account and latest unit updates in the app.',
                  };
              if (notificationsBackendEnabled()) {
                const result = await createNotificationInBackend({
                  tenantId: tenant.id,
                  roleTarget: 'tenant',
                  type: ledger ? 'rent' : 'message',
                  title: reminderCopy.title,
                  body: reminderCopy.body,
                  priority: ledger?.status === 'overdue' ? 'high' : 'normal',
                  actionLabel: ledger ? 'Open rent' : 'Open contact thread',
                  routeTarget: ledger ? '/(tenant)/(tabs)/ledger' : '/(tenant)/contact-admin',
                  entityType: ledger ? 'rent_charge' : 'message',
                  entityId: ledger?.chargeId ?? tenant.id,
                });

                if (!result.error) {
                  await refreshNotifications();
                  setNotifyMessage('Notification sent to the tenant notification feed.');
                  return;
                }

                setNotifyMessage(result.error ?? 'Unable to notify the resident right now.');
              }

              notifyTenant(
                tenant.id,
                reminderCopy.title,
                reminderCopy.body
              );
              setNotifyMessage('Notification sent to the tenant updates feed.');
            }}
            variant="secondary"
          />
        </View>
        {notifyMessage ? <Text style={styles.successText}>{notifyMessage}</Text> : null}
        <View style={styles.secondaryButtonSpacing}>
          {showDeactivateConfirm ? (
            <View style={styles.removeConfirmCard}>
              <Text style={styles.warningTitle}>Mark resident as former</Text>
              <Text style={commonStyles.helperText}>
                This keeps the record, removes the resident from the unit, and moves the unit to turnover.
              </Text>
              <View style={styles.loginActionRow}>
                <PrimaryButton
                  disabled={isDeactivatingTenant}
                  label={isDeactivatingTenant ? 'Updating...' : 'Confirm mark as former'}
                  loading={isDeactivatingTenant}
                  onPress={async () => {
                    setIsDeactivatingTenant(true);
                    const result = await deactivateTenant(tenant.id, tenant.unitId);
                    setIsDeactivatingTenant(false);

                    if (result.error) {
                      setTenantRemovalMessage(result.error);
                      return;
                    }

                    setTenantRemovalMessage('Resident marked as former. The unit has been moved to turnover.');
                    router.replace('/tenants');
                  }}
                  variant="secondary"
                />
                <PrimaryButton
                  disabled={isDeactivatingTenant}
                  label="Cancel"
                  onPress={() => setShowDeactivateConfirm(false)}
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}
          {showRemoveConfirm ? (
            <View style={styles.removeConfirmCard}>
              <Text style={styles.warningTitle}>Remove tenant from unit</Text>
              <Text style={commonStyles.helperText}>
                This removes the resident from the unit. If history exists, the app keeps the resident as former instead of deleting the record.
              </Text>
              <View style={styles.loginActionRow}>
                <PrimaryButton
                  disabled={isRemovingTenant}
                  label={isRemovingTenant ? 'Updating...' : 'Confirm remove tenant'}
                  loading={isRemovingTenant}
                  onPress={async () => {
                    setIsRemovingTenant(true);
                    const result = await removeTenantRecord(tenant.id, tenant.unitId);
                    setIsRemovingTenant(false);

                    if (result.error) {
                      setTenantRemovalMessage(result.error);
                      return;
                    }

                    setTenantRemovalMessage(
                      result.action === 'deleted'
                        ? 'Tenant record deleted. The unit has been moved to turnover.'
                        : 'Tenant history exists, so the resident was moved to former status and the unit was moved to turnover.'
                    );
                    router.replace('/tenants');
                  }}
                  variant="secondary"
                />
                <PrimaryButton
                  disabled={isRemovingTenant}
                  label="Cancel"
                  onPress={() => setShowRemoveConfirm(false)}
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}
          {!showDeactivateConfirm && !showRemoveConfirm ? (
            <View style={styles.loginActionRow}>
              <PrimaryButton
                label="Mark resident as former"
                onPress={() => setShowDeactivateConfirm(true)}
                variant="secondary"
              />
              <PrimaryButton
                label="Remove tenant from unit"
                onPress={() => setShowRemoveConfirm(true)}
                variant="secondary"
              />
            </View>
          ) : null}
          <Text style={commonStyles.helperText}>
            Use “Mark resident as former” for normal move-out cleanup. Use “Remove tenant from unit” when you want the app to delete a record only if it has no history; otherwise it safely converts the resident to former status.
          </Text>
        </View>
        {tenantRemovalMessage ? <Text style={styles.successText}>{tenantRemovalMessage}</Text> : null}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  metricTile: {
    backgroundColor: '#F3EEE5',
    borderRadius: 16,
    minWidth: '47%',
    padding: 12,
  },
  metricValue: {
    color: '#1F2933',
    fontSize: 17,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#66707A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  removeConfirmCard: {
    backgroundColor: '#FFF7EA',
    borderColor: '#E4C98C',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  warningTitle: {
    color: '#7A4E00',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  notifyRow: {
    marginTop: 12,
  },
  secondaryButtonSpacing: {
    marginTop: 10,
  },
  loginAccessCard: {
    backgroundColor: '#F3EEE5',
    borderRadius: 16,
    marginTop: 8,
    padding: 12,
  },
  loginActionRow: {
    gap: 10,
    marginTop: 12,
  },
  inlineInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  documentActionRow: {
    marginTop: 12,
  },
  documentList: {
    gap: 10,
    marginTop: 12,
  },
  inquiryList: {
    gap: 12,
    marginTop: 12,
  },
  documentCard: {
    backgroundColor: '#F3EEE5',
    borderRadius: 16,
    padding: 12,
  },
  inquiryCard: {
    backgroundColor: '#F3EEE5',
    borderRadius: 16,
    padding: 12,
  },
  inquiryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  documentTitle: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '700',
  },
  replyComposer: {
    marginTop: 12,
  },
  replyInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    minHeight: 92,
    padding: 12,
    textAlignVertical: 'top',
  },
  replyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 12,
    padding: 12,
  },
  replyLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  successText: {
    color: '#1D6E5B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
});
