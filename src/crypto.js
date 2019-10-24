import fetch from 'node-fetch';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { createDecipheriv } from 'crypto';
import hkdf from 'futoin-hkdf';

import logger from './logger';
import { HKDF_EXPAND_LENGTH, CHAT_LOGS_DIR } from './consts';
import { getSenderPath } from './utils';

function B64ToArrayBuffer(encKey) {
    for (var t = encKey.length, n = new Int32Array(t + t % 4), r = 0; r < t; r++) {
        var a = encKey.charCodeAt(r);
        if (65 <= a && a <= 90) n[r] = a - 65;
        else if (97 <= a && a <= 122) n[r] = a - 71;
        else if (48 <= a && a <= 57) n[r] = a + 4;
        else if (43 === a) n[r] = 62;
        else {
            if (47 !== a) {
                if (61 === a) {
                    t = r;
                    break
                }
                return null
            }
            n[r] = 63
        }
    }
    for (var i = n.length / 4, o = 0, s = 0; o < i; o++, s += 4) n[o] = n[s] << 18 | n[s + 1] << 12 | n[s + 2] << 6 | n[s + 3];
    for (var u = Math.floor(3 * t / 4), c = new Uint8Array(u), l = 0, f = 0; f + 3 <= u; l++, f += 3) {
        var d = n[l];
        c[f] = d >> 16, c[f + 1] = d >> 8 & 255, c[f + 2] = 255 & d
    }
    switch (u - f) {
        case 2:
            c[f] = n[l] >> 16, c[f + 1] = n[l] >> 8 & 255;
            break;
        case 1:
            c[f] = n[l] >> 16
    }
    return c
}

function decodeB64(encKey) {
    var decoded = B64ToArrayBuffer(encKey);
    if (decoded) return decoded.buffer;
    throw new Error("Base64.decode given invalid string");
}

// If exp = string, base64 decodes it and converts it to Uint8Array
function decode(arrType, exp) {
    if ( exp instanceof arrType ) return exp;
    // module: bcjbjghiih
    if ( "string" == typeof exp ) return new arrType(decodeB64(exp));
    return new arrType(exp);
}

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
        logger.verbose("download and decrypt of media file '%s' requested..", this._hash);

        let macSize = 10;
        let bytesRead = 0;

        const { info, ext } = this._type;
        const bundle = HKDF(this._key, info, HKDF_EXPAND_LENGTH);
        const filename = encodeURIComponent(this._hash);
        const output = createWriteStream(join(getSenderPath(`+${this._sender}`), `${filename}.${ext}`));
        const decryption = createDecipheriv(
            'aes-256-cbc',
            Buffer.from(bundle.encKey),
            Buffer.from(bundle.iv)
        );
        decryption.on('error', (err) => {
            logger.warn("error while decrypting media %s", filename);
            logger.error(err);
            return;
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

                res.body.on('error', err => {
                    logger.warn("error while downloading media %s", filename);
                    logger.error(err);
                    return bytesRead;
                })
                res.body.on('close', () => {
                    logger.verbose("file %s decrypted; %s bytes read", filename, bytesRead);
                    return bytesRead;
                })

                decryption.pipe(output);
            });
    }
}


