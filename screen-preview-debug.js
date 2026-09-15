(() => {
    const start = performance.now();
    const log = (label, details = {}) => {
        console.log(`[Adrax H264 +${Math.round(performance.now() - start)}ms] ${label}`, details);
    };

    const waitForPreview = () => {
        const preview = window.adraxScreenPreview;
        if (!preview) {
            requestAnimationFrame(waitForPreview);
            return;
        }

        log("debug attached", {
            deviceId: preview.deviceId,
            videoDecoder: !!window.VideoDecoder,
        });

        const originalHandleMessage = preview.handleMessage.bind(preview);
        preview.handleMessage = (data) => {
            const bytes = new Uint8Array(data);
            log("message", {
                type: bytes[0],
                length: bytes.length,
            });
            return originalHandleMessage(data);
        };

        const originalHandleSession = preview.handleSession.bind(preview);
        preview.handleSession = (bytes) => {
            log("session", {
                width: new DataView(bytes.buffer, bytes.byteOffset).getUint32(1),
                height: new DataView(bytes.buffer, bytes.byteOffset).getUint32(5),
            });
            return originalHandleSession(bytes);
        };

        const originalHandleFrame = preview.handleFrame.bind(preview);
        preview.handleFrame = (bytes) => {
            const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            const flags = view.getUint8(1);
            const payload = bytes.slice(10);
            const isConfig = (flags & 1) !== 0;
            const flaggedKeyFrame = (flags & 2) !== 0;
            const hasIdr = typeof containsH264Idr === "function" && containsH264Idr(payload);

            log("frame", {
                flags,
                isConfig,
                flaggedKeyFrame,
                hasIdr,
                payloadLength: payload.length,
                decoder: !!preview.decoder,
                configStored: !!preview.configData,
            });

            return originalHandleFrame(bytes);
        };

        const originalCreateDecoder = preview.createDecoder.bind(preview);
        preview.createDecoder = (config) => {
            log("createDecoder", {
                configLength: config?.length ?? 0,
                codec: typeof detectAvcCodec === "function" ? detectAvcCodec(config) : null,
            });
            return originalCreateDecoder(config);
        };

        const originalRenderFrame = preview.renderFrame.bind(preview);
        preview.renderFrame = (frame) => {
            log("renderFrame", {
                width: frame.displayWidth,
                height: frame.displayHeight,
            });
            return originalRenderFrame(frame);
        };

        if (preview.decoder) {
            log("decoder already exists");
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", waitForPreview, { once: true });
    } else {
        waitForPreview();
    }
})();
