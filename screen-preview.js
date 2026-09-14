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
        document.addEventListener("fullscreenchange", () => this.syncFullscreenState());
    }

    setDevice(deviceId) {
        if (!deviceId || deviceId === this.deviceId) {
            return;
        }

        this.deviceId = deviceId;
        this.stop();
        this.connect();
    }

    connect() {
        if (!this.deviceId) {
            return;
        }

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
        if (bytes.length === 0) {
            return;
        }

        if (bytes[0] === 1) {
            this.handleSession(bytes);
        } else if (bytes[0] === 2) {
            this.handleFrame(bytes);
        }
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
        const isKeyFrame = (flags & 2) !== 0;

        if (isConfig) {
            this.configData = payload;
            return;
        }

        if (!this.decoder) {
            this.createDecoder(payload);
            if (!this.decoder) return;
        }

        const data = isKeyFrame && this.configData
            ? concatUint8(this.configData, payload)
            : payload;

        try {
            this.decoder.decode(new EncodedVideoChunk({
                type: isKeyFrame ? "key" : "delta",
                timestamp: pts,
                data,
            }));
        } catch (error) {
            console.error("Failed to decode scrcpy frame:", error);
        }
    }

    createDecoder(sample) {
        const codec = detectAvcCodec(sample);
        if (!codec) {
            this.setStatus("Codec H.264 não identificado");
            return null;
        }

        try {
            this.decoder = new VideoDecoder({
                output: (frame) => this.renderFrame(frame),
                error: (error) => {
                    console.error("Screen decoder error:", error);
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
        this.root.classList.remove("is-streaming");
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

function concatUint8(first, second) {
    const result = new Uint8Array(first.length + second.length);
    result.set(first, 0);
    result.set(second, first.length);
    return result;
}

function detectAvcCodec(data) {
    const sps = findNalUnit(data, 7);
    if (!sps || sps.length < 4) return null;

    const profile = sps[1].toString(16).padStart(2, "0");
    const constraints = sps[2].toString(16).padStart(2, "0");
    const level = sps[3].toString(16).padStart(2, "0");
    return `avc1.${profile}${constraints}${level}`;
}

function findNalUnit(data, wantedType) {
    for (let i = 0; i + 4 < data.length; i += 1) {
        const fourByte = data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 1;
        const threeByte = data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1;
        if (!fourByte && !threeByte) continue;

        const offset = fourByte ? i + 4 : i + 3;
        if ((data[offset] & 0x1f) !== wantedType) continue;

        let end = offset + 1;
        while (end + 3 < data.length && !(data[end] === 0 && data[end + 1] === 0 && (data[end + 2] === 1 || (data[end + 2] === 0 && data[end + 3] === 1)))) {
            end += 1;
        }
        return data.slice(offset, end);
    }
    return null;
}

function initScreenPreview() {
    const root = document.querySelector("[data-screen-preview]");
    if (!root) return;

    const preview = new ScreenPreview(root);
    window.adraxScreenPreview = preview;

    document.addEventListener("adrax:device-selected", (event) => {
        preview.setDevice(event.detail.deviceId);
    });
}

document.addEventListener("DOMContentLoaded", initScreenPreview);
