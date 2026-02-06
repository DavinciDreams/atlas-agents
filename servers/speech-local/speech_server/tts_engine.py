import io
import logging

import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)


class TTSEngine:
    def __init__(
        self,
        voice: str = "af_heart",
        lang_code: str = "a",
        device: str = "cuda",
    ):
        from kokoro import KPipeline

        logger.info("Loading Kokoro TTS (lang=%s, device=%s)...", lang_code, device)
        self.pipeline = KPipeline(lang_code=lang_code)
        self.voice = voice
        self.sample_rate = 24000
        logger.info("Kokoro TTS ready (voice=%s)", voice)

    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        """Synthesize text to WAV bytes (PCM 16-bit, mono, 24kHz)."""
        voice = voice or self.voice
        audio_segments: list[np.ndarray] = []

        for _, _, audio in self.pipeline(text, voice=voice):
            audio_segments.append(audio.numpy())

        if not audio_segments:
            raise ValueError("No audio generated")

        combined = np.concatenate(audio_segments)

        buf = io.BytesIO()
        sf.write(buf, combined, self.sample_rate, format="WAV", subtype="PCM_16")
        return buf.getvalue()

    def list_voices(self) -> list[str]:
        """Return available voice IDs."""
        try:
            from kokoro import KPipeline

            return list(KPipeline.get_voices().keys())
        except Exception:
            return [self.voice]
