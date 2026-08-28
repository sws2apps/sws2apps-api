# Congregation administration module

This module owns privileged congregation administration endpoints under
`/api/v3/congregations/admin`.

Every route requires both an authenticated session and a congregation administrator
role. The module manages congregation keys, members, Pocket invitations, sessions,
join requests, and congregation deletion.

Role arrays are validated against the complete known congregation-role vocabulary
before reaching the controller. The large legacy controller should be decomposed by
use case only after characterization coverage is added.
