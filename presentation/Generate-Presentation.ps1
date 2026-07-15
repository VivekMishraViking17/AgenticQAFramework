# Generate Agentic QE Framework PowerPoint
# Requires Microsoft PowerPoint installed

$ErrorActionPreference = "Stop"
$outputPath = Join-Path $PSScriptRoot "Agentic_QE_Framework.pptx"

$slides = @(
    @{
        Title = "Agentic QE Framework"
        Bullets = @(
            "End-to-End AI-Powered Quality Engineering"
            "Cursor Agents + Jira + Confluence + XRay + Automation"
            "Human-in-the-Loop with Measurable Gates"
            "June 2026"
        )
    }
    @{
        Title = "Executive Summary"
        Bullets = @(
            "AI agents auto-generate labeled test cases from Jira stories"
            "Context enriched from Confluence, PRDs, and customer bug history"
            "QA SME review before XRay publication - quality bar preserved"
            "Automation MCP generates Cypress/Playwright scripts from approved tests"
            "Defects auto-filed to Jira with full traceability"
        )
    }
    @{
        Title = "Problem Statement"
        Bullets = @(
            "Manual test case authoring: 4-8 hours per story"
            "Inconsistent coverage: security, edge, UAT often missed"
            "Knowledge siloed across Jira, Confluence, PRDs, bug history"
            "Automation backlog grows faster than SDET capacity"
            "Weak traceability: Story to TC to Automation to Defect"
        )
    }
    @{
        Title = "Vision and Objectives"
        Bullets = @(
            "Accelerate: TC draft in under 15 minutes per story"
            "Broaden: Systematic functional, NFR, security, data, edge, UAT coverage"
            "Preserve: Mandatory human review gates at every critical step"
            "Trace: 100 percent Jira to XRay to Automation to Defect linkage"
            "Measure: KPIs on cycle time, coverage, automation rate, escapes"
        )
    }
    @{
        Title = "8-Phase Lifecycle Overview"
        Bullets = @(
            "1. Story Intake - Parse Jira DOD and Acceptance Criteria"
            "2. Knowledge Retrieval - Confluence, PRD, customer bugs"
            "3. Test Design - Multi-agent TC generation with labels"
            "4. QA SME Review - Checklist-gated approval (rework loop)"
            "5. XRay Sync - Publish finalized test cases"
            "6. Automation Plan - Scout identifies candidates"
            "7. Script Generation - Cypress/Playwright via MCP"
            "8. Execute and Defect - CI runs, Jira bugs with labels"
        )
    }
    @{
        Title = "Phase 1-2: Intake and Knowledge"
        Bullets = @(
            "Story Context Agent: Triggered when story is Ready for QA"
            "Parses description, AC, DOD, labels, component, epic link"
            "Knowledge Agent: RAG over Confluence pages and PRD docs"
            "Pulls related customer bugs and regression history"
            "Human Gate: PO confirms scope; SME validates source relevance"
        )
    }
    @{
        Title = "Phase 3: Multi-Agent Test Design"
        Bullets = @(
            "Test Design Agent: Functional, edge, data-centric, NFR cases"
            "Security Test Agent: OWASP categories, auth boundaries"
            "UAT Agent: Business scenarios from PRD personas"
            "Each TC tagged: priority, component, source citation"
            "Automation candidate flag set per TC"
        )
    }
    @{
        Title = "Test Case Taxonomy"
        Bullets = @(
            "functional - Core feature behavior per AC"
            "non-functional - Performance, reliability, usability"
            "edge-case - Boundaries, empty states, concurrency"
            "data-centric - CRUD, validation, migration"
            "security - AuthN/Z, injection, IDOR, exposure"
            "uat - Business acceptance flows"
            "accessibility - WCAG, keyboard, screen reader"
            "api-contract - Schema, status codes, versioning"
            "regression - Prior bug reproduction"
        )
    }
    @{
        Title = "Phase 4: QA SME Review Gate"
        Bullets = @(
            "Review Orchestrator produces coverage matrix vs AC"
            "Mandatory checklist: AC 100 percent, all categories, no duplicates"
            "Security cases required for trust boundaries"
            "Peer sign-off for P1 stories"
            "Reject: rework loop back to Test Design"
            "Approve: proceed to XRay publication"
        )
    }
    @{
        Title = "Phase 5: XRay Publication"
        Bullets = @(
            "XRay Sync Agent creates/updates tests via MCP"
            "Links each test to Jira story for traceability"
            "Applies labels matching taxonomy"
            "Human Gate: QE Lead approves publish"
            "Test plan version tagged for audit"
        )
    }
    @{
        Title = "Phase 6-7: Automation"
        Bullets = @(
            "Automation Scout monitors XRay for new approved tests"
            "Prioritizes P1/P2 automation candidates"
            "Codegen Agent generates Cypress or Playwright scripts"
            "Follows page object standards, data-testid selectors"
            "SDET code review gate before merge"
            "PR links to XRay test key"
        )
    }
    @{
        Title = "Phase 8: Execution and Defects"
        Bullets = @(
            "Execution Agent runs CI pipeline, collects artifacts"
            "Flake detection and retry policy"
            "Product failures handled by Defect Triage Agent"
            "Auto-creates Jira bug with labels: auto-filed, component, severity"
            "Links: XRay test key, screenshot, stack trace"
            "Dev triage validates product vs test fragility"
        )
    }
    @{
        Title = "MCP Integration Architecture"
        Bullets = @(
            "Cursor Orchestration Layer coordinates all agents"
            "Atlassian MCP: Jira stories, Confluence, JQL search"
            "XRay MCP: Test CRUD, story linking, run sync"
            "Git/CI MCP: Repo read, PR creation, pipeline trigger"
            "Test Framework MCP: Cypress/Playwright codegen"
        )
    }
    @{
        Title = "Human-in-the-Loop Gates (6)"
        Bullets = @(
            "Gate 1: PO scope confirmation (Definition of Ready)"
            "Gate 2: SME source validation (knowledge retrieval)"
            "Gate 3: QA SME test review (mandatory checklist)"
            "Gate 4: QE Lead XRay publish approval"
            "Gate 5: SDET automation prioritization and code review"
            "Gate 6: Dev defect triage (product vs test)"
        )
    }
    @{
        Title = "Measurables and KPIs"
        Bullets = @(
            "TC draft time: under 15 min per story"
            "AC coverage: 100 percent at review"
            "SME turnaround: under 1 business day"
            "Automation coverage (P1/P2): 70 percent or higher"
            "Codegen first-pass approval: 85 percent or higher"
            "Defect label accuracy: 95 percent or higher"
            "Escape defect rate: trend down QoQ"
        )
    }
    @{
        Title = "Skills: People, Process, Technology"
        Bullets = @(
            "People: QE Lead, QA SME, SDET, PO - plus prompt engineering"
            "Process: DOR, RACI, change control, audit trail, escalation SOP"
            "Technology: Cursor, Jira, Confluence, XRay, Cypress/Playwright"
            "MCP servers, CI/CD, vector index, metrics dashboard"
            "Security: No PII/secrets in prompts; vault for credentials"
        )
    }
    @{
        Title = "Rollout Roadmap"
        Bullets = @(
            "Pilot (Weeks 1-4): 1 squad, 10 stories, baseline metrics"
            "Integrate (Weeks 5-10): XRay MCP, review automation, KPIs"
            "Automate (Weeks 11-18): Codegen MCP, CI, defect agent"
            "Scale (Ongoing): All squads, prompt tuning, quarterly reviews"
        )
    }
    @{
        Title = "Next Steps"
        Bullets = @(
            "Identify pilot squad and 10 representative stories"
            "Configure Atlassian MCP and Jira field mappings"
            "Define prompt templates and TC taxonomy labels"
            "Establish SME review roster and checklists"
            "Set baseline KPIs and success criteria"
            "Questions?"
        )
    }
)

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue

    $presentation = $ppt.Presentations.Add()

    foreach ($slideData in $slides) {
        $isTitle = ($slideData.Title -eq "Agentic QE Framework")
        $layout = if ($isTitle) { 1 } else { 2 }
        $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, $layout)

        $slide.Shapes.Title.TextFrame.TextRange.Text = $slideData.Title

        if ($slide.Shapes.Count -ge 2) {
            $body = $slide.Shapes.Item(2).TextFrame.TextRange
            $body.Text = ""
            $first = $true
            foreach ($bullet in $slideData.Bullets) {
                if (-not $first) {
                    $body.InsertAfter("`r")
                }
                $first = $false
                $para = $body.Paragraphs($body.Paragraphs().Count)
                $para.Text = $bullet
                if (-not $isTitle) {
                    $para.ParagraphFormat.Bullet.Type = 1
                }
            }
        }
    }

    if (Test-Path $outputPath) { Remove-Item $outputPath -Force }
    $presentation.SaveAs($outputPath)
    Write-Host "Presentation saved to: $outputPath"
    $presentation.Close()
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
catch {
    Write-Warning "PowerPoint COM failed: $_"
    Write-Host "Use presentation/slides.html as fallback (browser fullscreen)"
    exit 1
}
