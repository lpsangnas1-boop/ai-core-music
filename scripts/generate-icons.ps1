Add-Type -AssemblyName System.Drawing

function Generate-JukeboxIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $c1 = [System.Drawing.ColorTranslator]::FromHtml("#5865f2")
    $c2 = [System.Drawing.ColorTranslator]::FromHtml("#0e0f2d")
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 45
    $g.FillRectangle($brush, $rect)

    # Rounded border or ring
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 255, 255, 255)), ($size * 0.04)
    $g.DrawEllipse($pen, ($size * 0.1), ($size * 0.1), ($size * 0.8), ($size * 0.8))

    # Center Music Note Text / Symbol
    $fontSize = [single]($size * 0.38)
    $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $g.DrawString([char]0x266B, $font, $textBrush, ($size / 2), ($size / 2), $format)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $outputPath ($size x $size)"
}

Generate-JukeboxIcon 192 "client/public/icon-192.png"
Generate-JukeboxIcon 512 "client/public/icon-512.png"
