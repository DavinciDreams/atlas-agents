from pydantic_settings import BaseSettings


class SpeechServerSettings(BaseSettings):
    host: str = "127.0.0.1"
    port: int = 8765

    # TTS
    tts_voice: str = "af_heart"
    tts_lang_code: str = "a"  # 'a' = American English, 'b' = British English
    tts_device: str = "cuda"
    tts_sample_rate: int = 24000

    # STT
    stt_model_size: str = "base.en"
    stt_device: str = "cuda"
    stt_compute_type: str = "float16"
    stt_language: str = "en"
    stt_beam_size: int = 5
    stt_silence_threshold: float = 0.01  # RMS threshold for silence detection
    stt_silence_duration: float = 1.5  # seconds of silence before auto-stop

    model_config = {"env_prefix": "SPEECH_"}
