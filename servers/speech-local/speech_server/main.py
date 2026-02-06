import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import SpeechServerSettings
from .stt_engine import STTEngine
from .tts_engine import TTSEngine

logger = logging.getLogger(__name__)
settings = SpeechServerSettings()

tts_engine: TTSEngine | None = None
stt_engine: STTEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_engine, stt_engine
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    logger.info("Starting Atlas Speech Server on %s:%d", settings.host, settings.port)

    tts_engine = TTSEngine(
        voice=settings.tts_voice,
        lang_code=settings.tts_lang_code,
        device=settings.tts_device,
    )
    stt_engine = STTEngine(
        model_size=settings.stt_model_size,
        device=settings.stt_device,
        compute_type=settings.stt_compute_type,
    )
    logger.info("All models loaded. Server ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(title="Atlas Speech Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "tts": {
            "voice": settings.tts_voice,
            "sampleRate": settings.tts_sample_rate,
        },
        "stt": {
            "model": settings.stt_model_size,
            "language": settings.stt_language,
        },
    }


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------


class STTSession:
    """Tracks state for one STT streaming session."""

    def __init__(self, session_id: str, language: str):
        self.session_id = session_id
        self.language = language
        self.audio_chunks: list[bytes] = []
        self.silent_chunks: int = 0


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    stt_sessions: dict[str, STTSession] = {}
    loop = asyncio.get_event_loop()

    try:
        while True:
            data = await ws.receive()

            if "text" in data:
                msg = json.loads(data["text"])
                msg_type = msg.get("type")
                msg_id = msg.get("id", str(uuid.uuid4()))

                if msg_type == "tts:synthesize":
                    await handle_tts(ws, msg_id, msg, loop)
                elif msg_type == "stt:start":
                    stt_sessions[msg_id] = STTSession(
                        session_id=msg_id,
                        language=msg.get("language", settings.stt_language),
                    )
                elif msg_type == "stt:audio":
                    # Next frame is binary audio
                    session = stt_sessions.get(msg_id)
                    if session:
                        await handle_stt_audio(ws, session, loop)
                elif msg_type == "stt:stop":
                    session = stt_sessions.pop(msg_id, None)
                    if session:
                        await handle_stt_stop(ws, session, loop)
                elif msg_type == "ping":
                    await ws.send_json({"type": "pong"})

            elif "bytes" in data:
                # Unexpected binary frame outside stt:audio context
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WebSocket error: %s", e)


# ---------------------------------------------------------------------------
# TTS handler
# ---------------------------------------------------------------------------


async def handle_tts(ws: WebSocket, msg_id: str, msg: dict, loop: asyncio.AbstractEventLoop):
    """Handle TTS synthesis request."""
    text = msg.get("text", "")
    voice = msg.get("voice")

    if not text.strip():
        await ws.send_json({"type": "tts:error", "id": msg_id, "error": "Empty text"})
        return

    try:
        wav_bytes = await loop.run_in_executor(None, tts_engine.synthesize, text, voice)

        await ws.send_json({
            "type": "tts:result",
            "id": msg_id,
            "format": settings.tts_output_format,
            "sampleRate": tts_engine.sample_rate,
            "byteLength": len(wav_bytes),
        })
        await ws.send_bytes(wav_bytes)
    except Exception as e:
        logger.error("TTS synthesis error: %s", e)
        await ws.send_json({"type": "tts:error", "id": msg_id, "error": str(e)})


# ---------------------------------------------------------------------------
# STT handlers
# ---------------------------------------------------------------------------


async def handle_stt_audio(
    ws: WebSocket, session: STTSession, loop: asyncio.AbstractEventLoop
):
    """Handle incoming audio chunk for STT."""
    session.audio_chunks.append(data["bytes"])

    # Check silence on latest chunk
    rms = await loop.run_in_executor(None, STTEngine.compute_rms, data["bytes"])

    if rms < settings.stt_silence_threshold:
        session.silent_chunks += 1
    else:
        session.silent_chunks = 0

    # Transcribe accumulated audio for interim result
    combined_audio = b"".join(session.audio_chunks)
    if len(combined_audio) < 1000:
        return

    try:
        result = await loop.run_in_executor(
            None,
            stt_engine.transcribe,
            combined_audio,
            session.language,
            settings.stt_beam_size,
        )

        if result["text"]:
            # Check if silence exceeded threshold (auto end-of-speech)
            silence_exceeded = session.silent_chunks >= settings.stt_silence_duration

            if silence_exceeded:
                await ws.send_json({
                    "type": "stt:final",
                    "id": session.session_id,
                    "text": result["text"],
                    "confidence": result.get("confidence", 1.0),
                })
                await ws.send_json({
                    "type": "stt:end-of-speech",
                    "id": session.session_id,
                })
                # Clear session audio so it doesn't re-process
                session.audio_chunks.clear()
                session.silent_chunks = 0
            else:
                await ws.send_json({
                    "type": "stt:interim",
                    "id": session.session_id,
                    "text": result["text"],
                    "confidence": result.get("confidence", 0.8),
                })
    except Exception as e:
        logger.error("STT transcription error: %s", e)
        await ws.send_json({
            "type": "stt:error",
            "id": session.session_id,
            "error": str(e),
        })


async def handle_stt_stop(
    ws: WebSocket, session: STTSession, loop: asyncio.AbstractEventLoop
):
    """Process remaining audio when user manually stops."""
    if not session.audio_chunks:
        return

    combined_audio = b"".join(session.audio_chunks)
    if len(combined_audio) < 1000:
        return

    try:
        result = await loop.run_in_executor(
            None,
            stt_engine.transcribe,
            combined_audio,
            session.language,
            settings.stt_beam_size,
        )
        if result["text"]:
            await ws.send_json({
                "type": "stt:final",
                "id": session.session_id,
                "text": result["text"],
                "confidence": result.get("confidence", 1.0),
            })
    except Exception as e:
        logger.error("STT final transcription error: %s", e)
        await ws.send_json({
            "type": "stt:error",
            "id": session.session_id,
            "error": str(e),
        })


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def cli():
    import uvicorn

    uvicorn.run(
        "speech_server.main:app",
        host=settings.host,
        port=settings.port,
        log_level="info",
    )


if __name__ == "__main__":
    cli()
