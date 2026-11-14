"""Build-time neural speech client, never called by the app.

Source: edge-tts 7.3.1, https://github.com/rany2/edge-tts
Only standard voice/rate/volume/pitch controls are used. The Edge read-aloud
service does not support Azure's arbitrary expressive-style SSML interface.
"""
import asyncio
import importlib.metadata
import json
from pathlib import Path
import sys

import edge_tts


async def render(plan_path, destination):
    version = importlib.metadata.version("edge-tts")
    if version != "7.3.1":
        raise RuntimeError("Install the pinned scripts/voice-requirements.txt before rendering.")
    plan = json.loads(Path(plan_path).read_text())
    try:
        available = await asyncio.wait_for(edge_tts.list_voices(), 30)
    except Exception as error:
        raise RuntimeError(f"Voice catalog unavailable: {type(error).__name__}") from None
    by_name = {voice["ShortName"]: voice for voice in available}
    for item in plan:
        found = by_name.get(item["voice"])
        if not found or found["Locale"] != item["locale"]:
            raise RuntimeError(f"Requested voice/locale unavailable: {item['voice']}")

    semaphore = asyncio.Semaphore(2)
    async def one(item):
        async with semaphore:
            path = destination / item["id"] / (item["key"] + ".mp3")
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_suffix(".partial")
            for attempt in range(3):
                try:
                    speech = edge_tts.Communicate(item["text"], item["voice"], rate=item["rate"], volume="+0%", pitch="+0Hz")
                    await asyncio.wait_for(speech.save(str(temporary)), 45)
                    if temporary.stat().st_size < 1024:
                        raise RuntimeError("Empty or truncated audio response")
                    temporary.replace(path)
                    print(f"Rendered {item['id']}/{item['key']} ({path.stat().st_size} bytes)", flush=True)
                    return
                except Exception as error:
                    temporary.unlink(missing_ok=True)
                    if attempt == 2:
                        # Avoid printing internal request URLs/tokens in terminal output.
                        status = getattr(error, "status", None)
                        raise RuntimeError(f"Speech request failed for {item['id']}/{item['key']}: {type(error).__name__}, HTTP {status}") from None
                    await asyncio.sleep(1 + attempt)

    await asyncio.gather(*(one(item) for item in plan))


if __name__ == "__main__":
    asyncio.run(render(sys.argv[1], Path(sys.argv[2])))
