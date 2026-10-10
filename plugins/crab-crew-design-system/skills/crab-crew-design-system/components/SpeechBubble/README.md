# SpeechBubble

A crab saying one short thing, in a pixel bubble with a stepped tail.

**Use it** for an agent's latest note, onboarding hints, or a friendly confirmation. One or two sentences in the crab's own voice: plain, present tense, specific ("Found 3 call sites that still pass the old token.").

**You provide** `look` and `pose` for the speaker, `children` for the words, `speaker` to override the name label (or `false` to hide it), and `live` when new messages should be announced to screen readers.

**Don't** put buttons or forms in a bubble, or stack more than three bubbles; use a list of CrewRows instead.
