$ErrorActionPreference = "Stop"

$apiBase = "http://localhost:5000/api"
$email = "pilot@flyaviation.com"
$password = "pilot123"
$name = "Captain Arjun Mehta"

function Invoke-ApiJson {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        $Body = $null
    )

    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
    }

    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -Body ($Body | ConvertTo-Json -Depth 10)
}

function Invoke-ApiMultipart {
    param(
        [string]$Url,
        [hashtable]$Headers,
        [hashtable]$Form
    )

    # Ensure required .NET types are loaded (PowerShell 5 compatibility)
    Add-Type -AssemblyName System.Net.Http

    $handler = New-Object System.Net.Http.HttpClientHandler
    $client = New-Object System.Net.Http.HttpClient($handler)

    foreach ($key in $Headers.Keys) {
        if ($key -ieq 'Content-Type') { continue }
        $client.DefaultRequestHeaders.Add($key, $Headers[$key])
    }

    $multipart = New-Object System.Net.Http.MultipartFormDataContent

    foreach ($fieldKey in $Form.Keys) {
        $value = $Form[$fieldKey]

        if ($value -is [System.IO.FileInfo]) {
            $fileStream = $value.OpenRead()
            $fileContent = New-Object System.Net.Http.StreamContent($fileStream)
            $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/pdf")
            $multipart.Add($fileContent, $fieldKey, $value.Name)
        } else {
            $stringContent = New-Object System.Net.Http.StringContent($value.ToString())
            $multipart.Add($stringContent, $fieldKey)
        }
    }

    $response = $client.PostAsync($Url, $multipart).Result
    $response.EnsureSuccessStatusCode()
    $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
}

Write-Host "Starting sample data population..."

# 1) Register (ignore if already exists)
try {
    Invoke-ApiJson -Method "Post" -Url "$apiBase/auth/register" -Headers @{ "Content-Type" = "application/json" } -Body @{
        name = $name
        email = $email
        password = $password
    } | Out-Null
    Write-Host "Registered demo user."
}
catch {
    Write-Host "Demo user may already exist. Continuing..."
}

# 2) Login
$login = Invoke-ApiJson -Method "Post" -Url "$apiBase/auth/login" -Headers @{ "Content-Type" = "application/json" } -Body @{
    email = $email
    password = $password
}

if (-not $login.token) {
    throw "Failed to get auth token."
}

$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $($login.token)"
}

Write-Host "Logged in as $email"

# 3) Update profile
Invoke-ApiJson -Method "Put" -Url "$apiBase/profile" -Headers $authHeaders -Body @{
    name = $name
    phone = "+1-555-217-9086"
} | Out-Null

# 4) Cleanup old data for this user
$existingLogs = Invoke-ApiJson -Method "Get" -Url "$apiBase/logbook" -Headers $authHeaders
foreach ($l in @($existingLogs)) {
    Invoke-RestMethod -Method Delete -Uri "$apiBase/logbook/$($l._id)" -Headers $authHeaders | Out-Null
}

$existingMedicals = Invoke-ApiJson -Method "Get" -Url "$apiBase/medicals" -Headers $authHeaders
foreach ($m in @($existingMedicals)) {
    Invoke-RestMethod -Method Delete -Uri "$apiBase/medicals/$($m._id)" -Headers $authHeaders | Out-Null
}

$existingLicenses = Invoke-ApiJson -Method "Get" -Url "$apiBase/license" -Headers $authHeaders
foreach ($lic in @($existingLicenses)) {
    Invoke-RestMethod -Method Delete -Uri "$apiBase/license/$($lic._id)" -Headers $authHeaders | Out-Null
}

Write-Host "Cleared existing user records."

# 5) Seed logbook (12 entries for better charts + currency)
$entries = @(
    @{ date="2025-04-12"; aircraft="C172"; departureAirport="KTEB"; arrivalAirport="KTEB"; totalTime=1.4; pilotInCommand=1.4; dayLandings=5; flightType="Personal"; remarks="Pattern currency session" },
    @{ date="2025-05-08"; aircraft="PA-28"; departureAirport="KTEB"; arrivalAirport="KPHL"; totalTime=2.1; pilotInCommand=2.1; crossCountry=2.1; dayLandings=2; flightType="Personal"; remarks="Cross-country to Philadelphia" },
    @{ date="2025-06-16"; aircraft="C172"; departureAirport="KJFK"; arrivalAirport="KBOS"; totalTime=2.9; pilotInCommand=2.9; crossCountry=2.9; dayLandings=2; flightType="Personal"; remarks="Long XC and ATC handling" },
    @{ date="2025-07-04"; aircraft="C172"; departureAirport="KJFK"; arrivalAirport="KJFK"; totalTime=1.3; dualReceived=1.3; instrumentSimulated=0.8; dayLandings=3; flightType="Training"; instructorName="S. Johnson CFII"; remarks="Instrument scan and unusual attitudes" },
    @{ date="2025-08-22"; aircraft="PA-28"; departureAirport="KEWR"; arrivalAirport="KHPN"; totalTime=1.6; pilotInCommand=1.6; nightTime=1.6; nightLandings=3; flightType="Personal"; remarks="Night currency hop" },
    @{ date="2025-09-10"; aircraft="C172"; departureAirport="KJFK"; arrivalAirport="KDCA"; totalTime=3.0; pilotInCommand=3.0; crossCountry=3.0; instrumentActual=0.4; dayLandings=2; flightType="Commercial"; remarks="Passenger charter reposition" },
    @{ date="2025-10-18"; aircraft="C172"; departureAirport="KTEB"; arrivalAirport="KTEB"; totalTime=1.7; dualReceived=1.7; instrumentActual=0.7; instrumentSimulated=0.6; dayLandings=2; flightType="Training"; instructorName="R. Cole CFII"; remarks="Approaches and holds" },
    @{ date="2025-11-30"; aircraft="DA42"; departureAirport="KJFK"; arrivalAirport="KBWI"; totalTime=2.4; pilotInCommand=2.4; crossCountry=2.4; dayLandings=2; flightType="Commercial"; remarks="Multi-engine route training" },
    @{ date="2025-12-19"; aircraft="C172"; departureAirport="KTEB"; arrivalAirport="KTEB"; totalTime=1.1; pilotInCommand=1.1; nightTime=1.1; nightLandings=3; flightType="Personal"; remarks="Night landings refresher" },
    @{ date="2026-01-11"; aircraft="PA-28"; departureAirport="KJFK"; arrivalAirport="KALB"; totalTime=2.3; pilotInCommand=2.3; crossCountry=2.3; dayLandings=2; flightType="Personal"; remarks="Cold weather operations" },
    @{ date="2026-02-06"; aircraft="C172"; departureAirport="KTEB"; arrivalAirport="KTEB"; totalTime=1.9; dualReceived=1.9; instrumentActual=1.1; dayLandings=3; flightType="Training"; instructorName="S. Johnson CFII"; remarks="IFR proficiency session" },
    @{ date="2026-03-09"; aircraft="DA42"; departureAirport="KJFK"; arrivalAirport="KBOS"; totalTime=2.7; pilotInCommand=2.7; crossCountry=2.7; dayLandings=2; flightType="Commercial"; remarks="Commercial ferry with weather diversion" }
)

foreach ($entry in $entries) {
    Invoke-ApiJson -Method "Post" -Url "$apiBase/logbook" -Headers $authHeaders -Body $entry | Out-Null
}

Write-Host "Inserted $($entries.Count) logbook entries."

# 6) Seed medicals with PDFs
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pdfClass1 = Join-Path $root "sample-documents\\sample-class1-medical.pdf"
$pdfClass2 = Join-Path $root "sample-documents\\sample-class2-medical.pdf"

$medicals = @(
    @{ classType="Class 1"; issueDate="2025-02-15"; expiryDate="2026-12-31"; examinerName="Dr. Alice Romero"; examinerNumber="AME-4421"; examinationDate="2025-02-15"; restrictions="Must wear corrective lenses"; limitations="None"; reminderDays=45; remarks="Annual Class 1 completed"; document=$pdfClass1 },
    @{ classType="Class 2"; issueDate="2025-06-10"; expiryDate="2027-06-09"; examinerName="Dr. Martin Shah"; examinerNumber="AME-1029"; examinationDate="2025-06-10"; restrictions="None"; limitations="None"; reminderDays=60; remarks="Class 2 backup medical"; document=$pdfClass2 },
    @{ classType="Class 3"; issueDate="2025-09-01"; expiryDate="2028-08-31"; examinerName="Dr. Kevin Ross"; examinerNumber="AME-5590"; examinationDate="2025-09-01"; restrictions="None"; limitations="Day VFR operations preferred"; reminderDays=90; remarks="Class 3 maintained for personal/recreational ops"; document=$pdfClass2 }
)

foreach ($m in $medicals) {
    $form = @{
        classType = $m.classType
        issueDate = $m.issueDate
        expiryDate = $m.expiryDate
        examinerName = $m.examinerName
        examinerNumber = $m.examinerNumber
        examinationDate = $m.examinationDate
        restrictions = $m.restrictions
        limitations = $m.limitations
        reminderDays = $m.reminderDays
        remarks = $m.remarks
    }
    $formWithFile = $form.Clone()
    $formWithFile.document = Get-Item $m.document
    Invoke-ApiMultipart -Url "$apiBase/medicals" -Headers $authHeaders -Form $formWithFile | Out-Null
}

Write-Host "Inserted medical records."

# 7) Seed licenses with PDFs
$pdfSpl = Join-Path $root "sample-documents\sample-spl-license.pdf"
$pdfCpl = Join-Path $root "sample-documents\sample-cpl-license.pdf"

$licenses = @(
    @{ type="SPL"; licenseNumber="SPL-342178"; issueDate="2023-03-11"; expiryDate="2028-03-11"; restrictions="Student solo with instructor endorsement"; remarks="Initial student license" },
    @{ type="PPL"; licenseNumber="PPL-981442"; issueDate="2024-08-02"; expiryDate="2029-08-02"; restrictions="Corrective lenses"; remarks="Private pilot privileges" },
    @{ type="CPL"; licenseNumber="CPL-557731"; issueDate="2025-01-20"; expiryDate="2030-01-20"; restrictions="None"; remarks="Commercial multi-engine" }
)

foreach ($l in $licenses) {
    $form = @{
        type = $l.type
        licenseNumber = $l.licenseNumber
        issueDate = $l.issueDate
        expiryDate = $l.expiryDate
        restrictions = $l.restrictions
        remarks = $l.remarks
    }

    $docPath = if ($l.type -eq 'SPL') { $pdfSpl } else { $pdfCpl }

    $formWithFile = $form.Clone()
    $formWithFile.document = Get-Item $docPath

    Invoke-ApiMultipart -Url "$apiBase/license" -Headers $authHeaders -Form $formWithFile | Out-Null
}

# 8) Add ratings and endorsements
$licenses = Invoke-ApiJson -Method "Get" -Url "$apiBase/license" -Headers $authHeaders
$cpl = $licenses | Where-Object { $_.type -eq "CPL" } | Select-Object -First 1
$ppl = $licenses | Where-Object { $_.type -eq "PPL" } | Select-Object -First 1

if ($cpl) {
    Invoke-ApiJson -Method "Post" -Url "$apiBase/license/$($cpl._id)/ratings" -Headers $authHeaders -Body @{ rating = "Instrument Rating" } | Out-Null
    Invoke-ApiJson -Method "Post" -Url "$apiBase/license/$($cpl._id)/ratings" -Headers $authHeaders -Body @{ rating = "Multi-Engine Rating" } | Out-Null
    Invoke-ApiJson -Method "Post" -Url "$apiBase/license/$($cpl._id)/endorsements" -Headers $authHeaders -Body @{
        endorsementType = "High Performance Aircraft"
        instructorName = "R. Cole"
        instructorCertificate = "CFI-77821"
        date = "2025-11-15"
        aircraftType = "DA42"
        remarks = "Completed high-performance transition"
    } | Out-Null
}

if ($ppl) {
    Invoke-ApiJson -Method "Post" -Url "$apiBase/license/$($ppl._id)/ratings" -Headers $authHeaders -Body @{ rating = "Seaplane Rating" } | Out-Null
}

# 9) Verify counts
$finalLogs = Invoke-ApiJson -Method "Get" -Url "$apiBase/logbook" -Headers $authHeaders
$finalMed = Invoke-ApiJson -Method "Get" -Url "$apiBase/medicals" -Headers $authHeaders
$finalLic = Invoke-ApiJson -Method "Get" -Url "$apiBase/license" -Headers $authHeaders

$totalHours = ($finalLogs | Measure-Object -Property totalTime -Sum).Sum

Write-Host ""
Write-Host "Population complete."
Write-Host "User: $email"
Write-Host "Logbook entries: $(@($finalLogs).Count)"
Write-Host "Total hours: $([math]::Round($totalHours, 1))"
Write-Host "Medicals: $(@($finalMed).Count)"
Write-Host "Licenses: $(@($finalLic).Count)"
Write-Host ""
Write-Host "Login credentials:"
Write-Host "Email: $email"
Write-Host "Password: $password"
