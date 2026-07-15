# Generate 3-slide CXO executive deck
# Requires Microsoft PowerPoint

$ErrorActionPreference = "Stop"
$outputPath = Join-Path $PSScriptRoot "Agentic_QE_CXO_Deck.pptx"

$slides = @(
    @{
        Title = "Agentic QE at VikingCloud"
        Bullets = @(
            "The Opportunity"
            "Manual test design consumes 4-8 hours per story across our squads"
            "Coverage gaps in security, edge cases, and UAT drive escape defects"
            "Automation backlog outpaces SDET capacity"
            "The Answer: AI agents with human-gated quality controls"
            "Cursor agents read Jira + Confluence + PRDs and auto-generate labeled test cases"
            "QA SME review before publish. Full traceability Jira to XRay to Automation"
        )
    }
    @{
        Title = "How It Works and What We Measure"
        Bullets = @(
            "8-phase continuous loop: Intake, Knowledge, Design, Review, XRay, Automate, Codegen, Execute"
            "11 specialized agents. 6 mandatory human review gates. Zero compromise on quality bar"
            "Year 1 measurable targets (illustrative, 4 squads / ~16 QE FTE)"
            "TC authoring time: down 75 percent (under 15 min vs 4-8 hrs per story)"
            "Escape defects: down 40 percent. Automation throughput: up 3x"
            "100 percent traceability: every story linked to XRay and automation"
            "Projected Year 1 value: 357K labor savings + 85K defect cost avoidance"
            "4.8x ROI. 18-week payback on 45K platform investment"
        )
    }
    @{
        Title = "Decision and Next Steps"
        Bullets = @(
            "The Ask: Approve 4-week pilot with 1 squad (10 stories)"
            "Investment: 45K Year 1 (Cursor, MCP integrations, QE training)"
            "Pilot success criteria: 75 pct TC time reduction, 100 pct AC coverage, SME sign-off rate"
            "Rollout: Pilot (4 wks) then Integrate (6 wks) then Automate (6 wks) then Scale"
            "Risk mitigation: Human-in-the-loop at every gate. No auto-publish without SME approval"
            "Owner: QE Leadership. Executive sponsor requested for cross-squad adoption"
            "Decision needed: Greenlight pilot by end of Q3"
        )
    }
)

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
    $presentation = $ppt.Presentations.Add()

    foreach ($slideData in $slides) {
        $isTitle = ($slideData.Title -eq "Agentic QE at VikingCloud")
        $layout = if ($isTitle) { 1 } else { 2 }
        $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, $layout)
        $slide.Shapes.Title.TextFrame.TextRange.Text = $slideData.Title

        if ($slide.Shapes.Count -ge 2) {
            $body = $slide.Shapes.Item(2).TextFrame.TextRange
            $body.Text = ""
            $first = $true
            foreach ($bullet in $slideData.Bullets) {
                if (-not $first) { $body.InsertAfter("`r") }
                $first = $false
                $para = $body.Paragraphs($body.Paragraphs().Count)
                $para.Text = $bullet
                if (-not $isTitle) { $para.ParagraphFormat.Bullet.Type = 1 }
            }
        }
    }

    if (Test-Path $outputPath) { Remove-Item $outputPath -Force }
    $presentation.SaveAs($outputPath)
    Write-Host "CXO deck saved to: $outputPath"
    $presentation.Close()
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
catch {
    Write-Warning "PowerPoint COM failed: $_"
    Write-Host "Use presentation/cxo-slides.html as fallback"
    exit 1
}
