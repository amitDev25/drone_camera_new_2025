let options = { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 20_000_000 };
if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: "video/mp4;codecs=h264", videoBitsPerSecond: 20_000_000 };
}
if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 20_000_000 };
}