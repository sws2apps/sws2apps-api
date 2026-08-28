# Congregations module

This module owns congregation discovery, congregation creation, and membership
application management under `/api/v3/congregations`.

All routes require an authenticated session. Request bodies are validated at the
route boundary, while the controller currently retains legacy domain and Firebase
dependencies. Those dependencies should move behind congregation services and
repositories in a later migration chunk.

Administrative and meeting-editor congregation endpoints remain separate modules
because they have different permission boundaries.
