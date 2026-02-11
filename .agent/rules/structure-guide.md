---
trigger: always_on
---

# GitLab Pipeline Notifier Rules

These rules enforce the project's modular architecture to ensure scalability and maintainability.

## 1. Modular Architecture Principles

This project follows a strict separation of concerns:

-   **Data Layer (`repository.js`)**:
    -   All data persistence and retrieval logic (specifically `chrome.storage.local`) MUST reside here.
    -   Do **NOT** access `chrome.storage` directly in other files; use `PipelineRepository` methods instead.
    -   This layer should be pure JS and not interact with the DOM.

-   **UI Layer (`*_renderer.js`)**:
    -   Logic for generating HTML strings or manipulating DOM elements belongs in renderer files (e.g., `dashboard_renderer.js`).
    -   Keep HTML generation separate from business logic.

-   **Business Logic / Controllers**:
    -   Identify the context (e.g., New Pipeline page vs. Pipeline View page) and delegate to specific modules (e.g., `tracker_new_pipeline.js`, `tracker_view_pipeline.js`).
    -   These modules orchestrate the flow between the Data Layer and the UI Layer.

-   **Utilities (`utils.js`)**:
    -   Common helper functions (e.g., `escapeHtml`, `formatDate`, `waitForElement`) reside here.
    -   Do not duplicate these helpers in other files.

-   **Constants (`tracker_selectors.js`)**:
    -   Store all CSS selectors, element IDs, and other "magic strings" in a dedicated constants file.
    -   Do not hardcode selectors inside logic files.

## 2. File Organization

-   **`dashboard.js`**: Main entry point for the extension popup. Should be minimal and delegate work to `PipelineRepository` and `DashboardRenderer`.
-   **`pipeline_tracker.js`**: Main entry point for the content script. It detects the page type and initializes the correct sub-module (`NewPipelineTracker` or `PipelineViewTracker`).

## 3. Extension Manifest Management

-   **Order Matters**: When adding new JavaScript files to `manifest.json` under `content_scripts`, ensure strict dependency order:
    1.  Core libraries (`utils.js`, `repository.js`, `tracker_selectors.js`)
    2.  Module definitions (`tracker_new_pipeline.js`, `tracker_view_pipeline.js`)
    3.  Main entry point (`pipeline_tracker.js`)
-   Failure to maintain this order will result in runtime errors due to undefined variables.

## 4. Coding Standards

-   **ES6+**: Use modern JavaScript features (const/let, arrow functions, template literals).
-   **No Frameworks**: This is a vanilla JS project to keep the extension lightweight. Do not introduce heavy libraries unless absolutely necessary.
-   **Comments**: Document complex logic, especially around the heuristics used to scrape GitLab pages.
