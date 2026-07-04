# TGA CRM - Dead seed script cleanup (production launch prep, round 2)
#
# Removes seed files superseded by real migrations / the current schema, or that reference
# tables that never made it into the shipped schema. Sent to the Windows Recycle Bin -
# recoverable via File Explorer > Recycle Bin > Restore, not a permanent delete.
#
# crm-api/Database/seeds/quiz_seed.sql          - INSERTs into `quiz_questions`, a table that
#                                                  was never created by any of the 81 migrations
#                                                  and is queried by no controller. Dead feature.
# crm-api/Database/seeds/programs_seed.sql      - INSERTs into `programs` (id, university_id,
#                                                  ..., intake_months_json) - predates the real
#                                                  `courses`/`intakes` split (migrations 015/016).
#                                                  Table doesn't exist.
# crm-api/Database/seeds/universities_seed.sql  - INSERTs into `universities` using columns
#                                                  (short_name, is_active) that don't exist on
#                                                  the current table (public_id/status era).
#                                                  Same stale 12-university list already found
#                                                  and removed from setup_database.php.
# scripts/seed_6i_6j_templates.php              - Its 3 notification_templates rows (sla.breached,
#                                                  system.disk_warning, system.disk_critical) are
#                                                  now migration 081, applied and wired into
#                                                  setup_database.php. Content preserved, not lost.
# scripts/seed_cron_health_table.php            - Creates cron_health with a column layout
#                                                  (cron_name PK, no job_name) that doesn't match
#                                                  the real table shipped via migration 034/043.
# scripts/seed_reminder_templates.php           - Covers reminder_type keys that don't match what
#                                                  PaymentTrackingController (the only real caller)
#                                                  actually produces (payment_upcoming/urgent, not
#                                                  payment_overdue) - doesn't fix the live gap,
#                                                  flagged separately as its own bug.
# scripts/seed_trigger_activity_logs.php        - Defines a MySQL trigger enforcement approach for
#                                                  activity_logs immutability; superseded by the
#                                                  DB-grant-level enforcement actually documented
#                                                  and used (no such trigger exists in the DB today).

Add-Type -AssemblyName Microsoft.VisualBasic

$repoRoot = Split-Path -Parent $PSScriptRoot
$recycledCount = 0

function Remove-ToRecycleBin {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host "Skip (not found): $Path"
        return
    }

    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
        $Path, 'OnlyErrorDialogs', 'SendToRecycleBin')
    Write-Host "Recycled: $Path"
    $script:recycledCount += 1
}

Write-Host "=== TGA CRM dead seed script cleanup ===" -ForegroundColor Cyan

@("crm-api\Database\seeds\quiz_seed.sql",
  "crm-api\Database\seeds\programs_seed.sql",
  "crm-api\Database\seeds\universities_seed.sql",
  "scripts\seed_6i_6j_templates.php",
  "scripts\seed_cron_health_table.php",
  "scripts\seed_reminder_templates.php",
  "scripts\seed_trigger_activity_logs.php") | ForEach-Object {
    Remove-ToRecycleBin (Join-Path $repoRoot $_)
}

$seedsDir = Join-Path $repoRoot "crm-api\Database\seeds"
if ((Test-Path $seedsDir) -and (Get-ChildItem $seedsDir -Force | Measure-Object).Count -eq 0) {
    Remove-ToRecycleBin $seedsDir
}

Write-Host "`n=== Done: $recycledCount item(s) recycled ===" -ForegroundColor Cyan
