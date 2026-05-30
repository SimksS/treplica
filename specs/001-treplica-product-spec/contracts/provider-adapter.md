# Contract: AI Provider Adapter

## Purpose

Normalize local and hosted AI providers behind one internal interface so the desktop app can support Ollama, OpenAI-compatible providers, OpenAI, Anthropic Claude, Groq, NVIDIA endpoints, and future providers without changing UI flows.

## Provider Metadata

Each adapter MUST expose:

- `provider_kind`
- `display_name`
- `is_local`
- `requires_credentials`
- `supports_streaming`
- `capabilities`: chat, translation, summarization, structured_output, transcription.
- `config_schema`: provider-specific fields that the settings UI can render.

## Request Types

### Guidance Request

**Input**:

- Session context.
- Recent transcript and translation segments.
- User role and objective.
- Requested suggestion type.
- Privacy mode.

**Output**:

- Suggestion text.
- Suggestion type.
- Confidence.
- Grounding summary.
- Provider call metadata.

### Translation Request

**Input**:

- Source language.
- Target language.
- Transcript text.
- Context hints.

**Output**:

- Translated text.
- Confidence.
- Uncertainty notes.
- Provider call metadata.

### Summary or Document Request

**Input**:

- Session transcript.
- Selected suggestions.
- Document type.
- User formatting preference.

**Output**:

- Document title.
- Document body.
- Suggested follow-up actions.
- Provider call metadata.

## Required Behavior

- Hosted adapters MUST receive explicit permission from privacy settings before sending session content off-device.
- Adapters MUST return structured errors: invalid_configuration, authentication_failed, rate_limited, provider_unavailable, model_unavailable, timeout, unsafe_output, unknown.
- Adapters MUST support cancellation for live sessions.
- Adapters MUST report latency, input size, output size, and whether content left the machine.
- Adapters MUST never log credentials.

## Contract Tests

- Provider settings validation rejects missing required fields.
- Hosted provider request is blocked when privacy mode is local-only.
- Local provider request succeeds without credentials when configured.
- Rate limit and timeout errors map to user-readable error states.
- Streaming guidance can be cancelled without corrupting session state.
