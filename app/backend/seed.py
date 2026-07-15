from .models import Story


def seed_database(db):
    samples = [
        Story(
            key="QE-1001",
            title="Merchant onboarding theme configuration API",
            description="As a merchant admin I want to configure my portal theme so that branding matches my store.",
            acceptance_criteria="- POST /merchanttheme returns 200 with valid payload\n- Invalid theme ID returns 400\n- Unauthorized user receives 403\n- Theme persists after page reload",
            definition_of_done="- Unit tests pass\n- API documented in Confluence\n- QA sign-off",
            component="vcp-subscription-service",
            priority="P1",
            phase="intake",
        ),
        Story(
            key="QE-1002",
            title="Dashboard drawer close on Escape key",
            description="Identity protection drawer should close when user presses Escape or clicks overlay.",
            acceptance_criteria="- Escape key closes drawer\n- Click outside closes drawer\n- Focus returns to trigger element",
            definition_of_done="- Accessibility review done\n- E2E test in CI",
            component="VCPCORE",
            priority="P2",
            phase="design",
        ),
    ]
    for s in samples:
        db.add(s)
    db.commit()
