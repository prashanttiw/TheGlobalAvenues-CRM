# TGA CRM - Test File Cleanup (production launch prep)
#
# Moves known test-only files/folders to the Windows Recycle Bin (NOT a permanent
# delete - recoverable via File Explorer > Recycle Bin > Restore). Targets are the
# test agent/student verification documents, test notice attachments, orphaned test
# university logo uploads, root-level junk, and superseded local dev backup dumps
# accumulated during development. The one real university logo (0f0c439c-*) and all
# .htaccess files are explicitly kept.
#
# Does NOT touch the local database - files removed here are only referenced by
# test rows in the local dev DB (agents/students that are themselves test data).

Add-Type -AssemblyName Microsoft.VisualBasic

$repoRoot = Split-Path -Parent $PSScriptRoot
$recycledCount = 0
$recycledBytes = 0

function Remove-ToRecycleBin {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $item = Get-Item -LiteralPath $Path
    if ($item.PSIsContainer) {
        $size = (Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue |
                 Measure-Object -Property Length -Sum).Sum
        $count = (Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue).Count
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(
            $Path, 'OnlyErrorDialogs', 'SendToRecycleBin')
        Write-Host "Recycled folder: $Path ($count files)"
        $script:recycledCount += $count
        $script:recycledBytes += $size
    } else {
        $size = $item.Length
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
            $Path, 'OnlyErrorDialogs', 'SendToRecycleBin')
        Write-Host "Recycled file:   $Path"
        $script:recycledCount += 1
        $script:recycledBytes += $size
    }
}

Write-Host "=== TGA CRM test file cleanup ===" -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot`n"

# 1. Test agent onboarding verification docs - every subfolder is a test agent
$agentsDir = Join-Path $repoRoot "storage\private\agents"
if (Test-Path $agentsDir) {
    Get-ChildItem -LiteralPath $agentsDir -Directory | ForEach-Object {
        Remove-ToRecycleBin $_.FullName
    }
}

# 2. Test student documents / custom-field uploads - every subfolder is a test student
$studentsDir = Join-Path $repoRoot "storage\private\students"
if (Test-Path $studentsDir) {
    Get-ChildItem -LiteralPath $studentsDir -Directory | ForEach-Object {
        Remove-ToRecycleBin $_.FullName
    }
}

# 3. Test notice attachments - all files (the 4 notices they belong to are test data)
$noticesDir = Join-Path $repoRoot "uploads\public\notices"
if (Test-Path $noticesDir) {
    Get-ChildItem -LiteralPath $noticesDir -File | ForEach-Object {
        Remove-ToRecycleBin $_.FullName
    }
}

# 4. Orphaned test university logo uploads - keep only the one real, referenced logo
#    (files.id=65, storage_path uploads/public/universities/0f0c439c-...)
$uniUploadsDir = Join-Path $repoRoot "uploads\public\universities"
if (Test-Path $uniUploadsDir) {
    Get-ChildItem -LiteralPath $uniUploadsDir -File | Where-Object {
        $_.Name -notlike "0f0c439c-37f3-41c1-acc8-748403962c43*" -and $_.Name -ne ".gitkeep"
    } | ForEach-Object {
        Remove-ToRecycleBin $_.FullName
    }
}

# 5. Root-level junk
@("login-payload.json",
  "BvgJVDHzVM41A3XuxT3ACgyDibs59NTQm0PGqiYl.tmp",
  "hoFOqEuzFgtvdnx2F7W0e5YmMxXkUyng5OY5rTYm.tmp") | ForEach-Object {
    Remove-ToRecycleBin (Join-Path $repoRoot $_)
}

# 6. Superseded local dev safety backups (from the 2026-07-03 university import work)
$backupsDir = Join-Path $repoRoot "storage\backups"
if (Test-Path $backupsDir) {
    Get-ChildItem -LiteralPath $backupsDir -Filter "*.sql" -File | ForEach-Object {
        Remove-ToRecycleBin $_.FullName
    }
}

$mb = [Math]::Round($recycledBytes / 1MB, 2)
Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "Recycled $recycledCount file(s), ~$mb MB total. Everything is in the Windows Recycle Bin -"
Write-Host "restore via File Explorer if anything is needed again."
