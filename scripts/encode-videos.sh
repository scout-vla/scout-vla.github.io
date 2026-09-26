#!/usr/bin/env bash
# Re-encode robot videos (HLG HDR, e.g. 4K60 HEVC) for the web.
#
#   scripts/encode-videos.sh <raw-video-dir>
#
# <raw-video-dir> holds one sub-folder per task with one file per method.
# Output: static/videos/<task>/<method>.mp4 plus a .jpg poster.
# Every file is 1920x1080, 30 fps, H.264 (yuv420p, BT.709), real-time speed,
# with audio and ALL container metadata (GPS location, device, capture time)
# removed.
set -euo pipefail

SRC="${1:?usage: $0 <raw-video-dir>}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/static/videos"

# Raw folder name -> published task slug.
task_slug() {
  case "$1" in
    "Block Stack") echo cube-stacking ;;
    "Ethernet Insertion") echo ethernet-insertion ;;
    "Lego Insert") echo lego-click ;;
    "Doll Throwing") echo doll-throwing ;;
    *) return 1 ;;
  esac
}

# Raw file stem (case-insensitive) -> published method slug.
method_slug() {
  case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
    baseline) echo base ;;
    scout) echo scout ;;
    rlt) echo rlt ;;
    dsrl) echo dsrl ;;
    dsrlt) echo dsrl-rlt ;;
    *) return 1 ;;
  esac
}

# HLG/BT.2020 10-bit -> SDR BT.709 8-bit.
VF="scale=1920:1080:flags=lanczos,fps=30,format=yuv420p10le,colorspace=all=bt709:iall=bt2020:itrc=bt2020-10:format=yuv420p"

for dir in "$SRC"/*/; do
  task_name="$(basename "$dir")"
  task="$(task_slug "$task_name")" || { echo "skip folder: $task_name" >&2; continue; }
  mkdir -p "$OUT/$task"
  for f in "$dir"*; do
    [[ -f "$f" ]] || continue
    stem="$(basename "${f%.*}")"
    method="$(method_slug "$stem")" || { echo "skip file: $f" >&2; continue; }
    dst="$OUT/$task/$method.mp4"
    echo "encoding $task/$method"
    ffmpeg -v error -y -hwaccel videotoolbox -i "$f" \
      -map 0:v:0 -an -sn -dn \
      -map_metadata -1 -map_chapters -1 \
      -vf "$VF" \
      -c:v libx264 -preset veryslow -tune film -crf 18 -profile:v high -pix_fmt yuv420p \
      -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
      -movflags +faststart -fflags +bitexact -flags:v +bitexact \
      "$dst"
    ffmpeg -v error -y -i "$dst" -frames:v 1 \
      -map_metadata -1 -fflags +bitexact -q:v 2 "$OUT/$task/$method.jpg"
  done
done
