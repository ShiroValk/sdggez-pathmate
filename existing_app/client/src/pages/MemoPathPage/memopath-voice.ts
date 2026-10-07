/** User-triggered browser speech adapter, never continuous listening. Results
 * go through the engine's same actions and server DTOs; unsupported/denied
 * recognition reports an error, not a fabricated command or service success.
 */
export interface VoiceRecognizerHandle {
  stop(): void;
  abort(): void;
}

export interface VoiceRecognizerOptions {
  lang: string;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (code: string) => void;
}

interface SpeechAlternativeLike {
  transcript: string;
}

interface SpeechResultLike {
  isFinal: boolean;
  [index: number]: SpeechAlternativeLike;
}

interface SpeechResultListLike {
  length: number;
  [index: number]: SpeechResultLike;
}

interface SpeechRecognitionEventLike {
  results: SpeechResultListLike;
}

interface SpeechRecognitionErrorLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSpeechSupported(): boolean {
  return Boolean(getCtor());
}

export function startVoiceRecognition(options: VoiceRecognizerOptions): VoiceRecognizerHandle | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = options.lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  let finalAccum = '';
  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let interim = '';
    let sessionFinal = '';
    for (let i = 0; i < event.results.length; i += 1) {
      const result: SpeechResultLike = event.results[i];
      const transcript: string = result[0]?.transcript ?? '';
      if (result.isFinal) sessionFinal += transcript;
      else interim += transcript;
    }
    if (sessionFinal.trim().length > 0) {
      finalAccum += sessionFinal;
      options.onFinal(finalAccum.trim());
    } else if (interim.trim().length > 0) {
      options.onInterim(interim.trim());
    }
  };
  recognition.onerror = (event: SpeechRecognitionErrorLike) => {
    options.onError(event.error ?? 'unknown');
  };
  recognition.onend = () => {
    options.onEnd();
  };
  try {
    recognition.start();
  } catch {
    return null;
  }
  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // 浏览器可能在停止时抛异常，交给 onend 收尾
      }
    },
    abort: () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    },
  };
}
