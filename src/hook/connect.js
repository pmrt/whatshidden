function getSession() {
    let
        key, value,
        i = 0,
        keys = Object.keys(window.localStorage),
        res = new Array(keys.length);
        len = keys.length;
    for(; i < len; i++) {
        key = keys[i];
        value = window.localStorage[key];
        res[i] = {key, value};
    }
    return res;
}

function setSession(items) {
    let
        obj,
        len = items.length,
        i = 0;
    for (;i < len; i++) {
        obj = items[i];
        window.localStorage.setItem(obj.key, obj.value);
    }
}

function getWBMods() {
    let mods, id = Date.now();
    window.webpackJsonp([], {
        [id]: (mod, exports, __webpack_require__) => {
                mods =  __webpack_require__.c;
            }
        },
        [id]
    );
    return mods;
}

function getConstants() {
    const mods = getWBMods();

    let name;
    for (name in mods) {
        mod = mods[name];
        if (mod.exports
            && mod.exports.hasOwnProperty('ACK')
            && mod.exports.hasOwnProperty('KEY_SECRET')
        ) {
            return mod.exports;
        }
    }
}

function attachTo(listener, ctx, cb) {
    listener.push({
        context: undefined,
        ctx,
        callback: cb,
    });
}

// inject attachs a `injectFn` function to the target listener which intercepts new message
// if `trial` = true no listener will be attached
function inject(injectFn, trial) {
    const mods = getWBMods();

    let name, listener, mod;
    for (name in mods) {
        mod = mods[name];
        try {
            listener = mod.exports.default._events.alert_new_msg;
        } catch(err) {
            if (err instanceof TypeError) {
                continue;
            } else {
                throw err;
            }
        }

        if (Array.isArray(listener)) {
            if (trial) return true;
            return attachTo(listener, mod.exports.default, injectFn);
        }
    }
    return false;
}

function waitForReady() {
    let timeout, timer;
    timeout = setTimeout(() => {
        clearInterval(timer);
        emit('wa:ready-timeout');
    }, 30e3);

    timer = setInterval(() => {
        if (inject(null, true)) {
            clearInterval(timer);
            clearTimeout(timeout);
            emit('wa:ready');
        }
    }, 50);
}

function emitMessage(data) {
    emit('message', data);
}

function isLoggedIn() {
    return !!window.localStorage.getItem("WASecretBundle")
        && !!window.localStorage.getItem("logout-token")
}