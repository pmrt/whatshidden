import fetch from 'node-fetch';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { createDecipheriv } from 'crypto';
import hkdf from 'futoin-hkdf';

import logger from './logger.js';
import { HKDF_EXPAND_LENGTH, MEDIA_DIR } from './consts.js';
import { getSenderPath } from './utils.js';

import { decode, toB64 } from './b64.js';
import { MediaDecryptionFailedWarn, MediaDownloadFailedWarn } from './errors.js';

function HKDF(secret, info, length) {
    const expanded = hkdf(
        decode(Uint8Array, secret).buffer,
        length,
        {
            salt: false,
            hash: 'SHA-256',
            info,
        }
    );
    return {
        iv: expanded.slice(0, 16),
        encKey: expanded.slice(16, 48),
        macKey: expanded.slice(48, 80),
        refKey: expanded.slice(80, 112),
    }
}

export class WAMediaDownloader {
    constructor(mediaKey, type, mediaUrl, mediaHash, sender) {
        this._key = mediaKey;
        this._url = mediaUrl;
        this._type = type;
        this._hash = mediaHash;
        this._sender = sender;
    }

    async downloadAndDecrypt() {
        const filename = toB64(this._hash);

        logger.verbose("download and decrypt of media file '%s' requested..", filename);

        let macSize = 10;
        let bytesRead = 0;
        const { info, ext } = this._type;
        const bundle = HKDF(this._key, info, HKDF_EXPAND_LENGTH);
        const output = createWriteStream(join(getSenderPath(`${this._sender}`), MEDIA_DIR, `${filename}.${ext}`));
        const decryption = createDecipheriv(
            'aes-256-cbc',
            Buffer.from(bundle.encKey),
            Buffer.from(bundle.iv)
        );
        decryption.on('error', (e) => {
            new MediaDecryptionFailedWarn(
                `(file: ${filename}) ${e.message}`
            )
            return bytesRead;
        })

        return await fetch(this._url)
            .then(res => {
                const fileSize = parseInt(res.headers["content-length"]);

                res.body.on('data', currentBlock => {
                    const len = currentBlock.length;

                    if (bytesRead + len === fileSize) {
                        const lastBlock = currentBlock.slice(0, -macSize);
                        decryption.write(lastBlock);
                        return bytesRead += lastBlock.length;
                    }

                    decryption.write(currentBlock);
                    bytesRead += len;
                })

                res.body.on('error', e => {
                    new MediaDownloadFailedWarn(
                        `(file: ${filename}) ${e.message}`
                    )
                    return bytesRead;
                })

                decryption.on('close', () => {
                    logger.verbose("file %s decrypted; %s bytes read", filename, bytesRead);
                    return bytesRead;
                })
                decryption.pipe(output);
            });
    }
}


