# Repository guidelines

## Architecture

- The backend is Go and uses the standard `net/http` server.
- The frontend is Vue with Vue Router and Pinia.
- `api/openapi.yaml` is the source of truth for API paths and schemas.
- Keep the `/api/v1` prefix aligned across the OpenAPI `servers` entry, the Go router's `BaseURL`, and the frontend API client's `baseUrl`.
- Keep traQ Bot credentials on the backend. Do not expose them to the frontend or add a generic traQ API proxy.
- In production, trust `X-Forwarded-User` only because the backend is reachable through NeoShowcase authentication. Do not expose the backend through an unauthenticated ingress.

## traQ directory

- Fetch users and groups through `backend/internal/traq` and serve application code from its in-memory snapshot; do not make per-request traQ API calls.
- Refresh users and groups as one logical snapshot. Publish a refresh only after both requests and snapshot validation succeed.
- A failed refresh may use the last good snapshot only until the configured maximum stale age. Callers must handle `traq.ErrDirectoryUnavailable` after that.
- Keep the external traQ response types local to the traQ adapter. Do not leak them into OpenAPI or domain models without an endpoint-specific reason.

## Generated API code

- Do not edit `backend/internal/api/server.gen.go` or `frontend/src/api/schema.d.ts` by hand.
- After changing `api/openapi.yaml`, run `go generate ./...` in `backend` and `pnpm generate:api` in `frontend`.
- Implement backend endpoints through the generated strict server interface.
- Use the generated frontend schema through `openapi-fetch`; do not duplicate request or response types manually.

## Product model

- Do not commit a database schema or fixed domain model until the data units, lifecycle, and permissions in sections A1-A3 of the detailed design worksheet have been decided.
- Treat a workshop completion record as the underlying fact. Derive badges and roadmap progress from it instead of storing duplicate client-side truth.
- Preserve completion history by default. If deletion or hiding is introduced, decide its history and derivation behavior explicitly first.

## Frontend

- Prefer BasiQ UI components once the package is released and installable. BasiQ UI is not installed yet.
- Do not introduce Tailwind CSS as a default styling foundation. Use component styles and design tokens.
- Use URL query parameters for shareable search and filter state.
- Use Pinia only for genuinely cross-route client state, such as the signed-in user, transient multi-step form state, or global notifications. Do not mirror server-owned workshop, completion, badge, or progress data into Pinia without a concrete need.
- Add route-level screens under `frontend/src/views` and keep route definitions in `frontend/src/router`.

## Checks

Before handing off a change, run the checks relevant to the files changed.

```sh
cd frontend
pnpm check
pnpm build

cd ../backend
test -z "$(gofmt -l .)"
go vet ./...
go test ./...
go build ./...
```

If the OpenAPI document changed, regenerate both clients and confirm that no generated diff remains after generation.
