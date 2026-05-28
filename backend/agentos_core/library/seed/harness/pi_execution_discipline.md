---
id: pi_execution_discipline
type: harness_policy
version: 1
name: Pi Execution Discipline
category: execution
source: "C:\\Users\\riege\\Documents\\perso\\SYSTEM.md"
rules:
  - targeted_inspection
  - precise_edits
  - parallel_independent_inspection
  - root_cause_fixes
  - validate_before_final_claims
  - concise_output
---

# Pi Execution Discipline

## Behavior

Use targeted inspection before broad reads. Prefer precise edits with minimal changed text. Use parallel independent inspection for unrelated files or commands. Fix root causes instead of symptoms. Always validate before final claims. Keep output concise and relevant.

## Runtime Contract

Return:

- files inspected
- files changed
- commands run
- evidence collected
- residual risks
