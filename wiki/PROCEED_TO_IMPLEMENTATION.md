Proceed to implementation of the attached plan.

Goal:
- Implement the approved plan exactly and safely.

Requirements:
1. Complete the development steps from the plan.
2. Write or update tests defined in the testing strategy.
3. If editing logic in an existing function, inspect its usages across the codebase and preserve existing behavior outside the scope of the plan.
4. Run relevant existing tests and ensure they pass.
5. If the plan is incomplete, inconsistent with the codebase, or unsafe to implement, stop and report the mismatch before proceeding.

Rules:
- Do not broaden scope beyond the plan.
- Do not make unrelated refactors, renames, formatting-only changes, or cleanup edits.
- Do not silently change behavior not covered by the plan.
- Prefer minimal edits.
- Preserve public interfaces unless the plan explicitly says otherwise.
- If implementation reveals the plan is wrong, stop and explain what changed.
- If a test fails outside the scope of the plan, report it separately instead of folding it into the same changes unless explicitly required.

Before coding:
- Verify the target files/functions from the plan exist.
- Verify the proposed changes still matches current code.
- Identify affected callers/usages of changed logic.
- Confirm which tests should fail before the changes and pass after the changes.

After coding:
- Summarize exact files changed.
- Summarize what was changed in each file.
- Summarize why the change is safe.
- Summarize tests added/updated.
- Report test results.
- Report any remaining risks or follow-up items.

Ask if something is not clear or ambiguous.