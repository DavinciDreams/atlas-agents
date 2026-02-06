import io
import logging
import subprocess
import tempfile

import numpy as np

logger = logging.getLogger(__name__)


class STTEngine:
    def __init__(
        self,
        model_size: str = "base.en",
        device: str = "cuda",
        compute_type: str = "float16",
    ):
        from faster_whisper import WhisperModel

        logger.info(
            "Loading Faster-Whisper (model=%s, device=%s, compute=%s)...",
            model_size,
            device,
            compute_type,
        )
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        logger.info("Faster-Whisper ready")

    def transcribe(
        self,
        audio_bytes: bytes,
        language: str = "en",
        beam_size: int = 5,
    ) -> dict:
        """Transcribe audio bytes to text.

        Accepts WAV or WebM/Opus. For WebM, uses ffmpeg to convert to WAV first.
        """
        audio_data = self._decode_audio(audio_bytes)
        if audio_data is None or len(audio_data) == 0:
            return {"text": "", "language": language, "confidence": 0.0}

        segments, info = self.model.transcribe(
            audio_data,
            language=language,
            beam_size=beam_size,
            vad_filter=True,
        )
        text = " ".join(seg.text for seg in segments).strip()
        return {
            "text": text,
            "language": info.language,
            "confidence": info.language_probability,
        }

    def _decode_audio(self, audio_bytes: bytes) -> np.ndarray | None:
        """Decode audio bytes to float32 numpy array at 16kHz mono."""
        import soundfile as sf

        buf = io.BytesIO(audio_bytes)

        # Try soundfile first (handles WAV, FLAC, OGG)
        try:
            audio_data, sample_rate = sf.read(buf, dtype="float32")
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)
            if sample_rate != 16000:
                audio_data = self._resample(audio_data, sample_rate, 16000)
            return audio_data
        except Exception:
            pass

        # Fall back to ffmpeg for WebM/Opus and other formats
        return self._decode_with_ffmpeg(audio_bytes)

    def _decode_with_ffmpeg(self, audio_bytes: bytes) -> np.ndarray | None:
        """Use ffmpeg to decode audio to 16kHz mono float32."""
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()

                result = subprocess.run(
                    [
                        "ffmpeg",
                        "-i",
                        tmp.name,
                        "-ar",
                        "16000",
                        "-ac",
                        "1",
                        "-f",
                        "f32le",
                        "-",
                    ],
                    capture_output=True,
                    timeout=10,
                )

            if result.returncode != 0:
                logger.warning("ffmpeg decode failed: %s", result.stderr[:200])
                return None

            return np.frombuffer(result.stdout, dtype=np.float32)
        except Exception as e:
            logger.warning("ffmpeg decode error: %s", e)
            return None

    @staticmethod
    def _resample(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
        """Simple linear interpolation resampling (no librosa dependency)."""
        if orig_sr == target_sr:
            return audio
        ratio = target_sr / orig_sr
        new_length = int(len(audio) * ratio)
        indices = np.linspace(0, len(audio) - 1, new_length)
        return np.interp(indices, np.arange(len(audio)), audio).astype(np.float32)

    @staticmethod
    def compute_rms(audio_bytes: bytes) -> float:
        """Compute RMS energy of raw audio bytes for silence detection."""
        try:
            # Try to decode and compute RMS
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()

                result = subprocess.run(
                    [
                        "ffmpeg",
                        "-i",
                        tmp.name,
                        "-ar",
                        "16000",
                        "-ac",
                        "1",
                        "-f",
                        "f32le",
                        "-",
                    ],
                    capture_output=True,
                    timeout=5,
                )

            if result.returncode != 0 or len(result.stdout) == 0:
                return 0.0

            samples = np.frombuffer(result.stdout, dtype=np.float32)
            return float(np.sqrt(np.mean(samples**2)))
        except Exception:
            return 0.0
