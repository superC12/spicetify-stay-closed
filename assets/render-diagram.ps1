param([string]$Output = "$PSScriptRoot\..\preview-diagram-ready.png")
Add-Type -AssemblyName System.Drawing
$bitmap = [Drawing.Bitmap]::new(1024,1024)
$g = [Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([Drawing.Color]::Black)
function Brush($Hex) { [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($Hex)) }
$surface=Brush '#111111'; $card=Brush '#202020'; $tile=Brush '#292929'; $line=Brush '#414141'; $dim=Brush '#2b2b2b'; $green=Brush '#1ed760'; $white=Brush '#ffffff'
function RoundRect($Brush,$X,$Y,$W,$H,$R=12) {
    $p=[Drawing.Drawing2D.GraphicsPath]::new()
    $d=$R*2
    $p.AddArc($X,$Y,$d,$d,180,90); $p.AddArc(($X+$W-$d),$Y,$d,$d,270,90)
    $p.AddArc(($X+$W-$d),($Y+$H-$d),$d,$d,0,90); $p.AddArc($X,($Y+$H-$d),$d,$d,90,90)
    $p.CloseFigure(); $g.FillPath($Brush,$p); $p.Dispose()
}
try {
    RoundRect $surface 36 36 624 792 16
    for($i=0;$i -lt 9;$i++) {
        $y=76+$i*78
        RoundRect $tile 68 $y 42 42 6
        $length=@(420,480,350,440,395,465,320,430,375)[$i]
        RoundRect $line 132 ($y+6) $length 10 5
        RoundRect $dim 132 ($y+26) ([int]($length*0.57)) 8 4
    }
    RoundRect $surface 692 36 296 792 16
    $outline=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#555555'),3)
    $outline.DashStyle=[Drawing.Drawing2D.DashStyle]::Dash
    $g.DrawRectangle($outline,704,48,272,768)
    RoundRect $card 720 68 240 354 10
    $g.FillEllipse($green,770,174,140,140)
    $cross=[Drawing.Pen]::new([Drawing.Color]::Black,15)
    $cross.StartCap=[Drawing.Drawing2D.LineCap]::Round; $cross.EndCap=[Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($cross,813,217,867,271); $g.DrawLine($cross,867,217,813,271)
    RoundRect $line 720 452 210 12 6
    RoundRect $dim 720 480 150 10 5
    RoundRect $card 720 530 240 258 10
    RoundRect $surface 36 860 952 128 16
    RoundRect $tile 60 884 80 80 8
    RoundRect $line 160 902 180 12 6
    RoundRect $dim 160 930 118 10 5
    $g.FillEllipse($white,580,883,48,48)
    $points=[Drawing.PointF[]]@([Drawing.PointF]::new(599,896),[Drawing.PointF]::new(599,918),[Drawing.PointF]::new(615,907))
    $g.FillPolygon([Drawing.Brushes]::Black,$points)
    RoundRect $line 420 950 420 5 2
    RoundRect $green 420 950 150 5 2
    $bitmap.Save([IO.Path]::GetFullPath($Output),[Drawing.Imaging.ImageFormat]::Png)
    $outline.Dispose(); $cross.Dispose()
} finally {
    $g.Dispose(); $bitmap.Dispose()
    foreach($b in @($surface,$card,$tile,$line,$dim,$green,$white)) { $b.Dispose() }
}
