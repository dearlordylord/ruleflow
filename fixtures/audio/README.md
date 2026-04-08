# Audio Fixtures

Clean spoken fixtures for manual and regression-oriented transcript checks.

Purpose:
- exercise semantic/action shapes
- inspect Whisper segmentation and timestamps
- avoid depending on messy microphone captures for early validation

Current matrix:
- `attack-goblin.wav`: single committed attack
- `attack-goblin-with-roll.wav`: action plus dice-result continuation
- `attack-then-move.wav`: two distinct actions in one recording
- `attack-then-move-weak.wav`: weaker `then` boundary between two actions
- `ambiguous-attack.wav`: intentionally underspecified attack
- `non-action-think.wav`: non-action chatter

Manual test command:

```bash
cd /workspace/typescript/osr-hellenvald
TRANSCRIPT_INTERPRETER_MODE=demo pnpm demo:audio -- fixtures/audio/attack-goblin-with-roll.wav
```

Use `TRANSCRIPT_INTERPRETER_MODE=live` to exercise the real LLM instead of the demo interpreter.
