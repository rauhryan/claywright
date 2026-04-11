# Test Plan: Virtual Scroll and Text Measurement Test Plan

## Status
Draft for review

## 1. Overview
Tests for virtual scroll and text measurement as defined in:
- Specification: [.pi/specs/spec-virtual-scroll-text-measure.md](.pi/specs/spec-virtual-scroll-text-measure.md)
- Design: [.pi/specs/design-virtual-scroll-text-measure.md](.pi/specs/design-virtual-scroll-text-measure.md)

This plan covers the `clayterm`, `@tui/core`, and `@tui/solid-bindings` layers. The goal is to verify that text measurement is deterministic and Clay-compatible, that virtualization happens before Clay op emission, and that transcript-oriented scrolling behavior remains stable under streaming tail updates, width changes, budgets, and collapse/expand behavior.

## 2. Test Strategy

### 2.1 Approach
Use a layered strategy:
- **Unit tests** for pure measurement helpers, cache invalidation, validation, and viewport math.
- **Integration tests** for `Renderer`, geometry delegation, wheel routing, viewport windowing, and imperative handle behavior.
- **Blackbox / E2E tests** with `ghostty-vt`-based harnesses for real terminal behavior: scrolling, auto-follow, anchoring, streaming, collapse/expand, and large-history bounded materialization.
- **Static/document tests** for explicit deferred TODO tracking in spec-facing artifacts where required.

### 2.2 Tools
- `bun test`
- Existing package-level test suites in:
  - `packages/clayterm`
  - `packages/core`
  - `packages/solid-bindings`
  - `packages/test-harness`
- Blackbox terminal tests using the repo's Ghostty VT harness
- Convergence helpers preferred over fixed sleeps:
  - `waitForTextConvergence`
  - `waitForFrameText`
  - `waitForFrame`

### 2.3 Coverage Goals
- **100% of MUST requirements** covered by at least one test case.
- **Negative coverage** for all normative error-handling paths.
- **Practical coverage** for SHOULD requirements.
- At least one blackbox test for each of the following behavioral groups:
  - auto-follow / end anchoring
  - history browsing / top anchor preservation
  - collapse/expand behavior
  - bounded materialization with large history

## 3. Test Cases

### TC-001: measureCellWidth returns Clay-compatible cell widths
- **Requirement**: REQ-001, REQ-035
- **Type**: Unit
- **Priority**: High
- **Preconditions**: Public measurement helpers are exported from `clayterm`.
- **Steps**:
  1. Call `measureCellWidth("")`.
  2. Call `measureCellWidth("abc")`.
  3. Call `measureCellWidth` with strings containing combining marks and zero-width codepoints.
  4. Call `measureCellWidth` twice with identical inputs.
- **Expected Result**:
  - Empty string returns `0`.
  - ASCII width equals character count.
  - Combining / zero-width codepoints contribute `0` additional cells.
  - Repeated calls return identical values.
- **Notes**: Include control-character coverage to confirm non-positive `wcwidth` values are treated as `0`.

### TC-002: wrapText honors supported wrap modes
- **Requirement**: REQ-002
- **Type**: Unit
- **Priority**: High
- **Preconditions**: `wrapText` is exported.
- **Steps**:
  1. Call `wrapText` with `mode: "words"` on a multi-word string and narrow width.
  2. Call `wrapText` with `mode: "newlines"` on text containing embedded newlines.
  3. Call `wrapText` with `mode: "none"` on a long string.
  4. Call `wrapText` with `width = 0`.
- **Expected Result**:
  - Word wrapping breaks on word boundaries where possible.
  - Newline mode wraps only at newlines.
  - None mode returns at most one non-empty line.
  - Zero width returns `[]`.
- **Notes**: Verify the exported type supports the three normative modes.

### TC-003: measureWrappedHeight matches wrapText line count
- **Requirement**: REQ-003
- **Type**: Unit
- **Priority**: High
- **Preconditions**: `wrapText` and `measureWrappedHeight` are exported.
- **Steps**:
  1. Prepare several inputs across `words`, `newlines`, and `none` modes.
  2. For each case, compute `wrapText(...).length`.
  3. Compute `measureWrappedHeight(...)` for the same inputs.
- **Expected Result**:
  - Wrapped height equals wrapped line count for every case.
  - Empty string returns `0`.
  - Width `0` returns `0`.

### TC-004: completed-render geometry is available by element ID
- **Requirement**: REQ-005, REQ-006, REQ-007
- **Type**: Integration
- **Priority**: High
- **Preconditions**: Geometry query is exposed on both term and renderer layers.
- **Steps**:
  1. Create a small app with a stable element ID inside a laid-out box.
  2. Query bounds before first render.
  3. Render once and query bounds by ID.
  4. Change layout dimensions and render again.
  5. Query an unknown ID.
- **Expected Result**:
  - Bounds are `undefined` before first completed render.
  - Known ID returns `{x,y,width,height}` after render.
  - Bounds update after layout changes.
  - Unknown ID returns `undefined` without throwing.

### TC-005: viewport accepts explicit ordered items and materializes contiguous windows
- **Requirement**: REQ-008, REQ-014
- **Type**: Integration
- **Priority**: High
- **Preconditions**: `VirtualViewport` exists and accepts typed items.
- **Steps**:
  1. Construct a viewport with an ordered array of `VirtualItem`s.
  2. Render at a size that causes only a subset to fit.
  3. Inspect viewport state and emitted structure.
- **Expected Result**:
  - The viewport consumes explicit items rather than arbitrary children as its virtualization source.
  - The materialized range is contiguous by index.
  - Outer clip plus top and bottom spacer structure is present.

### TC-006: stable item keys are required and preserved across updates
- **Requirement**: REQ-009
- **Type**: Integration
- **Priority**: High
- **Preconditions**: Viewport renders a stable item sequence.
- **Steps**:
  1. Render items with unique keys.
  2. Append new items while preserving existing keys.
  3. Perform a tail rewrite that keeps one item's key stable.
- **Expected Result**:
  - Existing items retain identity across append and tail rewrite.
  - Viewport state and caches continue to reference the stable key.

### TC-007: version changes invalidate cached measurement
- **Requirement**: REQ-010, REQ-018
- **Type**: Unit
- **Priority**: High
- **Preconditions**: Measurement cache is observable via instrumentation or test doubles.
- **Steps**:
  1. Measure an item at width `W` with version `1`.
  2. Measure again at width `W` with version `1`.
  3. Change only the version to `2` and measure again.
  4. Change only the width and measure again.
- **Expected Result**:
  - The second call reuses cache.
  - Changing version invalidates cache.
  - Changing width invalidates cache.

### TC-008: items measure as width-dependent values with optional budgets
- **Requirement**: REQ-011
- **Type**: Unit
- **Priority**: High
- **Preconditions**: A test item can return measurement data.
- **Steps**:
  1. Measure the same item at two different widths.
  2. Return a measurement with `height`, `estimatedElements`, and `estimatedMeasuredWords`.
  3. Feed the result into viewport math.
- **Expected Result**:
  - Height changes when width changes for width-sensitive content.
  - Optional budget estimates are accepted.
  - Measurement output is consumed as numeric row and estimate values.

### TC-009: viewport virtualizes before Clay op emission
- **Requirement**: REQ-013, REQ-036
- **Type**: Integration
- **Priority**: High
- **Preconditions**: Emitted ops can be inspected before they are rendered.
- **Steps**:
  1. Create a viewport with a very large history and a small visible region.
  2. Render the viewport.
  3. Inspect the generated Clay ops / rendered item IDs.
  4. Increase non-visible history and render again without changing viewport size.
- **Expected Result**:
  - Only the materialized window and spacer structure appear in emitted ops.
  - Non-materialized historical items do not appear in the ops array.
  - Increasing hidden history does not proportionally increase emitted ops.

### TC-010: viewport always renders visible items even under tight budgets
- **Requirement**: REQ-015, REQ-017
- **Type**: Integration
- **Priority**: High
- **Preconditions**: A viewport can be configured with very small budgets.
- **Steps**:
  1. Create several items that fill the viewport with little or no overscan budget left.
  2. Configure budgets below the cost of visible items.
  3. Render the viewport.
- **Expected Result**:
  - All viewport-intersecting items remain materialized.
  - `budgetExceeded` is `true`.
  - Rendering is not automatically degraded.

### TC-011: overscan is reduced before visible coverage is reduced
- **Requirement**: REQ-016
- **Type**: Integration
- **Priority**: Medium
- **Preconditions**: Overscan and budget settings are configurable.
- **Steps**:
  1. Configure a viewport with overscan rows and a moderate budget.
  2. Render once with sufficient budget.
  3. Tighten the budget until overscan no longer fully fits.
- **Expected Result**:
  - Overscan appears when budget permits.
  - Overscan shrinks when budget tightens.
  - Visible items remain present.

### TC-012: end threshold and viewport state are computed correctly
- **Requirement**: REQ-019, REQ-024
- **Type**: Unit
- **Priority**: High
- **Preconditions**: Viewport state can be read via handle or callback.
- **Steps**:
  1. Configure `endThresholdRows = 1`.
  2. Position viewport one row from the end.
  3. Position viewport more than one row from the end.
  4. Read state each time.
- **Expected Result**:
  - `atEnd` is `true` within threshold.
  - `atEnd` is `false` outside threshold.
  - Reported state includes all required fields.

### TC-013: auto-follow preserves bottom anchor on append and remeasurement
- **Requirement**: REQ-020, REQ-022
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Transcript viewport fixture with streaming tail updates.
- **Steps**:
  1. Spawn a transcript viewport at end with `autoFollow = true`.
  2. Stream additional tail content.
  3. Trigger a tail rewrite that changes measured height.
  4. Trigger a width change.
- **Expected Result**:
  - Viewport remains at end after append.
  - Viewport remains at end after tail remeasurement.
  - Viewport remains at end after width change.

### TC-014: browsing history preserves top visible anchor across reflow
- **Requirement**: REQ-021
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Transcript viewport with enough history to scroll away from end.
- **Steps**:
  1. Scroll upward until a known anchor item becomes first visible.
  2. Disable auto-follow implicitly by scrolling.
  3. Append new tail content.
  4. Trigger a tail rewrite and then a width change.
- **Expected Result**:
  - The same anchored item remains first visible when still present.
  - The intra-item reading position remains stable within measurement tolerance.

### TC-015: imperative viewport handle controls scrolling and follow mode
- **Requirement**: REQ-022
- **Type**: Integration
- **Priority**: High
- **Preconditions**: A ref or handle is available from `VirtualViewport`.
- **Steps**:
  1. Call `scrollTo(offset)`.
  2. Call `scrollBy(delta)`.
  3. Call `setAutoFollow(false)`.
  4. Call `scrollToLatest()`.
  5. Read `getState()` after each call.
- **Expected Result**:
  - Scroll position updates as requested and clamps to valid range.
  - Turning off auto-follow leaves current position unchanged.
  - `scrollToLatest()` moves to end and enables auto-follow.

### TC-016: user scrolling disables and re-enables auto-follow appropriately
- **Requirement**: REQ-023
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Interactive transcript fixture with visible follow state.
- **Steps**:
  1. Start at end with auto-follow enabled.
  2. Send wheel-up or PageUp.
  3. Confirm follow mode turns off.
  4. Scroll to the end using wheel-down / End.
- **Expected Result**:
  - Backward user scroll disables auto-follow.
  - Reaching end threshold re-enables auto-follow.
  - State changes are visible through callback/fixture output.

### TC-017: wheel events route through renderable bubbling and default viewport handling
- **Requirement**: REQ-025, REQ-026
- **Type**: Integration
- **Priority**: High
- **Preconditions**: Core wheel event plumbing exists; viewport is nested in a render tree.
- **Steps**:
  1. Hover a nested child inside the viewport and emit a wheel event.
  2. Observe target and ancestor handlers.
  3. Repeat with a descendant that calls `preventDefault()`.
- **Expected Result**:
  - The deepest hovered renderable receives the wheel event first.
  - The wheel event bubbles to viewport ancestors.
  - Default viewport scrolling occurs only when the event is not prevented.
  - Default wheel step is `3` rows.

### TC-018: PageUp/PageDown/Home/End keyboard scrolling works
- **Requirement**: REQ-027
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Focus is within the viewport or a descendant that allows bubbling.
- **Steps**:
  1. Send PageDown.
  2. Send PageUp.
  3. Send Home.
  4. Send End.
- **Expected Result**:
  - PageDown scrolls by `max(viewportHeight - 1, 1)`.
  - PageUp scrolls by the same amount in the opposite direction.
  - Home sets scroll to start and disables auto-follow.
  - End moves to max scroll and enables auto-follow.

### TC-019: optional arrow-key scrolling is off by default and works when enabled
- **Requirement**: REQ-028
- **Type**: Integration
- **Priority**: Medium
- **Preconditions**: Two viewport fixtures: one with `enableArrowKeys = false`, one with `true`.
- **Steps**:
  1. Send ArrowDown and ArrowUp to the disabled fixture.
  2. Send ArrowDown and ArrowUp to the enabled fixture.
- **Expected Result**:
  - Disabled fixture does not scroll on arrow keys.
  - Enabled fixture scrolls by `keyStepRows`.

### TC-020: focused content blurred by virtualized unmount or collapse remains within current JS focus semantics
- **Requirement**: REQ-029
- **Type**: Integration
- **Priority**: High
- **Preconditions**: A focusable control exists inside a virtualized or collapsible item.
- **Steps**:
  1. Focus the nested control.
  2. Collapse or virtualize away the containing item.
  3. Read focus state.
- **Expected Result**:
  - The implementation does not preserve hidden logical focus for the unmounted content.
  - Current JS behavior may blur the removed subtree.

### TC-021: transcript streaming supports append plus tail rewrite with stable keys
- **Requirement**: REQ-030
- **Type**: Integration
- **Priority**: High
- **Preconditions**: Transcript adapter fixture that simulates streaming markdown.
- **Steps**:
  1. Start with settled history plus one unsettled tail item.
  2. Append new content to the tail.
  3. Rewrite the tail item from plain text to a closed code fence or math-enhanced form while retaining key.
- **Expected Result**:
  - Earlier settled items remain unchanged.
  - Tail item retains key and updates version.
  - Viewport updates without requiring arbitrary historical rewrites.

### TC-022: thinking blocks are collapsible and default expanded
- **Requirement**: REQ-031
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Transcript fixture with a thinking block and visible collapse toggle.
- **Steps**:
  1. Render the fixture initially.
  2. Observe the thinking block content.
  3. Activate the collapse toggle.
  4. Activate the toggle again to expand.
- **Expected Result**:
  - The thinking block is initially expanded.
  - Collapse reduces visible height.
  - Expand restores the full content.

### TC-023: collapsed thinking blocks continue updating in background
- **Requirement**: REQ-032
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Collapsible thinking block fixture that continues streaming while collapsed.
- **Steps**:
  1. Collapse the thinking block.
  2. Stream additional thinking text.
  3. Expand the block after updates settle.
- **Expected Result**:
  - New content is incorporated while collapsed.
  - Re-expanding shows the updated content.
  - Any affected measurement/cache state is refreshed.

### TC-024: viewport participates in grow-based parent layout using actual geometry
- **Requirement**: REQ-033
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Viewport fixture inside a parent using grow/flex-like Clay sizing.
- **Steps**:
  1. Render the viewport without supplying a fixed height.
  2. Allow one correcting frame after geometry becomes available.
  3. Resize the terminal.
- **Expected Result**:
  - The viewport renders successfully inside parent-driven layout.
  - Subsequent frame(s) use actual geometry for windowing.
  - Resizing updates viewport height and materialization.

### TC-025: deferred topics are documented as TODO or future work
- **Requirement**: REQ-034
- **Type**: Unit / Static
- **Priority**: High
- **Preconditions**: Spec and test-plan artifacts are present.
- **Steps**:
  1. Parse the approved spec and test-plan text.
  2. Assert presence of the deferred topic list.
- **Expected Result**:
  - Deferred items are explicitly documented as out of scope / future work.
  - In-scope requirements are clearly separated from deferred topics.

### TC-026: measurement helpers are deterministic and side-effect free
- **Requirement**: REQ-035
- **Type**: Unit
- **Priority**: High
- **Preconditions**: Public measurement helpers available.
- **Steps**:
  1. Call each helper repeatedly with the same inputs.
  2. Snapshot any relevant global renderer/scroll state before and after.
- **Expected Result**:
  - Repeated outputs are identical.
  - No renderer, viewport, or global scroll state changes as a result of helper calls.

### TC-027: materialization size is bounded by viewport inputs, not total history size
- **Requirement**: REQ-036
- **Type**: Blackbox / E2E
- **Priority**: High
- **Preconditions**: Large transcript fixture capable of generating thousands of items.
- **Steps**:
  1. Render a viewport over a small slice of history and record the materialized item count / visible output.
  2. Multiply total hidden history by a large factor without changing viewport size, scroll position, or budgets.
  3. Render again.
- **Expected Result**:
  - Materialized window size remains bounded by visible range, overscan, and budget settings.
  - Hidden history growth does not force proportional growth in rendered window size.

## 4. Negative Test Cases

### TC-N01: invalid widths are rejected by wrap and wrapped-height helpers
- **Requirement**: REQ-004
- **Purpose**: Verify width validation for negative and non-finite inputs.
- **Type**: Unit
- **Priority**: High
- **Steps**:
  1. Call `wrapText` with `width = -1`, `Infinity`, and `NaN`.
  2. Call `measureWrappedHeight` with the same invalid widths.
- **Expected Result**:
  - Each call throws `RangeError`.
  - `measureCellWidth` is unaffected because it has no width parameter.

### TC-N02: duplicate viewport item keys produce a developer-visible error
- **Requirement**: REQ-009
- **Purpose**: Verify that duplicate keys are not silently coalesced.
- **Type**: Integration
- **Priority**: High
- **Steps**:
  1. Construct a viewport with two items that share the same key.
  2. Attempt to render.
- **Expected Result**:
  - The viewport produces a developer-visible error.
  - It does not silently merge the items.

### TC-N03: invalid measurement outputs are rejected
- **Requirement**: REQ-012
- **Purpose**: Verify validation of negative and non-finite measurement results.
- **Type**: Unit
- **Priority**: High
- **Steps**:
  1. Create test items that return `height = -1`, `NaN`, and `Infinity`.
  2. Create test items that return negative or non-finite budget estimates.
  3. Attempt to render the viewport.
- **Expected Result**:
  - The viewport raises a developer-visible error for each invalid measurement.
  - The viewport does not proceed with corrupted scroll math.

### TC-N04: invalid viewport configuration values are rejected
- **Requirement**: REQ-022, Error Handling Section
- **Purpose**: Verify validation of negative or non-finite viewport configuration inputs.
- **Type**: Unit
- **Priority**: High
- **Steps**:
  1. Configure `overscanRows`, `wheelStepRows`, `keyStepRows`, `endThresholdRows`, and budget ceilings with negative or non-finite values.
  2. Attempt to construct the viewport.
- **Expected Result**:
  - Construction or initialization throws `RangeError`.
  - Invalid configuration is not silently normalized.

### TC-N05: viewport API does not fall back to arbitrary child-tree virtualization
- **Requirement**: REQ-008
- **Purpose**: Verify the normative prohibition on automatic arbitrary-JSX virtualization.
- **Type**: Integration
- **Priority**: High
- **Steps**:
  1. Attempt to use `VirtualViewport` without an `items` collection, providing only arbitrary children.
  2. Attempt to treat nested JSX children as the virtualization source.
- **Expected Result**:
  - The API rejects the misuse at type-check time or runtime.
  - The viewport does not silently infer a virtualization source from arbitrary children.

### TC-N06: unknown geometry IDs do not throw
- **Requirement**: REQ-005
- **Purpose**: Verify error handling for nonexistent element IDs.
- **Type**: Integration
- **Priority**: High
- **Steps**:
  1. Render a simple app.
  2. Query bounds for an ID that was never rendered.
- **Expected Result**:
  - The result is `undefined`.
  - No exception is thrown.

## 5. Coverage Matrix

| Requirement | Test Cases | Priority | Status |
|-------------|------------|----------|--------|
| REQ-001 | TC-001 | High | - |
| REQ-002 | TC-002 | High | - |
| REQ-003 | TC-003 | High | - |
| REQ-004 | TC-N01 | High | - |
| REQ-005 | TC-004, TC-N06 | High | - |
| REQ-006 | TC-004 | High | - |
| REQ-007 | TC-004 | High | - |
| REQ-008 | TC-005, TC-N05 | High | - |
| REQ-009 | TC-006, TC-N02 | High | - |
| REQ-010 | TC-007 | High | - |
| REQ-011 | TC-008 | High | - |
| REQ-012 | TC-N03 | High | - |
| REQ-013 | TC-009 | High | - |
| REQ-014 | TC-005, TC-009 | High | - |
| REQ-015 | TC-010 | High | - |
| REQ-016 | TC-011 | Medium | - |
| REQ-017 | TC-010 | High | - |
| REQ-018 | TC-007 | High | - |
| REQ-019 | TC-012 | High | - |
| REQ-020 | TC-013 | High | - |
| REQ-021 | TC-014 | High | - |
| REQ-022 | TC-013, TC-015, TC-N04 | High | - |
| REQ-023 | TC-016 | High | - |
| REQ-024 | TC-012, TC-016 | High | - |
| REQ-025 | TC-017 | High | - |
| REQ-026 | TC-017 | High | - |
| REQ-027 | TC-018 | High | - |
| REQ-028 | TC-019 | Medium | - |
| REQ-029 | TC-020 | High | - |
| REQ-030 | TC-021 | High | - |
| REQ-031 | TC-022 | High | - |
| REQ-032 | TC-023 | High | - |
| REQ-033 | TC-024 | High | - |
| REQ-034 | TC-025 | High | - |
| REQ-035 | TC-001, TC-026 | High | - |
| REQ-036 | TC-009, TC-027 | High | - |

## 6. Test Data
- ASCII, Unicode, combining-mark, zero-width, and control-character text samples.
- Wrapped-text fixtures with spaces, long tokens, and embedded newlines.
- Transcript fixtures containing:
  - settled markdown blocks
  - unfinished code fences that later close
  - inline math that later stabilizes
  - collapsible thinking blocks
  - focusable descendants inside virtualized items
- Large-history fixtures with thousands of items to validate bounded materialization.
- Budget-stress fixtures with deliberately expensive blocks (many estimated elements / measured words).
- Layout fixtures with parent-driven `grow` sizing and terminal resize events.

## 7. Environment Requirements
- Bun test runner and package-local test setup.
- Access to the repo's Ghostty VT-based blackbox harness.
- Terminal environment capable of mouse reporting and wheel event simulation.
- Stable deterministic fixtures for transcript streaming so convergence assertions can be used instead of fixed sleeps.
- Instrumentation hooks or test doubles for measurement-cache and emitted-op inspection where needed.

## 8. Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Width/measurement behavior drifts from Clay runtime behavior | Incorrect virtualization heights and anchor jumps | Keep unit tests aligned with Clay-compatible rules and add integration checks against rendered output |
| Blackbox scrolling tests are flaky due to timing | CI instability | Prefer convergence helpers and observable state over sleeps |
| Budget estimates differ from actual Clay costs | False confidence in capacity behavior | Test both estimated-budget logic and actual bounded materialization behavior |
| Geometry is only available after a completed render | One-frame transient differences | Use fixtures that assert eventual corrected state on the next frame |
| Focus behavior differs across nested controls | Hard-to-reason interaction failures | Add explicit integration fixtures for focusable descendants and collapse/unmount cases |
