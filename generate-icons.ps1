# Matrix New Tab — Icon Generator
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "icons"

foreach ($sz in @(16, 48, 128)) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode  = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Black background
    $g.FillRectangle([System.Drawing.Brushes]::Black, 0, 0, $sz, $sz)

    # Green character columns (simulated)
    $greenBright = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 192, 255, 192))
    $greenMid    = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220,   0, 255,  65))
    $greenFade   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100,   0, 180,  30))
    $greenDark   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb( 50,   0,  80,  10))

    if ($sz -ge 48) {
        $fs = [int]($sz * 0.12)
        $font = New-Object System.Drawing.Font("Courier New", $fs, [System.Drawing.FontStyle]::Regular)
        $cols = @(0.06, 0.24, 0.42, 0.60, 0.78)
        foreach ($cx in $cols) {
            $px = [int]($sz * $cx)
            $rows = 5 + [int](($sz / 128.0) * 3)
            for ($r = 0; $r -lt $rows; $r++) {
                $py = [int]($r * $sz / $rows)
                $br = if ($r -eq 0) { $greenBright } elseif ($r -eq 1) { $greenMid } elseif ($r -lt 3) { $greenFade } else { $greenDark }
                $g.DrawString("ﾊ", $font, $br, $px, $py)
            }
        }
        $font.Dispose()
    }

    # Green border
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 0, 255, 65))
    $borderPen.Width = [System.Single](1)
    $g.DrawRectangle($borderPen, 0, 0, $sz - 1, $sz - 1)

    $bmp.Save("$dir\icon$sz.png", [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Generated icon$sz.png"
}
Write-Host "Done."
