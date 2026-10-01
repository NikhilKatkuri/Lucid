<#
  Seeds demo data for the Lucid inventory app through the public API.

  Idempotent: re-running will sign in instead of creating a duplicate account,
  and will skip any SKU that already exists. Safe to run repeatedly.

  Usage:
    .\server\seed-demo.ps1
    .\server\seed-demo.ps1 -ApiUrl http://localhost:5000

  Demo credentials:
    email:    demo@lucid.app
    password: 7#YR8Hvw$ci#uFf
#>
[CmdletBinding()]
param(
    [string]$ApiUrl = 'http://localhost:5000',
    [string]$Email = 'demo@lucid.app',
    [string]$Password = '7#YR8Hvw$ci#uFf',
    [string]$DisplayName = 'Demo User'
)

$ErrorActionPreference = 'Stop'
$base = "$ApiUrl/api/v1"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "   $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "   $msg" -ForegroundColor Yellow }

<#
  Calls the API and always returns a result object instead of throwing.

  A duplicate SKU (409) and a rate limit (429) are expected outcomes while
  seeding, so they are control flow rather than errors. Using exceptions here
  made the reported status unreliable, because PowerShell does not preserve a
  custom object thrown from a function across the catch boundary.
#>
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        $Body,
        [hashtable]$Headers
    )
    $params = @{
        Uri        = "$base$Path"
        Method     = $Method
        TimeoutSec = 30
    }
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 6)
        $params.ContentType = 'application/json'
    }
    if ($Headers) { $params.Headers = $Headers }

    try {
        $resp = Invoke-RestMethod @params
        return [pscustomobject]@{
            Ok = $true; StatusCode = 200; Message = ''; Data = $resp.data
        }
    }
    catch {
        $status = 0
        $detail = $_.Exception.Message
        try {
            $status = [int]$_.Exception.Response.StatusCode
            $stream = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
            $raw = $stream.ReadToEnd()
            if ($raw) { $detail = ($raw | ConvertFrom-Json).message }
        }
        catch { }

        return [pscustomobject]@{
            Ok = $false; StatusCode = $status; Message = $detail; Data = $null
        }
    }
}

<#
  Creates products, tolerating the two failures that are expected while seeding:
    409 duplicate SKU - the row is already there, so this is success for us.
    429 rate limited  - the API throttles per path, so back off and retry.
  Anything else is surfaced rather than silently counted as a skip.
#>
function Add-Products {
    param(
        [object[]]$Items,
        [hashtable]$Headers,
        [string]$Label
    )
    $created = 0; $skipped = 0; $failed = 0
    $seen = @{}

    # Fetch what is already there so a re-run does not spend the rate-limit
    # budget on POSTs that will all come back 409. The list endpoint filters on
    # IsArchived when the parameter is supplied, so query both states and merge.
    $existing = @{}
    foreach ($query in @('', '&isArchived=true')) {
        $suffix = if ($query -eq '') { '' } else { $query }
        $current = Invoke-Api -Method Get -Path "/inventory/products?page=1&pageSize=200$suffix" -Headers $Headers
        if ($current.Ok -and $current.Data -and $current.Data.items) {
            foreach ($p in $current.Data.items) { $existing[$p.sku.ToUpperInvariant()] = $true }
        }
    }

    foreach ($item in $Items) {
        $key = $item.sku.ToUpperInvariant()
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true

        if ($existing.ContainsKey($key)) { $skipped++; continue }

        $attempt = 0
        while ($true) {
            $attempt++
            $r = Invoke-Api -Method Post -Path '/inventory/products' -Headers $Headers -Body $item

            if ($r.Ok) { $created++; break }
            if ($r.StatusCode -eq 409) { $skipped++; break }
            if ($r.StatusCode -eq 429 -and $attempt -lt 10) {
                # The limiter allows 100 requests per 60s per path+client, so a
                # backoff of a few seconds is not always enough. Wait out a
                # whole window before trying again.
                Start-Sleep -Seconds 15
                continue
            }

            $failed++
            Write-Warn2 "  $($item.sku): HTTP $($r.StatusCode) $($r.Message)"
            break
        }
        # Stay comfortably under the 100-per-minute limit.
        Start-Sleep -Milliseconds 650
    }

    Write-Ok "$Label created $created, already present $skipped"
    if ($failed -gt 0) {
        Write-Host "   $Label FAILED: $failed" -ForegroundColor Red
    }
}

# ---------------------------------------------------------------- reachability
Write-Step 'Checking the API is reachable'
try {
    Invoke-RestMethod "$ApiUrl/health/live" -TimeoutSec 10 | Out-Null
    Write-Ok "$ApiUrl is up"
}
catch {
    Write-Host "Cannot reach $ApiUrl - start the API first (.\server\run-dev.ps1 or docker compose up)." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------- account
Write-Step "Signing in as $Email"
$r = Invoke-Api -Method Post -Path '/auth/signin' -Body @{ email = $Email; password = $Password }
$token = $null
if ($r.Ok) {
    $token = $r.Data.accessToken
    Write-Ok 'Existing account found'
}
else {
    Write-Warn2 'No existing account, creating one'
    $r = Invoke-Api -Method Post -Path '/auth/signup' -Body @{
        email = $Email; password = $Password; displayName = $DisplayName
    }
    if (-not $r.Ok) { throw "Could not sign in or sign up: HTTP $($r.StatusCode) $($r.Message)" }
    $token = $r.Data.accessToken
    Write-Ok 'Account created'
}

$authHeader = @{ Authorization = "Bearer $token" }

# ---------------------------------------------------------------- tenants
Write-Step 'Resolving tenants'
$orgsResult = Invoke-Api -Method Get -Path '/auth/my-orgs' -Headers $authHeader
if (-not $orgsResult.Ok) { throw "Could not list tenants: HTTP $($orgsResult.StatusCode) $($orgsResult.Message)" }
$myOrgs = $orgsResult.Data

# The main tenant is flagged by the API. Falling back to the first entry keeps
# this working against a server that does not yet report the flag.
$main = $myOrgs | Where-Object { $_.isMainTenant } | Select-Object -First 1
if (-not $main) { $main = $myOrgs | Select-Object -First 1 }
if (-not $main) { throw 'This account has no tenants.' }

$mainId = $main.tenantId
Write-Ok "main tenant: '$($main.name)' ($mainId)"

# A token is bound to one tenant, so working against a tenant requires a token
# issued for it. Switching the X-Tenant-ID header alone is rejected with 403.
function Get-TokenForTenant {
    param([string]$TenantId)
    $sw = Invoke-Api -Method Post -Path '/auth/switch-tenant' -Headers $authHeader -Body @{ tenantId = $TenantId }
    if (-not $sw.Ok) { throw "Could not switch to tenant $TenantId : HTTP $($sw.StatusCode) $($sw.Message)" }
    return $sw.Data.accessToken
}

$mainToken = Get-TokenForTenant -TenantId $mainId
$tenantHeader = @{ Authorization = "Bearer $mainToken"; 'X-Tenant-ID' = $mainId }

# ---------------------------------------------------------------- additional outlets
# Desired outlets: Bengaluru (original), Hyderabad, Chennai, Delhi, Mumbai
$desiredOutlets = @(
    @{ name = 'Bengaluru Outlet'; slug = 'bengaluru'; type = 'Store' },
    @{ name = 'Hyderabad Outlet'; slug = 'hyderabad'; type = 'Store' },
    @{ name = 'Chennai Outlet'; slug = 'chennai'; type = 'Store' },
    @{ name = 'Delhi Outlet'; slug = 'delhi'; type = 'Store' },
    @{ name = 'Mumbai Outlet'; slug = 'mumbai'; type = 'Store' }
)

Write-Step 'Ensuring outlet tenants exist (for the tenant switcher)'

$outletHeaders = @{}   # slug -> headers hashtable
$outletNames = @{}   # slug -> display name

foreach ($desired in $desiredOutlets) {
    $existing = $myOrgs | Where-Object {
        $_.tenantId -ne $mainId -and (
            $_.name -eq $desired.name -or
            ($_.slug -and $_.slug -eq $desired.slug)
        )
    } | Select-Object -First 1

    if ($existing) {
        $id = $existing.tenantId
        Write-Ok "already present: '$($existing.name)' ($id)"
    }
    else {
        $new = Invoke-Api -Method Post -Path '/dev/tenants' -Headers $tenantHeader -Body $desired
        if ($new.Ok) {
            $id = $new.Data.tenantId
            Write-Ok "created '$($new.Data.name)' ($id)"
            # refresh myOrgs so subsequent lookups see the new tenant
            $myOrgs = @($myOrgs) + $new.Data
        }
        else {
            Write-Warn2 "could not create '$($desired.name)': HTTP $($new.StatusCode) $($new.Message)"
            continue
        }
    }

    $tok = Get-TokenForTenant -TenantId $id
    $outletHeaders[$desired.slug] = @{ Authorization = "Bearer $tok"; 'X-Tenant-ID' = $id }
    $outletNames[$desired.slug] = $desired.name
}

# ---------------------------------------------------------------- catalogue (main / HQ)
# 100 products across the 8 categories the UI offers. quantity / reorderLevel
# are chosen so all three stock statuses appear across the dataset:
#   qty == 0                  -> Out of Stock
#   0 < qty <= reorderLevel   -> Low
#   qty >  reorderLevel       -> In Stock
$catalog = @(
    # --- Electronics (20)
    @{ sku = 'ELEC-1001'; name = 'Mechanical Keyboard'; category = 'Electronics'; quantity = 42; reorderLevel = 12; price = 2499 },
    @{ sku = 'ELEC-1002'; name = 'Wireless Mouse'; category = 'Electronics'; quantity = 8; reorderLevel = 15; price = 799 },
    @{ sku = 'ELEC-1003'; name = '27-inch IPS Monitor'; category = 'Electronics'; quantity = 0; reorderLevel = 5; price = 11499 },
    @{ sku = 'ELEC-1004'; name = 'USB-C Docking Hub'; category = 'Electronics'; quantity = 64; reorderLevel = 20; price = 4299 },
    @{ sku = 'ELEC-1005'; name = 'Noise-Cancelling Headset'; category = 'Electronics'; quantity = 3; reorderLevel = 10; price = 8999 },
    @{ sku = 'ELEC-1006'; name = 'Webcam 1080p'; category = 'Electronics'; quantity = 27; reorderLevel = 8; price = 3499 },
    @{ sku = 'ELEC-1007'; name = 'Portable SSD 1TB'; category = 'Electronics'; quantity = 5; reorderLevel = 8; price = 6799 },
    @{ sku = 'ELEC-1008'; name = 'Bluetooth Speaker'; category = 'Electronics'; quantity = 91; reorderLevel = 25; price = 2799 },
    @{ sku = 'ELEC-1009'; name = 'Ultrawide 34-inch Monitor'; category = 'Electronics'; quantity = 6; reorderLevel = 4; price = 42999 },
    @{ sku = 'ELEC-1010'; name = 'Mechanical Numpad'; category = 'Electronics'; quantity = 14; reorderLevel = 6; price = 1899 },
    @{ sku = 'ELEC-1011'; name = 'Wi-Fi 6E Router'; category = 'Electronics'; quantity = 22; reorderLevel = 8; price = 8999 },
    @{ sku = 'ELEC-1012'; name = '8-Port Gigabit Switch'; category = 'Electronics'; quantity = 38; reorderLevel = 10; price = 3499 },
    @{ sku = 'ELEC-1013'; name = 'UPS 1500VA'; category = 'Electronics'; quantity = 0; reorderLevel = 5; price = 13499 },
    @{ sku = 'ELEC-1014'; name = 'USB 3.2 PCIe Card'; category = 'Electronics'; quantity = 45; reorderLevel = 12; price = 1299 },
    @{ sku = 'ELEC-1015'; name = 'Studio Microphone'; category = 'Electronics'; quantity = 9; reorderLevel = 5; price = 11999 },
    @{ sku = 'ELEC-1016'; name = 'Graphics Tablet Wacom'; category = 'Electronics'; quantity = 11; reorderLevel = 4; price = 7999 },
    @{ sku = 'ELEC-1017'; name = 'External DVD Writer'; category = 'Electronics'; quantity = 0; reorderLevel = 2; price = 3299 },
    @{ sku = 'ELEC-1018'; name = 'Smart LED Bulb Pack'; category = 'Electronics'; quantity = 130; reorderLevel = 40; price = 899 },
    @{ sku = 'ELEC-1019'; name = 'HDMI Capture Card'; category = 'Electronics'; quantity = 7; reorderLevel = 5; price = 5499 },
    @{ sku = 'ELEC-1020'; name = 'NAS 4-Bay Enclosure'; category = 'Electronics'; quantity = 4; reorderLevel = 3; price = 38999 },

    # --- Accessories (18)
    @{ sku = 'ACCS-2001'; name = 'Laptop Stand'; category = 'Accessories'; quantity = 55; reorderLevel = 15; price = 1299 },
    @{ sku = 'ACCS-2002'; name = 'USB-C Cable 1m'; category = 'Accessories'; quantity = 0; reorderLevel = 40; price = 349 },
    @{ sku = 'ACCS-2003'; name = 'Laptop Backpack 20L'; category = 'Accessories'; quantity = 18; reorderLevel = 10; price = 2199 },
    @{ sku = 'ACCS-2004'; name = 'Screen Cleaning Kit'; category = 'Accessories'; quantity = 120; reorderLevel = 30; price = 199 },
    @{ sku = 'ACCS-2005'; name = 'HDMI Cable 2m'; category = 'Accessories'; quantity = 7; reorderLevel = 25; price = 449 },
    @{ sku = 'ACCS-2006'; name = 'Wireless Mousepad'; category = 'Accessories'; quantity = 33; reorderLevel = 12; price = 599 },
    @{ sku = 'ACCS-2007'; name = 'USB-C to HDMI Adapter'; category = 'Accessories'; quantity = 0; reorderLevel = 20; price = 649 },
    @{ sku = 'ACCS-2008'; name = 'Laptop Sleeve 14-inch'; category = 'Accessories'; quantity = 62; reorderLevel = 20; price = 899 },
    @{ sku = 'ACCS-2009'; name = 'Cable Management Box'; category = 'Accessories'; quantity = 41; reorderLevel = 15; price = 749 },
    @{ sku = 'ACCS-2010'; name = 'USB Hub 4-Port'; category = 'Accessories'; quantity = 88; reorderLevel = 25; price = 999 },
    @{ sku = 'ACCS-2011'; name = 'DisplayPort Cable 1.8m'; category = 'Accessories'; quantity = 5; reorderLevel = 20; price = 599 },
    @{ sku = 'ACCS-2012'; name = 'Laptop Cooling Pad'; category = 'Accessories'; quantity = 24; reorderLevel = 8; price = 1699 },
    @{ sku = 'ACCS-2013'; name = 'Travel Charger 65W'; category = 'Accessories'; quantity = 47; reorderLevel = 18; price = 2799 },
    @{ sku = 'ACCS-2014'; name = 'Microfibre Cloth Pack'; category = 'Accessories'; quantity = 210; reorderLevel = 60; price = 149 },
    @{ sku = 'ACCS-2015'; name = 'Cable Ties Assorted'; category = 'Accessories'; quantity = 0; reorderLevel = 50; price = 99 },
    @{ sku = 'ACCS-2016'; name = 'Headphone Hook'; category = 'Accessories'; quantity = 95; reorderLevel = 30; price = 129 },
    @{ sku = 'ACCS-2017'; name = 'Desk Mat XL'; category = 'Accessories'; quantity = 16; reorderLevel = 8; price = 1399 },
    @{ sku = 'ACCS-2018'; name = 'SD Card Reader'; category = 'Accessories'; quantity = 29; reorderLevel = 10; price = 1099 },

    # --- Furniture (12)
    @{ sku = 'FURN-3001'; name = 'Ergonomic Task Chair'; category = 'Furniture'; quantity = 12; reorderLevel = 4; price = 12999 },
    @{ sku = 'FURN-3002'; name = 'Standing Desk 140cm'; category = 'Furniture'; quantity = 0; reorderLevel = 2; price = 21999 },
    @{ sku = 'FURN-3003'; name = 'Filing Cabinet 3-Drawer'; category = 'Furniture'; quantity = 6; reorderLevel = 3; price = 7499 },
    @{ sku = 'FURN-3004'; name = 'Meeting Table 8-Seater'; category = 'Furniture'; quantity = 2; reorderLevel = 1; price = 34500 },
    @{ sku = 'FURN-3005'; name = 'Bookshelf 5-Tier'; category = 'Furniture'; quantity = 15; reorderLevel = 5; price = 5499 },
    @{ sku = 'FURN-3006'; name = 'Reception Desk'; category = 'Furniture'; quantity = 3; reorderLevel = 2; price = 18999 },
    @{ sku = 'FURN-3007'; name = 'Conference Chair'; category = 'Furniture'; quantity = 28; reorderLevel = 10; price = 6499 },
    @{ sku = 'FURN-3008'; name = 'Mobile Pedestal 3-Drawer'; category = 'Furniture'; quantity = 0; reorderLevel = 4; price = 8999 },
    @{ sku = 'FURN-3009'; name = 'Drafting Stool'; category = 'Furniture'; quantity = 9; reorderLevel = 3; price = 5999 },
    @{ sku = 'FURN-3010'; name = 'Meeting Room Table 6'; category = 'Furniture'; quantity = 4; reorderLevel = 2; price = 27999 },
    @{ sku = 'FURN-3011'; name = 'Locker 2-Door'; category = 'Furniture'; quantity = 18; reorderLevel = 6; price = 11499 },
    @{ sku = 'FURN-3012'; name = 'Whiteboard 6x4'; category = 'Furniture'; quantity = 11; reorderLevel = 4; price = 4999 },

    # --- Equipment (12)
    @{ sku = 'EQUIP-6001'; name = 'Barcode Scanner 1D/2D'; category = 'Equipment'; quantity = 19; reorderLevel = 6; price = 4299 },
    @{ sku = 'EQUIP-6002'; name = 'Label Printer 4-inch'; category = 'Equipment'; quantity = 0; reorderLevel = 3; price = 11999 },
    @{ sku = 'EQUIP-6003'; name = 'Handheld RF Terminal'; category = 'Equipment'; quantity = 4; reorderLevel = 4; price = 24999 },
    @{ sku = 'EQUIP-6004'; name = 'Pallet Jack Manual 2T'; category = 'Equipment'; quantity = 7; reorderLevel = 2; price = 18999 },
    @{ sku = 'EQUIP-6005'; name = 'Platform Trolley 300kg'; category = 'Equipment'; quantity = 13; reorderLevel = 4; price = 7499 },
    @{ sku = 'EQUIP-6006'; name = 'Weighing Scale 100kg'; category = 'Equipment'; quantity = 2; reorderLevel = 2; price = 8999 },
    @{ sku = 'EQUIP-6007'; name = 'Forklift Battery Charger'; category = 'Equipment'; quantity = 5; reorderLevel = 2; price = 42999 },
    @{ sku = 'EQUIP-6008'; name = 'Conveyor Belt 3m'; category = 'Equipment'; quantity = 0; reorderLevel = 1; price = 64999 },
    @{ sku = 'EQUIP-6009'; name = 'Shrink Wrapping Machine'; category = 'Equipment'; quantity = 3; reorderLevel = 1; price = 27999 },
    @{ sku = 'EQUIP-6010'; name = 'Vacuum Packer'; category = 'Equipment'; quantity = 6; reorderLevel = 2; price = 15999 },
    @{ sku = 'EQUIP-6011'; name = 'Safety Knife Auto-Retract'; category = 'Equipment'; quantity = 84; reorderLevel = 25; price = 249 },
    @{ sku = 'EQUIP-6012'; name = 'First Aid Station Wall'; category = 'Equipment'; quantity = 8; reorderLevel = 3; price = 3499 },

    # --- Wearables (10)
    @{ sku = 'WEAR-7001'; name = 'Smartwatch Series 9'; category = 'Wearables'; quantity = 23; reorderLevel = 8; price = 24999 },
    @{ sku = 'WEAR-7002'; name = 'Fitness Band 9'; category = 'Wearables'; quantity = 0; reorderLevel = 12; price = 5999 },
    @{ sku = 'WEAR-7003'; name = 'Smart Ring Gen 3'; category = 'Wearables'; quantity = 7; reorderLevel = 5; price = 12999 },
    @{ sku = 'WEAR-7004'; name = 'Safety Helmet V'; category = 'Wearables'; quantity = 36; reorderLevel = 10; price = 899 },
    @{ sku = 'WEAR-7005'; name = 'Safety Goggles Clear'; category = 'Wearables'; quantity = 112; reorderLevel = 40; price = 249 },
    @{ sku = 'WEAR-7006'; name = 'Cut-Resistant Gloves L'; category = 'Wearables'; quantity = 64; reorderLevel = 25; price = 349 },
    @{ sku = 'WEAR-7007'; name = 'High-Visibility Vest'; category = 'Wearables'; quantity = 0; reorderLevel = 30; price = 399 },
    @{ sku = 'WEAR-7008'; name = 'Steel Toe Boots'; category = 'Wearables'; quantity = 28; reorderLevel = 10; price = 2799 },
    @{ sku = 'WEAR-7009'; name = 'Ear Protection Muffs'; category = 'Wearables'; quantity = 41; reorderLevel = 15; price = 599 },
    @{ sku = 'WEAR-7010'; name = 'Cotton Gloves Pair'; category = 'Wearables'; quantity = 0; reorderLevel = 50; price = 129 },

    # --- Packaging (14)
    @{ sku = 'PACK-4001'; name = 'Corrugated Box Small'; category = 'Packaging'; quantity = 480; reorderLevel = 100; price = 18 },
    @{ sku = 'PACK-4002'; name = 'Corrugated Box Large'; category = 'Packaging'; quantity = 45; reorderLevel = 80; price = 42 },
    @{ sku = 'PACK-4003'; name = 'Bubble Wrap Roll 50m'; category = 'Packaging'; quantity = 62; reorderLevel = 20; price = 320 },
    @{ sku = 'PACK-4004'; name = 'Packing Tape 48mm'; category = 'Packaging'; quantity = 0; reorderLevel = 36; price = 85 },
    @{ sku = 'PACK-4005'; name = 'Shipping Labels 4x6'; category = 'Packaging'; quantity = 210; reorderLevel = 60; price = 249 },
    @{ sku = 'PACK-4006'; name = 'Bubble Mailer Size M'; category = 'Packaging'; quantity = 0; reorderLevel = 45; price = 32 },
    @{ sku = 'PACK-4007'; name = 'Stretch Film 500mm'; category = 'Packaging'; quantity = 38; reorderLevel = 15; price = 780 },
    @{ sku = 'PACK-4008'; name = 'Void Fill Paper 380mm'; category = 'Packaging'; quantity = 96; reorderLevel = 30; price = 540 },
    @{ sku = 'PACK-4009'; name = 'Carton Sealing Tape 72mm'; category = 'Packaging'; quantity = 74; reorderLevel = 25; price = 129 },
    @{ sku = 'PACK-4010'; name = 'Pallet Wrap Cast 20 micron'; category = 'Packaging'; quantity = 12; reorderLevel = 10; price = 1450 },
    @{ sku = 'PACK-4011'; name = 'Edge Protector 50mm'; category = 'Packaging'; quantity = 145; reorderLevel = 50; price = 22 },
    @{ sku = 'PACK-4012'; name = 'Desiccant Pack 50g'; category = 'Packaging'; quantity = 0; reorderLevel = 200; price = 6 },
    @{ sku = 'PACK-4013'; name = 'Thermal Label Roll 57mm'; category = 'Packaging'; quantity = 58; reorderLevel = 20; price = 189 },
    @{ sku = 'PACK-4014'; name = 'Kraft Paper Roll 60cm'; category = 'Packaging'; quantity = 23; reorderLevel = 12; price = 460 },

    # --- Shelving (8)
    @{ sku = 'SHLV-5001'; name = 'Steel Shelving Rack 5-Tier'; category = 'Shelving'; quantity = 8; reorderLevel = 4; price = 8999 },
    @{ sku = 'SHLV-5002'; name = 'Warehouse Rack Heavy Duty'; category = 'Shelving'; quantity = 3; reorderLevel = 5; price = 15999 },
    @{ sku = 'SHLV-5003'; name = 'Pickup Bin - Blue'; category = 'Shelving'; quantity = 140; reorderLevel = 50; price = 149 },
    @{ sku = 'SHLV-5004'; name = 'Pickup Bin - Red'; category = 'Shelving'; quantity = 0; reorderLevel = 50; price = 149 },
    @{ sku = 'SHLV-5005'; name = 'Wire Basket 3-Tier'; category = 'Shelving'; quantity = 26; reorderLevel = 8; price = 3299 },
    @{ sku = 'SHLV-5006'; name = 'Pallet Rack Beam 2700mm'; category = 'Shelving'; quantity = 16; reorderLevel = 6; price = 2450 },
    @{ sku = 'SHLV-5007'; name = 'Wall Mounted Shelf 90cm'; category = 'Shelving'; quantity = 47; reorderLevel = 15; price = 1299 },
    @{ sku = 'SHLV-5008'; name = 'Cantilever Rack 1.5m'; category = 'Shelving'; quantity = 5; reorderLevel = 3; price = 18999 },

    # --- Other (6)
    @{ sku = 'OTHR-8001'; name = 'First Aid Consumables Refill'; category = 'Other'; quantity = 19; reorderLevel = 8; price = 1299 },
    @{ sku = 'OTHR-8002'; name = 'Cleaning Cloth 10-Pack'; category = 'Other'; quantity = 0; reorderLevel = 40; price = 249 },
    @{ sku = 'OTHR-8003'; name = 'Hand Sanitiser 500ml'; category = 'Other'; quantity = 88; reorderLevel = 30; price = 149 },
    @{ sku = 'OTHR-8004'; name = 'Waste Bin 20L Pedal'; category = 'Other'; quantity = 34; reorderLevel = 12; price = 899 },
    @{ sku = 'OTHR-8005'; name = 'Coffee Mug Ceramic'; category = 'Other'; quantity = 0; reorderLevel = 25; price = 299 },
    @{ sku = 'OTHR-8006'; name = 'Notice Board A2 Cork'; category = 'Other'; quantity = 12; reorderLevel = 5; price = 1099 }
)

Write-Step "Seeding $($catalog.Count) products into the default tenant"
Add-Products -Items $catalog -Headers $tenantHeader -Label 'default tenant:'

# ---------------------------------------------------------------- per-outlet catalogues (different products per city)
$outletCatalogs = @{
    'bengaluru' = @(
        @{ sku = 'BGR-1001'; name = 'Countertop Display Case'; category = 'Shelving'; quantity = 3; reorderLevel = 2; price = 5999 },
        @{ sku = 'BGR-1002'; name = 'Card Reader Terminal'; category = 'Equipment'; quantity = 6; reorderLevel = 2; price = 7499 },
        @{ sku = 'BGR-1003'; name = 'Shopping Tote Bag'; category = 'Packaging'; quantity = 0; reorderLevel = 25; price = 149 },
        @{ sku = 'BGR-1004'; name = 'Receipt Roll 80mm'; category = 'Packaging'; quantity = 90; reorderLevel = 30; price = 99 },
        @{ sku = 'BGR-1005'; name = 'Local Coffee Blend 250g'; category = 'Other'; quantity = 48; reorderLevel = 15; price = 399 },
        @{ sku = 'BGR-1006'; name = 'Silk Filter Mask Pack'; category = 'Wearables'; quantity = 120; reorderLevel = 40; price = 199 }
    )
    'hyderabad' = @(
        @{ sku = 'HYD-2001'; name = 'Hyderabadi Pearl Jewellery Box'; category = 'Accessories'; quantity = 22; reorderLevel = 8; price = 1899 },
        @{ sku = 'HYD-2002'; name = 'IT Park Laptop Dock'; category = 'Electronics'; quantity = 15; reorderLevel = 5; price = 3499 },
        @{ sku = 'HYD-2003'; name = 'Biryani Spice Gift Set'; category = 'Other'; quantity = 0; reorderLevel = 20; price = 649 },
        @{ sku = 'HYD-2004'; name = 'Charminar Souvenir Mug'; category = 'Other'; quantity = 75; reorderLevel = 25; price = 299 },
        @{ sku = 'HYD-2005'; name = 'Warehouse RFID Gate'; category = 'Equipment'; quantity = 2; reorderLevel = 1; price = 45999 },
        @{ sku = 'HYD-2006'; name = 'Pharma Cold Chain Box'; category = 'Packaging'; quantity = 18; reorderLevel = 6; price = 1299 },
        @{ sku = 'HYD-2007'; name = 'Safety Shoes - Steel Toe'; category = 'Wearables'; quantity = 34; reorderLevel = 12; price = 2199 }
    )
    'chennai'   = @(
        @{ sku = 'CHN-3001'; name = 'Marina Beach Tote'; category = 'Packaging'; quantity = 60; reorderLevel = 20; price = 249 },
        @{ sku = 'CHN-3002'; name = 'Auto Component Bin Set'; category = 'Shelving'; quantity = 28; reorderLevel = 10; price = 1899 },
        @{ sku = 'CHN-3003'; name = 'Portable POS Terminal'; category = 'Equipment'; quantity = 9; reorderLevel = 4; price = 8999 },
        @{ sku = 'CHN-3004'; name = 'Tamil Nadu Handloom Scarf'; category = 'Wearables'; quantity = 0; reorderLevel = 15; price = 899 },
        @{ sku = 'CHN-3005'; name = 'Industrial Fan 24-inch'; category = 'Electronics'; quantity = 11; reorderLevel = 4; price = 4299 },
        @{ sku = 'CHN-3006'; name = 'Corrugated Export Crate'; category = 'Packaging'; quantity = 42; reorderLevel = 15; price = 380 },
        @{ sku = 'CHN-3007'; name = 'Workshop Tool Chest'; category = 'Furniture'; quantity = 5; reorderLevel = 2; price = 12499 },
        @{ sku = 'CHN-3008'; name = 'Humidity Indicator Card Pack'; category = 'Other'; quantity = 200; reorderLevel = 50; price = 89 }
    )
    'delhi'     = @(
        @{ sku = 'DEL-4001'; name = 'Corporate Gift Hamper Box'; category = 'Packaging'; quantity = 35; reorderLevel = 12; price = 499 },
        @{ sku = 'DEL-4002'; name = 'Conference Room Webcam Kit'; category = 'Electronics'; quantity = 8; reorderLevel = 3; price = 6799 },
        @{ sku = 'DEL-4003'; name = 'Red Fort Desk Ornament'; category = 'Other'; quantity = 0; reorderLevel = 25; price = 599 },
        @{ sku = 'DEL-4004'; name = 'Heavy Duty Pallet Jack'; category = 'Equipment'; quantity = 4; reorderLevel = 2; price = 24999 },
        @{ sku = 'DEL-4005'; name = 'Winter Thermal Jacket'; category = 'Wearables'; quantity = 19; reorderLevel = 8; price = 3499 },
        @{ sku = 'DEL-4006'; name = 'Executive Office Chair'; category = 'Furniture'; quantity = 7; reorderLevel = 3; price = 15999 },
        @{ sku = 'DEL-4007'; name = 'Barcode Label Printer Mobile'; category = 'Equipment'; quantity = 12; reorderLevel = 5; price = 9899 },
        @{ sku = 'DEL-4008'; name = 'Insulated Delivery Bag'; category = 'Packaging'; quantity = 55; reorderLevel = 18; price = 1299 }
    )
    'mumbai'    = @(
        @{ sku = 'MUM-5001'; name = 'Gateway of India Magnet Set'; category = 'Other'; quantity = 140; reorderLevel = 40; price = 149 },
        @{ sku = 'MUM-5002'; name = 'Marine Drive Desk Lamp'; category = 'Electronics'; quantity = 16; reorderLevel = 6; price = 2299 },
        @{ sku = 'MUM-5003'; name = 'Financial District Laptop Bag'; category = 'Accessories'; quantity = 0; reorderLevel = 15; price = 2799 },
        @{ sku = 'MUM-5004'; name = 'Portable Power Bank 20000mAh'; category = 'Electronics'; quantity = 48; reorderLevel = 15; price = 1899 },
        @{ sku = 'MUM-5005'; name = 'Warehouse Mezzanine Panel'; category = 'Shelving'; quantity = 3; reorderLevel = 2; price = 18999 },
        @{ sku = 'MUM-5006'; name = 'Monsoon Waterproof Cover Pack'; category = 'Packaging'; quantity = 72; reorderLevel = 25; price = 349 },
        @{ sku = 'MUM-5007'; name = 'Safety Reflective Raincoat'; category = 'Wearables'; quantity = 29; reorderLevel = 10; price = 1199 },
        @{ sku = 'MUM-5008'; name = 'High-Speed Label Applicator'; category = 'Equipment'; quantity = 2; reorderLevel = 1; price = 54999 },
        @{ sku = 'MUM-5009'; name = 'Compact Meeting Table 4-Seater'; category = 'Furniture'; quantity = 6; reorderLevel = 2; price = 18999 }
    )
}

foreach ($slug in $outletCatalogs.Keys) {
    if (-not $outletHeaders.ContainsKey($slug)) {
        Write-Warn2 "Skipping seed for $slug - tenant was not created"
        continue
    }
    $items = $outletCatalogs[$slug]
    $label = "$($outletNames[$slug]):"
    Write-Step "Seeding $($items.Count) products into $($outletNames[$slug])"
    Add-Products -Items $items -Headers $outletHeaders[$slug] -Label $label
}

# ---------------------------------------------------------------- movements (main tenant only)
Write-Step 'Recording stock movements so the history is not empty'
$listResult = Invoke-Api -Method Get -Path '/inventory/products?page=1&pageSize=100' -Headers $tenantHeader
$items = $listResult.Data.items

$movements = @(
    @{ match = 'ELEC-1001'; delta = 10; reason = 'Purchase order received' },
    @{ match = 'ELEC-1002'; delta = -5; reason = 'Damaged/defective' },
    @{ match = 'ELEC-1005'; delta = 2; reason = 'Return from customer' },
    @{ match = 'ACCS-2002'; delta = -20; reason = 'Theft or loss' },
    @{ match = 'PACK-4002'; delta = 25; reason = 'Purchase order received' },
    @{ match = 'EQUIP-6002'; delta = -3; reason = 'Cycle count adjustment' },
    @{ match = 'SHLV-5002'; delta = 1; reason = 'Purchase order received' },
    @{ match = 'FURN-3003'; delta = -2; reason = 'Damaged/defective' }
)

$recorded = 0
$skippedMv = 0
foreach ($mv in $movements) {
    $target = $items | Where-Object { $_.sku -eq $mv.match } | Select-Object -First 1
    if (-not $target) { continue }

    # Only seed a movement once per product. Re-applying the delta on every run
    # would drift quantities upward each time, so a product that already has
    # history is left alone.
    $existing = Invoke-Api -Method Get -Path "/inventory/products/$($target.id)/movements" -Headers $tenantHeader
    if ($existing.Ok -and $existing.Data -and @($existing.Data).Count -gt 0) { $skippedMv++; continue }

    # Never drive stock negative; the API rejects that by design.
    if ($target.quantity + $mv.delta -lt 0) { $skippedMv++; continue }

    $adj = Invoke-Api -Method Post -Path "/inventory/products/$($target.id)/adjust" -Headers $tenantHeader -Body @{
        quantityDelta = $mv.delta; reason = $mv.reason; note = 'Seeded demo data'
    }
    if ($adj.Ok) { $recorded++ } else { $skippedMv++ }
    Start-Sleep -Milliseconds 150
}
Write-Ok "recorded $recorded movements, skipped $skippedMv (already have history)"

# ---------------------------------------------------------------- summary
Write-Step 'Summary'
$dash = Invoke-Api -Method Get -Path '/reports/dashboard' -Headers $tenantHeader
if ($dash.Ok) {
    Write-Host "   products      : $($dash.Data.totalProducts)"
    Write-Host "   total units   : $($dash.Data.totalStock)"
    Write-Host "   low stock     : $($dash.Data.lowStockProducts)"
    Write-Host "   out of stock  : $($dash.Data.outOfStockProducts)"
    Write-Host "   stock value   : $($dash.Data.inventoryValue)"
}

foreach ($slug in $outletHeaders.Keys | Sort-Object) {
    $hdr = $outletHeaders[$slug]
    $name = $outletNames[$slug]
    $sibDash = Invoke-Api -Method Get -Path '/reports/dashboard' -Headers $hdr
    if ($sibDash.Ok) {
        Write-Host "   '$name' products : $($sibDash.Data.totalProducts)  units: $($sibDash.Data.totalStock)"
    }
}

Write-Host ''
Write-Host '  Sign in with:' -ForegroundColor Green
Write-Host "    email    : $Email" -ForegroundColor Green
Write-Host "    password : $Password" -ForegroundColor Green
Write-Host ''
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor DarkGray
Write-Host "  Swagger  : $ApiUrl/swagger" -ForegroundColor DarkGray
Write-Host ''