# Task #34 - Email Integration Foundation

**Status:** Pending  
**Priority:** Medium  
**Estimated Time:** 5-6 days  
**Dependencies:** Task #33 (Shipment Line Management)  

## Overview

Prepare the foundation for email-to-call-off workflow where counterparties can send emails that create draft call-offs for user review and quota assignment.

## Business Requirements

### Email-to-Call-Off Workflow
1. **Email Receipt:** Counterparty sends call-off request via email
2. **Email Parsing:** Extract relevant data (quantities, dates, references)
3. **Draft Creation:** Create draft call-off with extracted data
4. **User Review:** User reviews and assigns to appropriate quota
5. **Confirmation:** Convert draft to confirmed call-off

### Data Extraction Requirements
- **Counterparty Identification:** From email sender or content
- **Bundle Quantities:** Parse numerical values and units
- **Metal Codes:** Identify product references
- **Delivery Requirements:** Extract dates and locations
- **Reference Numbers:** Capture PO numbers or other references

## Technical Architecture

### Draft Call-Off Data Structure
```typescript
interface DraftCallOff {
  draft_id: string
  counterparty_id?: string // May be null if sender not recognized
  email_subject: string
  email_body: string
  sender_email: string
  received_at: timestamp
  
  // Extracted data
  extracted_data: {
    bundle_qty?: number
    metal_code?: string
    delivery_date?: string
    reference_number?: string
    delivery_location?: string
  }
  
  // Processing status
  status: 'PENDING_REVIEW' | 'QUOTA_ASSIGNED' | 'CONVERTED' | 'REJECTED'
  assigned_quota_id?: string
  assigned_by?: string
  assigned_at?: timestamp
  
  // Conversion tracking
  converted_call_off_id?: string
  converted_at?: timestamp
  
  // Review notes
  review_notes?: string
}
```

### Database Schema
```sql
-- Draft call-off table
CREATE TABLE draft_call_off (
  draft_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counterparty_id UUID REFERENCES counterparty(counterparty_id),
  email_subject VARCHAR(500) NOT NULL,
  email_body TEXT NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Extracted data (JSONB for flexibility)
  extracted_data JSONB DEFAULT '{}',
  
  -- Processing status
  status draft_status DEFAULT 'PENDING_REVIEW',
  assigned_quota_id UUID REFERENCES quota(quota_id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Conversion tracking
  converted_call_off_id UUID REFERENCES call_off(call_off_id),
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Review notes
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status enum
CREATE TYPE draft_status AS ENUM (
  'PENDING_REVIEW',
  'QUOTA_ASSIGNED', 
  'CONVERTED',
  'REJECTED'
);

-- Indexes
CREATE INDEX idx_draft_call_off_status ON draft_call_off(status);
CREATE INDEX idx_draft_call_off_counterparty ON draft_call_off(counterparty_id);
CREATE INDEX idx_draft_call_off_received ON draft_call_off(received_at DESC);
```

## Implementation Components

### 1. Email Parser Service (Stub)
```typescript
// services/email-parser.ts
export class EmailParserService {
  static parseCallOffRequest(emailContent: string): ExtractedData {
    // Initial implementation - simple regex patterns
    // Future: ML/AI enhancement for better accuracy
  }
  
  static identifyCounterparty(senderEmail: string): string | null {
    // Match sender email to counterparty records
  }
  
  static extractBundleQuantity(content: string): number | null {
    // Parse quantity mentions like "25 bundles", "50t", etc.
  }
  
  static extractMetalCode(content: string): string | null {
    // Identify metal product codes
  }
}
```

### 2. Draft Call-Off Management API
```typescript
// Edge Function endpoints
POST /draft-call-offs              // Create draft from email
GET /draft-call-offs               // List pending drafts
PATCH /draft-call-offs/{id}        // Update draft (assign quota)
POST /draft-call-offs/{id}/convert // Convert to call-off
DELETE /draft-call-offs/{id}       // Reject draft
```

### 3. React Components

#### DraftCallOffList.tsx
```typescript
interface DraftCallOffListProps {
  status?: DraftStatus
  onReview: (draftId: string) => void
}

// Features:
// - Filterable list of draft call-offs
// - Quick review actions
// - Status indicators
// - Bulk operations
```

#### DraftCallOffReviewDialog.tsx
```typescript
interface DraftCallOffReviewDialogProps {
  draftId: string
  open: boolean
  onClose: () => void
  onConverted: (callOffId: string) => void
}

// Features:
// - Display extracted data
// - Edit/correct extracted information
// - Assign to quota
// - Convert to call-off or reject
```

### 4. Email Integration Stub
```typescript
// services/email-integration.ts
export class EmailIntegrationService {
  // Future: Webhook handler for email service
  static async handleIncomingEmail(emailData: IncomingEmail) {
    // Parse email
    // Create draft call-off
    // Notify users
  }
  
  // Future: IMAP/POP3 polling for email systems
  static async pollEmailAccount() {
    // Check for new emails
    // Process call-off requests
  }
}
```

## User Interface Design

### Draft Call-Off Dashboard
- **Pending Reviews:** Cards showing drafts awaiting review
- **Quick Actions:** Assign, convert, reject buttons
- **Filters:** By status, counterparty, date range
- **Search:** Full-text search across email content

### Review Dialog
- **Email Display:** Show original email content
- **Extracted Data:** Editable fields for parsed information
- **Quota Assignment:** Dropdown to select appropriate quota
- **Validation:** Ensure business rules before conversion

## Integration Points

### Existing Workflow Integration
- **CreateCallOffWizard:** Enhance to support draft conversion
- **Call-Off List:** Show converted call-offs with draft reference
- **Counterparty Management:** Link drafts to counterparty records

### Future Email Service Integration
- **Webhook Endpoints:** For services like SendGrid, Mailgun
- **IMAP/POP3:** For direct email account monitoring
- **Authentication:** OAuth for email service access

## Acceptance Criteria

### ✅ Core Functionality
- [ ] Create draft call-offs from structured data
- [ ] List and filter draft call-offs
- [ ] Review and edit extracted information
- [ ] Assign drafts to specific quotas
- [ ] Convert drafts to confirmed call-offs

### ✅ Business Logic
- [ ] Counterparty identification from email
- [ ] Basic data extraction (quantities, dates)
- [ ] Quota assignment validation
- [ ] Audit trail for conversions and rejections

### ✅ User Experience
- [ ] Intuitive review interface
- [ ] Clear status tracking
- [ ] Efficient bulk operations
- [ ] Mobile-responsive design

### ✅ Integration
- [ ] Seamless conversion to call-off workflow
- [ ] Proper linking to counterparty records
- [ ] Real-time updates and notifications

## Files to Create

### New Components
1. `src/components/DraftCallOff/DraftCallOffList.tsx`
2. `src/components/DraftCallOff/DraftCallOffReviewDialog.tsx`
3. `src/components/DraftCallOff/DraftCallOffCard.tsx`
4. `src/pages/DraftCallOffs.tsx`

### Services & Types
1. `src/services/email-parser.ts`
2. `src/services/draft-calloff-api.ts`
3. `src/types/draft-calloff.ts`

### Database
1. `supabase/migrations/031_create_draft_call_off.sql`
2. `supabase/functions/draft-calloff-crud/index.ts`

### Modified Files
1. `src/App.tsx` (add routing)
2. `src/components/layout/MuiSidebar.tsx` (add navigation)
3. `src/components/CallOff/CreateCallOffWizard.tsx` (support draft conversion)

## Future Enhancements

### Advanced Email Parsing
- Machine learning for better data extraction
- Training data from successful conversions
- Support for multiple email formats and languages

### Email Service Integration
- Multiple email provider support
- Real-time webhook processing
- Email template responses

### Workflow Automation
- Auto-assignment based on rules
- Approval workflows for large quantities
- Integration with external approval systems

## Performance & Scaling

- Efficient querying with proper indexes
- Pagination for large draft lists
- Background processing for email parsing
- Caching for frequently accessed data

---

**Previous Task:** #33 - Shipment Line Management  
**Next Task:** #35 - Transport Order Basics