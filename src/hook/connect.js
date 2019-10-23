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
function inject(injectFn) {
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
            return attachTo(listener, mod.exports.default, injectFn);
        }
    }
}

function isLoggedIn() {
    return !!window.localStorage.getItem("WASecretBundle")
        && !!window.localStorage.getItem("logout-token")
}