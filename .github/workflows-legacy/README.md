# Legacy workflows

Files in this directory are retained only as upstream implementation history.
GitHub Actions does not load workflows outside `.github/workflows`.

`publish.yml` previously mixed CLI, Desktop, service, changelog, and signing
responsibilities. Do not dispatch it for Axon product releases. Use:

- `.github/workflows/release-cli.yml`
- `.github/workflows/release-desktop.yml`
- `.github/workflows/release-vscode.yml`
- `.github/workflows/release-suite.yml`
