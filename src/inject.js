// getWBMods retrieves the installed webpack modules for the given window `win`
export function getWBMods(win) {
    let mods, id = Date.now();
    win.webpackJsonp([], {
        [id]: (mod, exports, __webpack_require__) => {
                mods =  __webpack_require__.c;
            }
        },
        [id]
    );
    return mods;
}

function attachTo(listener, ctx, cb) {
    listener.push({
        context: undefined,
        ctx,
        callback: cb,
    });
}

// inject attachs a `injectFn` function to the target listener which intercepts new messages for
// a particular window `win`
export function inject(win, injectFn) {
    const mods = getWBMods(win);

    let name, listener, mod;
    for (name in mods) {
        mod = mods[name];
        try {
            listener = mod.exports.default._events.alert_new_msg;
        } catch(err) {
            if (err instanceof ReferenceError) {
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