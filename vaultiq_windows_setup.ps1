# Vaultiq Windows Setup Script
# Use this to restore the database state

$DatabaseName = "vaultiq"
$BackupFile = "vaultiq_full_data.sql"

Write-Host "--- Starting Vaultiq Database Restoration ---" -ForegroundColor Cyan

# Check if PostgreSQL is in PATH
if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'psql' not found. Please ensure PostgreSQL is installed and added to your PATH." -ForegroundColor Red
    exit
}

# Create Database if it doesn't exist
Write-Host "STEP 1: Creating database '$DatabaseName'..." -ForegroundColor Yellow
& psql -U postgres -c "CREATE DATABASE $DatabaseName;" 2>$null

# Restore Data
Write-Host "STEP 2: Importing data from $BackupFile..." -ForegroundColor Yellow
& psql -U postgres -d $DatabaseName -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database restored successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Restoration finished with some warnings or errors. Please check the output above." -ForegroundColor Yellow
}

Write-Host "`n🚀 You can now start the services as described in FRIEND_SETUP_GUIDE.md" -ForegroundColor Cyan
