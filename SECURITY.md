# Security

## Supported version

Only the latest release receives security updates.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not include private paper files, credentials, or personal information in a public issue.

## Local data and network access

Paper Archive reads PDFs only from the folder selected by the user. Paper contents are rendered locally and are not uploaded by the application. Network access is used to retrieve update metadata and installers from this repository's GitHub Releases.

## Verifying a Windows installer

Each release includes `SHA256SUMS.txt`, a CycloneDX software bill of materials (`sbom.cdx.json`), and GitHub build provenance. Compare the installer's SHA-256 digest with `SHA256SUMS.txt` before running it.

An unsigned build can still trigger Microsoft Defender SmartScreen's unknown-publisher warning. A clean dependency audit, checksum, or provenance record does not replace Authenticode signing. Official publisher identification requires a trusted Windows code-signing certificate.
