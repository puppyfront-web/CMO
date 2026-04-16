# transcribe-audio

## Goal

Convert one local call recording into a plain-text transcript for downstream structured extraction.

## Inputs

- one local audio file path
- `sheet-target.json` only as run metadata, not as transcription content

## Outputs

- `transcript.txt`

## Constraints

- Use `scripts/transcribe_local.sh`
- Preserve the transcript as plain text
- Do not extract fields in this stage
- Do not summarize, classify, or price anything in this stage
- If the transcription engine returns partial/noisy text, keep the raw usable transcript rather than rewriting it into polished prose

## Failure policy

- If the audio path is invalid or transcription fails, stop the workflow
- Do not invent transcript content
