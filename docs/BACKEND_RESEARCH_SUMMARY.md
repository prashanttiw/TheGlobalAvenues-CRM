# Backend Research Summary

## Status

Phase 0 research complete and approved for implementation.

## Student Data Decisions

- Keep stable identity, contact, passport, preference, consent, and profile-completion data on `student_profiles`
- Normalize repeatable records into separate tables for education history, test scores, financial profile, and travel history
- Track purpose-bound consent and retention metadata
- Store reusable verified documents separately from application-stage links

## Agent Data Decisions

- Capture legal entity, geography, operating scale, specialization, verification docs, finance details, manager assignment, and onboarding state
- Model sub-agents as first-class users with explicit permissions instead of free-text access patterns
- Keep commission logic separated into rules, calculations, claims, and payments

## Application Pipeline Decisions

- Use internal operational stages plus a simplified student-facing journey map
- Make stage transitions checklist-driven
- Encode country rules and document requirements by destination
- Record fraud signals as structured review data

## Security Decisions

- Design against OWASP API Security Top 10
- Use strict role and object authorization
- Use JWT access plus rotated refresh tokens
- Use database-backed rate limiting
- Use MIME-sniffed uploads with UUID filenames and blocked direct execution
- Use exact-origin CORS allowlists only

## Recommended Additional Tables

- `consent_logs`
- `student_education_records`
- `student_test_scores`
- `student_financial_profiles`
- `student_travel_history`
- `agent_documents`
- `partner_references`
- `country_rules`
- `document_requirements`
- `application_checklists`
- `fraud_flags`

## Source Set

External research used:

- UCAS
- Common App
- UK student visa guidance
- India DPDP Act reference
- Salesforce Education Cloud
- HubSpot for education CRM guidance
- RBI KYC guidance
- France Visas
- Study in Germany guidance
- Ireland student visa checklist
- Identita Malta student visa document list
- U.S. State Department student visa guidance
- Study in Estonia
- Austria residence permit student guidance
- EU immigration portal for Cyprus
- OWASP API Security Top 10 and File Upload Cheat Sheet
- MDN cookie and CORS guidance
- IETF OAuth security guidance
