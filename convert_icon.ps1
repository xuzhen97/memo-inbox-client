Add-Type -AssemblyName System.Drawing
$imgPath = "D:\vcp-hub\memo-inbox-client\docs\branding\icon_concept_b.png"
$outputPath = "D:\vcp-hub\memo-inbox-client\docs\branding\icon_concept_b_real.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$img.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Output "Conversion complete: $outputPath"
