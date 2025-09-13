const socket = io();
        let pc = new RTCPeerConnection();
        const localVideo = document.getElementById("localVideo");
        const remoteVideo = document.getElementById("remoteVideo");

        // Mobile buttons
        const startBtn = document.getElementById("startBtn");
        const rotateBtn = document.getElementById("rotateBtn");
        const zoomInBtn = document.getElementById("zoomInBtn");
        const zoomOutBtn = document.getElementById("zoomOutBtn");
        const torchBtn = document.getElementById("torchBtn");
        const localRecordBtn = document.getElementById("localRecordBtn");


        // Laptop buttons
        const rotateLaptopBtn = document.getElementById("rotateLaptopBtn");
        const zoomInLaptopBtn = document.getElementById("zoomInLaptop");
        const zoomOutLaptopBtn = document.getElementById("zoomOutLaptop");
        const torchLaptopBtn = document.getElementById("torchLaptop");
        const recordBtn = document.getElementById("recordBtn");
        const localRecordLaptopBtn = document.getElementById("localRecordLaptopBtn");
        const disableBtn = document.getElementById("disableBtn");

        const recordProgress = document.getElementById("recordProgress");
        const recordProgress2 = document.getElementById("recordProgress2");

        // Laptop controls div
        const laptopControls = document.getElementById("laptopControls");

        let currentStream;
        let currentVideoTrack;
        let sender;
        let usingFrontCamera = true;
        let currentZoom = 1;
        let mediaRecorder;
        let recordedChunks = [];
        let isRecording = false;
        let recordingStartTime;
        let recordingStartTime2;

        let timerInterval;
        let timerInterval2;

        let localRecorder;
        let localChunks = [];
        let isLocRecording = false;
        let mobileButtonsDisabled = false;


        // Show remote stream
        pc.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        pc.onconnectionstatechange = () => {
            console.log("Connection state:", pc.connectionState);
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                restartConnection();
            }
        };


        // Send ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) socket.emit("candidate", event.candidate);
        };

        // Start or switch stream
        async function startStream() {
            if (currentStream) currentStream.getTracks().forEach(t => t.stop());

            const constraints = {
                video: {
                    facingMode: usingFrontCamera ? "user" : "environment",
                    width: { ideal: 1280 },  // Stream at ~720p
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            localVideo.srcObject = currentStream;
            currentVideoTrack = currentStream.getVideoTracks()[0];

            if (!sender) {
                sender = pc.addTrack(currentVideoTrack, currentStream);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("offer", offer);
            } else {
                await sender.replaceTrack(currentVideoTrack);
            }
        }


        // Zoom
        async function applyZoom(level) {
            if (!currentVideoTrack) return;
            const caps = currentVideoTrack.getCapabilities();
            if (caps.zoom) {
                currentZoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min, level));
                await currentVideoTrack.applyConstraints({ advanced: [{ zoom: currentZoom }] });
            }
        }

        // Torch
        async function toggleTorch() {
            if (!currentVideoTrack) return;
            const caps = currentVideoTrack.getCapabilities();
            if (caps.torch) {
                let torchOn = !(torchBtn.dataset.torchOn === "true");
                await currentVideoTrack.applyConstraints({ advanced: [{ torch: torchOn }] });
                torchBtn.dataset.torchOn = torchOn;
            }
        }

        // Format time as MM:SS
        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        // Update recording progress
        function updateRecordingProgress() {
            const elapsedSeconds = (Date.now() - recordingStartTime) / 1000;
            recordProgress.textContent = `PC Recording: ${formatTime(elapsedSeconds)}`;


        }
        function updateRecordingProgress2() {
            const elapsedSeconds = (Date.now() - recordingStartTime2) / 1000;
            recordProgress2.textContent = `Mobile Recording: ${formatTime(elapsedSeconds)}`;

        }

        // Recording functionality
        function startRecording() {
            if (!remoteVideo.srcObject) {
                alert("No video stream available to record.");
                return;
            }
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(remoteVideo.srcObject, { mimeType: 'video/webm' });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `recording-${new Date().toISOString()}.webm`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            };

            mediaRecorder.start();
            isRecording = true;
            recordBtn.textContent = 'Stop Recording';
            recordingStartTime = Date.now();
            recordProgress.textContent = 'PC Recording: 00:00';
            timerInterval = setInterval(updateRecordingProgress, 1000);
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                recordBtn.textContent = 'Start Recording';
                clearInterval(timerInterval);
                recordProgress.textContent = '';
            }
        }



        // Detect mobile
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        disableBtn.onclick = () => {
            if (!mobileButtonsDisabled) {
                // disable all buttons on mobile
                socket.emit("control", { action: "disableButtons" });
                disableBtn.textContent = "Enable Mobile Buttons"; // update label
                mobileButtonsDisabled = true;
            } else {
                // enable all buttons on mobile
                socket.emit("control", { action: "enableButtons" });
                disableBtn.textContent = "Disable Mobile Buttons"; // update label
                mobileButtonsDisabled = false;
            }


        }

        if (isMobile) {
            // Show mobile buttons
            startBtn.style.display = "block";
            rotateBtn.style.display = "block";
            zoomInBtn.style.display = "block";
            zoomOutBtn.style.display = "block";
            torchBtn.style.display = "block";
            // Hide laptop controls and remote video
            remoteVideo.style.display = "none";
            laptopControls.style.display = "none";
            laptopVideoDiv.style.display = "none";
            laptopControls.style.display = "none"


            startBtn.onclick = () => {
                startStream();
            }
            rotateBtn.onclick = () => { usingFrontCamera = !usingFrontCamera; startStream(); };
            zoomInBtn.onclick = () => applyZoom(currentZoom + 1);
            zoomOutBtn.onclick = () => applyZoom(currentZoom - 1);
            torchBtn.onclick = () => toggleTorch();


            // localRecordBtn.style.display = "block";

            localRecordBtn.onclick = () => {
                if (isLocRecording) {
                    stopLocalRecording();
                    localRecordBtn.textContent = "Record Locally";
                } else {
                    startLocalRecording();
                    localRecordBtn.textContent = "Stop Local Recording";
                }
                isLocRecording = !isLocRecording;
            };

        } else {
            // Show laptop controls and hide local video
            laptopControls.style.display = "block";
            localVideo.style.display = "none";
            mobileVideoDiv.style.display = "none"            
            mobileControls.style.display = "none"


            // Laptop controls emit commands to mobile
            rotateLaptopBtn.addEventListener("click", () => socket.emit("control", { action: "rotate" }));
            zoomInLaptopBtn.addEventListener("click", () => socket.emit("control", { action: "zoomIn" }));
            zoomOutLaptopBtn.addEventListener("click", () => socket.emit("control", { action: "zoomOut" }));
            torchLaptopBtn.addEventListener("click", () => socket.emit("control", { action: "torch" }));
            recordBtn.addEventListener("click", () => {
                if (isRecording) stopRecording();
                else startRecording();
            });

            socket.on("offer", async (offer) => {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("answer", answer);
            });
        }

        // Mobile listens for laptop commands
        socket.on("control", async (data) => {
            if (!currentVideoTrack) return;
            switch (data.action) {
                case "disableButtons":
                    // disable mobile buttons (safe even if some elements are null)
                    if (startBtn) startBtn.disabled = true;
                    if (rotateBtn) rotateBtn.disabled = true;
                    if (zoomInBtn) zoomInBtn.disabled = true;
                    if (zoomOutBtn) zoomOutBtn.disabled = true;
                    if (torchBtn) torchBtn.disabled = true;
                    if (localRecordBtn) localRecordBtn.disabled = true;
                    break;

                case "enableButtons":
                    if (startBtn) startBtn.disabled = false;
                    if (rotateBtn) rotateBtn.disabled = false;
                    if (zoomInBtn) zoomInBtn.disabled = false;
                    if (zoomOutBtn) zoomOutBtn.disabled = false;
                    if (torchBtn) torchBtn.disabled = false;
                    if (localRecordBtn) localRecordBtn.disabled = false;
                    break;
                case "rotate": usingFrontCamera = !usingFrontCamera; await startStream(); break;
                case "zoomIn": await applyZoom(currentZoom + 1); break;
                case "zoomOut": await applyZoom(currentZoom - 1); break;
                case "torch": await toggleTorch(); break;
                case "localRecord":
                    if (isLocRecording) {
                        stopLocalRecording();
                        isLocRecording = false;
                        localRecordBtn.textContent = "Record Locally";
                    } else {
                        await startLocalRecording();
                        isLocRecording = true;
                        localRecordBtn.textContent = "Stop Local Recording";
                    }
                    break;
            }
        });

        // Handle answer & candidates
        socket.on("answer", async (answer) => {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });
        socket.on("candidate", async (candidate) => {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
            catch (err) { console.error("ICE candidate error", err); }
        });

        // Local recording (on mobile)


        // Start local recording in 4K
        // Start local recording in 4K
        // Start local recording in highest supported quality
        // Local recording (on mobile) - uses the existing streaming stream


        function startLocalRecording() {
            if (!currentStream) {
                alert("No camera stream available to record.");
                return;
            }

            // Clone the stream for recording if possible
            const recordStream = new MediaStream(currentStream.getTracks());

            localChunks = [];

            // Set high quality options
            let options = { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 30_000_000 };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: "video/mp4;codecs=h264", videoBitsPerSecond: 30_000_000 };
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 30_000_000 };
            }

            localRecorder = new MediaRecorder(recordStream, options);

            localRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) localChunks.push(event.data);
            };

            localRecorder.onstop = () => {
                const blob = new Blob(localChunks, { type: options.mimeType.split(";")[0] });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `local-recording-${new Date().toISOString()}.${options.mimeType.includes("mp4") ? "mp4" : "webm"}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log("Local recording saved");
            };

            localRecorder.start();
            console.log("Local recording started with:", options);



        }

        function stopLocalRecording() {
            if (localRecorder && localRecorder.state !== "inactive") {
                localRecorder.stop();
                console.log("Local recording stopped");

            }
        }

        //If internet gone and restore
        async function restartConnection() {
            console.log("Restarting connection...");
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            socket.emit("offer", offer);
        }


        var localcount = 0;
        localRecordLaptopBtn.addEventListener("click", () => {
            if (localcount == 0) {
                localRecordLaptopBtn.textContent = "Stop Local Recording";
                rotateLaptopBtn.disabled = true;
                localcount = 1
                recordingStartTime2 = Date.now();
                recordProgress2.textContent = 'Mobile Recording: 00:00';
                timerInterval2 = setInterval(updateRecordingProgress2, 1000);
            }
            else {
                localRecordLaptopBtn.textContent = "Record Locally (4K)";
                clearInterval(timerInterval2)
                recordProgress2.textContent = ''
                rotateLaptopBtn.disabled = false;


                localcount = 0
            }
            socket.emit("control", { action: "localRecord" });
        });

