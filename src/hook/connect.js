function withCache(fn) {
    let cached;
	return () => cached = cached ? cached : fn()
}

function extractWBMods() {
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

function extractConstants() {
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

const getWBMods = withCache(extractWBMods);
const getConstants = withCache(extractConstants);

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

function attachTo(listener, ctx, cb) {
    listener.push({
        context: undefined,
        ctx,
        callback: cb,
    });
}

/*
    inject attachs a `injectFn` function to the target listener which intercepts
    new messages.

    inject will not attach the same `injectFn` function twice.

    If `trial` = true no listener will be attached, this is useful for testing or
    checking if the needed listener is available
*/
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
            if (listener.length >= 2 && !!listener.find(evt => evt.callback === injectFn)) return false;
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
    emit('wa:message', data);
}

function storageHas(item) {
    return !!window.localStorage.getItem(item);
}

function storageGet(item) {
    return JSON.parse(window.localStorage.getItem(item));
}

function isLoggedIn() {
    const { KEY_SECRET_BUNDLE, KEY_LOGOUT_TOKEN } = getConstants();
    return !!storageHas(KEY_SECRET_BUNDLE)
        && !!storageHas(KEY_LOGOUT_TOKEN);
}

function getLastWID() {
    const { KEY_LAST_WID } = getConstants();
    return storageGet(KEY_LAST_WID);
}