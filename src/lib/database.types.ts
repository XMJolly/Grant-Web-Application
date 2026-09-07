/**
 * Hand-written types for the Milestone 1 schema.
 *
 * The row shapes below are `type` aliases, not `interface` declarations, and
 * that difference is load-bearing. supabase-js only applies a schema when it
 * satisfies `GenericSchema`, whose rows must extend `Record<string, unknown>`.
 * An interface has no implicit index signature and so fails that constraint —
 * at which point the client silently falls back to `any` and every query in the
 * app loses its typing with no error to say so. Mapped types do get an implicit
 * index signature, so `type` keeps the checking switched on.
 *
 * Once you have the Supabase CLI installed you can replace this file with
 * generated types:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 * Until then this keeps the app type-safe without another tool to install.
 */

export type OrgRole = 'admin' | 'staff' | 'reviewer' | 'volunteer';

export type DocumentCategory =
  | 'determination_letter'
  | 'annual_report'
  | 'budget'
  | 'financial_statement'
  | 'board_list'
  | 'staff_record'
  | 'policy'
  | 'program_description'
  | 'past_application'
  | 'registration'
  | 'other';

export type DocumentStatus =
  | 'uploaded'
  | 'parsing'
  | 'parsed'
  | 'no_text_layer'
  | 'failed'
  | 'archived';

export type Organization = {
  id: string;
  legal_name: string;
  ein: string | null;
  mission: string | null;
  founded_year: number | null;
  tax_exempt_status: string | null;
  annual_budget_usd: number | null;
  annual_budget_fy: number | null;
  service_area_state: string | null;
  service_area_counties: string[];
  website: string | null;
  emma_registered: boolean | null;
  state_good_standing: boolean | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRecord = {
  id: string;
  organization_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  sha256: string | null;
  category: DocumentCategory;
  is_sensitive: boolean;
  status: DocumentStatus;
  has_text_layer: boolean | null;
  page_count: number | null;
  extracted_char_count: number | null;
  failure_reason: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export type DocumentPage = {
  id: string;
  organization_id: string;
  document_id: string;
  page_number: number;
  page_label: string;
  content: string;
  is_sensitive: boolean;
  created_at: string;
};

export type AuditEvent = {
  id: number;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      organizations: Table<
        Organization,
        Pick<Organization, 'legal_name' | 'created_by'> & Partial<Organization>
      >;
      organization_members: Table<
        OrganizationMember,
        Pick<OrganizationMember, 'organization_id' | 'user_id'> & Partial<OrganizationMember>
      >;
      documents: Table<
        DocumentRecord,
        Pick<
          DocumentRecord,
          'id' | 'organization_id' | 'storage_path' | 'file_name' | 'mime_type' | 'byte_size' | 'uploaded_by'
        > &
          Partial<DocumentRecord>
      >;
      document_pages: Table<
        DocumentPage,
        Pick<DocumentPage, 'document_id' | 'page_number' | 'page_label' | 'content'> &
          Partial<DocumentPage>
      >;
      audit_events: Table<
        AuditEvent,
        Pick<AuditEvent, 'organization_id' | 'action' | 'entity_type'> & Partial<AuditEvent>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      org_role: OrgRole;
      document_category: DocumentCategory;
      document_status: DocumentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
