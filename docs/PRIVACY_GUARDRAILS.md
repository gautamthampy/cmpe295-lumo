# LUMO Privacy Guardrails

## Overview
This document defines the privacy and data protection policies for the LUMO platform, ensuring compliance with educational data privacy standards and ethical AI principles.

## Core Principles

### 1. Data Minimization
- Collect only data necessary for personalized learning
- Avoid collecting personally identifiable information (PII) beyond email and username
- No tracking of student location or device fingerprinting
- No collection of biometric data without explicit consent

### 2. Consent and Transparency
- Explicit consent required before data collection
- Clear explanation of data usage provided to users/parents
- Age-appropriate privacy notices for elementary students
- Ability to opt-out of advanced features (e.g., attention tracking)

### 3. Data Retention
- **Default Retention Period**: 90 days for event data
- **Anonymization**: After retention period, events are anonymized (user_id removed)
- **User Rights**: Users/parents can request data deletion at any time
- **Aggregated Data**: Anonymized, aggregated data may be retained for research

### 4. Access Control
- **Role-Based Access Control (RBAC)**: 
  - Students: View own data only
  - Parents: View child's data only
  - Teachers: View data for assigned students
  - Admins: System-wide access with audit logging
- **Data Encryption**: 
  - At rest: AES-256 encryption
  - In transit: TLS 1.3
- **Authentication**: JWT-based authentication with short-lived tokens

## Specific Guardrails

### Event Data Privacy
1. **No Raw Input Storage**: Don't store exact quiz answers in raw form; use answer IDs
2. **Anonymized Logs**: System logs must not contain PII
3. **Event Retention**: Automatic anonymization after 90 days (configurable per user)
4. **No Cross-User Tracking**: Events from different users are never correlated without explicit consent

### Attention Tracking Privacy
1. **Opt-In Required**: Attention tracking features require explicit opt-in
2. **Local Processing**: If camera/microphone used, process locally; don't transmit raw data
3. **Aggregated Metrics Only**: Store only computed metrics (attention score), not raw signals
4. **Transparency**: Dashboard shows what data is being collected and why

### LLM Usage Privacy
1. **No PII in Prompts**: Never send PII to LLM APIs
2. **Content Filtering**: Filter out any user-generated content that may contain PII
3. **Prompt Sanitization**: Remove student names, locations, or identifying info
4. **Vendor Selection**: Use LLM providers with strong data privacy commitments
5. **No Training on User Data**: User data must not be used to train LLM models

### Dashboard and Analytics Privacy
1. **Aggregated Views**: Parent/teacher dashboards show aggregated metrics
2. **No Comparison**: Don't enable comparison between students
3. **Privacy by Design**: Default to most private settings
4. **Audit Trails**: Log all access to student data

## Implementation Requirements

### Database Privacy
```sql
-- Automatic anonymization function (already in schema)
CREATE OR REPLACE FUNCTION anonymize_old_events()
RETURNS void AS $$
BEGIN
    UPDATE events.user_events
    SET event_data = jsonb_build_object('anonymized', true),
        user_id = '00000000-0000-0000-0000-000000000000'::uuid
    WHERE retention_until < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily anonymization
-- (Requires pg_cron extension or external scheduler)
```

### API Privacy
- All API endpoints must validate user permissions
- Rate limiting to prevent data harvesting
- No bulk export of student data
- Audit logging for all data access

### Frontend Privacy
- No third-party analytics without consent
- Session cookies only (no tracking cookies)
- Clear privacy policy link on all pages
- Age-appropriate privacy controls

## Compliance Checklist

### FERPA (Family Educational Rights and Privacy Act)
- [ ] Parental consent for data collection
- [ ] Right to access student records
- [ ] Right to request amendments
- [ ] Limitations on disclosure

### COPPA (Children's Online Privacy Protection Act)
- [ ] Parental consent for users under 13
- [ ] Clear privacy policy
- [ ] No targeted advertising
- [ ] Data deletion on request

### GDPR (General Data Protection Regulation)
- [ ] Right to access
- [ ] Right to rectification
- [ ] Right to erasure
- [ ] Right to data portability
- [ ] Data protection by design

## Incident Response

### Data Breach Protocol
1. **Detection**: Automated monitoring for unauthorized access
2. **Containment**: Immediate suspension of affected services
3. **Notification**: 
   - Affected users/parents within 72 hours
   - Regulatory authorities as required
4. **Remediation**: Root cause analysis and fixes
5. **Documentation**: Maintain incident logs

### Privacy Violation Response
1. Immediate suspension of violating feature
2. User notification
3. Data deletion if requested
4. Policy review and update

## Regular Reviews
- **Quarterly Privacy Audits**: Review data collection and retention
- **Annual Policy Review**: Update guardrails based on regulations
- **Penetration Testing**: Annual security assessment
- **User Feedback**: Continuous privacy feedback mechanism

## Contact
For privacy concerns or questions:
- Email: privacy@lumo-platform.org
- Privacy Officer: [To be assigned]

## Version History
- v1.0 (2025-10-21): Initial privacy guardrails

