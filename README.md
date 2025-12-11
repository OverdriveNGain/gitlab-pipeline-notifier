# GitLab Pipeline Notifier

A browser extension that notifies you when a GitLab pipeline completes or when a job fails.

## Features
- **"Notify me!" Button**: Injects a button on GitLab pipeline pages.
- **Watch Mode**: Click to start watching the pipeline status.
- **Notifications**:
    - **Pipeline Success**: Notifies when the pipeline passes.
    - **Pipeline Failed**: Notifies when the pipeline fails.
    - **Job Failed**: Notifies immediately if any individual job fails while the pipeline is still running (only notifies once per watch session).
- **Smart Detection**: Automatically detects pipeline status and job failures using GitLab's DOM structure.

## Installation

1.  **Clone or Download** this repository.
2.  Open your browser's extension management page:
    -   **Chrome/Brave/Edge**: `chrome://extensions`
    -   **Firefox**: `about:debugging` -> "This Firefox"
3.  Enable **Developer Mode** (usually a toggle in the top right).
4.  Click **Load unpacked** (or "Load Temporary Add-on" in Firefox).
5.  Select the folder containing this extension (where `manifest.json` is located).

## Usage

1.  Navigate to a GitLab pipeline page (URL format: `.../pipelines/<id>`).
2.  You should see a **"Notify me!"** button in the bottom-right corner of the page.
3.  Click the button. It will turn green and say **"Watching..."**.
4.  Keep the tab open. You can switch to other tabs or windows.
5.  You will receive a system notification when:
    -   A job fails.
    -   The pipeline finishes (success or failure).
6.  Clicking the button again while watching will stop the watch mode.

## Troubleshooting

-   **Button not appearing?**
    -   Ensure the URL matches the pattern `*/pipelines/*`.
    -   Refresh the page.
    -   If using a self-hosted GitLab with a custom domain, the extension matches `<all_urls>`, so it should work, but the internal logic checks for `/pipelines/\d+` in the URL.
-   **No notifications?**
    -   Ensure your OS "Do Not Disturb" mode is off.
    -   Check if the browser has permission to send notifications in your OS settings.
