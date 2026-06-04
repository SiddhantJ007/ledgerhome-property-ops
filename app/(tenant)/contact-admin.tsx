import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OptionPillGroup } from '@/components/option-pill-group';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenContainer } from '@/components/screen-container';
import { SectionCard } from '@/components/section-card';
import { StatusBadge, formatStatusLabel } from '@/components/status-badge';
import { DEMO_MODE } from '@/lib/demo-mode';
import {
  contactRequestsBackendEnabled,
  createContactRequestInBackend,
  fetchContactRequestsFromBackend,
} from '@/lib/contact-requests-backend';
import { hasText } from '@/lib/form-utils';
import { formatShortDate } from '@/lib/prototype-ledger';
import { getDemoTenantContext } from '@/lib/tenant-demo';
import { commonStyles, palette } from '@/lib/theme';
import { useAccess } from '@/providers/access-provider';
import { useMasterData } from '@/providers/master-data-provider';
import { useNotifications } from '@/providers/notifications-provider';
import type { ContactRequest, ContactRequestCategory } from '@/types/domain';
import { usePrototype } from '@/providers/prototype-provider';

export default function ContactAdminScreen() {
  const { currentTenantId } = useAccess();
  const { data, masterDataMessage } = useMasterData();
  const { refreshNotifications } = useNotifications();
  const { ledgerRows, maintenanceRows, sendTenantInquiry } = usePrototype();
  const { tenant, property, unit, contactRequests } = getDemoTenantContext(data, ledgerRows, maintenanceRows, currentTenantId);
  const tenantId = tenant?.id ?? currentTenantId ?? null;
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<ContactRequestCategory>('general');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendRequests, setBackendRequests] = useState<ContactRequest[] | null>(null);
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let isActive = true;

    async function loadRequests() {
      if (!contactRequestsBackendEnabled() || !tenantId) {
        return;
      }

      const result = await fetchContactRequestsFromBackend({ tenantId });

      if (!isActive) {
        return;
      }

      if (result.error) {
        setBackendRequests(null);
        setStatusMessage(result.error);
        return;
      }

      setBackendRequests(result.data.length > 0 ? result.data : null);
      setStatusMessage(result.data.length > 0 ? '' : 'No messages have been sent yet.');
    }

    void loadRequests();

    return () => {
      isActive = false;
    };
  }, [tenantId]);

  const inquiries = useMemo(() => backendRequests ?? contactRequests, [backendRequests, contactRequests]);

  function categoryLabel(value: ContactRequestCategory) {
    return value === 'maintenance' ? 'Repair' : formatStatusLabel(value);
  }

  const submitInquiry = async (input: {
    subject: string;
    message: string;
    category: ContactRequestCategory;
    successText: string;
  }) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (contactRequestsBackendEnabled() && property && unit && tenantId) {
      const result = await createContactRequestInBackend({
        tenantId,
        propertyId: property.id,
        unitId: unit.id,
        subject: input.subject.trim(),
        message: input.message.trim(),
        category: input.category,
        channel: 'message',
      });

      if (!result.error && result.request) {
        setBackendRequests((current) => [result.request!, ...(current ?? [])]);
      setSuccessMessage(input.successText);
      setStatusMessage('');
        await refreshNotifications();
        setIsSubmitting(false);
        return true;
      }

      setErrorMessage(result.error ?? 'Unable to send the message right now.');
      setIsSubmitting(false);
      return false;
    }

    if (!DEMO_MODE) {
      setErrorMessage('Messaging requires a linked tenant, property, and unit.');
      setIsSubmitting(false);
      return false;
    }

    sendTenantInquiry(input.subject.trim(), input.message.trim(), 'message');
    setBackendRequests(null);
    setSuccessMessage(input.successText);
    await refreshNotifications();
    setIsSubmitting(false);
    return true;
  };

  return (
    <ScreenContainer
      eyebrow="Tenant Portal"
      title="Messages"
      subtitle="Send a message to property management and keep a clear record of replies.">
      <SectionCard title="Send a message">
        <Text style={commonStyles.helperText}>Use the secure message thread below to contact property management and keep the conversation attached to your account.</Text>
        {masterDataMessage ? <Text style={commonStyles.helperText}>{masterDataMessage}</Text> : null}
        {statusMessage ? <Text style={commonStyles.helperText}>{statusMessage}</Text> : null}
        {!tenantId ? <Text style={commonStyles.errorText}>No tenant record is linked to this session yet.</Text> : null}
        <Text style={styles.label}>Category</Text>
        <OptionPillGroup
          onChange={(value) => setCategory(value as ContactRequestCategory)}
          options={[
            { label: 'General', value: 'general' },
            { label: 'Billing', value: 'billing' },
            { label: 'Repair', value: 'maintenance' },
            { label: 'Lease', value: 'lease' },
          ]}
          selectedValue={category}
        />
        <Text style={styles.label}>Subject</Text>
        <TextInput onChangeText={setSubject} placeholder="Question about my balance" placeholderTextColor={palette.mutedText} style={styles.input} value={subject} />
        <Text style={styles.label}>Message</Text>
        <TextInput multiline onChangeText={setMessage} placeholder="Type your message to the property team." placeholderTextColor={palette.mutedText} style={styles.notesInput} value={message} />
        {errorMessage ? <Text style={commonStyles.errorText}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
        <View style={styles.buttonRow}>
          <PrimaryButton
            disabled={isSubmitting}
            label="Send message"
            onPress={async () => {
              if (!hasText(subject) || !hasText(message)) {
                setErrorMessage('Subject and message are required.');
                return;
              }

              await submitInquiry({
                subject,
                message,
                category,
                successText: 'Your message was sent to the admin team.',
              });
              setSubject('');
              setMessage('');
              setCategory('general');
            }}
          />
        </View>
      </SectionCard>

      <SectionCard title="Recent messages">
        {inquiries.length > 0 ? (
          inquiries.map((inquiry) => (
            <View key={inquiry.id} style={styles.inquiryCard}>
              <View style={styles.inquiryHeader}>
                <Text style={styles.inquiryTitle}>{inquiry.subject}</Text>
                <StatusBadge label={formatStatusLabel(inquiry.status)} tone={inquiry.status === 'responded' ? 'success' : 'warning'} />
              </View>
              <Text style={commonStyles.helperText}>{inquiry.message}</Text>
              <Text style={commonStyles.helperText}>
                {categoryLabel(inquiry.category)} • {inquiry.channel === 'call_request' ? 'Callback requested' : 'Message sent'} • {formatShortDate(inquiry.sentAt)}
              </Text>
              {inquiry.adminReply ? (
                <View style={styles.replyCard}>
                  <Text style={styles.replyLabel}>Admin reply</Text>
                  <Text style={commonStyles.helperText}>{inquiry.adminReply}</Text>
                  <Text style={commonStyles.helperText}>Updated {formatShortDate(inquiry.respondedAt)}</Text>
                  <Text style={styles.replyLabel}>Follow up</Text>
                  <TextInput
                    editable={!isSubmitting}
                    onChangeText={(value) =>
                      setFollowUpDrafts((current) => ({
                        ...current,
                        [inquiry.id]: value,
                      }))
                    }
                    placeholder="Need clarification? Send a follow-up."
                    placeholderTextColor={palette.mutedText}
                    style={styles.followUpInput}
                    value={followUpDrafts[inquiry.id] ?? ''}
                  />
                  <View style={styles.followUpActionRow}>
                    <PrimaryButton
                      disabled={isSubmitting}
                      label="Send follow-up"
                      onPress={async () => {
                        const followUpMessage = followUpDrafts[inquiry.id] ?? '';

                        if (!hasText(followUpMessage)) {
                          setErrorMessage('Follow-up message cannot be empty.');
                          return;
                        }

                        await submitInquiry({
                          subject: `Follow-up: ${inquiry.subject}`,
                          message: followUpMessage,
                          category: inquiry.category,
                          successText: 'Your follow-up was sent to the admin team.',
                        });
                        setFollowUpDrafts((current) => ({
                          ...current,
                          [inquiry.id]: '',
                        }));
                      }}
                      variant="secondary"
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={commonStyles.helperText}>No messages have been sent from this resident account yet.</Text>
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.text,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  buttonRow: {
    marginTop: 16,
  },
  success: {
    color: '#1D6E5B',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  inquiryCard: {
    backgroundColor: '#F7F2EA',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
  },
  inquiryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inquiryTitle: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '700',
  },
  replyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 12,
    padding: 12,
  },
  followUpInput: {
    backgroundColor: '#FFFFFF',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.text,
    marginTop: 8,
    minHeight: 72,
    padding: 12,
    textAlignVertical: 'top',
  },
  followUpActionRow: {
    marginTop: 12,
  },
  replyLabel: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
});
