#!/usr/bin/env python3
"""
Local Whisper runner for recorded WAV files.

This script is called from the TypeScript WhisperTranscriber live layer through
`uv run`. It intentionally supports uncompressed WAV input only so the current
Docker devcontainer does not need ffmpeg.
"""

from __future__ import annotations

import argparse
import json
import sys
import wave
from pathlib import Path

import numpy as np
import whisper


TARGET_SAMPLE_RATE = 16_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-file", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--language", required=True)
    return parser.parse_args()


def read_wav_audio(path: Path) -> np.ndarray:
    if path.suffix.lower() != ".wav":
        raise ValueError(
            f"WhisperTranscriber currently supports .wav files only in the devcontainer: {path}"
        )

    with wave.open(str(path), "rb") as wav_file:
        if wav_file.getcomptype() != "NONE":
            raise ValueError(f"Compressed WAV is not supported: {path}")

        sample_width = wav_file.getsampwidth()
        sample_rate = wav_file.getframerate()
        channel_count = wav_file.getnchannels()
        frame_count = wav_file.getnframes()
        pcm_bytes = wav_file.readframes(frame_count)

    dtype = dtype_for_sample_width(sample_width)
    audio = np.frombuffer(pcm_bytes, dtype=dtype)

    if channel_count > 1:
        audio = audio.reshape(-1, channel_count).mean(axis=1)

    audio = normalize_audio(audio, sample_width)
    if sample_rate != TARGET_SAMPLE_RATE:
        audio = resample_audio(audio, sample_rate, TARGET_SAMPLE_RATE)

    return audio.astype(np.float32)


def dtype_for_sample_width(sample_width: int) -> np.dtype:
    match sample_width:
        case 1:
            return np.dtype(np.uint8)
        case 2:
            return np.dtype(np.int16)
        case 4:
            return np.dtype(np.int32)
        case _:
            raise ValueError(f"Unsupported WAV sample width: {sample_width} bytes")


def normalize_audio(audio: np.ndarray, sample_width: int) -> np.ndarray:
    if sample_width == 1:
        return (audio.astype(np.float32) - 128.0) / 128.0

    max_magnitude = float(2 ** (sample_width * 8 - 1))
    return audio.astype(np.float32) / max_magnitude


def resample_audio(audio: np.ndarray, source_rate: int, target_rate: int) -> np.ndarray:
    if audio.size == 0:
        return audio.astype(np.float32)

    duration_seconds = audio.size / float(source_rate)
    target_size = max(1, int(round(duration_seconds * target_rate)))
    source_positions = np.linspace(0.0, duration_seconds, num=audio.size, endpoint=False)
    target_positions = np.linspace(0.0, duration_seconds, num=target_size, endpoint=False)
    return np.interp(target_positions, source_positions, audio).astype(np.float32)


def main() -> int:
    args = parse_args()
    audio_path = Path(args.audio_file)

    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    audio = read_wav_audio(audio_path)
    model = whisper.load_model(args.model)
    result = model.transcribe(audio, language=args.language, fp16=False, temperature=0)

    segments = []
    for segment in result.get("segments", []):
        text = str(segment.get("text", "")).strip()
        if not text:
            continue

        segments.append(
            {
                "text": text,
                "startMs": int(round(float(segment["start"]) * 1000)),
                "endMs": int(round(float(segment["end"]) * 1000)),
            }
        )

    print(json.dumps({"segments": segments}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - subprocess boundary
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
