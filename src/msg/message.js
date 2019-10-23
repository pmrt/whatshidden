class Message {
    constructor(msg) {
        this._type = msg.type;
        this._timestamp = msg.t;
        this._sender = msg.from;
        this._isForwarded = msg.isForwarded;
    }
}

class Chat extends Message {
    constructor(msg) {
        super(msg);
        this._body = msg.body;
    }

    toString() {
        return this._body;
    }
}

class Media extends Message {
    constructor(msg) {
        super(msg);
        this._mimetype = msg.mimetype;
        this._mediaKey = msg.mediaKey;
        this._clientUrl = msg.clientUrl;
        this._size = msg.size;
        this._filehash = msg.filehash;
    }

    toString() {
        return `${this.typename} message (${this._filehash})`;
    }
}

class Image extends Media {
    constructor(msg) {
        super(msg);
        this._body = msg.body;
        this._width = msg.width;
        this._height = msg.height;
    }

    get typename() {
        return "Image";
    }
}

class Voice extends Media {
    constructor(msg) {
        super(msg);
        this._duration = msg.duration
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
export function extract(msg) {
    return new Type[msg.type](msg);
}
