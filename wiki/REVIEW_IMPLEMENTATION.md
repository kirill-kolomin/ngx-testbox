Review the implementation against the attached plan. Do not implement new changes unless explicitly asked.

Goal:
- Verify that the implementation matches the plan, fixes the root cause, and does not introduce obvious regressions.

Tasks:
1. Compare implementation against the plan step by step.
2. Check whether the root cause was actually addressed.
3. Check whether scope was exceeded.
4. Review tests for adequacy:
   - do they test the bug?
   - do they test the happy path?
   - do they test likely regressions?
5. Identify fragile assumptions, hidden risks, and uncovered edge cases.
6. Identify any mismatch between claimed success criteria and actual implementation/testing.
7. Report whether the change is:
   - safe to merge
   - needs revision
   - incomplete

Rules:
- Do not make code changes.
- Be skeptical.
- Prefer finding concrete risks over giving general praise.
- Distinguish critical issues from minor suggestions.

Output format:
1. Verdict
2. Plan compliance
3. Root-cause coverage
4. Test adequacy
5. Regression risks
6. Missing edge cases
7. Recommended follow-ups