const SCREEN_STREAM_URL = "wss://adrax.onrender.com/api/v1/devices";

class ScreenPreview {
    constructor(root) {
        this.root = root;
        this.canvas = root.querySelector("#screen-preview");
        this.state = root.querySelector("[data-screen-state]");
        this.resolution = root.querySelector("[data-screen-resolution]");
        this.orientation = root.querySelector("[data-screen-orientation]");
        this.fps = root.querySelector("[data-screen-fps]");
        this.fullscreen = root.querySelector("[data-screen-fullscreen]");
        this.socket = null;
        this.decoder = null;
        this.configData = null;
        this.width = 0;
        this.height = 0;
        this.frames = 0;
        this.lastFpsAt = performance.now();
        this.deviceId = null;

        this.fullscreen?.addEventListener("click", () => this.toggleFullscreen());
        this.canvas?.addEventListener("pointerdown", (event) => this.handlePointer(event, 0));
        this.canvas?.addEventListener("pointermove", (event) => this.handlePointer(event, 2));
        this.canvas?.addEventListener("pointerup", (event) => this.handlePointer(event, 1));
        this.canvas?.addEventListener("pointercancel", (event) => this.handlePointer(event, 1));
        this.canvas?.addEventListener("contextmenu", (event) => event.preventDefault());
        document.addEventListener("keydown", (event) => this.handleKeyDown(event));
        document.addEventListener("keyup", (event) => this.handleKeyUp(event));
        document.addEventListener("fullscreenchange", () => this.syncFullscreenState());
    }

    setDevice(deviceId) {
        if (!deviceId || deviceId === this.deviceId) return;
        this.stop();
        this.deviceId = deviceId;
        this.connect();
    }

    connect() {
        if (!this.deviceId) return;
        this.setStatus("Conectando");
        const url = `${SCREEN_STREAM_URL}/${encodeURIComponent(this.deviceId)}/screen/stream`;
        this.socket = new WebSocket(url);
        this.socket.binaryType = "arraybuffer";
        this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
        this.socket.addEventListener("close", () => {
            this.setStatus("Offline");
            this.root.classList.remove("is-streaming");
        });
        this.socket.addEventListener("error", () => this.setStatus("Indisponível"));
    }

    handleMessage(data) {
        const bytes = new Uint8Array(data);
        if (bytes.length === 0) return;
        if (bytes[0] === 1) this.handleSession(bytes);
        else if (bytes[0] === 2) this.handleFrame(bytes);
    }

    handleSession(bytes) {
        if (bytes.length < 9) return;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this.width = view.getUint32(1);
        this.height = view.getUint32(5);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.resolution.textContent = `${this.width} × ${this.height}`;
        this.orientation.textContent = this.width >= this.height ? "Paisagem" : "Retrato";
        if (this.decoder) this.decoder.close();
        this.decoder = null;
        this.configData = null;
        this.setStatus("Aguardando vídeo");
    }

    handleFrame(bytes) {
        if (bytes.length < 11) return;
        if (!window.VideoDecoder) {
            this.setStatus("Seu navegador não suporta WebCodecs");
            return;
        }

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const flags = view.getUint8(1);
        const pts = Number(view.getBigUint64(2));
        const payload = bytes.slice(10);
        const isConfig = (flags & 1) !== 0;
        const flaggedKeyFrame = (flags & 2) !== 0;

        if (isConfig) {
            this.configData = payload;
            return;
        }

        // Keep the browser-side stream resilient to hardware encoders that
        // emit an IDR NAL without setting the scrcpy key-frame flag.
        const isKeyFrame = flaggedKeyFrame || containsH264Idr(payload);

        if (!this.decoder && !isKeyFrame) {
            return;
        }

        if (!this.decoder) {
            this.createDecoder(this.configData);
            if (!this.decoder) return;
        }

        // Avoid building an unbounded decoder queue when the browser cannot keep
        // up with the device frame rate. Keep keyframes and drop only delta frames.
        if (!isKeyFrame && this.decoder.decodeQueueSize > 3) {
            return;
        }

        try {
            this.decoder.decode(new EncodedVideoChunk({
                type: isKeyFrame ? "key" : "delta",
                timestamp: pts,
                data: payload,
            }));
        } catch (error) {
            console.error("Failed to decode scrcpy frame:", error);
        }
    }

    createDecoder(config) {
        const codec = detectAvcCodec(config);
        if (!codec) {
            this.setStatus("Codec H.264 não identificado");
            return null;
        }

        try {
            this.decoder = new VideoDecoder({
                output: (frame) => this.renderFrame(frame),
                error: (error) => {
                    console.error("Screen decoder error:", error);
                    this.decoder = null;
                    this.setStatus("Erro no vídeo");
                },
            });
            this.decoder.configure({
                codec,
                optimizeForLatency: true,
                hardwareAcceleration: "prefer-hardware",
            });
            return this.decoder;
        } catch (error) {
            console.error("Failed to configure screen decoder:", error);
            this.decoder = null;
            this.setStatus("H.264 não suportado pelo navegador");
            return null;
        }
    }

    renderFrame(frame) {
        const context = this.canvas.getContext("2d", { alpha: false });
        context.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
        frame.close();
        this.root.classList.add("is-streaming");
        this.setStatus("Ao vivo");
        this.frames += 1;
        const now = performance.now();
        if (now - this.lastFpsAt >= 1000) {
            this.fps.textContent = `${this.frames} FPS`;
            this.frames = 0;
            this.lastFpsAt = now;
        }
    }

    handlePointer(event, action) {
        if (!this.root.classList.contains("is-interactive") || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        if (!this.width || !this.height) return;

        const point = this.toScreenCoordinates(event);
        if (!point) return;
        if (action === 0) this.canvas.setPointerCapture?.(event.pointerId);
        if (action === 1 && this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);

        const message = new Uint8Array(32);
        const view = new DataView(message.buffer);
        view.setUint8(0, 0x10);
        view.setUint8(1, action);
        view.setUint32(2, point.x);
        view.setUint32(6, point.y);
        view.setUint32(10, this.width);
        view.setUint32(14, this.height);
        view.setBigUint64(18, BigInt(event.pointerId));
        view.setUint16(26, action === 1 ? 0 : 65535);
        view.setUint32(28, 0);
        this.socket.send(message);
    }

    toScreenCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const scale = Math.min(rect.width / this.width, rect.height / this.height);
        const renderedWidth = this.width * scale;
        const renderedHeight = this.height * scale;
        const offsetX = (rect.width - renderedWidth) / 2;
        const offsetY = (rect.height - renderedHeight) / 2;
        const x = Math.max(0, Math.min(this.width - 1, Math.round((event.clientX - rect.left - offsetX) / scale)));
        const y = Math.max(0, Math.min(this.height - 1, Math.round((event.clientY - rect.top - offsetY) / scale)));
        return { x, y };
    }

    handleKeyDown(event) {
        if (!this.root.classList.contains("is-interactive") || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        if (event.key.length === 1) {
            event.preventDefault();
            this.sendText(event.key);
            return;
        }
        const keycodes = {
            Enter: 66,
            Backspace: 67,
            Tab: 61,
            Escape: 111,
            ArrowUp: 19,
            ArrowDown: 20,
            ArrowLeft: 21,
            ArrowRight: 22,
            Home: 3,
            End: 123,
            PageUp: 92,
            PageDown: 93,
            Delete: 112,
            Space: 62,
        };
        const keycode = keycodes[event.key];
        if (keycode == null) return;
        event.preventDefault();
        this.sendKeycode(0, keycode, 0, 0);
    }

    handleKeyUp(event) {
        if (!this.root.classList.contains("is-interactive") || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        const keycodes = {
            Enter: 66,
            Backspace: 67,
            Tab: 61,
            Escape: 111,
            ArrowUp: 19,
            ArrowDown: 20,
            ArrowLeft: 21,
            ArrowRight: 22,
            Home: 3,
            End: 123,
            PageUp: 92,
            PageDown: 93,
            Delete: 112,
            Space: 62,
        };
        const keycode = keycodes[event.key];
        if (keycode != null) this.sendKeycode(1, keycode, 0, 0);
    }

    sendText(text) {
        const encoded = new TextEncoder().encode(text);
        if (encoded.length > 300) return;
        const message = new Uint8Array(5 + encoded.length);
        const view = new DataView(message.buffer);
        view.setUint8(0, 0x11);
        view.setUint32(1, encoded.length);
        message.set(encoded, 5);
        this.socket.send(message);
    }

    sendKeycode(action, keycode, repeat, metastate) {
        const message = new Uint8Array(14);
        const view = new DataView(message.buffer);
        view.setUint8(0, 0x12);
        view.setUint8(1, action);
        view.setUint32(2, keycode);
        view.setUint32(6, repeat);
        view.setUint32(10, metastate);
        this.socket.send(message);
    }

    async toggleFullscreen() {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }
        await this.root.requestFullscreen();
    }

    syncFullscreenState() {
        const active = document.fullscreenElement === this.root;
        this.root.classList.toggle("is-fullscreen", active);
        this.root.classList.toggle("is-interactive", active);
        this.fullscreen.textContent = active ? "⛶ Sair da tela cheia" : "⛶ Tela cheia";
    }

    setStatus(value) {
        if (this.state) this.state.textContent = value;
    }

    stop() {
        this.root.classList.remove("is-streaming", "is-interactive", "is-fullscreen");
        if (this.decoder) {
            this.decoder.close();
            this.decoder = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.configData = null;
        this.setStatus("Conectando");
    }
}

function detectAvcCodec(config) {
    if (!config) return null;

    const sps = findNalUnit(config, 7);
    if (!sps || sps.length < 4) return null;

    const profile = sps[1].toString(16).padStart(2, "0");
    const constraints = sps[2].toString(16).padStart(2, "0");
    const level = sps[3].toString(16).padStart(2, "0");
    return `avc1.${profile}${constraints}${level}`;
}

function findNalUnit(data, wantedType) {
    if (!data) return null;

    for (let i = 0; i + 3 < data.length; i += 1) {
        const fourByte = data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 1;
        const threeByte = data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1;
        if (!fourByte && !threeByte) continue;

        const offset = fourByte ? i + 4 : i + 3;
        if (offset >= data.length || (data[offset] & 0x1f) !== wantedType) continue;

        let end = offset + 1;
        while (end + 3 < data.length && !(data[end] === 0 && data[end + 1] === 0 && (data[end + 2] === 1 || (data[end + 2] === 0 && data[end + 3] === 1)))) {
            end += 1;
        }
        return data.slice(offset, end);
    }

    return null;
}

function containsH264Idr(data) {
    return findNalUnit(data, 5) !== null;
}

function initScreenPreview() {
    const root = document.querySelector("[data-screen-preview]");
    if (!root) return;
    const preview = new ScreenPreview(root);
    window.adraxScreenPreview = preview;
    document.addEventListener("adrax:device-selected", (event) => preview.setDevice(event.detail.deviceId));
}

document.addEventListener("DOMContentLoaded", initScreenPreview);
