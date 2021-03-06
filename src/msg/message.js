import { WAMediaDownloader } from "../crypto.js";
import { toB64 } from "../b64.js";

const
    s = 1,
    ms = 1000;

class Message {
    constructor(msgData) {
        this.setTime(msgData.t * s);
        this._type = msgData.type;
        this._id = msgData.id;
        this._sender = msgData.from;
        this._isForwarded = msgData.isForwarded;
    }

    get sender() {
        const s = parseSender(this._sender);
        if (s) {
            return s.number;
        }
    }

    get participant() {
        const p = parseSender(this._id.participant);
        if (p) {
            return p.number;
        }
    }

    get at() {
       return this._timestr;
    }

    isMedia() {
        return false
    }

    toString() {
        return "Unsupported message type";
    }

    toLog() {
        if (this.isGroup()) {
            return `(${this.participant}) -> ${this.toString()}`;
        }
        return this.toString();
    }

    isGroup() {
        return !!this._id.participant;
    }

    setTime(t) {
        const inMs = t * ms;
        const date = new Date(inMs);
        this._timestamp = t;
        this._timestr = date.toLocaleString();
    }
}

class Chat extends Message {
    constructor(msgData) {
        super(msgData);
        this._body = msgData.body;
    }

    toString() {
        return this._body;
    }
}

class Media extends Message {
    constructor(msgData) {
        super(msgData);
        this._mimetype = msgData.mimetype;
        this._mediaKey = msgData.mediaKey;
        this._clientUrl = msgData.clientUrl;
        this._size = msgData.size;
        this._filehash = msgData.filehash;
    }

    toString() {
        return `${this.typename} message (${toB64(this._filehash)})`;
    }

    isMedia() {
        return true;
    }

    getType() {
        return {
            mime: this._mimetype,
            info: this.appInfo,
            ext: this.fileExtension,
        }
    }

    async downloadAndDecrypt() {
        const dw = new WAMediaDownloader(
            this._mediaKey,
            this.getType(),
            this._clientUrl,
            this._filehash,
            this.sender,
        )
        return await dw.downloadAndDecrypt();
    }
}

class Image extends Media {
    constructor(msgData) {
        super(msgData);
        this._body = msgData.body;
        this._width = msgData.width;
        this._height = msgData.height;
    }

    get typename() {
        return "Image";
    }

    get appInfo() {
        return "WhatsApp Image Keys";
    }

    get fileExtension() {
        return "jpg";
    }
}

// TODO - Sticker should extend Image
class Sticker extends Media {
    constructor(msgData) {
        super(msgData);
        this._body = msgData.body;
        this._width = msgData.width;
        this._height = msgData.height;
    }

    get typename() {
        return "Sticker";
    }

    get appInfo() {
        return "WhatsApp Image Keys";
    }

    get fileExtension() {
        return "webp";
    }
}

class Audio extends Media {
    constructor(msgData) {
        super(msgData);
        this._duration = msgData.duration
    }

    get typename() {
        return "Audio";
    }

    get appInfo() {
        return "WhatsApp Audio Keys";
    }

    get fileExtension() {
        return "ogg";
    }
}

const Type = {
    'ptt': Audio,
    'image': Image,
    'chat': Chat,
    'sticker': Sticker,
}

// extract is a convenient function to get the corresponding
// class message with O(1).
export function extract(msgData) {
    const type = Type[msgData.type];
    return type ? new type(msgData) : new Message(msgData);
}

function parseSender(sender) {
    if (!sender) return;
    const [number, type] = sender.split("@");
    return { number, type };
}