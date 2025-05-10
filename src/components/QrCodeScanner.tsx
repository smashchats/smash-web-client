import {
    Html5Qrcode,
    type Html5QrcodeResult,
    Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import type { Html5QrcodeScannerConfig } from 'html5-qrcode/esm/html5-qrcode-scanner';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import './QrCodeScanner.css';

const qrcodeRegionId = 'html5qr-code-full-region';

interface Config extends Partial<Html5QrcodeScannerConfig> {
    fps?: number;
    qrbox?: number;
    aspectRatio?: number;
    disableFlip?: boolean;
    // formatsToSupport?: Html5QrcodeSupportedFormats[];
}

interface Props extends Config {
    qrCodeSuccessCallback: (
        decodedText: string,
        decodedResult: Html5QrcodeResult,
    ) => void;
    qrCodeErrorCallback: (error: string) => void;
    verbose?: boolean;
}

// Creates the configuration object for Html5QrcodeScanner.
const createConfig = (props: Config): Html5QrcodeScannerConfig => {
    const config: Config = {};
    if (props.fps) {
        config.fps = props.fps;
    }
    if (props.qrbox) {
        config.qrbox = props.qrbox;
    }
    if (props.aspectRatio) {
        config.aspectRatio = props.aspectRatio;
    }
    if (props.disableFlip !== undefined) {
        config.disableFlip = props.disableFlip;
    }
    return config as Html5QrcodeScannerConfig;
};

export type Html5QrcodePluginHandle = {
    stop: () => void;
    scanFile: (file: File, multiple: boolean) => Promise<string>;
};

const Html5QrcodePlugin = forwardRef<Html5QrcodePluginHandle, Props>(
    (
        {
            qrCodeSuccessCallback,
            qrCodeErrorCallback,
            fps,
            formatsToSupport,
            qrbox,
            aspectRatio,
            disableFlip,
        },
        ref,
    ) => {
        const [reader, setReader] = useState<Html5Qrcode | null>(null);
        useImperativeHandle(ref, () => ({
            scanFile: (file: File, multiple: boolean) => {
                return reader?.scanFile(file, multiple) ?? Promise.resolve('');
            },
            stop: () => {
                reader?.stop();
            },
        }));
        useEffect(() => {
            const config = createConfig({
                fps,
                formatsToSupport,
                qrbox,
                aspectRatio,
                disableFlip,
            });

            const reader = new Html5Qrcode(qrcodeRegionId, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false,
            });
            setReader(reader);

            reader.start(
                { facingMode: 'environment' },
                config,
                qrCodeSuccessCallback,
                qrCodeErrorCallback,
            );

            return () => {
                if (reader.isScanning) {
                    reader.stop();
                }
            };
        }, [
            qrCodeSuccessCallback,
            qrCodeErrorCallback,
            fps,
            formatsToSupport,
            qrbox,
            aspectRatio,
            disableFlip,
        ]);

        return <div id={qrcodeRegionId} />;
    },
);

export default Html5QrcodePlugin;
