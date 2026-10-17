import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startVoiceRecognition } from '../../client/src/pages/MemoPathPage/memopath-voice';

test('cumulative browser speech results do not duplicate previous final phrases', () => {
  class FakeRecognition {
    static current: FakeRecognition;
    onresult: (event: unknown) => void;
    start(): void { FakeRecognition.current = this; }
    stop(): void { /* no microphone in this unit test */ }
    abort(): void { /* no microphone in this unit test */ }
  }
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: { SpeechRecognition: FakeRecognition } });
  try {
    const finals: string[] = [];
    startVoiceRecognition({ lang: 'en-HK', onInterim: () => {}, onFinal: text => finals.push(text), onEnd: () => {}, onError: () => {} });
    FakeRecognition.current.onresult({ results: [{ 0: { transcript: 'take me ' }, isFinal: true }] });
    FakeRecognition.current.onresult({ results: [{ 0: { transcript: 'take me ' }, isFinal: true }, { 0: { transcript: 'home' }, isFinal: true }] });
    assert.deepEqual(finals, ['take me', 'take me home']);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else Object.assign(globalThis, { window: previousWindow });
  }
});
