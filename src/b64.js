
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

export function toB64(exp) {
    return Buffer.from(exp).toString("base64");
}

function hexToArayBuffer(hex) {
    const len = hex.length;

    let view = new Uint8Array(len / 2);
    for (let i = 0; i < len; i += 2) {
        view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    return view.buffer
}

function decodeB64(encKey) {
    var decoded = B64ToArrayBuffer(encKey);
    if (decoded) return decoded.buffer;
    throw new Error("Base64.decode given invalid string");
}

export function encode(str) {
    return toB64(hexToArayBuffer(str));
}

export function decode(arrType, exp) {
    if ( exp instanceof arrType ) return exp;
    // module: bcjbjghiih
    if ( "string" == typeof exp ) return new arrType(decodeB64(exp));
    return new arrType(exp);
}