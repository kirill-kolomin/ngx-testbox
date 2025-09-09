# Ngx-Testbox

[![npm version](https://img.shields.io/npm/v/ngx-testbox.svg)](https://www.npmjs.com/package/ngx-testbox)
[![npm downloads](https://img.shields.io/npm/dm/ngx-testbox.svg)](https://www.npmjs.com/package/ngx-testbox)
[![CI](https://github.com/kirill-kolomin/ngx-testbox/actions/workflows/ci.yml/badge.svg)](https://github.com/kirill-kolomin/ngx-testbox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.txt)

**Black-box integration testing for Angular made easy.**

Ngx-testbox empowers developers to write integration tests with **minimal setup** and **maximum reliability**.  
Abstract away internal implementation details and focus on what actually matters—your feature's behavior as seen by the user.

📚 Full documentation: [ngx-testbox docs](https://kirill-kolomin.github.io/ngx-testbox-docs/)

---

## Key Benefits

- **Black-box by design**  
  Focus on inputs and outputs, not the internals. Tests remain concise, maintainable, and stable.

- **Deterministic async control**  
  Leveraging Angular’s Zone, `ngx-testbox` waits for your app to stabilize—HTTP calls complete, DOM settled—before assertions continue.

- **UX-centric testing**  
  Ensure what users actually see is what matters. Internal state isn't enough if the UI doesn't reflect it.

- **Test-Driven Development friendly**  
  Write tests first using your REST API contract and UI expectations; implement logic later—boosts confidence and speed.

---

## Getting Started

```bash

npm install ngx-testbox --save-dev

```

Or using yarn

```bash

yarn add ngx-testbox --dev

```

## Quick Example

```typescript
import { fakeAsync } from '@angular/core/testing';
import { DebugElementHarness, predefinedHttpCallInstructions, runTasksUntilStable } from 'ngx-testbox/testing';

describe('MyComponent', () => {
  let harness: DebugElementHarness<typeof testIds>;

  beforeEach(() => {
    // setup TestBed, component, and harness
  });

  it('should display data on success', fakeAsync(() => {
    const mockData = [{ id: 1, name: 'Item A' }];

    runTasksUntilStable(fixture, {
      httpCallInstructions: [
        predefinedHttpCallInstructions.get.success('/api/items', mockData)
      ]
    });

    const items = harness.elements.item.queryAll();
    expect(items.length).toBe(1);
    expect(harness.elements.itemText.getTextContent(items[0])).toContain('Item A');
  }));
});
```

## Documentation & Examples

👉 Visit the full [documentation site](https://kirill-kolomin.github.io/ngx-testbox-docs/) to explore:
- Concept overviews
- Step-by-step tutorials
- Full application examples (e.g., Todo flows)

## Continuous Integration

This project uses GitHub Actions for continuous integration. The workflow:
- Runs on every push to main/master branches and pull requests
- Builds the library
- Runs tests for all projects with code coverage
- Uploads coverage reports as artifacts

You can see the workflow status in the Actions tab of the repository.

## Contributing & Support

Contributions are welcome — submit issues or PRs on GitHub.

For discussions or questions, reach out at:
- 📧 [kkolomin.w@gmail.com](mailto:kkolomin.w@gmail.com)
- 💼 [LinkedIn](https://www.linkedin.com/in/kirill-kolomin/)
