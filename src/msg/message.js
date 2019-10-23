const
    s = 1,
    ms = 1000;

class Message {
    constructor(msgData) {
        this._type = msgData.type;
        // timestamp (in seconds)
        this._timestamp = msgData.t * s;
        this.setTime(msgData.t * s);
        this._sender = msgData.from;
        this._isForwarded = msgData.isForwarded;
    }

    get sender() {
        const s = parseSender(this._sender);
        if (s.number) {
            return s.number;
        }
    }

    get at() {
       return this._timestr;
    }

    setTime(t) {
        const inMs = this._timestamp * ms;
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
        return `${this.typename} message (${this._filehash})`;
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
}

class Voice extends Media {
    constructor(msgData) {
        super(msgData);
        this._duration = msgData.duration
    }

    get typename() {
        return "Voice";
    }
}

const Type = {
    'ptt': Voice,
    'image': Image,
    'chat': Chat,
}

// extract is a convenient function to get with O(1) the corresponding
// class message.
export function extract(msgData) {
    return new Type[msgData.type](msgData);
}

function parseSender(sender) {
    if (!sender) return;
    const [number, type] = sender.split("@");
    return { number, type };
}