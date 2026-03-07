function Of(i, n) {
    for (var o = 0; o < n.length; o++) {
        const a = n[o];
        if (typeof a != "string" && !Array.isArray(a)) {
            for (const c in a)
                if (c !== "default" && !(c in i)) {
                    const f = Object.getOwnPropertyDescriptor(a, c);
                    f &&
                        Object.defineProperty(
                            i,
                            c,
                            f.get ? f : { enumerable: !0, get: () => a[c] }
                        );
                }
        }
    }
    return Object.freeze(Object.defineProperty(i, Symbol.toStringTag, { value: "Module" }));
}
(function () {
    const n = document.createElement("link").relList;
    if (n && n.supports && n.supports("modulepreload")) return;
    for (const c of document.querySelectorAll('link[rel="modulepreload"]')) a(c);
    new MutationObserver((c) => {
        for (const f of c)
            if (f.type === "childList")
                for (const h of f.addedNodes)
                    h.tagName === "LINK" && h.rel === "modulepreload" && a(h);
    }).observe(document, { childList: !0, subtree: !0 });
    function o(c) {
        const f = {};
        return (
            c.integrity && (f.integrity = c.integrity),
            c.referrerPolicy && (f.referrerPolicy = c.referrerPolicy),
            c.crossOrigin === "use-credentials"
                ? (f.credentials = "include")
                : c.crossOrigin === "anonymous"
                  ? (f.credentials = "omit")
                  : (f.credentials = "same-origin"),
            f
        );
    }
    function a(c) {
        if (c.ep) return;
        c.ep = !0;
        const f = o(c);
        fetch(c.href, f);
    }
})();
function Lf(i) {
    return i && i.__esModule && Object.prototype.hasOwnProperty.call(i, "default") ? i.default : i;
}
var Ss = { exports: {} },
    Jn = {},
    Bs = { exports: {} },
    ue = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Zc;
function Wp() {
    if (Zc) return ue;
    Zc = 1;
    var i = Symbol.for("react.element"),
        n = Symbol.for("react.portal"),
        o = Symbol.for("react.fragment"),
        a = Symbol.for("react.strict_mode"),
        c = Symbol.for("react.profiler"),
        f = Symbol.for("react.provider"),
        h = Symbol.for("react.context"),
        p = Symbol.for("react.forward_ref"),
        m = Symbol.for("react.suspense"),
        v = Symbol.for("react.memo"),
        b = Symbol.for("react.lazy"),
        y = Symbol.iterator;
    function k(x) {
        return x === null || typeof x != "object"
            ? null
            : ((x = (y && x[y]) || x["@@iterator"]), typeof x == "function" ? x : null);
    }
    var S = {
            isMounted: function () {
                return !1;
            },
            enqueueForceUpdate: function () {},
            enqueueReplaceState: function () {},
            enqueueSetState: function () {},
        },
        C = Object.assign,
        E = {};
    function N(x, F, ae) {
        ((this.props = x), (this.context = F), (this.refs = E), (this.updater = ae || S));
    }
    ((N.prototype.isReactComponent = {}),
        (N.prototype.setState = function (x, F) {
            if (typeof x != "object" && typeof x != "function" && x != null)
                throw Error(
                    "setState(...): takes an object of state variables to update or a function which returns an object of state variables."
                );
            this.updater.enqueueSetState(this, x, F, "setState");
        }),
        (N.prototype.forceUpdate = function (x) {
            this.updater.enqueueForceUpdate(this, x, "forceUpdate");
        }));
    function q() {}
    q.prototype = N.prototype;
    function H(x, F, ae) {
        ((this.props = x), (this.context = F), (this.refs = E), (this.updater = ae || S));
    }
    var D = (H.prototype = new q());
    ((D.constructor = H), C(D, N.prototype), (D.isPureReactComponent = !0));
    var Q = Array.isArray,
        re = Object.prototype.hasOwnProperty,
        G = { current: null },
        ee = { key: !0, ref: !0, __self: !0, __source: !0 };
    function U(x, F, ae) {
        var le,
            ce = {},
            he = null,
            we = null;
        if (F != null)
            for (le in (F.ref !== void 0 && (we = F.ref), F.key !== void 0 && (he = "" + F.key), F))
                re.call(F, le) && !ee.hasOwnProperty(le) && (ce[le] = F[le]);
        var me = arguments.length - 2;
        if (me === 1) ce.children = ae;
        else if (1 < me) {
            for (var Se = Array(me), dt = 0; dt < me; dt++) Se[dt] = arguments[dt + 2];
            ce.children = Se;
        }
        if (x && x.defaultProps)
            for (le in ((me = x.defaultProps), me)) ce[le] === void 0 && (ce[le] = me[le]);
        return { $$typeof: i, type: x, key: he, ref: we, props: ce, _owner: G.current };
    }
    function ie(x, F) {
        return { $$typeof: i, type: x.type, key: F, ref: x.ref, props: x.props, _owner: x._owner };
    }
    function fe(x) {
        return typeof x == "object" && x !== null && x.$$typeof === i;
    }
    function Ue(x) {
        var F = { "=": "=0", ":": "=2" };
        return (
            "$" +
            x.replace(/[=:]/g, function (ae) {
                return F[ae];
            })
        );
    }
    var Te = /\/+/g;
    function Oe(x, F) {
        return typeof x == "object" && x !== null && x.key != null
            ? Ue("" + x.key)
            : F.toString(36);
    }
    function Qe(x, F, ae, le, ce) {
        var he = typeof x;
        (he === "undefined" || he === "boolean") && (x = null);
        var we = !1;
        if (x === null) we = !0;
        else
            switch (he) {
                case "string":
                case "number":
                    we = !0;
                    break;
                case "object":
                    switch (x.$$typeof) {
                        case i:
                        case n:
                            we = !0;
                    }
            }
        if (we)
            return (
                (we = x),
                (ce = ce(we)),
                (x = le === "" ? "." + Oe(we, 0) : le),
                Q(ce)
                    ? ((ae = ""),
                      x != null && (ae = x.replace(Te, "$&/") + "/"),
                      Qe(ce, F, ae, "", function (dt) {
                          return dt;
                      }))
                    : ce != null &&
                      (fe(ce) &&
                          (ce = ie(
                              ce,
                              ae +
                                  (!ce.key || (we && we.key === ce.key)
                                      ? ""
                                      : ("" + ce.key).replace(Te, "$&/") + "/") +
                                  x
                          )),
                      F.push(ce)),
                1
            );
        if (((we = 0), (le = le === "" ? "." : le + ":"), Q(x)))
            for (var me = 0; me < x.length; me++) {
                he = x[me];
                var Se = le + Oe(he, me);
                we += Qe(he, F, ae, Se, ce);
            }
        else if (((Se = k(x)), typeof Se == "function"))
            for (x = Se.call(x), me = 0; !(he = x.next()).done; )
                ((he = he.value), (Se = le + Oe(he, me++)), (we += Qe(he, F, ae, Se, ce)));
        else if (he === "object")
            throw (
                (F = String(x)),
                Error(
                    "Objects are not valid as a React child (found: " +
                        (F === "[object Object]"
                            ? "object with keys {" + Object.keys(x).join(", ") + "}"
                            : F) +
                        "). If you meant to render a collection of children, use an array instead."
                )
            );
        return we;
    }
    function qe(x, F, ae) {
        if (x == null) return x;
        var le = [],
            ce = 0;
        return (
            Qe(x, le, "", "", function (he) {
                return F.call(ae, he, ce++);
            }),
            le
        );
    }
    function A(x) {
        if (x._status === -1) {
            var F = x._result;
            ((F = F()),
                F.then(
                    function (ae) {
                        (x._status === 0 || x._status === -1) &&
                            ((x._status = 1), (x._result = ae));
                    },
                    function (ae) {
                        (x._status === 0 || x._status === -1) &&
                            ((x._status = 2), (x._result = ae));
                    }
                ),
                x._status === -1 && ((x._status = 0), (x._result = F)));
        }
        if (x._status === 1) return x._result.default;
        throw x._result;
    }
    var Y = { current: null },
        P = { transition: null },
        V = { ReactCurrentDispatcher: Y, ReactCurrentBatchConfig: P, ReactCurrentOwner: G };
    function L() {
        throw Error("act(...) is not supported in production builds of React.");
    }
    return (
        (ue.Children = {
            map: qe,
            forEach: function (x, F, ae) {
                qe(
                    x,
                    function () {
                        F.apply(this, arguments);
                    },
                    ae
                );
            },
            count: function (x) {
                var F = 0;
                return (
                    qe(x, function () {
                        F++;
                    }),
                    F
                );
            },
            toArray: function (x) {
                return (
                    qe(x, function (F) {
                        return F;
                    }) || []
                );
            },
            only: function (x) {
                if (!fe(x))
                    throw Error(
                        "React.Children.only expected to receive a single React element child."
                    );
                return x;
            },
        }),
        (ue.Component = N),
        (ue.Fragment = o),
        (ue.Profiler = c),
        (ue.PureComponent = H),
        (ue.StrictMode = a),
        (ue.Suspense = m),
        (ue.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = V),
        (ue.act = L),
        (ue.cloneElement = function (x, F, ae) {
            if (x == null)
                throw Error(
                    "React.cloneElement(...): The argument must be a React element, but you passed " +
                        x +
                        "."
                );
            var le = C({}, x.props),
                ce = x.key,
                he = x.ref,
                we = x._owner;
            if (F != null) {
                if (
                    (F.ref !== void 0 && ((he = F.ref), (we = G.current)),
                    F.key !== void 0 && (ce = "" + F.key),
                    x.type && x.type.defaultProps)
                )
                    var me = x.type.defaultProps;
                for (Se in F)
                    re.call(F, Se) &&
                        !ee.hasOwnProperty(Se) &&
                        (le[Se] = F[Se] === void 0 && me !== void 0 ? me[Se] : F[Se]);
            }
            var Se = arguments.length - 2;
            if (Se === 1) le.children = ae;
            else if (1 < Se) {
                me = Array(Se);
                for (var dt = 0; dt < Se; dt++) me[dt] = arguments[dt + 2];
                le.children = me;
            }
            return { $$typeof: i, type: x.type, key: ce, ref: he, props: le, _owner: we };
        }),
        (ue.createContext = function (x) {
            return (
                (x = {
                    $$typeof: h,
                    _currentValue: x,
                    _currentValue2: x,
                    _threadCount: 0,
                    Provider: null,
                    Consumer: null,
                    _defaultValue: null,
                    _globalName: null,
                }),
                (x.Provider = { $$typeof: f, _context: x }),
                (x.Consumer = x)
            );
        }),
        (ue.createElement = U),
        (ue.createFactory = function (x) {
            var F = U.bind(null, x);
            return ((F.type = x), F);
        }),
        (ue.createRef = function () {
            return { current: null };
        }),
        (ue.forwardRef = function (x) {
            return { $$typeof: p, render: x };
        }),
        (ue.isValidElement = fe),
        (ue.lazy = function (x) {
            return { $$typeof: b, _payload: { _status: -1, _result: x }, _init: A };
        }),
        (ue.memo = function (x, F) {
            return { $$typeof: v, type: x, compare: F === void 0 ? null : F };
        }),
        (ue.startTransition = function (x) {
            var F = P.transition;
            P.transition = {};
            try {
                x();
            } finally {
                P.transition = F;
            }
        }),
        (ue.unstable_act = L),
        (ue.useCallback = function (x, F) {
            return Y.current.useCallback(x, F);
        }),
        (ue.useContext = function (x) {
            return Y.current.useContext(x);
        }),
        (ue.useDebugValue = function () {}),
        (ue.useDeferredValue = function (x) {
            return Y.current.useDeferredValue(x);
        }),
        (ue.useEffect = function (x, F) {
            return Y.current.useEffect(x, F);
        }),
        (ue.useId = function () {
            return Y.current.useId();
        }),
        (ue.useImperativeHandle = function (x, F, ae) {
            return Y.current.useImperativeHandle(x, F, ae);
        }),
        (ue.useInsertionEffect = function (x, F) {
            return Y.current.useInsertionEffect(x, F);
        }),
        (ue.useLayoutEffect = function (x, F) {
            return Y.current.useLayoutEffect(x, F);
        }),
        (ue.useMemo = function (x, F) {
            return Y.current.useMemo(x, F);
        }),
        (ue.useReducer = function (x, F, ae) {
            return Y.current.useReducer(x, F, ae);
        }),
        (ue.useRef = function (x) {
            return Y.current.useRef(x);
        }),
        (ue.useState = function (x) {
            return Y.current.useState(x);
        }),
        (ue.useSyncExternalStore = function (x, F, ae) {
            return Y.current.useSyncExternalStore(x, F, ae);
        }),
        (ue.useTransition = function () {
            return Y.current.useTransition();
        }),
        (ue.version = "18.3.1"),
        ue
    );
}
var ef;
function $s() {
    return (ef || ((ef = 1), (Bs.exports = Wp())), Bs.exports);
}
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var tf;
function Up() {
    if (tf) return Jn;
    tf = 1;
    var i = $s(),
        n = Symbol.for("react.element"),
        o = Symbol.for("react.fragment"),
        a = Object.prototype.hasOwnProperty,
        c = i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
        f = { key: !0, ref: !0, __self: !0, __source: !0 };
    function h(p, m, v) {
        var b,
            y = {},
            k = null,
            S = null;
        (v !== void 0 && (k = "" + v),
            m.key !== void 0 && (k = "" + m.key),
            m.ref !== void 0 && (S = m.ref));
        for (b in m) a.call(m, b) && !f.hasOwnProperty(b) && (y[b] = m[b]);
        if (p && p.defaultProps)
            for (b in ((m = p.defaultProps), m)) y[b] === void 0 && (y[b] = m[b]);
        return { $$typeof: n, type: p, key: k, ref: S, props: y, _owner: c.current };
    }
    return ((Jn.Fragment = o), (Jn.jsx = h), (Jn.jsxs = h), Jn);
}
var rf;
function Vp() {
    return (rf || ((rf = 1), (Ss.exports = Up())), Ss.exports);
}
var Fe = Vp();
const Kp = Lf(Fe),
    $p = Of({ __proto__: null, default: Kp }, [Fe]);
var gi = {},
    Es = { exports: {} },
    ft = {},
    Ts = { exports: {} },
    Cs = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var nf;
function Qp() {
    return (
        nf ||
            ((nf = 1),
            (function (i) {
                function n(P, V) {
                    var L = P.length;
                    P.push(V);
                    e: for (; 0 < L; ) {
                        var x = (L - 1) >>> 1,
                            F = P[x];
                        if (0 < c(F, V)) ((P[x] = V), (P[L] = F), (L = x));
                        else break e;
                    }
                }
                function o(P) {
                    return P.length === 0 ? null : P[0];
                }
                function a(P) {
                    if (P.length === 0) return null;
                    var V = P[0],
                        L = P.pop();
                    if (L !== V) {
                        P[0] = L;
                        e: for (var x = 0, F = P.length, ae = F >>> 1; x < ae; ) {
                            var le = 2 * (x + 1) - 1,
                                ce = P[le],
                                he = le + 1,
                                we = P[he];
                            if (0 > c(ce, L))
                                he < F && 0 > c(we, ce)
                                    ? ((P[x] = we), (P[he] = L), (x = he))
                                    : ((P[x] = ce), (P[le] = L), (x = le));
                            else if (he < F && 0 > c(we, L)) ((P[x] = we), (P[he] = L), (x = he));
                            else break e;
                        }
                    }
                    return V;
                }
                function c(P, V) {
                    var L = P.sortIndex - V.sortIndex;
                    return L !== 0 ? L : P.id - V.id;
                }
                if (typeof performance == "object" && typeof performance.now == "function") {
                    var f = performance;
                    i.unstable_now = function () {
                        return f.now();
                    };
                } else {
                    var h = Date,
                        p = h.now();
                    i.unstable_now = function () {
                        return h.now() - p;
                    };
                }
                var m = [],
                    v = [],
                    b = 1,
                    y = null,
                    k = 3,
                    S = !1,
                    C = !1,
                    E = !1,
                    N = typeof setTimeout == "function" ? setTimeout : null,
                    q = typeof clearTimeout == "function" ? clearTimeout : null,
                    H = typeof setImmediate < "u" ? setImmediate : null;
                typeof navigator < "u" &&
                    navigator.scheduling !== void 0 &&
                    navigator.scheduling.isInputPending !== void 0 &&
                    navigator.scheduling.isInputPending.bind(navigator.scheduling);
                function D(P) {
                    for (var V = o(v); V !== null; ) {
                        if (V.callback === null) a(v);
                        else if (V.startTime <= P)
                            (a(v), (V.sortIndex = V.expirationTime), n(m, V));
                        else break;
                        V = o(v);
                    }
                }
                function Q(P) {
                    if (((E = !1), D(P), !C))
                        if (o(m) !== null) ((C = !0), A(re));
                        else {
                            var V = o(v);
                            V !== null && Y(Q, V.startTime - P);
                        }
                }
                function re(P, V) {
                    ((C = !1), E && ((E = !1), q(U), (U = -1)), (S = !0));
                    var L = k;
                    try {
                        for (
                            D(V), y = o(m);
                            y !== null && (!(y.expirationTime > V) || (P && !Ue()));
                        ) {
                            var x = y.callback;
                            if (typeof x == "function") {
                                ((y.callback = null), (k = y.priorityLevel));
                                var F = x(y.expirationTime <= V);
                                ((V = i.unstable_now()),
                                    typeof F == "function" ? (y.callback = F) : y === o(m) && a(m),
                                    D(V));
                            } else a(m);
                            y = o(m);
                        }
                        if (y !== null) var ae = !0;
                        else {
                            var le = o(v);
                            (le !== null && Y(Q, le.startTime - V), (ae = !1));
                        }
                        return ae;
                    } finally {
                        ((y = null), (k = L), (S = !1));
                    }
                }
                var G = !1,
                    ee = null,
                    U = -1,
                    ie = 5,
                    fe = -1;
                function Ue() {
                    return !(i.unstable_now() - fe < ie);
                }
                function Te() {
                    if (ee !== null) {
                        var P = i.unstable_now();
                        fe = P;
                        var V = !0;
                        try {
                            V = ee(!0, P);
                        } finally {
                            V ? Oe() : ((G = !1), (ee = null));
                        }
                    } else G = !1;
                }
                var Oe;
                if (typeof H == "function")
                    Oe = function () {
                        H(Te);
                    };
                else if (typeof MessageChannel < "u") {
                    var Qe = new MessageChannel(),
                        qe = Qe.port2;
                    ((Qe.port1.onmessage = Te),
                        (Oe = function () {
                            qe.postMessage(null);
                        }));
                } else
                    Oe = function () {
                        N(Te, 0);
                    };
                function A(P) {
                    ((ee = P), G || ((G = !0), Oe()));
                }
                function Y(P, V) {
                    U = N(function () {
                        P(i.unstable_now());
                    }, V);
                }
                ((i.unstable_IdlePriority = 5),
                    (i.unstable_ImmediatePriority = 1),
                    (i.unstable_LowPriority = 4),
                    (i.unstable_NormalPriority = 3),
                    (i.unstable_Profiling = null),
                    (i.unstable_UserBlockingPriority = 2),
                    (i.unstable_cancelCallback = function (P) {
                        P.callback = null;
                    }),
                    (i.unstable_continueExecution = function () {
                        C || S || ((C = !0), A(re));
                    }),
                    (i.unstable_forceFrameRate = function (P) {
                        0 > P || 125 < P
                            ? console.error(
                                  "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
                              )
                            : (ie = 0 < P ? Math.floor(1e3 / P) : 5);
                    }),
                    (i.unstable_getCurrentPriorityLevel = function () {
                        return k;
                    }),
                    (i.unstable_getFirstCallbackNode = function () {
                        return o(m);
                    }),
                    (i.unstable_next = function (P) {
                        switch (k) {
                            case 1:
                            case 2:
                            case 3:
                                var V = 3;
                                break;
                            default:
                                V = k;
                        }
                        var L = k;
                        k = V;
                        try {
                            return P();
                        } finally {
                            k = L;
                        }
                    }),
                    (i.unstable_pauseExecution = function () {}),
                    (i.unstable_requestPaint = function () {}),
                    (i.unstable_runWithPriority = function (P, V) {
                        switch (P) {
                            case 1:
                            case 2:
                            case 3:
                            case 4:
                            case 5:
                                break;
                            default:
                                P = 3;
                        }
                        var L = k;
                        k = P;
                        try {
                            return V();
                        } finally {
                            k = L;
                        }
                    }),
                    (i.unstable_scheduleCallback = function (P, V, L) {
                        var x = i.unstable_now();
                        switch (
                            (typeof L == "object" && L !== null
                                ? ((L = L.delay), (L = typeof L == "number" && 0 < L ? x + L : x))
                                : (L = x),
                            P)
                        ) {
                            case 1:
                                var F = -1;
                                break;
                            case 2:
                                F = 250;
                                break;
                            case 5:
                                F = 1073741823;
                                break;
                            case 4:
                                F = 1e4;
                                break;
                            default:
                                F = 5e3;
                        }
                        return (
                            (F = L + F),
                            (P = {
                                id: b++,
                                callback: V,
                                priorityLevel: P,
                                startTime: L,
                                expirationTime: F,
                                sortIndex: -1,
                            }),
                            L > x
                                ? ((P.sortIndex = L),
                                  n(v, P),
                                  o(m) === null &&
                                      P === o(v) &&
                                      (E ? (q(U), (U = -1)) : (E = !0), Y(Q, L - x)))
                                : ((P.sortIndex = F), n(m, P), C || S || ((C = !0), A(re))),
                            P
                        );
                    }),
                    (i.unstable_shouldYield = Ue),
                    (i.unstable_wrapCallback = function (P) {
                        var V = k;
                        return function () {
                            var L = k;
                            k = V;
                            try {
                                return P.apply(this, arguments);
                            } finally {
                                k = L;
                            }
                        };
                    }));
            })(Cs)),
        Cs
    );
}
var of;
function Gp() {
    return (of || ((of = 1), (Ts.exports = Qp())), Ts.exports);
}
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var lf;
function Xp() {
    if (lf) return ft;
    lf = 1;
    var i = $s(),
        n = Gp();
    function o(e) {
        for (
            var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e, r = 1;
            r < arguments.length;
            r++
        )
            t += "&args[]=" + encodeURIComponent(arguments[r]);
        return (
            "Minified React error #" +
            e +
            "; visit " +
            t +
            " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
        );
    }
    var a = new Set(),
        c = {};
    function f(e, t) {
        (h(e, t), h(e + "Capture", t));
    }
    function h(e, t) {
        for (c[e] = t, e = 0; e < t.length; e++) a.add(t[e]);
    }
    var p = !(
            typeof window > "u" ||
            typeof window.document > "u" ||
            typeof window.document.createElement > "u"
        ),
        m = Object.prototype.hasOwnProperty,
        v =
            /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
        b = {},
        y = {};
    function k(e) {
        return m.call(y, e) ? !0 : m.call(b, e) ? !1 : v.test(e) ? (y[e] = !0) : ((b[e] = !0), !1);
    }
    function S(e, t, r, l) {
        if (r !== null && r.type === 0) return !1;
        switch (typeof t) {
            case "function":
            case "symbol":
                return !0;
            case "boolean":
                return l
                    ? !1
                    : r !== null
                      ? !r.acceptsBooleans
                      : ((e = e.toLowerCase().slice(0, 5)), e !== "data-" && e !== "aria-");
            default:
                return !1;
        }
    }
    function C(e, t, r, l) {
        if (t === null || typeof t > "u" || S(e, t, r, l)) return !0;
        if (l) return !1;
        if (r !== null)
            switch (r.type) {
                case 3:
                    return !t;
                case 4:
                    return t === !1;
                case 5:
                    return isNaN(t);
                case 6:
                    return isNaN(t) || 1 > t;
            }
        return !1;
    }
    function E(e, t, r, l, s, u, d) {
        ((this.acceptsBooleans = t === 2 || t === 3 || t === 4),
            (this.attributeName = l),
            (this.attributeNamespace = s),
            (this.mustUseProperty = r),
            (this.propertyName = e),
            (this.type = t),
            (this.sanitizeURL = u),
            (this.removeEmptyString = d));
    }
    var N = {};
    ("children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style"
        .split(" ")
        .forEach(function (e) {
            N[e] = new E(e, 0, !1, e, null, !1, !1);
        }),
        [
            ["acceptCharset", "accept-charset"],
            ["className", "class"],
            ["htmlFor", "for"],
            ["httpEquiv", "http-equiv"],
        ].forEach(function (e) {
            var t = e[0];
            N[t] = new E(t, 1, !1, e[1], null, !1, !1);
        }),
        ["contentEditable", "draggable", "spellCheck", "value"].forEach(function (e) {
            N[e] = new E(e, 2, !1, e.toLowerCase(), null, !1, !1);
        }),
        ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(
            function (e) {
                N[e] = new E(e, 2, !1, e, null, !1, !1);
            }
        ),
        "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope"
            .split(" ")
            .forEach(function (e) {
                N[e] = new E(e, 3, !1, e.toLowerCase(), null, !1, !1);
            }),
        ["checked", "multiple", "muted", "selected"].forEach(function (e) {
            N[e] = new E(e, 3, !0, e, null, !1, !1);
        }),
        ["capture", "download"].forEach(function (e) {
            N[e] = new E(e, 4, !1, e, null, !1, !1);
        }),
        ["cols", "rows", "size", "span"].forEach(function (e) {
            N[e] = new E(e, 6, !1, e, null, !1, !1);
        }),
        ["rowSpan", "start"].forEach(function (e) {
            N[e] = new E(e, 5, !1, e.toLowerCase(), null, !1, !1);
        }));
    var q = /[\-:]([a-z])/g;
    function H(e) {
        return e[1].toUpperCase();
    }
    ("accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height"
        .split(" ")
        .forEach(function (e) {
            var t = e.replace(q, H);
            N[t] = new E(t, 1, !1, e, null, !1, !1);
        }),
        "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type"
            .split(" ")
            .forEach(function (e) {
                var t = e.replace(q, H);
                N[t] = new E(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
            }),
        ["xml:base", "xml:lang", "xml:space"].forEach(function (e) {
            var t = e.replace(q, H);
            N[t] = new E(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
        }),
        ["tabIndex", "crossOrigin"].forEach(function (e) {
            N[e] = new E(e, 1, !1, e.toLowerCase(), null, !1, !1);
        }),
        (N.xlinkHref = new E(
            "xlinkHref",
            1,
            !1,
            "xlink:href",
            "http://www.w3.org/1999/xlink",
            !0,
            !1
        )),
        ["src", "href", "action", "formAction"].forEach(function (e) {
            N[e] = new E(e, 1, !1, e.toLowerCase(), null, !0, !0);
        }));
    function D(e, t, r, l) {
        var s = N.hasOwnProperty(t) ? N[t] : null;
        (s !== null
            ? s.type !== 0
            : l ||
              !(2 < t.length) ||
              (t[0] !== "o" && t[0] !== "O") ||
              (t[1] !== "n" && t[1] !== "N")) &&
            (C(t, r, s, l) && (r = null),
            l || s === null
                ? k(t) && (r === null ? e.removeAttribute(t) : e.setAttribute(t, "" + r))
                : s.mustUseProperty
                  ? (e[s.propertyName] = r === null ? (s.type === 3 ? !1 : "") : r)
                  : ((t = s.attributeName),
                    (l = s.attributeNamespace),
                    r === null
                        ? e.removeAttribute(t)
                        : ((s = s.type),
                          (r = s === 3 || (s === 4 && r === !0) ? "" : "" + r),
                          l ? e.setAttributeNS(l, t, r) : e.setAttribute(t, r))));
    }
    var Q = i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
        re = Symbol.for("react.element"),
        G = Symbol.for("react.portal"),
        ee = Symbol.for("react.fragment"),
        U = Symbol.for("react.strict_mode"),
        ie = Symbol.for("react.profiler"),
        fe = Symbol.for("react.provider"),
        Ue = Symbol.for("react.context"),
        Te = Symbol.for("react.forward_ref"),
        Oe = Symbol.for("react.suspense"),
        Qe = Symbol.for("react.suspense_list"),
        qe = Symbol.for("react.memo"),
        A = Symbol.for("react.lazy"),
        Y = Symbol.for("react.offscreen"),
        P = Symbol.iterator;
    function V(e) {
        return e === null || typeof e != "object"
            ? null
            : ((e = (P && e[P]) || e["@@iterator"]), typeof e == "function" ? e : null);
    }
    var L = Object.assign,
        x;
    function F(e) {
        if (x === void 0)
            try {
                throw Error();
            } catch (r) {
                var t = r.stack.trim().match(/\n( *(at )?)/);
                x = (t && t[1]) || "";
            }
        return (
            `
` +
            x +
            e
        );
    }
    var ae = !1;
    function le(e, t) {
        if (!e || ae) return "";
        ae = !0;
        var r = Error.prepareStackTrace;
        Error.prepareStackTrace = void 0;
        try {
            if (t)
                if (
                    ((t = function () {
                        throw Error();
                    }),
                    Object.defineProperty(t.prototype, "props", {
                        set: function () {
                            throw Error();
                        },
                    }),
                    typeof Reflect == "object" && Reflect.construct)
                ) {
                    try {
                        Reflect.construct(t, []);
                    } catch (z) {
                        var l = z;
                    }
                    Reflect.construct(e, [], t);
                } else {
                    try {
                        t.call();
                    } catch (z) {
                        l = z;
                    }
                    e.call(t.prototype);
                }
            else {
                try {
                    throw Error();
                } catch (z) {
                    l = z;
                }
                e();
            }
        } catch (z) {
            if (z && l && typeof z.stack == "string") {
                for (
                    var s = z.stack.split(`
`),
                        u = l.stack.split(`
`),
                        d = s.length - 1,
                        g = u.length - 1;
                    1 <= d && 0 <= g && s[d] !== u[g];
                )
                    g--;
                for (; 1 <= d && 0 <= g; d--, g--)
                    if (s[d] !== u[g]) {
                        if (d !== 1 || g !== 1)
                            do
                                if ((d--, g--, 0 > g || s[d] !== u[g])) {
                                    var w =
                                        `
` + s[d].replace(" at new ", " at ");
                                    return (
                                        e.displayName &&
                                            w.includes("<anonymous>") &&
                                            (w = w.replace("<anonymous>", e.displayName)),
                                        w
                                    );
                                }
                            while (1 <= d && 0 <= g);
                        break;
                    }
            }
        } finally {
            ((ae = !1), (Error.prepareStackTrace = r));
        }
        return (e = e ? e.displayName || e.name : "") ? F(e) : "";
    }
    function ce(e) {
        switch (e.tag) {
            case 5:
                return F(e.type);
            case 16:
                return F("Lazy");
            case 13:
                return F("Suspense");
            case 19:
                return F("SuspenseList");
            case 0:
            case 2:
            case 15:
                return ((e = le(e.type, !1)), e);
            case 11:
                return ((e = le(e.type.render, !1)), e);
            case 1:
                return ((e = le(e.type, !0)), e);
            default:
                return "";
        }
    }
    function he(e) {
        if (e == null) return null;
        if (typeof e == "function") return e.displayName || e.name || null;
        if (typeof e == "string") return e;
        switch (e) {
            case ee:
                return "Fragment";
            case G:
                return "Portal";
            case ie:
                return "Profiler";
            case U:
                return "StrictMode";
            case Oe:
                return "Suspense";
            case Qe:
                return "SuspenseList";
        }
        if (typeof e == "object")
            switch (e.$$typeof) {
                case Ue:
                    return (e.displayName || "Context") + ".Consumer";
                case fe:
                    return (e._context.displayName || "Context") + ".Provider";
                case Te:
                    var t = e.render;
                    return (
                        (e = e.displayName),
                        e ||
                            ((e = t.displayName || t.name || ""),
                            (e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")),
                        e
                    );
                case qe:
                    return ((t = e.displayName || null), t !== null ? t : he(e.type) || "Memo");
                case A:
                    ((t = e._payload), (e = e._init));
                    try {
                        return he(e(t));
                    } catch {}
            }
        return null;
    }
    function we(e) {
        var t = e.type;
        switch (e.tag) {
            case 24:
                return "Cache";
            case 9:
                return (t.displayName || "Context") + ".Consumer";
            case 10:
                return (t._context.displayName || "Context") + ".Provider";
            case 18:
                return "DehydratedFragment";
            case 11:
                return (
                    (e = t.render),
                    (e = e.displayName || e.name || ""),
                    t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")
                );
            case 7:
                return "Fragment";
            case 5:
                return t;
            case 4:
                return "Portal";
            case 3:
                return "Root";
            case 6:
                return "Text";
            case 16:
                return he(t);
            case 8:
                return t === U ? "StrictMode" : "Mode";
            case 22:
                return "Offscreen";
            case 12:
                return "Profiler";
            case 21:
                return "Scope";
            case 13:
                return "Suspense";
            case 19:
                return "SuspenseList";
            case 25:
                return "TracingMarker";
            case 1:
            case 0:
            case 17:
            case 2:
            case 14:
            case 15:
                if (typeof t == "function") return t.displayName || t.name || null;
                if (typeof t == "string") return t;
        }
        return null;
    }
    function me(e) {
        switch (typeof e) {
            case "boolean":
            case "number":
            case "string":
            case "undefined":
                return e;
            case "object":
                return e;
            default:
                return "";
        }
    }
    function Se(e) {
        var t = e.type;
        return (
            (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio")
        );
    }
    function dt(e) {
        var t = Se(e) ? "checked" : "value",
            r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
            l = "" + e[t];
        if (
            !e.hasOwnProperty(t) &&
            typeof r < "u" &&
            typeof r.get == "function" &&
            typeof r.set == "function"
        ) {
            var s = r.get,
                u = r.set;
            return (
                Object.defineProperty(e, t, {
                    configurable: !0,
                    get: function () {
                        return s.call(this);
                    },
                    set: function (d) {
                        ((l = "" + d), u.call(this, d));
                    },
                }),
                Object.defineProperty(e, t, { enumerable: r.enumerable }),
                {
                    getValue: function () {
                        return l;
                    },
                    setValue: function (d) {
                        l = "" + d;
                    },
                    stopTracking: function () {
                        ((e._valueTracker = null), delete e[t]);
                    },
                }
            );
        }
    }
    function lo(e) {
        e._valueTracker || (e._valueTracker = dt(e));
    }
    function ia(e) {
        if (!e) return !1;
        var t = e._valueTracker;
        if (!t) return !0;
        var r = t.getValue(),
            l = "";
        return (
            e && (l = Se(e) ? (e.checked ? "true" : "false") : e.value),
            (e = l),
            e !== r ? (t.setValue(e), !0) : !1
        );
    }
    function so(e) {
        if (((e = e || (typeof document < "u" ? document : void 0)), typeof e > "u")) return null;
        try {
            return e.activeElement || e.body;
        } catch {
            return e.body;
        }
    }
    function Pi(e, t) {
        var r = t.checked;
        return L({}, t, {
            defaultChecked: void 0,
            defaultValue: void 0,
            value: void 0,
            checked: r ?? e._wrapperState.initialChecked,
        });
    }
    function la(e, t) {
        var r = t.defaultValue == null ? "" : t.defaultValue,
            l = t.checked != null ? t.checked : t.defaultChecked;
        ((r = me(t.value != null ? t.value : r)),
            (e._wrapperState = {
                initialChecked: l,
                initialValue: r,
                controlled:
                    t.type === "checkbox" || t.type === "radio"
                        ? t.checked != null
                        : t.value != null,
            }));
    }
    function sa(e, t) {
        ((t = t.checked), t != null && D(e, "checked", t, !1));
    }
    function Fi(e, t) {
        sa(e, t);
        var r = me(t.value),
            l = t.type;
        if (r != null)
            l === "number"
                ? ((r === 0 && e.value === "") || e.value != r) && (e.value = "" + r)
                : e.value !== "" + r && (e.value = "" + r);
        else if (l === "submit" || l === "reset") {
            e.removeAttribute("value");
            return;
        }
        (t.hasOwnProperty("value")
            ? Ri(e, t.type, r)
            : t.hasOwnProperty("defaultValue") && Ri(e, t.type, me(t.defaultValue)),
            t.checked == null &&
                t.defaultChecked != null &&
                (e.defaultChecked = !!t.defaultChecked));
    }
    function aa(e, t, r) {
        if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
            var l = t.type;
            if (!((l !== "submit" && l !== "reset") || (t.value !== void 0 && t.value !== null)))
                return;
            ((t = "" + e._wrapperState.initialValue),
                r || t === e.value || (e.value = t),
                (e.defaultValue = t));
        }
        ((r = e.name),
            r !== "" && (e.name = ""),
            (e.defaultChecked = !!e._wrapperState.initialChecked),
            r !== "" && (e.name = r));
    }
    function Ri(e, t, r) {
        (t !== "number" || so(e.ownerDocument) !== e) &&
            (r == null
                ? (e.defaultValue = "" + e._wrapperState.initialValue)
                : e.defaultValue !== "" + r && (e.defaultValue = "" + r));
    }
    var hn = Array.isArray;
    function Or(e, t, r, l) {
        if (((e = e.options), t)) {
            t = {};
            for (var s = 0; s < r.length; s++) t["$" + r[s]] = !0;
            for (r = 0; r < e.length; r++)
                ((s = t.hasOwnProperty("$" + e[r].value)),
                    e[r].selected !== s && (e[r].selected = s),
                    s && l && (e[r].defaultSelected = !0));
        } else {
            for (r = "" + me(r), t = null, s = 0; s < e.length; s++) {
                if (e[s].value === r) {
                    ((e[s].selected = !0), l && (e[s].defaultSelected = !0));
                    return;
                }
                t !== null || e[s].disabled || (t = e[s]);
            }
            t !== null && (t.selected = !0);
        }
    }
    function ji(e, t) {
        if (t.dangerouslySetInnerHTML != null) throw Error(o(91));
        return L({}, t, {
            value: void 0,
            defaultValue: void 0,
            children: "" + e._wrapperState.initialValue,
        });
    }
    function ua(e, t) {
        var r = t.value;
        if (r == null) {
            if (((r = t.children), (t = t.defaultValue), r != null)) {
                if (t != null) throw Error(o(92));
                if (hn(r)) {
                    if (1 < r.length) throw Error(o(93));
                    r = r[0];
                }
                t = r;
            }
            (t == null && (t = ""), (r = t));
        }
        e._wrapperState = { initialValue: me(r) };
    }
    function ca(e, t) {
        var r = me(t.value),
            l = me(t.defaultValue);
        (r != null &&
            ((r = "" + r),
            r !== e.value && (e.value = r),
            t.defaultValue == null && e.defaultValue !== r && (e.defaultValue = r)),
            l != null && (e.defaultValue = "" + l));
    }
    function fa(e) {
        var t = e.textContent;
        t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
    }
    function da(e) {
        switch (e) {
            case "svg":
                return "http://www.w3.org/2000/svg";
            case "math":
                return "http://www.w3.org/1998/Math/MathML";
            default:
                return "http://www.w3.org/1999/xhtml";
        }
    }
    function Ii(e, t) {
        return e == null || e === "http://www.w3.org/1999/xhtml"
            ? da(t)
            : e === "http://www.w3.org/2000/svg" && t === "foreignObject"
              ? "http://www.w3.org/1999/xhtml"
              : e;
    }
    var ao,
        ha = (function (e) {
            return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction
                ? function (t, r, l, s) {
                      MSApp.execUnsafeLocalFunction(function () {
                          return e(t, r, l, s);
                      });
                  }
                : e;
        })(function (e, t) {
            if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e)
                e.innerHTML = t;
            else {
                for (
                    ao = ao || document.createElement("div"),
                        ao.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>",
                        t = ao.firstChild;
                    e.firstChild;
                )
                    e.removeChild(e.firstChild);
                for (; t.firstChild; ) e.appendChild(t.firstChild);
            }
        });
    function pn(e, t) {
        if (t) {
            var r = e.firstChild;
            if (r && r === e.lastChild && r.nodeType === 3) {
                r.nodeValue = t;
                return;
            }
        }
        e.textContent = t;
    }
    var vn = {
            animationIterationCount: !0,
            aspectRatio: !0,
            borderImageOutset: !0,
            borderImageSlice: !0,
            borderImageWidth: !0,
            boxFlex: !0,
            boxFlexGroup: !0,
            boxOrdinalGroup: !0,
            columnCount: !0,
            columns: !0,
            flex: !0,
            flexGrow: !0,
            flexPositive: !0,
            flexShrink: !0,
            flexNegative: !0,
            flexOrder: !0,
            gridArea: !0,
            gridRow: !0,
            gridRowEnd: !0,
            gridRowSpan: !0,
            gridRowStart: !0,
            gridColumn: !0,
            gridColumnEnd: !0,
            gridColumnSpan: !0,
            gridColumnStart: !0,
            fontWeight: !0,
            lineClamp: !0,
            lineHeight: !0,
            opacity: !0,
            order: !0,
            orphans: !0,
            tabSize: !0,
            widows: !0,
            zIndex: !0,
            zoom: !0,
            fillOpacity: !0,
            floodOpacity: !0,
            stopOpacity: !0,
            strokeDasharray: !0,
            strokeDashoffset: !0,
            strokeMiterlimit: !0,
            strokeOpacity: !0,
            strokeWidth: !0,
        },
        $d = ["Webkit", "ms", "Moz", "O"];
    Object.keys(vn).forEach(function (e) {
        $d.forEach(function (t) {
            ((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (vn[t] = vn[e]));
        });
    });
    function pa(e, t, r) {
        return t == null || typeof t == "boolean" || t === ""
            ? ""
            : r || typeof t != "number" || t === 0 || (vn.hasOwnProperty(e) && vn[e])
              ? ("" + t).trim()
              : t + "px";
    }
    function va(e, t) {
        e = e.style;
        for (var r in t)
            if (t.hasOwnProperty(r)) {
                var l = r.indexOf("--") === 0,
                    s = pa(r, t[r], l);
                (r === "float" && (r = "cssFloat"), l ? e.setProperty(r, s) : (e[r] = s));
            }
    }
    var Qd = L(
        { menuitem: !0 },
        {
            area: !0,
            base: !0,
            br: !0,
            col: !0,
            embed: !0,
            hr: !0,
            img: !0,
            input: !0,
            keygen: !0,
            link: !0,
            meta: !0,
            param: !0,
            source: !0,
            track: !0,
            wbr: !0,
        }
    );
    function Di(e, t) {
        if (t) {
            if (Qd[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
                throw Error(o(137, e));
            if (t.dangerouslySetInnerHTML != null) {
                if (t.children != null) throw Error(o(60));
                if (
                    typeof t.dangerouslySetInnerHTML != "object" ||
                    !("__html" in t.dangerouslySetInnerHTML)
                )
                    throw Error(o(61));
            }
            if (t.style != null && typeof t.style != "object") throw Error(o(62));
        }
    }
    function Oi(e, t) {
        if (e.indexOf("-") === -1) return typeof t.is == "string";
        switch (e) {
            case "annotation-xml":
            case "color-profile":
            case "font-face":
            case "font-face-src":
            case "font-face-uri":
            case "font-face-format":
            case "font-face-name":
            case "missing-glyph":
                return !1;
            default:
                return !0;
        }
    }
    var Li = null;
    function Mi(e) {
        return (
            (e = e.target || e.srcElement || window),
            e.correspondingUseElement && (e = e.correspondingUseElement),
            e.nodeType === 3 ? e.parentNode : e
        );
    }
    var Ai = null,
        Lr = null,
        Mr = null;
    function ma(e) {
        if ((e = On(e))) {
            if (typeof Ai != "function") throw Error(o(280));
            var t = e.stateNode;
            t && ((t = Fo(t)), Ai(e.stateNode, e.type, t));
        }
    }
    function ga(e) {
        Lr ? (Mr ? Mr.push(e) : (Mr = [e])) : (Lr = e);
    }
    function ya() {
        if (Lr) {
            var e = Lr,
                t = Mr;
            if (((Mr = Lr = null), ma(e), t)) for (e = 0; e < t.length; e++) ma(t[e]);
        }
    }
    function wa(e, t) {
        return e(t);
    }
    function ba() {}
    var qi = !1;
    function _a(e, t, r) {
        if (qi) return e(t, r);
        qi = !0;
        try {
            return wa(e, t, r);
        } finally {
            ((qi = !1), (Lr !== null || Mr !== null) && (ba(), ya()));
        }
    }
    function mn(e, t) {
        var r = e.stateNode;
        if (r === null) return null;
        var l = Fo(r);
        if (l === null) return null;
        r = l[t];
        e: switch (t) {
            case "onClick":
            case "onClickCapture":
            case "onDoubleClick":
            case "onDoubleClickCapture":
            case "onMouseDown":
            case "onMouseDownCapture":
            case "onMouseMove":
            case "onMouseMoveCapture":
            case "onMouseUp":
            case "onMouseUpCapture":
            case "onMouseEnter":
                ((l = !l.disabled) ||
                    ((e = e.type),
                    (l = !(e === "button" || e === "input" || e === "select" || e === "textarea"))),
                    (e = !l));
                break e;
            default:
                e = !1;
        }
        if (e) return null;
        if (r && typeof r != "function") throw Error(o(231, t, typeof r));
        return r;
    }
    var Hi = !1;
    if (p)
        try {
            var gn = {};
            (Object.defineProperty(gn, "passive", {
                get: function () {
                    Hi = !0;
                },
            }),
                window.addEventListener("test", gn, gn),
                window.removeEventListener("test", gn, gn));
        } catch {
            Hi = !1;
        }
    function Gd(e, t, r, l, s, u, d, g, w) {
        var z = Array.prototype.slice.call(arguments, 3);
        try {
            t.apply(r, z);
        } catch (j) {
            this.onError(j);
        }
    }
    var yn = !1,
        uo = null,
        co = !1,
        Wi = null,
        Xd = {
            onError: function (e) {
                ((yn = !0), (uo = e));
            },
        };
    function Yd(e, t, r, l, s, u, d, g, w) {
        ((yn = !1), (uo = null), Gd.apply(Xd, arguments));
    }
    function Jd(e, t, r, l, s, u, d, g, w) {
        if ((Yd.apply(this, arguments), yn)) {
            if (yn) {
                var z = uo;
                ((yn = !1), (uo = null));
            } else throw Error(o(198));
            co || ((co = !0), (Wi = z));
        }
    }
    function xr(e) {
        var t = e,
            r = e;
        if (e.alternate) for (; t.return; ) t = t.return;
        else {
            e = t;
            do ((t = e), (t.flags & 4098) !== 0 && (r = t.return), (e = t.return));
            while (e);
        }
        return t.tag === 3 ? r : null;
    }
    function ka(e) {
        if (e.tag === 13) {
            var t = e.memoizedState;
            if (
                (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null)
            )
                return t.dehydrated;
        }
        return null;
    }
    function xa(e) {
        if (xr(e) !== e) throw Error(o(188));
    }
    function Zd(e) {
        var t = e.alternate;
        if (!t) {
            if (((t = xr(e)), t === null)) throw Error(o(188));
            return t !== e ? null : e;
        }
        for (var r = e, l = t; ; ) {
            var s = r.return;
            if (s === null) break;
            var u = s.alternate;
            if (u === null) {
                if (((l = s.return), l !== null)) {
                    r = l;
                    continue;
                }
                break;
            }
            if (s.child === u.child) {
                for (u = s.child; u; ) {
                    if (u === r) return (xa(s), e);
                    if (u === l) return (xa(s), t);
                    u = u.sibling;
                }
                throw Error(o(188));
            }
            if (r.return !== l.return) ((r = s), (l = u));
            else {
                for (var d = !1, g = s.child; g; ) {
                    if (g === r) {
                        ((d = !0), (r = s), (l = u));
                        break;
                    }
                    if (g === l) {
                        ((d = !0), (l = s), (r = u));
                        break;
                    }
                    g = g.sibling;
                }
                if (!d) {
                    for (g = u.child; g; ) {
                        if (g === r) {
                            ((d = !0), (r = u), (l = s));
                            break;
                        }
                        if (g === l) {
                            ((d = !0), (l = u), (r = s));
                            break;
                        }
                        g = g.sibling;
                    }
                    if (!d) throw Error(o(189));
                }
            }
            if (r.alternate !== l) throw Error(o(190));
        }
        if (r.tag !== 3) throw Error(o(188));
        return r.stateNode.current === r ? e : t;
    }
    function Sa(e) {
        return ((e = Zd(e)), e !== null ? Ba(e) : null);
    }
    function Ba(e) {
        if (e.tag === 5 || e.tag === 6) return e;
        for (e = e.child; e !== null; ) {
            var t = Ba(e);
            if (t !== null) return t;
            e = e.sibling;
        }
        return null;
    }
    var Ea = n.unstable_scheduleCallback,
        Ta = n.unstable_cancelCallback,
        eh = n.unstable_shouldYield,
        th = n.unstable_requestPaint,
        je = n.unstable_now,
        rh = n.unstable_getCurrentPriorityLevel,
        Ui = n.unstable_ImmediatePriority,
        Ca = n.unstable_UserBlockingPriority,
        fo = n.unstable_NormalPriority,
        nh = n.unstable_LowPriority,
        za = n.unstable_IdlePriority,
        ho = null,
        It = null;
    function oh(e) {
        if (It && typeof It.onCommitFiberRoot == "function")
            try {
                It.onCommitFiberRoot(ho, e, void 0, (e.current.flags & 128) === 128);
            } catch {}
    }
    var Bt = Math.clz32 ? Math.clz32 : sh,
        ih = Math.log,
        lh = Math.LN2;
    function sh(e) {
        return ((e >>>= 0), e === 0 ? 32 : (31 - ((ih(e) / lh) | 0)) | 0);
    }
    var po = 64,
        vo = 4194304;
    function wn(e) {
        switch (e & -e) {
            case 1:
                return 1;
            case 2:
                return 2;
            case 4:
                return 4;
            case 8:
                return 8;
            case 16:
                return 16;
            case 32:
                return 32;
            case 64:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
                return e & 4194240;
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
            case 67108864:
                return e & 130023424;
            case 134217728:
                return 134217728;
            case 268435456:
                return 268435456;
            case 536870912:
                return 536870912;
            case 1073741824:
                return 1073741824;
            default:
                return e;
        }
    }
    function mo(e, t) {
        var r = e.pendingLanes;
        if (r === 0) return 0;
        var l = 0,
            s = e.suspendedLanes,
            u = e.pingedLanes,
            d = r & 268435455;
        if (d !== 0) {
            var g = d & ~s;
            g !== 0 ? (l = wn(g)) : ((u &= d), u !== 0 && (l = wn(u)));
        } else ((d = r & ~s), d !== 0 ? (l = wn(d)) : u !== 0 && (l = wn(u)));
        if (l === 0) return 0;
        if (
            t !== 0 &&
            t !== l &&
            (t & s) === 0 &&
            ((s = l & -l), (u = t & -t), s >= u || (s === 16 && (u & 4194240) !== 0))
        )
            return t;
        if (((l & 4) !== 0 && (l |= r & 16), (t = e.entangledLanes), t !== 0))
            for (e = e.entanglements, t &= l; 0 < t; )
                ((r = 31 - Bt(t)), (s = 1 << r), (l |= e[r]), (t &= ~s));
        return l;
    }
    function ah(e, t) {
        switch (e) {
            case 1:
            case 2:
            case 4:
                return t + 250;
            case 8:
            case 16:
            case 32:
            case 64:
            case 128:
            case 256:
            case 512:
            case 1024:
            case 2048:
            case 4096:
            case 8192:
            case 16384:
            case 32768:
            case 65536:
            case 131072:
            case 262144:
            case 524288:
            case 1048576:
            case 2097152:
                return t + 5e3;
            case 4194304:
            case 8388608:
            case 16777216:
            case 33554432:
            case 67108864:
                return -1;
            case 134217728:
            case 268435456:
            case 536870912:
            case 1073741824:
                return -1;
            default:
                return -1;
        }
    }
    function uh(e, t) {
        for (
            var r = e.suspendedLanes, l = e.pingedLanes, s = e.expirationTimes, u = e.pendingLanes;
            0 < u;
        ) {
            var d = 31 - Bt(u),
                g = 1 << d,
                w = s[d];
            (w === -1
                ? ((g & r) === 0 || (g & l) !== 0) && (s[d] = ah(g, t))
                : w <= t && (e.expiredLanes |= g),
                (u &= ~g));
        }
    }
    function Vi(e) {
        return ((e = e.pendingLanes & -1073741825), e !== 0 ? e : e & 1073741824 ? 1073741824 : 0);
    }
    function Na() {
        var e = po;
        return ((po <<= 1), (po & 4194240) === 0 && (po = 64), e);
    }
    function Ki(e) {
        for (var t = [], r = 0; 31 > r; r++) t.push(e);
        return t;
    }
    function bn(e, t, r) {
        ((e.pendingLanes |= t),
            t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
            (e = e.eventTimes),
            (t = 31 - Bt(t)),
            (e[t] = r));
    }
    function ch(e, t) {
        var r = e.pendingLanes & ~t;
        ((e.pendingLanes = t),
            (e.suspendedLanes = 0),
            (e.pingedLanes = 0),
            (e.expiredLanes &= t),
            (e.mutableReadLanes &= t),
            (e.entangledLanes &= t),
            (t = e.entanglements));
        var l = e.eventTimes;
        for (e = e.expirationTimes; 0 < r; ) {
            var s = 31 - Bt(r),
                u = 1 << s;
            ((t[s] = 0), (l[s] = -1), (e[s] = -1), (r &= ~u));
        }
    }
    function $i(e, t) {
        var r = (e.entangledLanes |= t);
        for (e = e.entanglements; r; ) {
            var l = 31 - Bt(r),
                s = 1 << l;
            ((s & t) | (e[l] & t) && (e[l] |= t), (r &= ~s));
        }
    }
    var ge = 0;
    function Pa(e) {
        return ((e &= -e), 1 < e ? (4 < e ? ((e & 268435455) !== 0 ? 16 : 536870912) : 4) : 1);
    }
    var Fa,
        Qi,
        Ra,
        ja,
        Ia,
        Gi = !1,
        go = [],
        Jt = null,
        Zt = null,
        er = null,
        _n = new Map(),
        kn = new Map(),
        tr = [],
        fh =
            "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(
                " "
            );
    function Da(e, t) {
        switch (e) {
            case "focusin":
            case "focusout":
                Jt = null;
                break;
            case "dragenter":
            case "dragleave":
                Zt = null;
                break;
            case "mouseover":
            case "mouseout":
                er = null;
                break;
            case "pointerover":
            case "pointerout":
                _n.delete(t.pointerId);
                break;
            case "gotpointercapture":
            case "lostpointercapture":
                kn.delete(t.pointerId);
        }
    }
    function xn(e, t, r, l, s, u) {
        return e === null || e.nativeEvent !== u
            ? ((e = {
                  blockedOn: t,
                  domEventName: r,
                  eventSystemFlags: l,
                  nativeEvent: u,
                  targetContainers: [s],
              }),
              t !== null && ((t = On(t)), t !== null && Qi(t)),
              e)
            : ((e.eventSystemFlags |= l),
              (t = e.targetContainers),
              s !== null && t.indexOf(s) === -1 && t.push(s),
              e);
    }
    function dh(e, t, r, l, s) {
        switch (t) {
            case "focusin":
                return ((Jt = xn(Jt, e, t, r, l, s)), !0);
            case "dragenter":
                return ((Zt = xn(Zt, e, t, r, l, s)), !0);
            case "mouseover":
                return ((er = xn(er, e, t, r, l, s)), !0);
            case "pointerover":
                var u = s.pointerId;
                return (_n.set(u, xn(_n.get(u) || null, e, t, r, l, s)), !0);
            case "gotpointercapture":
                return ((u = s.pointerId), kn.set(u, xn(kn.get(u) || null, e, t, r, l, s)), !0);
        }
        return !1;
    }
    function Oa(e) {
        var t = Sr(e.target);
        if (t !== null) {
            var r = xr(t);
            if (r !== null) {
                if (((t = r.tag), t === 13)) {
                    if (((t = ka(r)), t !== null)) {
                        ((e.blockedOn = t),
                            Ia(e.priority, function () {
                                Ra(r);
                            }));
                        return;
                    }
                } else if (t === 3 && r.stateNode.current.memoizedState.isDehydrated) {
                    e.blockedOn = r.tag === 3 ? r.stateNode.containerInfo : null;
                    return;
                }
            }
        }
        e.blockedOn = null;
    }
    function yo(e) {
        if (e.blockedOn !== null) return !1;
        for (var t = e.targetContainers; 0 < t.length; ) {
            var r = Yi(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
            if (r === null) {
                r = e.nativeEvent;
                var l = new r.constructor(r.type, r);
                ((Li = l), r.target.dispatchEvent(l), (Li = null));
            } else return ((t = On(r)), t !== null && Qi(t), (e.blockedOn = r), !1);
            t.shift();
        }
        return !0;
    }
    function La(e, t, r) {
        yo(e) && r.delete(t);
    }
    function hh() {
        ((Gi = !1),
            Jt !== null && yo(Jt) && (Jt = null),
            Zt !== null && yo(Zt) && (Zt = null),
            er !== null && yo(er) && (er = null),
            _n.forEach(La),
            kn.forEach(La));
    }
    function Sn(e, t) {
        e.blockedOn === t &&
            ((e.blockedOn = null),
            Gi || ((Gi = !0), n.unstable_scheduleCallback(n.unstable_NormalPriority, hh)));
    }
    function Bn(e) {
        function t(s) {
            return Sn(s, e);
        }
        if (0 < go.length) {
            Sn(go[0], e);
            for (var r = 1; r < go.length; r++) {
                var l = go[r];
                l.blockedOn === e && (l.blockedOn = null);
            }
        }
        for (
            Jt !== null && Sn(Jt, e),
                Zt !== null && Sn(Zt, e),
                er !== null && Sn(er, e),
                _n.forEach(t),
                kn.forEach(t),
                r = 0;
            r < tr.length;
            r++
        )
            ((l = tr[r]), l.blockedOn === e && (l.blockedOn = null));
        for (; 0 < tr.length && ((r = tr[0]), r.blockedOn === null); )
            (Oa(r), r.blockedOn === null && tr.shift());
    }
    var Ar = Q.ReactCurrentBatchConfig,
        wo = !0;
    function ph(e, t, r, l) {
        var s = ge,
            u = Ar.transition;
        Ar.transition = null;
        try {
            ((ge = 1), Xi(e, t, r, l));
        } finally {
            ((ge = s), (Ar.transition = u));
        }
    }
    function vh(e, t, r, l) {
        var s = ge,
            u = Ar.transition;
        Ar.transition = null;
        try {
            ((ge = 4), Xi(e, t, r, l));
        } finally {
            ((ge = s), (Ar.transition = u));
        }
    }
    function Xi(e, t, r, l) {
        if (wo) {
            var s = Yi(e, t, r, l);
            if (s === null) (pl(e, t, l, bo, r), Da(e, l));
            else if (dh(s, e, t, r, l)) l.stopPropagation();
            else if ((Da(e, l), t & 4 && -1 < fh.indexOf(e))) {
                for (; s !== null; ) {
                    var u = On(s);
                    if (
                        (u !== null && Fa(u),
                        (u = Yi(e, t, r, l)),
                        u === null && pl(e, t, l, bo, r),
                        u === s)
                    )
                        break;
                    s = u;
                }
                s !== null && l.stopPropagation();
            } else pl(e, t, l, null, r);
        }
    }
    var bo = null;
    function Yi(e, t, r, l) {
        if (((bo = null), (e = Mi(l)), (e = Sr(e)), e !== null))
            if (((t = xr(e)), t === null)) e = null;
            else if (((r = t.tag), r === 13)) {
                if (((e = ka(t)), e !== null)) return e;
                e = null;
            } else if (r === 3) {
                if (t.stateNode.current.memoizedState.isDehydrated)
                    return t.tag === 3 ? t.stateNode.containerInfo : null;
                e = null;
            } else t !== e && (e = null);
        return ((bo = e), null);
    }
    function Ma(e) {
        switch (e) {
            case "cancel":
            case "click":
            case "close":
            case "contextmenu":
            case "copy":
            case "cut":
            case "auxclick":
            case "dblclick":
            case "dragend":
            case "dragstart":
            case "drop":
            case "focusin":
            case "focusout":
            case "input":
            case "invalid":
            case "keydown":
            case "keypress":
            case "keyup":
            case "mousedown":
            case "mouseup":
            case "paste":
            case "pause":
            case "play":
            case "pointercancel":
            case "pointerdown":
            case "pointerup":
            case "ratechange":
            case "reset":
            case "resize":
            case "seeked":
            case "submit":
            case "touchcancel":
            case "touchend":
            case "touchstart":
            case "volumechange":
            case "change":
            case "selectionchange":
            case "textInput":
            case "compositionstart":
            case "compositionend":
            case "compositionupdate":
            case "beforeblur":
            case "afterblur":
            case "beforeinput":
            case "blur":
            case "fullscreenchange":
            case "focus":
            case "hashchange":
            case "popstate":
            case "select":
            case "selectstart":
                return 1;
            case "drag":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "mousemove":
            case "mouseout":
            case "mouseover":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "scroll":
            case "toggle":
            case "touchmove":
            case "wheel":
            case "mouseenter":
            case "mouseleave":
            case "pointerenter":
            case "pointerleave":
                return 4;
            case "message":
                switch (rh()) {
                    case Ui:
                        return 1;
                    case Ca:
                        return 4;
                    case fo:
                    case nh:
                        return 16;
                    case za:
                        return 536870912;
                    default:
                        return 16;
                }
            default:
                return 16;
        }
    }
    var rr = null,
        Ji = null,
        _o = null;
    function Aa() {
        if (_o) return _o;
        var e,
            t = Ji,
            r = t.length,
            l,
            s = "value" in rr ? rr.value : rr.textContent,
            u = s.length;
        for (e = 0; e < r && t[e] === s[e]; e++);
        var d = r - e;
        for (l = 1; l <= d && t[r - l] === s[u - l]; l++);
        return (_o = s.slice(e, 1 < l ? 1 - l : void 0));
    }
    function ko(e) {
        var t = e.keyCode;
        return (
            "charCode" in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
            e === 10 && (e = 13),
            32 <= e || e === 13 ? e : 0
        );
    }
    function xo() {
        return !0;
    }
    function qa() {
        return !1;
    }
    function ht(e) {
        function t(r, l, s, u, d) {
            ((this._reactName = r),
                (this._targetInst = s),
                (this.type = l),
                (this.nativeEvent = u),
                (this.target = d),
                (this.currentTarget = null));
            for (var g in e) e.hasOwnProperty(g) && ((r = e[g]), (this[g] = r ? r(u) : u[g]));
            return (
                (this.isDefaultPrevented = (
                    u.defaultPrevented != null ? u.defaultPrevented : u.returnValue === !1
                )
                    ? xo
                    : qa),
                (this.isPropagationStopped = qa),
                this
            );
        }
        return (
            L(t.prototype, {
                preventDefault: function () {
                    this.defaultPrevented = !0;
                    var r = this.nativeEvent;
                    r &&
                        (r.preventDefault
                            ? r.preventDefault()
                            : typeof r.returnValue != "unknown" && (r.returnValue = !1),
                        (this.isDefaultPrevented = xo));
                },
                stopPropagation: function () {
                    var r = this.nativeEvent;
                    r &&
                        (r.stopPropagation
                            ? r.stopPropagation()
                            : typeof r.cancelBubble != "unknown" && (r.cancelBubble = !0),
                        (this.isPropagationStopped = xo));
                },
                persist: function () {},
                isPersistent: xo,
            }),
            t
        );
    }
    var qr = {
            eventPhase: 0,
            bubbles: 0,
            cancelable: 0,
            timeStamp: function (e) {
                return e.timeStamp || Date.now();
            },
            defaultPrevented: 0,
            isTrusted: 0,
        },
        Zi = ht(qr),
        En = L({}, qr, { view: 0, detail: 0 }),
        mh = ht(En),
        el,
        tl,
        Tn,
        So = L({}, En, {
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            pageX: 0,
            pageY: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            getModifierState: nl,
            button: 0,
            buttons: 0,
            relatedTarget: function (e) {
                return e.relatedTarget === void 0
                    ? e.fromElement === e.srcElement
                        ? e.toElement
                        : e.fromElement
                    : e.relatedTarget;
            },
            movementX: function (e) {
                return "movementX" in e
                    ? e.movementX
                    : (e !== Tn &&
                          (Tn && e.type === "mousemove"
                              ? ((el = e.screenX - Tn.screenX), (tl = e.screenY - Tn.screenY))
                              : (tl = el = 0),
                          (Tn = e)),
                      el);
            },
            movementY: function (e) {
                return "movementY" in e ? e.movementY : tl;
            },
        }),
        Ha = ht(So),
        gh = L({}, So, { dataTransfer: 0 }),
        yh = ht(gh),
        wh = L({}, En, { relatedTarget: 0 }),
        rl = ht(wh),
        bh = L({}, qr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
        _h = ht(bh),
        kh = L({}, qr, {
            clipboardData: function (e) {
                return "clipboardData" in e ? e.clipboardData : window.clipboardData;
            },
        }),
        xh = ht(kh),
        Sh = L({}, qr, { data: 0 }),
        Wa = ht(Sh),
        Bh = {
            Esc: "Escape",
            Spacebar: " ",
            Left: "ArrowLeft",
            Up: "ArrowUp",
            Right: "ArrowRight",
            Down: "ArrowDown",
            Del: "Delete",
            Win: "OS",
            Menu: "ContextMenu",
            Apps: "ContextMenu",
            Scroll: "ScrollLock",
            MozPrintableKey: "Unidentified",
        },
        Eh = {
            8: "Backspace",
            9: "Tab",
            12: "Clear",
            13: "Enter",
            16: "Shift",
            17: "Control",
            18: "Alt",
            19: "Pause",
            20: "CapsLock",
            27: "Escape",
            32: " ",
            33: "PageUp",
            34: "PageDown",
            35: "End",
            36: "Home",
            37: "ArrowLeft",
            38: "ArrowUp",
            39: "ArrowRight",
            40: "ArrowDown",
            45: "Insert",
            46: "Delete",
            112: "F1",
            113: "F2",
            114: "F3",
            115: "F4",
            116: "F5",
            117: "F6",
            118: "F7",
            119: "F8",
            120: "F9",
            121: "F10",
            122: "F11",
            123: "F12",
            144: "NumLock",
            145: "ScrollLock",
            224: "Meta",
        },
        Th = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
    function Ch(e) {
        var t = this.nativeEvent;
        return t.getModifierState ? t.getModifierState(e) : (e = Th[e]) ? !!t[e] : !1;
    }
    function nl() {
        return Ch;
    }
    var zh = L({}, En, {
            key: function (e) {
                if (e.key) {
                    var t = Bh[e.key] || e.key;
                    if (t !== "Unidentified") return t;
                }
                return e.type === "keypress"
                    ? ((e = ko(e)), e === 13 ? "Enter" : String.fromCharCode(e))
                    : e.type === "keydown" || e.type === "keyup"
                      ? Eh[e.keyCode] || "Unidentified"
                      : "";
            },
            code: 0,
            location: 0,
            ctrlKey: 0,
            shiftKey: 0,
            altKey: 0,
            metaKey: 0,
            repeat: 0,
            locale: 0,
            getModifierState: nl,
            charCode: function (e) {
                return e.type === "keypress" ? ko(e) : 0;
            },
            keyCode: function (e) {
                return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
            },
            which: function (e) {
                return e.type === "keypress"
                    ? ko(e)
                    : e.type === "keydown" || e.type === "keyup"
                      ? e.keyCode
                      : 0;
            },
        }),
        Nh = ht(zh),
        Ph = L({}, So, {
            pointerId: 0,
            width: 0,
            height: 0,
            pressure: 0,
            tangentialPressure: 0,
            tiltX: 0,
            tiltY: 0,
            twist: 0,
            pointerType: 0,
            isPrimary: 0,
        }),
        Ua = ht(Ph),
        Fh = L({}, En, {
            touches: 0,
            targetTouches: 0,
            changedTouches: 0,
            altKey: 0,
            metaKey: 0,
            ctrlKey: 0,
            shiftKey: 0,
            getModifierState: nl,
        }),
        Rh = ht(Fh),
        jh = L({}, qr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
        Ih = ht(jh),
        Dh = L({}, So, {
            deltaX: function (e) {
                return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
            },
            deltaY: function (e) {
                return "deltaY" in e
                    ? e.deltaY
                    : "wheelDeltaY" in e
                      ? -e.wheelDeltaY
                      : "wheelDelta" in e
                        ? -e.wheelDelta
                        : 0;
            },
            deltaZ: 0,
            deltaMode: 0,
        }),
        Oh = ht(Dh),
        Lh = [9, 13, 27, 32],
        ol = p && "CompositionEvent" in window,
        Cn = null;
    p && "documentMode" in document && (Cn = document.documentMode);
    var Mh = p && "TextEvent" in window && !Cn,
        Va = p && (!ol || (Cn && 8 < Cn && 11 >= Cn)),
        Ka = " ",
        $a = !1;
    function Qa(e, t) {
        switch (e) {
            case "keyup":
                return Lh.indexOf(t.keyCode) !== -1;
            case "keydown":
                return t.keyCode !== 229;
            case "keypress":
            case "mousedown":
            case "focusout":
                return !0;
            default:
                return !1;
        }
    }
    function Ga(e) {
        return ((e = e.detail), typeof e == "object" && "data" in e ? e.data : null);
    }
    var Hr = !1;
    function Ah(e, t) {
        switch (e) {
            case "compositionend":
                return Ga(t);
            case "keypress":
                return t.which !== 32 ? null : (($a = !0), Ka);
            case "textInput":
                return ((e = t.data), e === Ka && $a ? null : e);
            default:
                return null;
        }
    }
    function qh(e, t) {
        if (Hr)
            return e === "compositionend" || (!ol && Qa(e, t))
                ? ((e = Aa()), (_o = Ji = rr = null), (Hr = !1), e)
                : null;
        switch (e) {
            case "paste":
                return null;
            case "keypress":
                if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
                    if (t.char && 1 < t.char.length) return t.char;
                    if (t.which) return String.fromCharCode(t.which);
                }
                return null;
            case "compositionend":
                return Va && t.locale !== "ko" ? null : t.data;
            default:
                return null;
        }
    }
    var Hh = {
        color: !0,
        date: !0,
        datetime: !0,
        "datetime-local": !0,
        email: !0,
        month: !0,
        number: !0,
        password: !0,
        range: !0,
        search: !0,
        tel: !0,
        text: !0,
        time: !0,
        url: !0,
        week: !0,
    };
    function Xa(e) {
        var t = e && e.nodeName && e.nodeName.toLowerCase();
        return t === "input" ? !!Hh[e.type] : t === "textarea";
    }
    function Ya(e, t, r, l) {
        (ga(l),
            (t = zo(t, "onChange")),
            0 < t.length &&
                ((r = new Zi("onChange", "change", null, r, l)),
                e.push({ event: r, listeners: t })));
    }
    var zn = null,
        Nn = null;
    function Wh(e) {
        vu(e, 0);
    }
    function Bo(e) {
        var t = $r(e);
        if (ia(t)) return e;
    }
    function Uh(e, t) {
        if (e === "change") return t;
    }
    var Ja = !1;
    if (p) {
        var il;
        if (p) {
            var ll = "oninput" in document;
            if (!ll) {
                var Za = document.createElement("div");
                (Za.setAttribute("oninput", "return;"), (ll = typeof Za.oninput == "function"));
            }
            il = ll;
        } else il = !1;
        Ja = il && (!document.documentMode || 9 < document.documentMode);
    }
    function eu() {
        zn && (zn.detachEvent("onpropertychange", tu), (Nn = zn = null));
    }
    function tu(e) {
        if (e.propertyName === "value" && Bo(Nn)) {
            var t = [];
            (Ya(t, Nn, e, Mi(e)), _a(Wh, t));
        }
    }
    function Vh(e, t, r) {
        e === "focusin"
            ? (eu(), (zn = t), (Nn = r), zn.attachEvent("onpropertychange", tu))
            : e === "focusout" && eu();
    }
    function Kh(e) {
        if (e === "selectionchange" || e === "keyup" || e === "keydown") return Bo(Nn);
    }
    function $h(e, t) {
        if (e === "click") return Bo(t);
    }
    function Qh(e, t) {
        if (e === "input" || e === "change") return Bo(t);
    }
    function Gh(e, t) {
        return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
    }
    var Et = typeof Object.is == "function" ? Object.is : Gh;
    function Pn(e, t) {
        if (Et(e, t)) return !0;
        if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
        var r = Object.keys(e),
            l = Object.keys(t);
        if (r.length !== l.length) return !1;
        for (l = 0; l < r.length; l++) {
            var s = r[l];
            if (!m.call(t, s) || !Et(e[s], t[s])) return !1;
        }
        return !0;
    }
    function ru(e) {
        for (; e && e.firstChild; ) e = e.firstChild;
        return e;
    }
    function nu(e, t) {
        var r = ru(e);
        e = 0;
        for (var l; r; ) {
            if (r.nodeType === 3) {
                if (((l = e + r.textContent.length), e <= t && l >= t))
                    return { node: r, offset: t - e };
                e = l;
            }
            e: {
                for (; r; ) {
                    if (r.nextSibling) {
                        r = r.nextSibling;
                        break e;
                    }
                    r = r.parentNode;
                }
                r = void 0;
            }
            r = ru(r);
        }
    }
    function ou(e, t) {
        return e && t
            ? e === t
                ? !0
                : e && e.nodeType === 3
                  ? !1
                  : t && t.nodeType === 3
                    ? ou(e, t.parentNode)
                    : "contains" in e
                      ? e.contains(t)
                      : e.compareDocumentPosition
                        ? !!(e.compareDocumentPosition(t) & 16)
                        : !1
            : !1;
    }
    function iu() {
        for (var e = window, t = so(); t instanceof e.HTMLIFrameElement; ) {
            try {
                var r = typeof t.contentWindow.location.href == "string";
            } catch {
                r = !1;
            }
            if (r) e = t.contentWindow;
            else break;
            t = so(e.document);
        }
        return t;
    }
    function sl(e) {
        var t = e && e.nodeName && e.nodeName.toLowerCase();
        return (
            t &&
            ((t === "input" &&
                (e.type === "text" ||
                    e.type === "search" ||
                    e.type === "tel" ||
                    e.type === "url" ||
                    e.type === "password")) ||
                t === "textarea" ||
                e.contentEditable === "true")
        );
    }
    function Xh(e) {
        var t = iu(),
            r = e.focusedElem,
            l = e.selectionRange;
        if (t !== r && r && r.ownerDocument && ou(r.ownerDocument.documentElement, r)) {
            if (l !== null && sl(r)) {
                if (((t = l.start), (e = l.end), e === void 0 && (e = t), "selectionStart" in r))
                    ((r.selectionStart = t), (r.selectionEnd = Math.min(e, r.value.length)));
                else if (
                    ((e = ((t = r.ownerDocument || document) && t.defaultView) || window),
                    e.getSelection)
                ) {
                    e = e.getSelection();
                    var s = r.textContent.length,
                        u = Math.min(l.start, s);
                    ((l = l.end === void 0 ? u : Math.min(l.end, s)),
                        !e.extend && u > l && ((s = l), (l = u), (u = s)),
                        (s = nu(r, u)));
                    var d = nu(r, l);
                    s &&
                        d &&
                        (e.rangeCount !== 1 ||
                            e.anchorNode !== s.node ||
                            e.anchorOffset !== s.offset ||
                            e.focusNode !== d.node ||
                            e.focusOffset !== d.offset) &&
                        ((t = t.createRange()),
                        t.setStart(s.node, s.offset),
                        e.removeAllRanges(),
                        u > l
                            ? (e.addRange(t), e.extend(d.node, d.offset))
                            : (t.setEnd(d.node, d.offset), e.addRange(t)));
                }
            }
            for (t = [], e = r; (e = e.parentNode); )
                e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
            for (typeof r.focus == "function" && r.focus(), r = 0; r < t.length; r++)
                ((e = t[r]), (e.element.scrollLeft = e.left), (e.element.scrollTop = e.top));
        }
    }
    var Yh = p && "documentMode" in document && 11 >= document.documentMode,
        Wr = null,
        al = null,
        Fn = null,
        ul = !1;
    function lu(e, t, r) {
        var l = r.window === r ? r.document : r.nodeType === 9 ? r : r.ownerDocument;
        ul ||
            Wr == null ||
            Wr !== so(l) ||
            ((l = Wr),
            "selectionStart" in l && sl(l)
                ? (l = { start: l.selectionStart, end: l.selectionEnd })
                : ((l = (
                      (l.ownerDocument && l.ownerDocument.defaultView) ||
                      window
                  ).getSelection()),
                  (l = {
                      anchorNode: l.anchorNode,
                      anchorOffset: l.anchorOffset,
                      focusNode: l.focusNode,
                      focusOffset: l.focusOffset,
                  })),
            (Fn && Pn(Fn, l)) ||
                ((Fn = l),
                (l = zo(al, "onSelect")),
                0 < l.length &&
                    ((t = new Zi("onSelect", "select", null, t, r)),
                    e.push({ event: t, listeners: l }),
                    (t.target = Wr))));
    }
    function Eo(e, t) {
        var r = {};
        return (
            (r[e.toLowerCase()] = t.toLowerCase()),
            (r["Webkit" + e] = "webkit" + t),
            (r["Moz" + e] = "moz" + t),
            r
        );
    }
    var Ur = {
            animationend: Eo("Animation", "AnimationEnd"),
            animationiteration: Eo("Animation", "AnimationIteration"),
            animationstart: Eo("Animation", "AnimationStart"),
            transitionend: Eo("Transition", "TransitionEnd"),
        },
        cl = {},
        su = {};
    p &&
        ((su = document.createElement("div").style),
        "AnimationEvent" in window ||
            (delete Ur.animationend.animation,
            delete Ur.animationiteration.animation,
            delete Ur.animationstart.animation),
        "TransitionEvent" in window || delete Ur.transitionend.transition);
    function To(e) {
        if (cl[e]) return cl[e];
        if (!Ur[e]) return e;
        var t = Ur[e],
            r;
        for (r in t) if (t.hasOwnProperty(r) && r in su) return (cl[e] = t[r]);
        return e;
    }
    var au = To("animationend"),
        uu = To("animationiteration"),
        cu = To("animationstart"),
        fu = To("transitionend"),
        du = new Map(),
        hu =
            "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
                " "
            );
    function nr(e, t) {
        (du.set(e, t), f(t, [e]));
    }
    for (var fl = 0; fl < hu.length; fl++) {
        var dl = hu[fl],
            Jh = dl.toLowerCase(),
            Zh = dl[0].toUpperCase() + dl.slice(1);
        nr(Jh, "on" + Zh);
    }
    (nr(au, "onAnimationEnd"),
        nr(uu, "onAnimationIteration"),
        nr(cu, "onAnimationStart"),
        nr("dblclick", "onDoubleClick"),
        nr("focusin", "onFocus"),
        nr("focusout", "onBlur"),
        nr(fu, "onTransitionEnd"),
        h("onMouseEnter", ["mouseout", "mouseover"]),
        h("onMouseLeave", ["mouseout", "mouseover"]),
        h("onPointerEnter", ["pointerout", "pointerover"]),
        h("onPointerLeave", ["pointerout", "pointerover"]),
        f(
            "onChange",
            "change click focusin focusout input keydown keyup selectionchange".split(" ")
        ),
        f(
            "onSelect",
            "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
                " "
            )
        ),
        f("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]),
        f(
            "onCompositionEnd",
            "compositionend focusout keydown keypress keyup mousedown".split(" ")
        ),
        f(
            "onCompositionStart",
            "compositionstart focusout keydown keypress keyup mousedown".split(" ")
        ),
        f(
            "onCompositionUpdate",
            "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
        ));
    var Rn =
            "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
                " "
            ),
        ep = new Set("cancel close invalid load scroll toggle".split(" ").concat(Rn));
    function pu(e, t, r) {
        var l = e.type || "unknown-event";
        ((e.currentTarget = r), Jd(l, t, void 0, e), (e.currentTarget = null));
    }
    function vu(e, t) {
        t = (t & 4) !== 0;
        for (var r = 0; r < e.length; r++) {
            var l = e[r],
                s = l.event;
            l = l.listeners;
            e: {
                var u = void 0;
                if (t)
                    for (var d = l.length - 1; 0 <= d; d--) {
                        var g = l[d],
                            w = g.instance,
                            z = g.currentTarget;
                        if (((g = g.listener), w !== u && s.isPropagationStopped())) break e;
                        (pu(s, g, z), (u = w));
                    }
                else
                    for (d = 0; d < l.length; d++) {
                        if (
                            ((g = l[d]),
                            (w = g.instance),
                            (z = g.currentTarget),
                            (g = g.listener),
                            w !== u && s.isPropagationStopped())
                        )
                            break e;
                        (pu(s, g, z), (u = w));
                    }
            }
        }
        if (co) throw ((e = Wi), (co = !1), (Wi = null), e);
    }
    function ke(e, t) {
        var r = t[bl];
        r === void 0 && (r = t[bl] = new Set());
        var l = e + "__bubble";
        r.has(l) || (mu(t, e, 2, !1), r.add(l));
    }
    function hl(e, t, r) {
        var l = 0;
        (t && (l |= 4), mu(r, e, l, t));
    }
    var Co = "_reactListening" + Math.random().toString(36).slice(2);
    function jn(e) {
        if (!e[Co]) {
            ((e[Co] = !0),
                a.forEach(function (r) {
                    r !== "selectionchange" && (ep.has(r) || hl(r, !1, e), hl(r, !0, e));
                }));
            var t = e.nodeType === 9 ? e : e.ownerDocument;
            t === null || t[Co] || ((t[Co] = !0), hl("selectionchange", !1, t));
        }
    }
    function mu(e, t, r, l) {
        switch (Ma(t)) {
            case 1:
                var s = ph;
                break;
            case 4:
                s = vh;
                break;
            default:
                s = Xi;
        }
        ((r = s.bind(null, t, r, e)),
            (s = void 0),
            !Hi || (t !== "touchstart" && t !== "touchmove" && t !== "wheel") || (s = !0),
            l
                ? s !== void 0
                    ? e.addEventListener(t, r, { capture: !0, passive: s })
                    : e.addEventListener(t, r, !0)
                : s !== void 0
                  ? e.addEventListener(t, r, { passive: s })
                  : e.addEventListener(t, r, !1));
    }
    function pl(e, t, r, l, s) {
        var u = l;
        if ((t & 1) === 0 && (t & 2) === 0 && l !== null)
            e: for (;;) {
                if (l === null) return;
                var d = l.tag;
                if (d === 3 || d === 4) {
                    var g = l.stateNode.containerInfo;
                    if (g === s || (g.nodeType === 8 && g.parentNode === s)) break;
                    if (d === 4)
                        for (d = l.return; d !== null; ) {
                            var w = d.tag;
                            if (
                                (w === 3 || w === 4) &&
                                ((w = d.stateNode.containerInfo),
                                w === s || (w.nodeType === 8 && w.parentNode === s))
                            )
                                return;
                            d = d.return;
                        }
                    for (; g !== null; ) {
                        if (((d = Sr(g)), d === null)) return;
                        if (((w = d.tag), w === 5 || w === 6)) {
                            l = u = d;
                            continue e;
                        }
                        g = g.parentNode;
                    }
                }
                l = l.return;
            }
        _a(function () {
            var z = u,
                j = Mi(r),
                I = [];
            e: {
                var R = du.get(e);
                if (R !== void 0) {
                    var $ = Zi,
                        J = e;
                    switch (e) {
                        case "keypress":
                            if (ko(r) === 0) break e;
                        case "keydown":
                        case "keyup":
                            $ = Nh;
                            break;
                        case "focusin":
                            ((J = "focus"), ($ = rl));
                            break;
                        case "focusout":
                            ((J = "blur"), ($ = rl));
                            break;
                        case "beforeblur":
                        case "afterblur":
                            $ = rl;
                            break;
                        case "click":
                            if (r.button === 2) break e;
                        case "auxclick":
                        case "dblclick":
                        case "mousedown":
                        case "mousemove":
                        case "mouseup":
                        case "mouseout":
                        case "mouseover":
                        case "contextmenu":
                            $ = Ha;
                            break;
                        case "drag":
                        case "dragend":
                        case "dragenter":
                        case "dragexit":
                        case "dragleave":
                        case "dragover":
                        case "dragstart":
                        case "drop":
                            $ = yh;
                            break;
                        case "touchcancel":
                        case "touchend":
                        case "touchmove":
                        case "touchstart":
                            $ = Rh;
                            break;
                        case au:
                        case uu:
                        case cu:
                            $ = _h;
                            break;
                        case fu:
                            $ = Ih;
                            break;
                        case "scroll":
                            $ = mh;
                            break;
                        case "wheel":
                            $ = Oh;
                            break;
                        case "copy":
                        case "cut":
                        case "paste":
                            $ = xh;
                            break;
                        case "gotpointercapture":
                        case "lostpointercapture":
                        case "pointercancel":
                        case "pointerdown":
                        case "pointermove":
                        case "pointerout":
                        case "pointerover":
                        case "pointerup":
                            $ = Ua;
                    }
                    var Z = (t & 4) !== 0,
                        Ie = !Z && e === "scroll",
                        B = Z ? (R !== null ? R + "Capture" : null) : R;
                    Z = [];
                    for (var _ = z, T; _ !== null; ) {
                        T = _;
                        var O = T.stateNode;
                        if (
                            (T.tag === 5 &&
                                O !== null &&
                                ((T = O),
                                B !== null && ((O = mn(_, B)), O != null && Z.push(In(_, O, T)))),
                            Ie)
                        )
                            break;
                        _ = _.return;
                    }
                    0 < Z.length &&
                        ((R = new $(R, J, null, r, j)), I.push({ event: R, listeners: Z }));
                }
            }
            if ((t & 7) === 0) {
                e: {
                    if (
                        ((R = e === "mouseover" || e === "pointerover"),
                        ($ = e === "mouseout" || e === "pointerout"),
                        R && r !== Li && (J = r.relatedTarget || r.fromElement) && (Sr(J) || J[qt]))
                    )
                        break e;
                    if (
                        ($ || R) &&
                        ((R =
                            j.window === j
                                ? j
                                : (R = j.ownerDocument)
                                  ? R.defaultView || R.parentWindow
                                  : window),
                        $
                            ? ((J = r.relatedTarget || r.toElement),
                              ($ = z),
                              (J = J ? Sr(J) : null),
                              J !== null &&
                                  ((Ie = xr(J)), J !== Ie || (J.tag !== 5 && J.tag !== 6)) &&
                                  (J = null))
                            : (($ = null), (J = z)),
                        $ !== J)
                    ) {
                        if (
                            ((Z = Ha),
                            (O = "onMouseLeave"),
                            (B = "onMouseEnter"),
                            (_ = "mouse"),
                            (e === "pointerout" || e === "pointerover") &&
                                ((Z = Ua),
                                (O = "onPointerLeave"),
                                (B = "onPointerEnter"),
                                (_ = "pointer")),
                            (Ie = $ == null ? R : $r($)),
                            (T = J == null ? R : $r(J)),
                            (R = new Z(O, _ + "leave", $, r, j)),
                            (R.target = Ie),
                            (R.relatedTarget = T),
                            (O = null),
                            Sr(j) === z &&
                                ((Z = new Z(B, _ + "enter", J, r, j)),
                                (Z.target = T),
                                (Z.relatedTarget = Ie),
                                (O = Z)),
                            (Ie = O),
                            $ && J)
                        )
                            t: {
                                for (Z = $, B = J, _ = 0, T = Z; T; T = Vr(T)) _++;
                                for (T = 0, O = B; O; O = Vr(O)) T++;
                                for (; 0 < _ - T; ) ((Z = Vr(Z)), _--);
                                for (; 0 < T - _; ) ((B = Vr(B)), T--);
                                for (; _--; ) {
                                    if (Z === B || (B !== null && Z === B.alternate)) break t;
                                    ((Z = Vr(Z)), (B = Vr(B)));
                                }
                                Z = null;
                            }
                        else Z = null;
                        ($ !== null && gu(I, R, $, Z, !1),
                            J !== null && Ie !== null && gu(I, Ie, J, Z, !0));
                    }
                }
                e: {
                    if (
                        ((R = z ? $r(z) : window),
                        ($ = R.nodeName && R.nodeName.toLowerCase()),
                        $ === "select" || ($ === "input" && R.type === "file"))
                    )
                        var te = Uh;
                    else if (Xa(R))
                        if (Ja) te = Qh;
                        else {
                            te = Kh;
                            var ne = Vh;
                        }
                    else
                        ($ = R.nodeName) &&
                            $.toLowerCase() === "input" &&
                            (R.type === "checkbox" || R.type === "radio") &&
                            (te = $h);
                    if (te && (te = te(e, z))) {
                        Ya(I, te, r, j);
                        break e;
                    }
                    (ne && ne(e, R, z),
                        e === "focusout" &&
                            (ne = R._wrapperState) &&
                            ne.controlled &&
                            R.type === "number" &&
                            Ri(R, "number", R.value));
                }
                switch (((ne = z ? $r(z) : window), e)) {
                    case "focusin":
                        (Xa(ne) || ne.contentEditable === "true") &&
                            ((Wr = ne), (al = z), (Fn = null));
                        break;
                    case "focusout":
                        Fn = al = Wr = null;
                        break;
                    case "mousedown":
                        ul = !0;
                        break;
                    case "contextmenu":
                    case "mouseup":
                    case "dragend":
                        ((ul = !1), lu(I, r, j));
                        break;
                    case "selectionchange":
                        if (Yh) break;
                    case "keydown":
                    case "keyup":
                        lu(I, r, j);
                }
                var oe;
                if (ol)
                    e: {
                        switch (e) {
                            case "compositionstart":
                                var se = "onCompositionStart";
                                break e;
                            case "compositionend":
                                se = "onCompositionEnd";
                                break e;
                            case "compositionupdate":
                                se = "onCompositionUpdate";
                                break e;
                        }
                        se = void 0;
                    }
                else
                    Hr
                        ? Qa(e, r) && (se = "onCompositionEnd")
                        : e === "keydown" && r.keyCode === 229 && (se = "onCompositionStart");
                (se &&
                    (Va &&
                        r.locale !== "ko" &&
                        (Hr || se !== "onCompositionStart"
                            ? se === "onCompositionEnd" && Hr && (oe = Aa())
                            : ((rr = j),
                              (Ji = "value" in rr ? rr.value : rr.textContent),
                              (Hr = !0))),
                    (ne = zo(z, se)),
                    0 < ne.length &&
                        ((se = new Wa(se, e, null, r, j)),
                        I.push({ event: se, listeners: ne }),
                        oe ? (se.data = oe) : ((oe = Ga(r)), oe !== null && (se.data = oe)))),
                    (oe = Mh ? Ah(e, r) : qh(e, r)) &&
                        ((z = zo(z, "onBeforeInput")),
                        0 < z.length &&
                            ((j = new Wa("onBeforeInput", "beforeinput", null, r, j)),
                            I.push({ event: j, listeners: z }),
                            (j.data = oe))));
            }
            vu(I, t);
        });
    }
    function In(e, t, r) {
        return { instance: e, listener: t, currentTarget: r };
    }
    function zo(e, t) {
        for (var r = t + "Capture", l = []; e !== null; ) {
            var s = e,
                u = s.stateNode;
            (s.tag === 5 &&
                u !== null &&
                ((s = u),
                (u = mn(e, r)),
                u != null && l.unshift(In(e, u, s)),
                (u = mn(e, t)),
                u != null && l.push(In(e, u, s))),
                (e = e.return));
        }
        return l;
    }
    function Vr(e) {
        if (e === null) return null;
        do e = e.return;
        while (e && e.tag !== 5);
        return e || null;
    }
    function gu(e, t, r, l, s) {
        for (var u = t._reactName, d = []; r !== null && r !== l; ) {
            var g = r,
                w = g.alternate,
                z = g.stateNode;
            if (w !== null && w === l) break;
            (g.tag === 5 &&
                z !== null &&
                ((g = z),
                s
                    ? ((w = mn(r, u)), w != null && d.unshift(In(r, w, g)))
                    : s || ((w = mn(r, u)), w != null && d.push(In(r, w, g)))),
                (r = r.return));
        }
        d.length !== 0 && e.push({ event: t, listeners: d });
    }
    var tp = /\r\n?/g,
        rp = /\u0000|\uFFFD/g;
    function yu(e) {
        return (typeof e == "string" ? e : "" + e)
            .replace(
                tp,
                `
`
            )
            .replace(rp, "");
    }
    function No(e, t, r) {
        if (((t = yu(t)), yu(e) !== t && r)) throw Error(o(425));
    }
    function Po() {}
    var vl = null,
        ml = null;
    function gl(e, t) {
        return (
            e === "textarea" ||
            e === "noscript" ||
            typeof t.children == "string" ||
            typeof t.children == "number" ||
            (typeof t.dangerouslySetInnerHTML == "object" &&
                t.dangerouslySetInnerHTML !== null &&
                t.dangerouslySetInnerHTML.__html != null)
        );
    }
    var yl = typeof setTimeout == "function" ? setTimeout : void 0,
        np = typeof clearTimeout == "function" ? clearTimeout : void 0,
        wu = typeof Promise == "function" ? Promise : void 0,
        op =
            typeof queueMicrotask == "function"
                ? queueMicrotask
                : typeof wu < "u"
                  ? function (e) {
                        return wu.resolve(null).then(e).catch(ip);
                    }
                  : yl;
    function ip(e) {
        setTimeout(function () {
            throw e;
        });
    }
    function wl(e, t) {
        var r = t,
            l = 0;
        do {
            var s = r.nextSibling;
            if ((e.removeChild(r), s && s.nodeType === 8))
                if (((r = s.data), r === "/$")) {
                    if (l === 0) {
                        (e.removeChild(s), Bn(t));
                        return;
                    }
                    l--;
                } else (r !== "$" && r !== "$?" && r !== "$!") || l++;
            r = s;
        } while (r);
        Bn(t);
    }
    function or(e) {
        for (; e != null; e = e.nextSibling) {
            var t = e.nodeType;
            if (t === 1 || t === 3) break;
            if (t === 8) {
                if (((t = e.data), t === "$" || t === "$!" || t === "$?")) break;
                if (t === "/$") return null;
            }
        }
        return e;
    }
    function bu(e) {
        e = e.previousSibling;
        for (var t = 0; e; ) {
            if (e.nodeType === 8) {
                var r = e.data;
                if (r === "$" || r === "$!" || r === "$?") {
                    if (t === 0) return e;
                    t--;
                } else r === "/$" && t++;
            }
            e = e.previousSibling;
        }
        return null;
    }
    var Kr = Math.random().toString(36).slice(2),
        Dt = "__reactFiber$" + Kr,
        Dn = "__reactProps$" + Kr,
        qt = "__reactContainer$" + Kr,
        bl = "__reactEvents$" + Kr,
        lp = "__reactListeners$" + Kr,
        sp = "__reactHandles$" + Kr;
    function Sr(e) {
        var t = e[Dt];
        if (t) return t;
        for (var r = e.parentNode; r; ) {
            if ((t = r[qt] || r[Dt])) {
                if (((r = t.alternate), t.child !== null || (r !== null && r.child !== null)))
                    for (e = bu(e); e !== null; ) {
                        if ((r = e[Dt])) return r;
                        e = bu(e);
                    }
                return t;
            }
            ((e = r), (r = e.parentNode));
        }
        return null;
    }
    function On(e) {
        return (
            (e = e[Dt] || e[qt]),
            !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
        );
    }
    function $r(e) {
        if (e.tag === 5 || e.tag === 6) return e.stateNode;
        throw Error(o(33));
    }
    function Fo(e) {
        return e[Dn] || null;
    }
    var _l = [],
        Qr = -1;
    function ir(e) {
        return { current: e };
    }
    function xe(e) {
        0 > Qr || ((e.current = _l[Qr]), (_l[Qr] = null), Qr--);
    }
    function be(e, t) {
        (Qr++, (_l[Qr] = e.current), (e.current = t));
    }
    var lr = {},
        Je = ir(lr),
        lt = ir(!1),
        Br = lr;
    function Gr(e, t) {
        var r = e.type.contextTypes;
        if (!r) return lr;
        var l = e.stateNode;
        if (l && l.__reactInternalMemoizedUnmaskedChildContext === t)
            return l.__reactInternalMemoizedMaskedChildContext;
        var s = {},
            u;
        for (u in r) s[u] = t[u];
        return (
            l &&
                ((e = e.stateNode),
                (e.__reactInternalMemoizedUnmaskedChildContext = t),
                (e.__reactInternalMemoizedMaskedChildContext = s)),
            s
        );
    }
    function st(e) {
        return ((e = e.childContextTypes), e != null);
    }
    function Ro() {
        (xe(lt), xe(Je));
    }
    function _u(e, t, r) {
        if (Je.current !== lr) throw Error(o(168));
        (be(Je, t), be(lt, r));
    }
    function ku(e, t, r) {
        var l = e.stateNode;
        if (((t = t.childContextTypes), typeof l.getChildContext != "function")) return r;
        l = l.getChildContext();
        for (var s in l) if (!(s in t)) throw Error(o(108, we(e) || "Unknown", s));
        return L({}, r, l);
    }
    function jo(e) {
        return (
            (e = ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || lr),
            (Br = Je.current),
            be(Je, e),
            be(lt, lt.current),
            !0
        );
    }
    function xu(e, t, r) {
        var l = e.stateNode;
        if (!l) throw Error(o(169));
        (r
            ? ((e = ku(e, t, Br)),
              (l.__reactInternalMemoizedMergedChildContext = e),
              xe(lt),
              xe(Je),
              be(Je, e))
            : xe(lt),
            be(lt, r));
    }
    var Ht = null,
        Io = !1,
        kl = !1;
    function Su(e) {
        Ht === null ? (Ht = [e]) : Ht.push(e);
    }
    function ap(e) {
        ((Io = !0), Su(e));
    }
    function sr() {
        if (!kl && Ht !== null) {
            kl = !0;
            var e = 0,
                t = ge;
            try {
                var r = Ht;
                for (ge = 1; e < r.length; e++) {
                    var l = r[e];
                    do l = l(!0);
                    while (l !== null);
                }
                ((Ht = null), (Io = !1));
            } catch (s) {
                throw (Ht !== null && (Ht = Ht.slice(e + 1)), Ea(Ui, sr), s);
            } finally {
                ((ge = t), (kl = !1));
            }
        }
        return null;
    }
    var Xr = [],
        Yr = 0,
        Do = null,
        Oo = 0,
        wt = [],
        bt = 0,
        Er = null,
        Wt = 1,
        Ut = "";
    function Tr(e, t) {
        ((Xr[Yr++] = Oo), (Xr[Yr++] = Do), (Do = e), (Oo = t));
    }
    function Bu(e, t, r) {
        ((wt[bt++] = Wt), (wt[bt++] = Ut), (wt[bt++] = Er), (Er = e));
        var l = Wt;
        e = Ut;
        var s = 32 - Bt(l) - 1;
        ((l &= ~(1 << s)), (r += 1));
        var u = 32 - Bt(t) + s;
        if (30 < u) {
            var d = s - (s % 5);
            ((u = (l & ((1 << d) - 1)).toString(32)),
                (l >>= d),
                (s -= d),
                (Wt = (1 << (32 - Bt(t) + s)) | (r << s) | l),
                (Ut = u + e));
        } else ((Wt = (1 << u) | (r << s) | l), (Ut = e));
    }
    function xl(e) {
        e.return !== null && (Tr(e, 1), Bu(e, 1, 0));
    }
    function Sl(e) {
        for (; e === Do; ) ((Do = Xr[--Yr]), (Xr[Yr] = null), (Oo = Xr[--Yr]), (Xr[Yr] = null));
        for (; e === Er; )
            ((Er = wt[--bt]),
                (wt[bt] = null),
                (Ut = wt[--bt]),
                (wt[bt] = null),
                (Wt = wt[--bt]),
                (wt[bt] = null));
    }
    var pt = null,
        vt = null,
        Be = !1,
        Tt = null;
    function Eu(e, t) {
        var r = St(5, null, null, 0);
        ((r.elementType = "DELETED"),
            (r.stateNode = t),
            (r.return = e),
            (t = e.deletions),
            t === null ? ((e.deletions = [r]), (e.flags |= 16)) : t.push(r));
    }
    function Tu(e, t) {
        switch (e.tag) {
            case 5:
                var r = e.type;
                return (
                    (t =
                        t.nodeType !== 1 || r.toLowerCase() !== t.nodeName.toLowerCase()
                            ? null
                            : t),
                    t !== null ? ((e.stateNode = t), (pt = e), (vt = or(t.firstChild)), !0) : !1
                );
            case 6:
                return (
                    (t = e.pendingProps === "" || t.nodeType !== 3 ? null : t),
                    t !== null ? ((e.stateNode = t), (pt = e), (vt = null), !0) : !1
                );
            case 13:
                return (
                    (t = t.nodeType !== 8 ? null : t),
                    t !== null
                        ? ((r = Er !== null ? { id: Wt, overflow: Ut } : null),
                          (e.memoizedState = {
                              dehydrated: t,
                              treeContext: r,
                              retryLane: 1073741824,
                          }),
                          (r = St(18, null, null, 0)),
                          (r.stateNode = t),
                          (r.return = e),
                          (e.child = r),
                          (pt = e),
                          (vt = null),
                          !0)
                        : !1
                );
            default:
                return !1;
        }
    }
    function Bl(e) {
        return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
    }
    function El(e) {
        if (Be) {
            var t = vt;
            if (t) {
                var r = t;
                if (!Tu(e, t)) {
                    if (Bl(e)) throw Error(o(418));
                    t = or(r.nextSibling);
                    var l = pt;
                    t && Tu(e, t)
                        ? Eu(l, r)
                        : ((e.flags = (e.flags & -4097) | 2), (Be = !1), (pt = e));
                }
            } else {
                if (Bl(e)) throw Error(o(418));
                ((e.flags = (e.flags & -4097) | 2), (Be = !1), (pt = e));
            }
        }
    }
    function Cu(e) {
        for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
        pt = e;
    }
    function Lo(e) {
        if (e !== pt) return !1;
        if (!Be) return (Cu(e), (Be = !0), !1);
        var t;
        if (
            ((t = e.tag !== 3) &&
                !(t = e.tag !== 5) &&
                ((t = e.type), (t = t !== "head" && t !== "body" && !gl(e.type, e.memoizedProps))),
            t && (t = vt))
        ) {
            if (Bl(e)) throw (zu(), Error(o(418)));
            for (; t; ) (Eu(e, t), (t = or(t.nextSibling)));
        }
        if ((Cu(e), e.tag === 13)) {
            if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
                throw Error(o(317));
            e: {
                for (e = e.nextSibling, t = 0; e; ) {
                    if (e.nodeType === 8) {
                        var r = e.data;
                        if (r === "/$") {
                            if (t === 0) {
                                vt = or(e.nextSibling);
                                break e;
                            }
                            t--;
                        } else (r !== "$" && r !== "$!" && r !== "$?") || t++;
                    }
                    e = e.nextSibling;
                }
                vt = null;
            }
        } else vt = pt ? or(e.stateNode.nextSibling) : null;
        return !0;
    }
    function zu() {
        for (var e = vt; e; ) e = or(e.nextSibling);
    }
    function Jr() {
        ((vt = pt = null), (Be = !1));
    }
    function Tl(e) {
        Tt === null ? (Tt = [e]) : Tt.push(e);
    }
    var up = Q.ReactCurrentBatchConfig;
    function Ln(e, t, r) {
        if (((e = r.ref), e !== null && typeof e != "function" && typeof e != "object")) {
            if (r._owner) {
                if (((r = r._owner), r)) {
                    if (r.tag !== 1) throw Error(o(309));
                    var l = r.stateNode;
                }
                if (!l) throw Error(o(147, e));
                var s = l,
                    u = "" + e;
                return t !== null &&
                    t.ref !== null &&
                    typeof t.ref == "function" &&
                    t.ref._stringRef === u
                    ? t.ref
                    : ((t = function (d) {
                          var g = s.refs;
                          d === null ? delete g[u] : (g[u] = d);
                      }),
                      (t._stringRef = u),
                      t);
            }
            if (typeof e != "string") throw Error(o(284));
            if (!r._owner) throw Error(o(290, e));
        }
        return e;
    }
    function Mo(e, t) {
        throw (
            (e = Object.prototype.toString.call(t)),
            Error(
                o(
                    31,
                    e === "[object Object]"
                        ? "object with keys {" + Object.keys(t).join(", ") + "}"
                        : e
                )
            )
        );
    }
    function Nu(e) {
        var t = e._init;
        return t(e._payload);
    }
    function Pu(e) {
        function t(B, _) {
            if (e) {
                var T = B.deletions;
                T === null ? ((B.deletions = [_]), (B.flags |= 16)) : T.push(_);
            }
        }
        function r(B, _) {
            if (!e) return null;
            for (; _ !== null; ) (t(B, _), (_ = _.sibling));
            return null;
        }
        function l(B, _) {
            for (B = new Map(); _ !== null; )
                (_.key !== null ? B.set(_.key, _) : B.set(_.index, _), (_ = _.sibling));
            return B;
        }
        function s(B, _) {
            return ((B = vr(B, _)), (B.index = 0), (B.sibling = null), B);
        }
        function u(B, _, T) {
            return (
                (B.index = T),
                e
                    ? ((T = B.alternate),
                      T !== null
                          ? ((T = T.index), T < _ ? ((B.flags |= 2), _) : T)
                          : ((B.flags |= 2), _))
                    : ((B.flags |= 1048576), _)
            );
        }
        function d(B) {
            return (e && B.alternate === null && (B.flags |= 2), B);
        }
        function g(B, _, T, O) {
            return _ === null || _.tag !== 6
                ? ((_ = ys(T, B.mode, O)), (_.return = B), _)
                : ((_ = s(_, T)), (_.return = B), _);
        }
        function w(B, _, T, O) {
            var te = T.type;
            return te === ee
                ? j(B, _, T.props.children, O, T.key)
                : _ !== null &&
                    (_.elementType === te ||
                        (typeof te == "object" &&
                            te !== null &&
                            te.$$typeof === A &&
                            Nu(te) === _.type))
                  ? ((O = s(_, T.props)), (O.ref = Ln(B, _, T)), (O.return = B), O)
                  : ((O = ui(T.type, T.key, T.props, null, B.mode, O)),
                    (O.ref = Ln(B, _, T)),
                    (O.return = B),
                    O);
        }
        function z(B, _, T, O) {
            return _ === null ||
                _.tag !== 4 ||
                _.stateNode.containerInfo !== T.containerInfo ||
                _.stateNode.implementation !== T.implementation
                ? ((_ = ws(T, B.mode, O)), (_.return = B), _)
                : ((_ = s(_, T.children || [])), (_.return = B), _);
        }
        function j(B, _, T, O, te) {
            return _ === null || _.tag !== 7
                ? ((_ = Ir(T, B.mode, O, te)), (_.return = B), _)
                : ((_ = s(_, T)), (_.return = B), _);
        }
        function I(B, _, T) {
            if ((typeof _ == "string" && _ !== "") || typeof _ == "number")
                return ((_ = ys("" + _, B.mode, T)), (_.return = B), _);
            if (typeof _ == "object" && _ !== null) {
                switch (_.$$typeof) {
                    case re:
                        return (
                            (T = ui(_.type, _.key, _.props, null, B.mode, T)),
                            (T.ref = Ln(B, null, _)),
                            (T.return = B),
                            T
                        );
                    case G:
                        return ((_ = ws(_, B.mode, T)), (_.return = B), _);
                    case A:
                        var O = _._init;
                        return I(B, O(_._payload), T);
                }
                if (hn(_) || V(_)) return ((_ = Ir(_, B.mode, T, null)), (_.return = B), _);
                Mo(B, _);
            }
            return null;
        }
        function R(B, _, T, O) {
            var te = _ !== null ? _.key : null;
            if ((typeof T == "string" && T !== "") || typeof T == "number")
                return te !== null ? null : g(B, _, "" + T, O);
            if (typeof T == "object" && T !== null) {
                switch (T.$$typeof) {
                    case re:
                        return T.key === te ? w(B, _, T, O) : null;
                    case G:
                        return T.key === te ? z(B, _, T, O) : null;
                    case A:
                        return ((te = T._init), R(B, _, te(T._payload), O));
                }
                if (hn(T) || V(T)) return te !== null ? null : j(B, _, T, O, null);
                Mo(B, T);
            }
            return null;
        }
        function $(B, _, T, O, te) {
            if ((typeof O == "string" && O !== "") || typeof O == "number")
                return ((B = B.get(T) || null), g(_, B, "" + O, te));
            if (typeof O == "object" && O !== null) {
                switch (O.$$typeof) {
                    case re:
                        return ((B = B.get(O.key === null ? T : O.key) || null), w(_, B, O, te));
                    case G:
                        return ((B = B.get(O.key === null ? T : O.key) || null), z(_, B, O, te));
                    case A:
                        var ne = O._init;
                        return $(B, _, T, ne(O._payload), te);
                }
                if (hn(O) || V(O)) return ((B = B.get(T) || null), j(_, B, O, te, null));
                Mo(_, O);
            }
            return null;
        }
        function J(B, _, T, O) {
            for (
                var te = null, ne = null, oe = _, se = (_ = 0), $e = null;
                oe !== null && se < T.length;
                se++
            ) {
                oe.index > se ? (($e = oe), (oe = null)) : ($e = oe.sibling);
                var pe = R(B, oe, T[se], O);
                if (pe === null) {
                    oe === null && (oe = $e);
                    break;
                }
                (e && oe && pe.alternate === null && t(B, oe),
                    (_ = u(pe, _, se)),
                    ne === null ? (te = pe) : (ne.sibling = pe),
                    (ne = pe),
                    (oe = $e));
            }
            if (se === T.length) return (r(B, oe), Be && Tr(B, se), te);
            if (oe === null) {
                for (; se < T.length; se++)
                    ((oe = I(B, T[se], O)),
                        oe !== null &&
                            ((_ = u(oe, _, se)),
                            ne === null ? (te = oe) : (ne.sibling = oe),
                            (ne = oe)));
                return (Be && Tr(B, se), te);
            }
            for (oe = l(B, oe); se < T.length; se++)
                (($e = $(oe, B, se, T[se], O)),
                    $e !== null &&
                        (e && $e.alternate !== null && oe.delete($e.key === null ? se : $e.key),
                        (_ = u($e, _, se)),
                        ne === null ? (te = $e) : (ne.sibling = $e),
                        (ne = $e)));
            return (
                e &&
                    oe.forEach(function (mr) {
                        return t(B, mr);
                    }),
                Be && Tr(B, se),
                te
            );
        }
        function Z(B, _, T, O) {
            var te = V(T);
            if (typeof te != "function") throw Error(o(150));
            if (((T = te.call(T)), T == null)) throw Error(o(151));
            for (
                var ne = (te = null), oe = _, se = (_ = 0), $e = null, pe = T.next();
                oe !== null && !pe.done;
                se++, pe = T.next()
            ) {
                oe.index > se ? (($e = oe), (oe = null)) : ($e = oe.sibling);
                var mr = R(B, oe, pe.value, O);
                if (mr === null) {
                    oe === null && (oe = $e);
                    break;
                }
                (e && oe && mr.alternate === null && t(B, oe),
                    (_ = u(mr, _, se)),
                    ne === null ? (te = mr) : (ne.sibling = mr),
                    (ne = mr),
                    (oe = $e));
            }
            if (pe.done) return (r(B, oe), Be && Tr(B, se), te);
            if (oe === null) {
                for (; !pe.done; se++, pe = T.next())
                    ((pe = I(B, pe.value, O)),
                        pe !== null &&
                            ((_ = u(pe, _, se)),
                            ne === null ? (te = pe) : (ne.sibling = pe),
                            (ne = pe)));
                return (Be && Tr(B, se), te);
            }
            for (oe = l(B, oe); !pe.done; se++, pe = T.next())
                ((pe = $(oe, B, se, pe.value, O)),
                    pe !== null &&
                        (e && pe.alternate !== null && oe.delete(pe.key === null ? se : pe.key),
                        (_ = u(pe, _, se)),
                        ne === null ? (te = pe) : (ne.sibling = pe),
                        (ne = pe)));
            return (
                e &&
                    oe.forEach(function (Hp) {
                        return t(B, Hp);
                    }),
                Be && Tr(B, se),
                te
            );
        }
        function Ie(B, _, T, O) {
            if (
                (typeof T == "object" &&
                    T !== null &&
                    T.type === ee &&
                    T.key === null &&
                    (T = T.props.children),
                typeof T == "object" && T !== null)
            ) {
                switch (T.$$typeof) {
                    case re:
                        e: {
                            for (var te = T.key, ne = _; ne !== null; ) {
                                if (ne.key === te) {
                                    if (((te = T.type), te === ee)) {
                                        if (ne.tag === 7) {
                                            (r(B, ne.sibling),
                                                (_ = s(ne, T.props.children)),
                                                (_.return = B),
                                                (B = _));
                                            break e;
                                        }
                                    } else if (
                                        ne.elementType === te ||
                                        (typeof te == "object" &&
                                            te !== null &&
                                            te.$$typeof === A &&
                                            Nu(te) === ne.type)
                                    ) {
                                        (r(B, ne.sibling),
                                            (_ = s(ne, T.props)),
                                            (_.ref = Ln(B, ne, T)),
                                            (_.return = B),
                                            (B = _));
                                        break e;
                                    }
                                    r(B, ne);
                                    break;
                                } else t(B, ne);
                                ne = ne.sibling;
                            }
                            T.type === ee
                                ? ((_ = Ir(T.props.children, B.mode, O, T.key)),
                                  (_.return = B),
                                  (B = _))
                                : ((O = ui(T.type, T.key, T.props, null, B.mode, O)),
                                  (O.ref = Ln(B, _, T)),
                                  (O.return = B),
                                  (B = O));
                        }
                        return d(B);
                    case G:
                        e: {
                            for (ne = T.key; _ !== null; ) {
                                if (_.key === ne)
                                    if (
                                        _.tag === 4 &&
                                        _.stateNode.containerInfo === T.containerInfo &&
                                        _.stateNode.implementation === T.implementation
                                    ) {
                                        (r(B, _.sibling),
                                            (_ = s(_, T.children || [])),
                                            (_.return = B),
                                            (B = _));
                                        break e;
                                    } else {
                                        r(B, _);
                                        break;
                                    }
                                else t(B, _);
                                _ = _.sibling;
                            }
                            ((_ = ws(T, B.mode, O)), (_.return = B), (B = _));
                        }
                        return d(B);
                    case A:
                        return ((ne = T._init), Ie(B, _, ne(T._payload), O));
                }
                if (hn(T)) return J(B, _, T, O);
                if (V(T)) return Z(B, _, T, O);
                Mo(B, T);
            }
            return (typeof T == "string" && T !== "") || typeof T == "number"
                ? ((T = "" + T),
                  _ !== null && _.tag === 6
                      ? (r(B, _.sibling), (_ = s(_, T)), (_.return = B), (B = _))
                      : (r(B, _), (_ = ys(T, B.mode, O)), (_.return = B), (B = _)),
                  d(B))
                : r(B, _);
        }
        return Ie;
    }
    var Zr = Pu(!0),
        Fu = Pu(!1),
        Ao = ir(null),
        qo = null,
        en = null,
        Cl = null;
    function zl() {
        Cl = en = qo = null;
    }
    function Nl(e) {
        var t = Ao.current;
        (xe(Ao), (e._currentValue = t));
    }
    function Pl(e, t, r) {
        for (; e !== null; ) {
            var l = e.alternate;
            if (
                ((e.childLanes & t) !== t
                    ? ((e.childLanes |= t), l !== null && (l.childLanes |= t))
                    : l !== null && (l.childLanes & t) !== t && (l.childLanes |= t),
                e === r)
            )
                break;
            e = e.return;
        }
    }
    function tn(e, t) {
        ((qo = e),
            (Cl = en = null),
            (e = e.dependencies),
            e !== null &&
                e.firstContext !== null &&
                ((e.lanes & t) !== 0 && (at = !0), (e.firstContext = null)));
    }
    function _t(e) {
        var t = e._currentValue;
        if (Cl !== e)
            if (((e = { context: e, memoizedValue: t, next: null }), en === null)) {
                if (qo === null) throw Error(o(308));
                ((en = e), (qo.dependencies = { lanes: 0, firstContext: e }));
            } else en = en.next = e;
        return t;
    }
    var Cr = null;
    function Fl(e) {
        Cr === null ? (Cr = [e]) : Cr.push(e);
    }
    function Ru(e, t, r, l) {
        var s = t.interleaved;
        return (
            s === null ? ((r.next = r), Fl(t)) : ((r.next = s.next), (s.next = r)),
            (t.interleaved = r),
            Vt(e, l)
        );
    }
    function Vt(e, t) {
        e.lanes |= t;
        var r = e.alternate;
        for (r !== null && (r.lanes |= t), r = e, e = e.return; e !== null; )
            ((e.childLanes |= t),
                (r = e.alternate),
                r !== null && (r.childLanes |= t),
                (r = e),
                (e = e.return));
        return r.tag === 3 ? r.stateNode : null;
    }
    var ar = !1;
    function Rl(e) {
        e.updateQueue = {
            baseState: e.memoizedState,
            firstBaseUpdate: null,
            lastBaseUpdate: null,
            shared: { pending: null, interleaved: null, lanes: 0 },
            effects: null,
        };
    }
    function ju(e, t) {
        ((e = e.updateQueue),
            t.updateQueue === e &&
                (t.updateQueue = {
                    baseState: e.baseState,
                    firstBaseUpdate: e.firstBaseUpdate,
                    lastBaseUpdate: e.lastBaseUpdate,
                    shared: e.shared,
                    effects: e.effects,
                }));
    }
    function Kt(e, t) {
        return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
    }
    function ur(e, t, r) {
        var l = e.updateQueue;
        if (l === null) return null;
        if (((l = l.shared), (de & 2) !== 0)) {
            var s = l.pending;
            return (
                s === null ? (t.next = t) : ((t.next = s.next), (s.next = t)),
                (l.pending = t),
                Vt(e, r)
            );
        }
        return (
            (s = l.interleaved),
            s === null ? ((t.next = t), Fl(l)) : ((t.next = s.next), (s.next = t)),
            (l.interleaved = t),
            Vt(e, r)
        );
    }
    function Ho(e, t, r) {
        if (((t = t.updateQueue), t !== null && ((t = t.shared), (r & 4194240) !== 0))) {
            var l = t.lanes;
            ((l &= e.pendingLanes), (r |= l), (t.lanes = r), $i(e, r));
        }
    }
    function Iu(e, t) {
        var r = e.updateQueue,
            l = e.alternate;
        if (l !== null && ((l = l.updateQueue), r === l)) {
            var s = null,
                u = null;
            if (((r = r.firstBaseUpdate), r !== null)) {
                do {
                    var d = {
                        eventTime: r.eventTime,
                        lane: r.lane,
                        tag: r.tag,
                        payload: r.payload,
                        callback: r.callback,
                        next: null,
                    };
                    (u === null ? (s = u = d) : (u = u.next = d), (r = r.next));
                } while (r !== null);
                u === null ? (s = u = t) : (u = u.next = t);
            } else s = u = t;
            ((r = {
                baseState: l.baseState,
                firstBaseUpdate: s,
                lastBaseUpdate: u,
                shared: l.shared,
                effects: l.effects,
            }),
                (e.updateQueue = r));
            return;
        }
        ((e = r.lastBaseUpdate),
            e === null ? (r.firstBaseUpdate = t) : (e.next = t),
            (r.lastBaseUpdate = t));
    }
    function Wo(e, t, r, l) {
        var s = e.updateQueue;
        ar = !1;
        var u = s.firstBaseUpdate,
            d = s.lastBaseUpdate,
            g = s.shared.pending;
        if (g !== null) {
            s.shared.pending = null;
            var w = g,
                z = w.next;
            ((w.next = null), d === null ? (u = z) : (d.next = z), (d = w));
            var j = e.alternate;
            j !== null &&
                ((j = j.updateQueue),
                (g = j.lastBaseUpdate),
                g !== d &&
                    (g === null ? (j.firstBaseUpdate = z) : (g.next = z), (j.lastBaseUpdate = w)));
        }
        if (u !== null) {
            var I = s.baseState;
            ((d = 0), (j = z = w = null), (g = u));
            do {
                var R = g.lane,
                    $ = g.eventTime;
                if ((l & R) === R) {
                    j !== null &&
                        (j = j.next =
                            {
                                eventTime: $,
                                lane: 0,
                                tag: g.tag,
                                payload: g.payload,
                                callback: g.callback,
                                next: null,
                            });
                    e: {
                        var J = e,
                            Z = g;
                        switch (((R = t), ($ = r), Z.tag)) {
                            case 1:
                                if (((J = Z.payload), typeof J == "function")) {
                                    I = J.call($, I, R);
                                    break e;
                                }
                                I = J;
                                break e;
                            case 3:
                                J.flags = (J.flags & -65537) | 128;
                            case 0:
                                if (
                                    ((J = Z.payload),
                                    (R = typeof J == "function" ? J.call($, I, R) : J),
                                    R == null)
                                )
                                    break e;
                                I = L({}, I, R);
                                break e;
                            case 2:
                                ar = !0;
                        }
                    }
                    g.callback !== null &&
                        g.lane !== 0 &&
                        ((e.flags |= 64),
                        (R = s.effects),
                        R === null ? (s.effects = [g]) : R.push(g));
                } else
                    (($ = {
                        eventTime: $,
                        lane: R,
                        tag: g.tag,
                        payload: g.payload,
                        callback: g.callback,
                        next: null,
                    }),
                        j === null ? ((z = j = $), (w = I)) : (j = j.next = $),
                        (d |= R));
                if (((g = g.next), g === null)) {
                    if (((g = s.shared.pending), g === null)) break;
                    ((R = g),
                        (g = R.next),
                        (R.next = null),
                        (s.lastBaseUpdate = R),
                        (s.shared.pending = null));
                }
            } while (!0);
            if (
                (j === null && (w = I),
                (s.baseState = w),
                (s.firstBaseUpdate = z),
                (s.lastBaseUpdate = j),
                (t = s.shared.interleaved),
                t !== null)
            ) {
                s = t;
                do ((d |= s.lane), (s = s.next));
                while (s !== t);
            } else u === null && (s.shared.lanes = 0);
            ((Pr |= d), (e.lanes = d), (e.memoizedState = I));
        }
    }
    function Du(e, t, r) {
        if (((e = t.effects), (t.effects = null), e !== null))
            for (t = 0; t < e.length; t++) {
                var l = e[t],
                    s = l.callback;
                if (s !== null) {
                    if (((l.callback = null), (l = r), typeof s != "function"))
                        throw Error(o(191, s));
                    s.call(l);
                }
            }
    }
    var Mn = {},
        Ot = ir(Mn),
        An = ir(Mn),
        qn = ir(Mn);
    function zr(e) {
        if (e === Mn) throw Error(o(174));
        return e;
    }
    function jl(e, t) {
        switch ((be(qn, t), be(An, e), be(Ot, Mn), (e = t.nodeType), e)) {
            case 9:
            case 11:
                t = (t = t.documentElement) ? t.namespaceURI : Ii(null, "");
                break;
            default:
                ((e = e === 8 ? t.parentNode : t),
                    (t = e.namespaceURI || null),
                    (e = e.tagName),
                    (t = Ii(t, e)));
        }
        (xe(Ot), be(Ot, t));
    }
    function rn() {
        (xe(Ot), xe(An), xe(qn));
    }
    function Ou(e) {
        zr(qn.current);
        var t = zr(Ot.current),
            r = Ii(t, e.type);
        t !== r && (be(An, e), be(Ot, r));
    }
    function Il(e) {
        An.current === e && (xe(Ot), xe(An));
    }
    var Ce = ir(0);
    function Uo(e) {
        for (var t = e; t !== null; ) {
            if (t.tag === 13) {
                var r = t.memoizedState;
                if (
                    r !== null &&
                    ((r = r.dehydrated), r === null || r.data === "$?" || r.data === "$!")
                )
                    return t;
            } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
                if ((t.flags & 128) !== 0) return t;
            } else if (t.child !== null) {
                ((t.child.return = t), (t = t.child));
                continue;
            }
            if (t === e) break;
            for (; t.sibling === null; ) {
                if (t.return === null || t.return === e) return null;
                t = t.return;
            }
            ((t.sibling.return = t.return), (t = t.sibling));
        }
        return null;
    }
    var Dl = [];
    function Ol() {
        for (var e = 0; e < Dl.length; e++) Dl[e]._workInProgressVersionPrimary = null;
        Dl.length = 0;
    }
    var Vo = Q.ReactCurrentDispatcher,
        Ll = Q.ReactCurrentBatchConfig,
        Nr = 0,
        ze = null,
        He = null,
        Ve = null,
        Ko = !1,
        Hn = !1,
        Wn = 0,
        cp = 0;
    function Ze() {
        throw Error(o(321));
    }
    function Ml(e, t) {
        if (t === null) return !1;
        for (var r = 0; r < t.length && r < e.length; r++) if (!Et(e[r], t[r])) return !1;
        return !0;
    }
    function Al(e, t, r, l, s, u) {
        if (
            ((Nr = u),
            (ze = t),
            (t.memoizedState = null),
            (t.updateQueue = null),
            (t.lanes = 0),
            (Vo.current = e === null || e.memoizedState === null ? pp : vp),
            (e = r(l, s)),
            Hn)
        ) {
            u = 0;
            do {
                if (((Hn = !1), (Wn = 0), 25 <= u)) throw Error(o(301));
                ((u += 1),
                    (Ve = He = null),
                    (t.updateQueue = null),
                    (Vo.current = mp),
                    (e = r(l, s)));
            } while (Hn);
        }
        if (
            ((Vo.current = Go),
            (t = He !== null && He.next !== null),
            (Nr = 0),
            (Ve = He = ze = null),
            (Ko = !1),
            t)
        )
            throw Error(o(300));
        return e;
    }
    function ql() {
        var e = Wn !== 0;
        return ((Wn = 0), e);
    }
    function Lt() {
        var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
        return (Ve === null ? (ze.memoizedState = Ve = e) : (Ve = Ve.next = e), Ve);
    }
    function kt() {
        if (He === null) {
            var e = ze.alternate;
            e = e !== null ? e.memoizedState : null;
        } else e = He.next;
        var t = Ve === null ? ze.memoizedState : Ve.next;
        if (t !== null) ((Ve = t), (He = e));
        else {
            if (e === null) throw Error(o(310));
            ((He = e),
                (e = {
                    memoizedState: He.memoizedState,
                    baseState: He.baseState,
                    baseQueue: He.baseQueue,
                    queue: He.queue,
                    next: null,
                }),
                Ve === null ? (ze.memoizedState = Ve = e) : (Ve = Ve.next = e));
        }
        return Ve;
    }
    function Un(e, t) {
        return typeof t == "function" ? t(e) : t;
    }
    function Hl(e) {
        var t = kt(),
            r = t.queue;
        if (r === null) throw Error(o(311));
        r.lastRenderedReducer = e;
        var l = He,
            s = l.baseQueue,
            u = r.pending;
        if (u !== null) {
            if (s !== null) {
                var d = s.next;
                ((s.next = u.next), (u.next = d));
            }
            ((l.baseQueue = s = u), (r.pending = null));
        }
        if (s !== null) {
            ((u = s.next), (l = l.baseState));
            var g = (d = null),
                w = null,
                z = u;
            do {
                var j = z.lane;
                if ((Nr & j) === j)
                    (w !== null &&
                        (w = w.next =
                            {
                                lane: 0,
                                action: z.action,
                                hasEagerState: z.hasEagerState,
                                eagerState: z.eagerState,
                                next: null,
                            }),
                        (l = z.hasEagerState ? z.eagerState : e(l, z.action)));
                else {
                    var I = {
                        lane: j,
                        action: z.action,
                        hasEagerState: z.hasEagerState,
                        eagerState: z.eagerState,
                        next: null,
                    };
                    (w === null ? ((g = w = I), (d = l)) : (w = w.next = I),
                        (ze.lanes |= j),
                        (Pr |= j));
                }
                z = z.next;
            } while (z !== null && z !== u);
            (w === null ? (d = l) : (w.next = g),
                Et(l, t.memoizedState) || (at = !0),
                (t.memoizedState = l),
                (t.baseState = d),
                (t.baseQueue = w),
                (r.lastRenderedState = l));
        }
        if (((e = r.interleaved), e !== null)) {
            s = e;
            do ((u = s.lane), (ze.lanes |= u), (Pr |= u), (s = s.next));
            while (s !== e);
        } else s === null && (r.lanes = 0);
        return [t.memoizedState, r.dispatch];
    }
    function Wl(e) {
        var t = kt(),
            r = t.queue;
        if (r === null) throw Error(o(311));
        r.lastRenderedReducer = e;
        var l = r.dispatch,
            s = r.pending,
            u = t.memoizedState;
        if (s !== null) {
            r.pending = null;
            var d = (s = s.next);
            do ((u = e(u, d.action)), (d = d.next));
            while (d !== s);
            (Et(u, t.memoizedState) || (at = !0),
                (t.memoizedState = u),
                t.baseQueue === null && (t.baseState = u),
                (r.lastRenderedState = u));
        }
        return [u, l];
    }
    function Lu() {}
    function Mu(e, t) {
        var r = ze,
            l = kt(),
            s = t(),
            u = !Et(l.memoizedState, s);
        if (
            (u && ((l.memoizedState = s), (at = !0)),
            (l = l.queue),
            Ul(Hu.bind(null, r, l, e), [e]),
            l.getSnapshot !== t || u || (Ve !== null && Ve.memoizedState.tag & 1))
        ) {
            if (((r.flags |= 2048), Vn(9, qu.bind(null, r, l, s, t), void 0, null), Ke === null))
                throw Error(o(349));
            (Nr & 30) !== 0 || Au(r, t, s);
        }
        return s;
    }
    function Au(e, t, r) {
        ((e.flags |= 16384),
            (e = { getSnapshot: t, value: r }),
            (t = ze.updateQueue),
            t === null
                ? ((t = { lastEffect: null, stores: null }), (ze.updateQueue = t), (t.stores = [e]))
                : ((r = t.stores), r === null ? (t.stores = [e]) : r.push(e)));
    }
    function qu(e, t, r, l) {
        ((t.value = r), (t.getSnapshot = l), Wu(t) && Uu(e));
    }
    function Hu(e, t, r) {
        return r(function () {
            Wu(t) && Uu(e);
        });
    }
    function Wu(e) {
        var t = e.getSnapshot;
        e = e.value;
        try {
            var r = t();
            return !Et(e, r);
        } catch {
            return !0;
        }
    }
    function Uu(e) {
        var t = Vt(e, 1);
        t !== null && Pt(t, e, 1, -1);
    }
    function Vu(e) {
        var t = Lt();
        return (
            typeof e == "function" && (e = e()),
            (t.memoizedState = t.baseState = e),
            (e = {
                pending: null,
                interleaved: null,
                lanes: 0,
                dispatch: null,
                lastRenderedReducer: Un,
                lastRenderedState: e,
            }),
            (t.queue = e),
            (e = e.dispatch = hp.bind(null, ze, e)),
            [t.memoizedState, e]
        );
    }
    function Vn(e, t, r, l) {
        return (
            (e = { tag: e, create: t, destroy: r, deps: l, next: null }),
            (t = ze.updateQueue),
            t === null
                ? ((t = { lastEffect: null, stores: null }),
                  (ze.updateQueue = t),
                  (t.lastEffect = e.next = e))
                : ((r = t.lastEffect),
                  r === null
                      ? (t.lastEffect = e.next = e)
                      : ((l = r.next), (r.next = e), (e.next = l), (t.lastEffect = e))),
            e
        );
    }
    function Ku() {
        return kt().memoizedState;
    }
    function $o(e, t, r, l) {
        var s = Lt();
        ((ze.flags |= e), (s.memoizedState = Vn(1 | t, r, void 0, l === void 0 ? null : l)));
    }
    function Qo(e, t, r, l) {
        var s = kt();
        l = l === void 0 ? null : l;
        var u = void 0;
        if (He !== null) {
            var d = He.memoizedState;
            if (((u = d.destroy), l !== null && Ml(l, d.deps))) {
                s.memoizedState = Vn(t, r, u, l);
                return;
            }
        }
        ((ze.flags |= e), (s.memoizedState = Vn(1 | t, r, u, l)));
    }
    function $u(e, t) {
        return $o(8390656, 8, e, t);
    }
    function Ul(e, t) {
        return Qo(2048, 8, e, t);
    }
    function Qu(e, t) {
        return Qo(4, 2, e, t);
    }
    function Gu(e, t) {
        return Qo(4, 4, e, t);
    }
    function Xu(e, t) {
        if (typeof t == "function")
            return (
                (e = e()),
                t(e),
                function () {
                    t(null);
                }
            );
        if (t != null)
            return (
                (e = e()),
                (t.current = e),
                function () {
                    t.current = null;
                }
            );
    }
    function Yu(e, t, r) {
        return ((r = r != null ? r.concat([e]) : null), Qo(4, 4, Xu.bind(null, t, e), r));
    }
    function Vl() {}
    function Ju(e, t) {
        var r = kt();
        t = t === void 0 ? null : t;
        var l = r.memoizedState;
        return l !== null && t !== null && Ml(t, l[1]) ? l[0] : ((r.memoizedState = [e, t]), e);
    }
    function Zu(e, t) {
        var r = kt();
        t = t === void 0 ? null : t;
        var l = r.memoizedState;
        return l !== null && t !== null && Ml(t, l[1])
            ? l[0]
            : ((e = e()), (r.memoizedState = [e, t]), e);
    }
    function ec(e, t, r) {
        return (Nr & 21) === 0
            ? (e.baseState && ((e.baseState = !1), (at = !0)), (e.memoizedState = r))
            : (Et(r, t) || ((r = Na()), (ze.lanes |= r), (Pr |= r), (e.baseState = !0)), t);
    }
    function fp(e, t) {
        var r = ge;
        ((ge = r !== 0 && 4 > r ? r : 4), e(!0));
        var l = Ll.transition;
        Ll.transition = {};
        try {
            (e(!1), t());
        } finally {
            ((ge = r), (Ll.transition = l));
        }
    }
    function tc() {
        return kt().memoizedState;
    }
    function dp(e, t, r) {
        var l = hr(e);
        if (((r = { lane: l, action: r, hasEagerState: !1, eagerState: null, next: null }), rc(e)))
            nc(t, r);
        else if (((r = Ru(e, t, r, l)), r !== null)) {
            var s = ot();
            (Pt(r, e, l, s), oc(r, t, l));
        }
    }
    function hp(e, t, r) {
        var l = hr(e),
            s = { lane: l, action: r, hasEagerState: !1, eagerState: null, next: null };
        if (rc(e)) nc(t, s);
        else {
            var u = e.alternate;
            if (
                e.lanes === 0 &&
                (u === null || u.lanes === 0) &&
                ((u = t.lastRenderedReducer), u !== null)
            )
                try {
                    var d = t.lastRenderedState,
                        g = u(d, r);
                    if (((s.hasEagerState = !0), (s.eagerState = g), Et(g, d))) {
                        var w = t.interleaved;
                        (w === null ? ((s.next = s), Fl(t)) : ((s.next = w.next), (w.next = s)),
                            (t.interleaved = s));
                        return;
                    }
                } catch {
                } finally {
                }
            ((r = Ru(e, t, s, l)), r !== null && ((s = ot()), Pt(r, e, l, s), oc(r, t, l)));
        }
    }
    function rc(e) {
        var t = e.alternate;
        return e === ze || (t !== null && t === ze);
    }
    function nc(e, t) {
        Hn = Ko = !0;
        var r = e.pending;
        (r === null ? (t.next = t) : ((t.next = r.next), (r.next = t)), (e.pending = t));
    }
    function oc(e, t, r) {
        if ((r & 4194240) !== 0) {
            var l = t.lanes;
            ((l &= e.pendingLanes), (r |= l), (t.lanes = r), $i(e, r));
        }
    }
    var Go = {
            readContext: _t,
            useCallback: Ze,
            useContext: Ze,
            useEffect: Ze,
            useImperativeHandle: Ze,
            useInsertionEffect: Ze,
            useLayoutEffect: Ze,
            useMemo: Ze,
            useReducer: Ze,
            useRef: Ze,
            useState: Ze,
            useDebugValue: Ze,
            useDeferredValue: Ze,
            useTransition: Ze,
            useMutableSource: Ze,
            useSyncExternalStore: Ze,
            useId: Ze,
            unstable_isNewReconciler: !1,
        },
        pp = {
            readContext: _t,
            useCallback: function (e, t) {
                return ((Lt().memoizedState = [e, t === void 0 ? null : t]), e);
            },
            useContext: _t,
            useEffect: $u,
            useImperativeHandle: function (e, t, r) {
                return (
                    (r = r != null ? r.concat([e]) : null),
                    $o(4194308, 4, Xu.bind(null, t, e), r)
                );
            },
            useLayoutEffect: function (e, t) {
                return $o(4194308, 4, e, t);
            },
            useInsertionEffect: function (e, t) {
                return $o(4, 2, e, t);
            },
            useMemo: function (e, t) {
                var r = Lt();
                return ((t = t === void 0 ? null : t), (e = e()), (r.memoizedState = [e, t]), e);
            },
            useReducer: function (e, t, r) {
                var l = Lt();
                return (
                    (t = r !== void 0 ? r(t) : t),
                    (l.memoizedState = l.baseState = t),
                    (e = {
                        pending: null,
                        interleaved: null,
                        lanes: 0,
                        dispatch: null,
                        lastRenderedReducer: e,
                        lastRenderedState: t,
                    }),
                    (l.queue = e),
                    (e = e.dispatch = dp.bind(null, ze, e)),
                    [l.memoizedState, e]
                );
            },
            useRef: function (e) {
                var t = Lt();
                return ((e = { current: e }), (t.memoizedState = e));
            },
            useState: Vu,
            useDebugValue: Vl,
            useDeferredValue: function (e) {
                return (Lt().memoizedState = e);
            },
            useTransition: function () {
                var e = Vu(!1),
                    t = e[0];
                return ((e = fp.bind(null, e[1])), (Lt().memoizedState = e), [t, e]);
            },
            useMutableSource: function () {},
            useSyncExternalStore: function (e, t, r) {
                var l = ze,
                    s = Lt();
                if (Be) {
                    if (r === void 0) throw Error(o(407));
                    r = r();
                } else {
                    if (((r = t()), Ke === null)) throw Error(o(349));
                    (Nr & 30) !== 0 || Au(l, t, r);
                }
                s.memoizedState = r;
                var u = { value: r, getSnapshot: t };
                return (
                    (s.queue = u),
                    $u(Hu.bind(null, l, u, e), [e]),
                    (l.flags |= 2048),
                    Vn(9, qu.bind(null, l, u, r, t), void 0, null),
                    r
                );
            },
            useId: function () {
                var e = Lt(),
                    t = Ke.identifierPrefix;
                if (Be) {
                    var r = Ut,
                        l = Wt;
                    ((r = (l & ~(1 << (32 - Bt(l) - 1))).toString(32) + r),
                        (t = ":" + t + "R" + r),
                        (r = Wn++),
                        0 < r && (t += "H" + r.toString(32)),
                        (t += ":"));
                } else ((r = cp++), (t = ":" + t + "r" + r.toString(32) + ":"));
                return (e.memoizedState = t);
            },
            unstable_isNewReconciler: !1,
        },
        vp = {
            readContext: _t,
            useCallback: Ju,
            useContext: _t,
            useEffect: Ul,
            useImperativeHandle: Yu,
            useInsertionEffect: Qu,
            useLayoutEffect: Gu,
            useMemo: Zu,
            useReducer: Hl,
            useRef: Ku,
            useState: function () {
                return Hl(Un);
            },
            useDebugValue: Vl,
            useDeferredValue: function (e) {
                var t = kt();
                return ec(t, He.memoizedState, e);
            },
            useTransition: function () {
                var e = Hl(Un)[0],
                    t = kt().memoizedState;
                return [e, t];
            },
            useMutableSource: Lu,
            useSyncExternalStore: Mu,
            useId: tc,
            unstable_isNewReconciler: !1,
        },
        mp = {
            readContext: _t,
            useCallback: Ju,
            useContext: _t,
            useEffect: Ul,
            useImperativeHandle: Yu,
            useInsertionEffect: Qu,
            useLayoutEffect: Gu,
            useMemo: Zu,
            useReducer: Wl,
            useRef: Ku,
            useState: function () {
                return Wl(Un);
            },
            useDebugValue: Vl,
            useDeferredValue: function (e) {
                var t = kt();
                return He === null ? (t.memoizedState = e) : ec(t, He.memoizedState, e);
            },
            useTransition: function () {
                var e = Wl(Un)[0],
                    t = kt().memoizedState;
                return [e, t];
            },
            useMutableSource: Lu,
            useSyncExternalStore: Mu,
            useId: tc,
            unstable_isNewReconciler: !1,
        };
    function Ct(e, t) {
        if (e && e.defaultProps) {
            ((t = L({}, t)), (e = e.defaultProps));
            for (var r in e) t[r] === void 0 && (t[r] = e[r]);
            return t;
        }
        return t;
    }
    function Kl(e, t, r, l) {
        ((t = e.memoizedState),
            (r = r(l, t)),
            (r = r == null ? t : L({}, t, r)),
            (e.memoizedState = r),
            e.lanes === 0 && (e.updateQueue.baseState = r));
    }
    var Xo = {
        isMounted: function (e) {
            return (e = e._reactInternals) ? xr(e) === e : !1;
        },
        enqueueSetState: function (e, t, r) {
            e = e._reactInternals;
            var l = ot(),
                s = hr(e),
                u = Kt(l, s);
            ((u.payload = t),
                r != null && (u.callback = r),
                (t = ur(e, u, s)),
                t !== null && (Pt(t, e, s, l), Ho(t, e, s)));
        },
        enqueueReplaceState: function (e, t, r) {
            e = e._reactInternals;
            var l = ot(),
                s = hr(e),
                u = Kt(l, s);
            ((u.tag = 1),
                (u.payload = t),
                r != null && (u.callback = r),
                (t = ur(e, u, s)),
                t !== null && (Pt(t, e, s, l), Ho(t, e, s)));
        },
        enqueueForceUpdate: function (e, t) {
            e = e._reactInternals;
            var r = ot(),
                l = hr(e),
                s = Kt(r, l);
            ((s.tag = 2),
                t != null && (s.callback = t),
                (t = ur(e, s, l)),
                t !== null && (Pt(t, e, l, r), Ho(t, e, l)));
        },
    };
    function ic(e, t, r, l, s, u, d) {
        return (
            (e = e.stateNode),
            typeof e.shouldComponentUpdate == "function"
                ? e.shouldComponentUpdate(l, u, d)
                : t.prototype && t.prototype.isPureReactComponent
                  ? !Pn(r, l) || !Pn(s, u)
                  : !0
        );
    }
    function lc(e, t, r) {
        var l = !1,
            s = lr,
            u = t.contextType;
        return (
            typeof u == "object" && u !== null
                ? (u = _t(u))
                : ((s = st(t) ? Br : Je.current),
                  (l = t.contextTypes),
                  (u = (l = l != null) ? Gr(e, s) : lr)),
            (t = new t(r, u)),
            (e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
            (t.updater = Xo),
            (e.stateNode = t),
            (t._reactInternals = e),
            l &&
                ((e = e.stateNode),
                (e.__reactInternalMemoizedUnmaskedChildContext = s),
                (e.__reactInternalMemoizedMaskedChildContext = u)),
            t
        );
    }
    function sc(e, t, r, l) {
        ((e = t.state),
            typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(r, l),
            typeof t.UNSAFE_componentWillReceiveProps == "function" &&
                t.UNSAFE_componentWillReceiveProps(r, l),
            t.state !== e && Xo.enqueueReplaceState(t, t.state, null));
    }
    function $l(e, t, r, l) {
        var s = e.stateNode;
        ((s.props = r), (s.state = e.memoizedState), (s.refs = {}), Rl(e));
        var u = t.contextType;
        (typeof u == "object" && u !== null
            ? (s.context = _t(u))
            : ((u = st(t) ? Br : Je.current), (s.context = Gr(e, u))),
            (s.state = e.memoizedState),
            (u = t.getDerivedStateFromProps),
            typeof u == "function" && (Kl(e, t, u, r), (s.state = e.memoizedState)),
            typeof t.getDerivedStateFromProps == "function" ||
                typeof s.getSnapshotBeforeUpdate == "function" ||
                (typeof s.UNSAFE_componentWillMount != "function" &&
                    typeof s.componentWillMount != "function") ||
                ((t = s.state),
                typeof s.componentWillMount == "function" && s.componentWillMount(),
                typeof s.UNSAFE_componentWillMount == "function" && s.UNSAFE_componentWillMount(),
                t !== s.state && Xo.enqueueReplaceState(s, s.state, null),
                Wo(e, r, s, l),
                (s.state = e.memoizedState)),
            typeof s.componentDidMount == "function" && (e.flags |= 4194308));
    }
    function nn(e, t) {
        try {
            var r = "",
                l = t;
            do ((r += ce(l)), (l = l.return));
            while (l);
            var s = r;
        } catch (u) {
            s =
                `
Error generating stack: ` +
                u.message +
                `
` +
                u.stack;
        }
        return { value: e, source: t, stack: s, digest: null };
    }
    function Ql(e, t, r) {
        return { value: e, source: null, stack: r ?? null, digest: t ?? null };
    }
    function Gl(e, t) {
        try {
            console.error(t.value);
        } catch (r) {
            setTimeout(function () {
                throw r;
            });
        }
    }
    var gp = typeof WeakMap == "function" ? WeakMap : Map;
    function ac(e, t, r) {
        ((r = Kt(-1, r)), (r.tag = 3), (r.payload = { element: null }));
        var l = t.value;
        return (
            (r.callback = function () {
                (ni || ((ni = !0), (cs = l)), Gl(e, t));
            }),
            r
        );
    }
    function uc(e, t, r) {
        ((r = Kt(-1, r)), (r.tag = 3));
        var l = e.type.getDerivedStateFromError;
        if (typeof l == "function") {
            var s = t.value;
            ((r.payload = function () {
                return l(s);
            }),
                (r.callback = function () {
                    Gl(e, t);
                }));
        }
        var u = e.stateNode;
        return (
            u !== null &&
                typeof u.componentDidCatch == "function" &&
                (r.callback = function () {
                    (Gl(e, t),
                        typeof l != "function" &&
                            (fr === null ? (fr = new Set([this])) : fr.add(this)));
                    var d = t.stack;
                    this.componentDidCatch(t.value, { componentStack: d !== null ? d : "" });
                }),
            r
        );
    }
    function cc(e, t, r) {
        var l = e.pingCache;
        if (l === null) {
            l = e.pingCache = new gp();
            var s = new Set();
            l.set(t, s);
        } else ((s = l.get(t)), s === void 0 && ((s = new Set()), l.set(t, s)));
        s.has(r) || (s.add(r), (e = Pp.bind(null, e, t, r)), t.then(e, e));
    }
    function fc(e) {
        do {
            var t;
            if (
                ((t = e.tag === 13) &&
                    ((t = e.memoizedState), (t = t !== null ? t.dehydrated !== null : !0)),
                t)
            )
                return e;
            e = e.return;
        } while (e !== null);
        return null;
    }
    function dc(e, t, r, l, s) {
        return (e.mode & 1) === 0
            ? (e === t
                  ? (e.flags |= 65536)
                  : ((e.flags |= 128),
                    (r.flags |= 131072),
                    (r.flags &= -52805),
                    r.tag === 1 &&
                        (r.alternate === null
                            ? (r.tag = 17)
                            : ((t = Kt(-1, 1)), (t.tag = 2), ur(r, t, 1))),
                    (r.lanes |= 1)),
              e)
            : ((e.flags |= 65536), (e.lanes = s), e);
    }
    var yp = Q.ReactCurrentOwner,
        at = !1;
    function nt(e, t, r, l) {
        t.child = e === null ? Fu(t, null, r, l) : Zr(t, e.child, r, l);
    }
    function hc(e, t, r, l, s) {
        r = r.render;
        var u = t.ref;
        return (
            tn(t, s),
            (l = Al(e, t, r, l, u, s)),
            (r = ql()),
            e !== null && !at
                ? ((t.updateQueue = e.updateQueue),
                  (t.flags &= -2053),
                  (e.lanes &= ~s),
                  $t(e, t, s))
                : (Be && r && xl(t), (t.flags |= 1), nt(e, t, l, s), t.child)
        );
    }
    function pc(e, t, r, l, s) {
        if (e === null) {
            var u = r.type;
            return typeof u == "function" &&
                !gs(u) &&
                u.defaultProps === void 0 &&
                r.compare === null &&
                r.defaultProps === void 0
                ? ((t.tag = 15), (t.type = u), vc(e, t, u, l, s))
                : ((e = ui(r.type, null, l, t, t.mode, s)),
                  (e.ref = t.ref),
                  (e.return = t),
                  (t.child = e));
        }
        if (((u = e.child), (e.lanes & s) === 0)) {
            var d = u.memoizedProps;
            if (((r = r.compare), (r = r !== null ? r : Pn), r(d, l) && e.ref === t.ref))
                return $t(e, t, s);
        }
        return ((t.flags |= 1), (e = vr(u, l)), (e.ref = t.ref), (e.return = t), (t.child = e));
    }
    function vc(e, t, r, l, s) {
        if (e !== null) {
            var u = e.memoizedProps;
            if (Pn(u, l) && e.ref === t.ref)
                if (((at = !1), (t.pendingProps = l = u), (e.lanes & s) !== 0))
                    (e.flags & 131072) !== 0 && (at = !0);
                else return ((t.lanes = e.lanes), $t(e, t, s));
        }
        return Xl(e, t, r, l, s);
    }
    function mc(e, t, r) {
        var l = t.pendingProps,
            s = l.children,
            u = e !== null ? e.memoizedState : null;
        if (l.mode === "hidden")
            if ((t.mode & 1) === 0)
                ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
                    be(ln, mt),
                    (mt |= r));
            else {
                if ((r & 1073741824) === 0)
                    return (
                        (e = u !== null ? u.baseLanes | r : r),
                        (t.lanes = t.childLanes = 1073741824),
                        (t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }),
                        (t.updateQueue = null),
                        be(ln, mt),
                        (mt |= e),
                        null
                    );
                ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
                    (l = u !== null ? u.baseLanes : r),
                    be(ln, mt),
                    (mt |= l));
            }
        else
            (u !== null ? ((l = u.baseLanes | r), (t.memoizedState = null)) : (l = r),
                be(ln, mt),
                (mt |= l));
        return (nt(e, t, s, r), t.child);
    }
    function gc(e, t) {
        var r = t.ref;
        ((e === null && r !== null) || (e !== null && e.ref !== r)) &&
            ((t.flags |= 512), (t.flags |= 2097152));
    }
    function Xl(e, t, r, l, s) {
        var u = st(r) ? Br : Je.current;
        return (
            (u = Gr(t, u)),
            tn(t, s),
            (r = Al(e, t, r, l, u, s)),
            (l = ql()),
            e !== null && !at
                ? ((t.updateQueue = e.updateQueue),
                  (t.flags &= -2053),
                  (e.lanes &= ~s),
                  $t(e, t, s))
                : (Be && l && xl(t), (t.flags |= 1), nt(e, t, r, s), t.child)
        );
    }
    function yc(e, t, r, l, s) {
        if (st(r)) {
            var u = !0;
            jo(t);
        } else u = !1;
        if ((tn(t, s), t.stateNode === null)) (Jo(e, t), lc(t, r, l), $l(t, r, l, s), (l = !0));
        else if (e === null) {
            var d = t.stateNode,
                g = t.memoizedProps;
            d.props = g;
            var w = d.context,
                z = r.contextType;
            typeof z == "object" && z !== null
                ? (z = _t(z))
                : ((z = st(r) ? Br : Je.current), (z = Gr(t, z)));
            var j = r.getDerivedStateFromProps,
                I = typeof j == "function" || typeof d.getSnapshotBeforeUpdate == "function";
            (I ||
                (typeof d.UNSAFE_componentWillReceiveProps != "function" &&
                    typeof d.componentWillReceiveProps != "function") ||
                ((g !== l || w !== z) && sc(t, d, l, z)),
                (ar = !1));
            var R = t.memoizedState;
            ((d.state = R),
                Wo(t, l, d, s),
                (w = t.memoizedState),
                g !== l || R !== w || lt.current || ar
                    ? (typeof j == "function" && (Kl(t, r, j, l), (w = t.memoizedState)),
                      (g = ar || ic(t, r, g, l, R, w, z))
                          ? (I ||
                                (typeof d.UNSAFE_componentWillMount != "function" &&
                                    typeof d.componentWillMount != "function") ||
                                (typeof d.componentWillMount == "function" &&
                                    d.componentWillMount(),
                                typeof d.UNSAFE_componentWillMount == "function" &&
                                    d.UNSAFE_componentWillMount()),
                            typeof d.componentDidMount == "function" && (t.flags |= 4194308))
                          : (typeof d.componentDidMount == "function" && (t.flags |= 4194308),
                            (t.memoizedProps = l),
                            (t.memoizedState = w)),
                      (d.props = l),
                      (d.state = w),
                      (d.context = z),
                      (l = g))
                    : (typeof d.componentDidMount == "function" && (t.flags |= 4194308), (l = !1)));
        } else {
            ((d = t.stateNode),
                ju(e, t),
                (g = t.memoizedProps),
                (z = t.type === t.elementType ? g : Ct(t.type, g)),
                (d.props = z),
                (I = t.pendingProps),
                (R = d.context),
                (w = r.contextType),
                typeof w == "object" && w !== null
                    ? (w = _t(w))
                    : ((w = st(r) ? Br : Je.current), (w = Gr(t, w))));
            var $ = r.getDerivedStateFromProps;
            ((j = typeof $ == "function" || typeof d.getSnapshotBeforeUpdate == "function") ||
                (typeof d.UNSAFE_componentWillReceiveProps != "function" &&
                    typeof d.componentWillReceiveProps != "function") ||
                ((g !== I || R !== w) && sc(t, d, l, w)),
                (ar = !1),
                (R = t.memoizedState),
                (d.state = R),
                Wo(t, l, d, s));
            var J = t.memoizedState;
            g !== I || R !== J || lt.current || ar
                ? (typeof $ == "function" && (Kl(t, r, $, l), (J = t.memoizedState)),
                  (z = ar || ic(t, r, z, l, R, J, w) || !1)
                      ? (j ||
                            (typeof d.UNSAFE_componentWillUpdate != "function" &&
                                typeof d.componentWillUpdate != "function") ||
                            (typeof d.componentWillUpdate == "function" &&
                                d.componentWillUpdate(l, J, w),
                            typeof d.UNSAFE_componentWillUpdate == "function" &&
                                d.UNSAFE_componentWillUpdate(l, J, w)),
                        typeof d.componentDidUpdate == "function" && (t.flags |= 4),
                        typeof d.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024))
                      : (typeof d.componentDidUpdate != "function" ||
                            (g === e.memoizedProps && R === e.memoizedState) ||
                            (t.flags |= 4),
                        typeof d.getSnapshotBeforeUpdate != "function" ||
                            (g === e.memoizedProps && R === e.memoizedState) ||
                            (t.flags |= 1024),
                        (t.memoizedProps = l),
                        (t.memoizedState = J)),
                  (d.props = l),
                  (d.state = J),
                  (d.context = w),
                  (l = z))
                : (typeof d.componentDidUpdate != "function" ||
                      (g === e.memoizedProps && R === e.memoizedState) ||
                      (t.flags |= 4),
                  typeof d.getSnapshotBeforeUpdate != "function" ||
                      (g === e.memoizedProps && R === e.memoizedState) ||
                      (t.flags |= 1024),
                  (l = !1));
        }
        return Yl(e, t, r, l, u, s);
    }
    function Yl(e, t, r, l, s, u) {
        gc(e, t);
        var d = (t.flags & 128) !== 0;
        if (!l && !d) return (s && xu(t, r, !1), $t(e, t, u));
        ((l = t.stateNode), (yp.current = t));
        var g = d && typeof r.getDerivedStateFromError != "function" ? null : l.render();
        return (
            (t.flags |= 1),
            e !== null && d
                ? ((t.child = Zr(t, e.child, null, u)), (t.child = Zr(t, null, g, u)))
                : nt(e, t, g, u),
            (t.memoizedState = l.state),
            s && xu(t, r, !0),
            t.child
        );
    }
    function wc(e) {
        var t = e.stateNode;
        (t.pendingContext
            ? _u(e, t.pendingContext, t.pendingContext !== t.context)
            : t.context && _u(e, t.context, !1),
            jl(e, t.containerInfo));
    }
    function bc(e, t, r, l, s) {
        return (Jr(), Tl(s), (t.flags |= 256), nt(e, t, r, l), t.child);
    }
    var Jl = { dehydrated: null, treeContext: null, retryLane: 0 };
    function Zl(e) {
        return { baseLanes: e, cachePool: null, transitions: null };
    }
    function _c(e, t, r) {
        var l = t.pendingProps,
            s = Ce.current,
            u = !1,
            d = (t.flags & 128) !== 0,
            g;
        if (
            ((g = d) || (g = e !== null && e.memoizedState === null ? !1 : (s & 2) !== 0),
            g
                ? ((u = !0), (t.flags &= -129))
                : (e === null || e.memoizedState !== null) && (s |= 1),
            be(Ce, s & 1),
            e === null)
        )
            return (
                El(t),
                (e = t.memoizedState),
                e !== null && ((e = e.dehydrated), e !== null)
                    ? ((t.mode & 1) === 0
                          ? (t.lanes = 1)
                          : e.data === "$!"
                            ? (t.lanes = 8)
                            : (t.lanes = 1073741824),
                      null)
                    : ((d = l.children),
                      (e = l.fallback),
                      u
                          ? ((l = t.mode),
                            (u = t.child),
                            (d = { mode: "hidden", children: d }),
                            (l & 1) === 0 && u !== null
                                ? ((u.childLanes = 0), (u.pendingProps = d))
                                : (u = ci(d, l, 0, null)),
                            (e = Ir(e, l, r, null)),
                            (u.return = t),
                            (e.return = t),
                            (u.sibling = e),
                            (t.child = u),
                            (t.child.memoizedState = Zl(r)),
                            (t.memoizedState = Jl),
                            e)
                          : es(t, d))
            );
        if (((s = e.memoizedState), s !== null && ((g = s.dehydrated), g !== null)))
            return wp(e, t, d, l, g, s, r);
        if (u) {
            ((u = l.fallback), (d = t.mode), (s = e.child), (g = s.sibling));
            var w = { mode: "hidden", children: l.children };
            return (
                (d & 1) === 0 && t.child !== s
                    ? ((l = t.child),
                      (l.childLanes = 0),
                      (l.pendingProps = w),
                      (t.deletions = null))
                    : ((l = vr(s, w)), (l.subtreeFlags = s.subtreeFlags & 14680064)),
                g !== null ? (u = vr(g, u)) : ((u = Ir(u, d, r, null)), (u.flags |= 2)),
                (u.return = t),
                (l.return = t),
                (l.sibling = u),
                (t.child = l),
                (l = u),
                (u = t.child),
                (d = e.child.memoizedState),
                (d =
                    d === null
                        ? Zl(r)
                        : {
                              baseLanes: d.baseLanes | r,
                              cachePool: null,
                              transitions: d.transitions,
                          }),
                (u.memoizedState = d),
                (u.childLanes = e.childLanes & ~r),
                (t.memoizedState = Jl),
                l
            );
        }
        return (
            (u = e.child),
            (e = u.sibling),
            (l = vr(u, { mode: "visible", children: l.children })),
            (t.mode & 1) === 0 && (l.lanes = r),
            (l.return = t),
            (l.sibling = null),
            e !== null &&
                ((r = t.deletions),
                r === null ? ((t.deletions = [e]), (t.flags |= 16)) : r.push(e)),
            (t.child = l),
            (t.memoizedState = null),
            l
        );
    }
    function es(e, t) {
        return (
            (t = ci({ mode: "visible", children: t }, e.mode, 0, null)),
            (t.return = e),
            (e.child = t)
        );
    }
    function Yo(e, t, r, l) {
        return (
            l !== null && Tl(l),
            Zr(t, e.child, null, r),
            (e = es(t, t.pendingProps.children)),
            (e.flags |= 2),
            (t.memoizedState = null),
            e
        );
    }
    function wp(e, t, r, l, s, u, d) {
        if (r)
            return t.flags & 256
                ? ((t.flags &= -257), (l = Ql(Error(o(422)))), Yo(e, t, d, l))
                : t.memoizedState !== null
                  ? ((t.child = e.child), (t.flags |= 128), null)
                  : ((u = l.fallback),
                    (s = t.mode),
                    (l = ci({ mode: "visible", children: l.children }, s, 0, null)),
                    (u = Ir(u, s, d, null)),
                    (u.flags |= 2),
                    (l.return = t),
                    (u.return = t),
                    (l.sibling = u),
                    (t.child = l),
                    (t.mode & 1) !== 0 && Zr(t, e.child, null, d),
                    (t.child.memoizedState = Zl(d)),
                    (t.memoizedState = Jl),
                    u);
        if ((t.mode & 1) === 0) return Yo(e, t, d, null);
        if (s.data === "$!") {
            if (((l = s.nextSibling && s.nextSibling.dataset), l)) var g = l.dgst;
            return ((l = g), (u = Error(o(419))), (l = Ql(u, l, void 0)), Yo(e, t, d, l));
        }
        if (((g = (d & e.childLanes) !== 0), at || g)) {
            if (((l = Ke), l !== null)) {
                switch (d & -d) {
                    case 4:
                        s = 2;
                        break;
                    case 16:
                        s = 8;
                        break;
                    case 64:
                    case 128:
                    case 256:
                    case 512:
                    case 1024:
                    case 2048:
                    case 4096:
                    case 8192:
                    case 16384:
                    case 32768:
                    case 65536:
                    case 131072:
                    case 262144:
                    case 524288:
                    case 1048576:
                    case 2097152:
                    case 4194304:
                    case 8388608:
                    case 16777216:
                    case 33554432:
                    case 67108864:
                        s = 32;
                        break;
                    case 536870912:
                        s = 268435456;
                        break;
                    default:
                        s = 0;
                }
                ((s = (s & (l.suspendedLanes | d)) !== 0 ? 0 : s),
                    s !== 0 && s !== u.retryLane && ((u.retryLane = s), Vt(e, s), Pt(l, e, s, -1)));
            }
            return (ms(), (l = Ql(Error(o(421)))), Yo(e, t, d, l));
        }
        return s.data === "$?"
            ? ((t.flags |= 128),
              (t.child = e.child),
              (t = Fp.bind(null, e)),
              (s._reactRetry = t),
              null)
            : ((e = u.treeContext),
              (vt = or(s.nextSibling)),
              (pt = t),
              (Be = !0),
              (Tt = null),
              e !== null &&
                  ((wt[bt++] = Wt),
                  (wt[bt++] = Ut),
                  (wt[bt++] = Er),
                  (Wt = e.id),
                  (Ut = e.overflow),
                  (Er = t)),
              (t = es(t, l.children)),
              (t.flags |= 4096),
              t);
    }
    function kc(e, t, r) {
        e.lanes |= t;
        var l = e.alternate;
        (l !== null && (l.lanes |= t), Pl(e.return, t, r));
    }
    function ts(e, t, r, l, s) {
        var u = e.memoizedState;
        u === null
            ? (e.memoizedState = {
                  isBackwards: t,
                  rendering: null,
                  renderingStartTime: 0,
                  last: l,
                  tail: r,
                  tailMode: s,
              })
            : ((u.isBackwards = t),
              (u.rendering = null),
              (u.renderingStartTime = 0),
              (u.last = l),
              (u.tail = r),
              (u.tailMode = s));
    }
    function xc(e, t, r) {
        var l = t.pendingProps,
            s = l.revealOrder,
            u = l.tail;
        if ((nt(e, t, l.children, r), (l = Ce.current), (l & 2) !== 0))
            ((l = (l & 1) | 2), (t.flags |= 128));
        else {
            if (e !== null && (e.flags & 128) !== 0)
                e: for (e = t.child; e !== null; ) {
                    if (e.tag === 13) e.memoizedState !== null && kc(e, r, t);
                    else if (e.tag === 19) kc(e, r, t);
                    else if (e.child !== null) {
                        ((e.child.return = e), (e = e.child));
                        continue;
                    }
                    if (e === t) break e;
                    for (; e.sibling === null; ) {
                        if (e.return === null || e.return === t) break e;
                        e = e.return;
                    }
                    ((e.sibling.return = e.return), (e = e.sibling));
                }
            l &= 1;
        }
        if ((be(Ce, l), (t.mode & 1) === 0)) t.memoizedState = null;
        else
            switch (s) {
                case "forwards":
                    for (r = t.child, s = null; r !== null; )
                        ((e = r.alternate),
                            e !== null && Uo(e) === null && (s = r),
                            (r = r.sibling));
                    ((r = s),
                        r === null
                            ? ((s = t.child), (t.child = null))
                            : ((s = r.sibling), (r.sibling = null)),
                        ts(t, !1, s, r, u));
                    break;
                case "backwards":
                    for (r = null, s = t.child, t.child = null; s !== null; ) {
                        if (((e = s.alternate), e !== null && Uo(e) === null)) {
                            t.child = s;
                            break;
                        }
                        ((e = s.sibling), (s.sibling = r), (r = s), (s = e));
                    }
                    ts(t, !0, r, null, u);
                    break;
                case "together":
                    ts(t, !1, null, null, void 0);
                    break;
                default:
                    t.memoizedState = null;
            }
        return t.child;
    }
    function Jo(e, t) {
        (t.mode & 1) === 0 &&
            e !== null &&
            ((e.alternate = null), (t.alternate = null), (t.flags |= 2));
    }
    function $t(e, t, r) {
        if (
            (e !== null && (t.dependencies = e.dependencies),
            (Pr |= t.lanes),
            (r & t.childLanes) === 0)
        )
            return null;
        if (e !== null && t.child !== e.child) throw Error(o(153));
        if (t.child !== null) {
            for (
                e = t.child, r = vr(e, e.pendingProps), t.child = r, r.return = t;
                e.sibling !== null;
            )
                ((e = e.sibling), (r = r.sibling = vr(e, e.pendingProps)), (r.return = t));
            r.sibling = null;
        }
        return t.child;
    }
    function bp(e, t, r) {
        switch (t.tag) {
            case 3:
                (wc(t), Jr());
                break;
            case 5:
                Ou(t);
                break;
            case 1:
                st(t.type) && jo(t);
                break;
            case 4:
                jl(t, t.stateNode.containerInfo);
                break;
            case 10:
                var l = t.type._context,
                    s = t.memoizedProps.value;
                (be(Ao, l._currentValue), (l._currentValue = s));
                break;
            case 13:
                if (((l = t.memoizedState), l !== null))
                    return l.dehydrated !== null
                        ? (be(Ce, Ce.current & 1), (t.flags |= 128), null)
                        : (r & t.child.childLanes) !== 0
                          ? _c(e, t, r)
                          : (be(Ce, Ce.current & 1),
                            (e = $t(e, t, r)),
                            e !== null ? e.sibling : null);
                be(Ce, Ce.current & 1);
                break;
            case 19:
                if (((l = (r & t.childLanes) !== 0), (e.flags & 128) !== 0)) {
                    if (l) return xc(e, t, r);
                    t.flags |= 128;
                }
                if (
                    ((s = t.memoizedState),
                    s !== null && ((s.rendering = null), (s.tail = null), (s.lastEffect = null)),
                    be(Ce, Ce.current),
                    l)
                )
                    break;
                return null;
            case 22:
            case 23:
                return ((t.lanes = 0), mc(e, t, r));
        }
        return $t(e, t, r);
    }
    var Sc, rs, Bc, Ec;
    ((Sc = function (e, t) {
        for (var r = t.child; r !== null; ) {
            if (r.tag === 5 || r.tag === 6) e.appendChild(r.stateNode);
            else if (r.tag !== 4 && r.child !== null) {
                ((r.child.return = r), (r = r.child));
                continue;
            }
            if (r === t) break;
            for (; r.sibling === null; ) {
                if (r.return === null || r.return === t) return;
                r = r.return;
            }
            ((r.sibling.return = r.return), (r = r.sibling));
        }
    }),
        (rs = function () {}),
        (Bc = function (e, t, r, l) {
            var s = e.memoizedProps;
            if (s !== l) {
                ((e = t.stateNode), zr(Ot.current));
                var u = null;
                switch (r) {
                    case "input":
                        ((s = Pi(e, s)), (l = Pi(e, l)), (u = []));
                        break;
                    case "select":
                        ((s = L({}, s, { value: void 0 })),
                            (l = L({}, l, { value: void 0 })),
                            (u = []));
                        break;
                    case "textarea":
                        ((s = ji(e, s)), (l = ji(e, l)), (u = []));
                        break;
                    default:
                        typeof s.onClick != "function" &&
                            typeof l.onClick == "function" &&
                            (e.onclick = Po);
                }
                Di(r, l);
                var d;
                r = null;
                for (z in s)
                    if (!l.hasOwnProperty(z) && s.hasOwnProperty(z) && s[z] != null)
                        if (z === "style") {
                            var g = s[z];
                            for (d in g) g.hasOwnProperty(d) && (r || (r = {}), (r[d] = ""));
                        } else
                            z !== "dangerouslySetInnerHTML" &&
                                z !== "children" &&
                                z !== "suppressContentEditableWarning" &&
                                z !== "suppressHydrationWarning" &&
                                z !== "autoFocus" &&
                                (c.hasOwnProperty(z) ? u || (u = []) : (u = u || []).push(z, null));
                for (z in l) {
                    var w = l[z];
                    if (
                        ((g = s != null ? s[z] : void 0),
                        l.hasOwnProperty(z) && w !== g && (w != null || g != null))
                    )
                        if (z === "style")
                            if (g) {
                                for (d in g)
                                    !g.hasOwnProperty(d) ||
                                        (w && w.hasOwnProperty(d)) ||
                                        (r || (r = {}), (r[d] = ""));
                                for (d in w)
                                    w.hasOwnProperty(d) &&
                                        g[d] !== w[d] &&
                                        (r || (r = {}), (r[d] = w[d]));
                            } else (r || (u || (u = []), u.push(z, r)), (r = w));
                        else
                            z === "dangerouslySetInnerHTML"
                                ? ((w = w ? w.__html : void 0),
                                  (g = g ? g.__html : void 0),
                                  w != null && g !== w && (u = u || []).push(z, w))
                                : z === "children"
                                  ? (typeof w != "string" && typeof w != "number") ||
                                    (u = u || []).push(z, "" + w)
                                  : z !== "suppressContentEditableWarning" &&
                                    z !== "suppressHydrationWarning" &&
                                    (c.hasOwnProperty(z)
                                        ? (w != null && z === "onScroll" && ke("scroll", e),
                                          u || g === w || (u = []))
                                        : (u = u || []).push(z, w));
                }
                r && (u = u || []).push("style", r);
                var z = u;
                (t.updateQueue = z) && (t.flags |= 4);
            }
        }),
        (Ec = function (e, t, r, l) {
            r !== l && (t.flags |= 4);
        }));
    function Kn(e, t) {
        if (!Be)
            switch (e.tailMode) {
                case "hidden":
                    t = e.tail;
                    for (var r = null; t !== null; )
                        (t.alternate !== null && (r = t), (t = t.sibling));
                    r === null ? (e.tail = null) : (r.sibling = null);
                    break;
                case "collapsed":
                    r = e.tail;
                    for (var l = null; r !== null; )
                        (r.alternate !== null && (l = r), (r = r.sibling));
                    l === null
                        ? t || e.tail === null
                            ? (e.tail = null)
                            : (e.tail.sibling = null)
                        : (l.sibling = null);
            }
    }
    function et(e) {
        var t = e.alternate !== null && e.alternate.child === e.child,
            r = 0,
            l = 0;
        if (t)
            for (var s = e.child; s !== null; )
                ((r |= s.lanes | s.childLanes),
                    (l |= s.subtreeFlags & 14680064),
                    (l |= s.flags & 14680064),
                    (s.return = e),
                    (s = s.sibling));
        else
            for (s = e.child; s !== null; )
                ((r |= s.lanes | s.childLanes),
                    (l |= s.subtreeFlags),
                    (l |= s.flags),
                    (s.return = e),
                    (s = s.sibling));
        return ((e.subtreeFlags |= l), (e.childLanes = r), t);
    }
    function _p(e, t, r) {
        var l = t.pendingProps;
        switch ((Sl(t), t.tag)) {
            case 2:
            case 16:
            case 15:
            case 0:
            case 11:
            case 7:
            case 8:
            case 12:
            case 9:
            case 14:
                return (et(t), null);
            case 1:
                return (st(t.type) && Ro(), et(t), null);
            case 3:
                return (
                    (l = t.stateNode),
                    rn(),
                    xe(lt),
                    xe(Je),
                    Ol(),
                    l.pendingContext && ((l.context = l.pendingContext), (l.pendingContext = null)),
                    (e === null || e.child === null) &&
                        (Lo(t)
                            ? (t.flags |= 4)
                            : e === null ||
                              (e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
                              ((t.flags |= 1024), Tt !== null && (hs(Tt), (Tt = null)))),
                    rs(e, t),
                    et(t),
                    null
                );
            case 5:
                Il(t);
                var s = zr(qn.current);
                if (((r = t.type), e !== null && t.stateNode != null))
                    (Bc(e, t, r, l, s),
                        e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
                else {
                    if (!l) {
                        if (t.stateNode === null) throw Error(o(166));
                        return (et(t), null);
                    }
                    if (((e = zr(Ot.current)), Lo(t))) {
                        ((l = t.stateNode), (r = t.type));
                        var u = t.memoizedProps;
                        switch (((l[Dt] = t), (l[Dn] = u), (e = (t.mode & 1) !== 0), r)) {
                            case "dialog":
                                (ke("cancel", l), ke("close", l));
                                break;
                            case "iframe":
                            case "object":
                            case "embed":
                                ke("load", l);
                                break;
                            case "video":
                            case "audio":
                                for (s = 0; s < Rn.length; s++) ke(Rn[s], l);
                                break;
                            case "source":
                                ke("error", l);
                                break;
                            case "img":
                            case "image":
                            case "link":
                                (ke("error", l), ke("load", l));
                                break;
                            case "details":
                                ke("toggle", l);
                                break;
                            case "input":
                                (la(l, u), ke("invalid", l));
                                break;
                            case "select":
                                ((l._wrapperState = { wasMultiple: !!u.multiple }),
                                    ke("invalid", l));
                                break;
                            case "textarea":
                                (ua(l, u), ke("invalid", l));
                        }
                        (Di(r, u), (s = null));
                        for (var d in u)
                            if (u.hasOwnProperty(d)) {
                                var g = u[d];
                                d === "children"
                                    ? typeof g == "string"
                                        ? l.textContent !== g &&
                                          (u.suppressHydrationWarning !== !0 &&
                                              No(l.textContent, g, e),
                                          (s = ["children", g]))
                                        : typeof g == "number" &&
                                          l.textContent !== "" + g &&
                                          (u.suppressHydrationWarning !== !0 &&
                                              No(l.textContent, g, e),
                                          (s = ["children", "" + g]))
                                    : c.hasOwnProperty(d) &&
                                      g != null &&
                                      d === "onScroll" &&
                                      ke("scroll", l);
                            }
                        switch (r) {
                            case "input":
                                (lo(l), aa(l, u, !0));
                                break;
                            case "textarea":
                                (lo(l), fa(l));
                                break;
                            case "select":
                            case "option":
                                break;
                            default:
                                typeof u.onClick == "function" && (l.onclick = Po);
                        }
                        ((l = s), (t.updateQueue = l), l !== null && (t.flags |= 4));
                    } else {
                        ((d = s.nodeType === 9 ? s : s.ownerDocument),
                            e === "http://www.w3.org/1999/xhtml" && (e = da(r)),
                            e === "http://www.w3.org/1999/xhtml"
                                ? r === "script"
                                    ? ((e = d.createElement("div")),
                                      (e.innerHTML = "<script><\/script>"),
                                      (e = e.removeChild(e.firstChild)))
                                    : typeof l.is == "string"
                                      ? (e = d.createElement(r, { is: l.is }))
                                      : ((e = d.createElement(r)),
                                        r === "select" &&
                                            ((d = e),
                                            l.multiple
                                                ? (d.multiple = !0)
                                                : l.size && (d.size = l.size)))
                                : (e = d.createElementNS(e, r)),
                            (e[Dt] = t),
                            (e[Dn] = l),
                            Sc(e, t, !1, !1),
                            (t.stateNode = e));
                        e: {
                            switch (((d = Oi(r, l)), r)) {
                                case "dialog":
                                    (ke("cancel", e), ke("close", e), (s = l));
                                    break;
                                case "iframe":
                                case "object":
                                case "embed":
                                    (ke("load", e), (s = l));
                                    break;
                                case "video":
                                case "audio":
                                    for (s = 0; s < Rn.length; s++) ke(Rn[s], e);
                                    s = l;
                                    break;
                                case "source":
                                    (ke("error", e), (s = l));
                                    break;
                                case "img":
                                case "image":
                                case "link":
                                    (ke("error", e), ke("load", e), (s = l));
                                    break;
                                case "details":
                                    (ke("toggle", e), (s = l));
                                    break;
                                case "input":
                                    (la(e, l), (s = Pi(e, l)), ke("invalid", e));
                                    break;
                                case "option":
                                    s = l;
                                    break;
                                case "select":
                                    ((e._wrapperState = { wasMultiple: !!l.multiple }),
                                        (s = L({}, l, { value: void 0 })),
                                        ke("invalid", e));
                                    break;
                                case "textarea":
                                    (ua(e, l), (s = ji(e, l)), ke("invalid", e));
                                    break;
                                default:
                                    s = l;
                            }
                            (Di(r, s), (g = s));
                            for (u in g)
                                if (g.hasOwnProperty(u)) {
                                    var w = g[u];
                                    u === "style"
                                        ? va(e, w)
                                        : u === "dangerouslySetInnerHTML"
                                          ? ((w = w ? w.__html : void 0), w != null && ha(e, w))
                                          : u === "children"
                                            ? typeof w == "string"
                                                ? (r !== "textarea" || w !== "") && pn(e, w)
                                                : typeof w == "number" && pn(e, "" + w)
                                            : u !== "suppressContentEditableWarning" &&
                                              u !== "suppressHydrationWarning" &&
                                              u !== "autoFocus" &&
                                              (c.hasOwnProperty(u)
                                                  ? w != null && u === "onScroll" && ke("scroll", e)
                                                  : w != null && D(e, u, w, d));
                                }
                            switch (r) {
                                case "input":
                                    (lo(e), aa(e, l, !1));
                                    break;
                                case "textarea":
                                    (lo(e), fa(e));
                                    break;
                                case "option":
                                    l.value != null && e.setAttribute("value", "" + me(l.value));
                                    break;
                                case "select":
                                    ((e.multiple = !!l.multiple),
                                        (u = l.value),
                                        u != null
                                            ? Or(e, !!l.multiple, u, !1)
                                            : l.defaultValue != null &&
                                              Or(e, !!l.multiple, l.defaultValue, !0));
                                    break;
                                default:
                                    typeof s.onClick == "function" && (e.onclick = Po);
                            }
                            switch (r) {
                                case "button":
                                case "input":
                                case "select":
                                case "textarea":
                                    l = !!l.autoFocus;
                                    break e;
                                case "img":
                                    l = !0;
                                    break e;
                                default:
                                    l = !1;
                            }
                        }
                        l && (t.flags |= 4);
                    }
                    t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152));
                }
                return (et(t), null);
            case 6:
                if (e && t.stateNode != null) Ec(e, t, e.memoizedProps, l);
                else {
                    if (typeof l != "string" && t.stateNode === null) throw Error(o(166));
                    if (((r = zr(qn.current)), zr(Ot.current), Lo(t))) {
                        if (
                            ((l = t.stateNode),
                            (r = t.memoizedProps),
                            (l[Dt] = t),
                            (u = l.nodeValue !== r) && ((e = pt), e !== null))
                        )
                            switch (e.tag) {
                                case 3:
                                    No(l.nodeValue, r, (e.mode & 1) !== 0);
                                    break;
                                case 5:
                                    e.memoizedProps.suppressHydrationWarning !== !0 &&
                                        No(l.nodeValue, r, (e.mode & 1) !== 0);
                            }
                        u && (t.flags |= 4);
                    } else
                        ((l = (r.nodeType === 9 ? r : r.ownerDocument).createTextNode(l)),
                            (l[Dt] = t),
                            (t.stateNode = l));
                }
                return (et(t), null);
            case 13:
                if (
                    (xe(Ce),
                    (l = t.memoizedState),
                    e === null || (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
                ) {
                    if (Be && vt !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0)
                        (zu(), Jr(), (t.flags |= 98560), (u = !1));
                    else if (((u = Lo(t)), l !== null && l.dehydrated !== null)) {
                        if (e === null) {
                            if (!u) throw Error(o(318));
                            if (((u = t.memoizedState), (u = u !== null ? u.dehydrated : null), !u))
                                throw Error(o(317));
                            u[Dt] = t;
                        } else
                            (Jr(),
                                (t.flags & 128) === 0 && (t.memoizedState = null),
                                (t.flags |= 4));
                        (et(t), (u = !1));
                    } else (Tt !== null && (hs(Tt), (Tt = null)), (u = !0));
                    if (!u) return t.flags & 65536 ? t : null;
                }
                return (t.flags & 128) !== 0
                    ? ((t.lanes = r), t)
                    : ((l = l !== null),
                      l !== (e !== null && e.memoizedState !== null) &&
                          l &&
                          ((t.child.flags |= 8192),
                          (t.mode & 1) !== 0 &&
                              (e === null || (Ce.current & 1) !== 0 ? We === 0 && (We = 3) : ms())),
                      t.updateQueue !== null && (t.flags |= 4),
                      et(t),
                      null);
            case 4:
                return (rn(), rs(e, t), e === null && jn(t.stateNode.containerInfo), et(t), null);
            case 10:
                return (Nl(t.type._context), et(t), null);
            case 17:
                return (st(t.type) && Ro(), et(t), null);
            case 19:
                if ((xe(Ce), (u = t.memoizedState), u === null)) return (et(t), null);
                if (((l = (t.flags & 128) !== 0), (d = u.rendering), d === null))
                    if (l) Kn(u, !1);
                    else {
                        if (We !== 0 || (e !== null && (e.flags & 128) !== 0))
                            for (e = t.child; e !== null; ) {
                                if (((d = Uo(e)), d !== null)) {
                                    for (
                                        t.flags |= 128,
                                            Kn(u, !1),
                                            l = d.updateQueue,
                                            l !== null && ((t.updateQueue = l), (t.flags |= 4)),
                                            t.subtreeFlags = 0,
                                            l = r,
                                            r = t.child;
                                        r !== null;
                                    )
                                        ((u = r),
                                            (e = l),
                                            (u.flags &= 14680066),
                                            (d = u.alternate),
                                            d === null
                                                ? ((u.childLanes = 0),
                                                  (u.lanes = e),
                                                  (u.child = null),
                                                  (u.subtreeFlags = 0),
                                                  (u.memoizedProps = null),
                                                  (u.memoizedState = null),
                                                  (u.updateQueue = null),
                                                  (u.dependencies = null),
                                                  (u.stateNode = null))
                                                : ((u.childLanes = d.childLanes),
                                                  (u.lanes = d.lanes),
                                                  (u.child = d.child),
                                                  (u.subtreeFlags = 0),
                                                  (u.deletions = null),
                                                  (u.memoizedProps = d.memoizedProps),
                                                  (u.memoizedState = d.memoizedState),
                                                  (u.updateQueue = d.updateQueue),
                                                  (u.type = d.type),
                                                  (e = d.dependencies),
                                                  (u.dependencies =
                                                      e === null
                                                          ? null
                                                          : {
                                                                lanes: e.lanes,
                                                                firstContext: e.firstContext,
                                                            })),
                                            (r = r.sibling));
                                    return (be(Ce, (Ce.current & 1) | 2), t.child);
                                }
                                e = e.sibling;
                            }
                        u.tail !== null &&
                            je() > sn &&
                            ((t.flags |= 128), (l = !0), Kn(u, !1), (t.lanes = 4194304));
                    }
                else {
                    if (!l)
                        if (((e = Uo(d)), e !== null)) {
                            if (
                                ((t.flags |= 128),
                                (l = !0),
                                (r = e.updateQueue),
                                r !== null && ((t.updateQueue = r), (t.flags |= 4)),
                                Kn(u, !0),
                                u.tail === null && u.tailMode === "hidden" && !d.alternate && !Be)
                            )
                                return (et(t), null);
                        } else
                            2 * je() - u.renderingStartTime > sn &&
                                r !== 1073741824 &&
                                ((t.flags |= 128), (l = !0), Kn(u, !1), (t.lanes = 4194304));
                    u.isBackwards
                        ? ((d.sibling = t.child), (t.child = d))
                        : ((r = u.last),
                          r !== null ? (r.sibling = d) : (t.child = d),
                          (u.last = d));
                }
                return u.tail !== null
                    ? ((t = u.tail),
                      (u.rendering = t),
                      (u.tail = t.sibling),
                      (u.renderingStartTime = je()),
                      (t.sibling = null),
                      (r = Ce.current),
                      be(Ce, l ? (r & 1) | 2 : r & 1),
                      t)
                    : (et(t), null);
            case 22:
            case 23:
                return (
                    vs(),
                    (l = t.memoizedState !== null),
                    e !== null && (e.memoizedState !== null) !== l && (t.flags |= 8192),
                    l && (t.mode & 1) !== 0
                        ? (mt & 1073741824) !== 0 &&
                          (et(t), t.subtreeFlags & 6 && (t.flags |= 8192))
                        : et(t),
                    null
                );
            case 24:
                return null;
            case 25:
                return null;
        }
        throw Error(o(156, t.tag));
    }
    function kp(e, t) {
        switch ((Sl(t), t.tag)) {
            case 1:
                return (
                    st(t.type) && Ro(),
                    (e = t.flags),
                    e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
                );
            case 3:
                return (
                    rn(),
                    xe(lt),
                    xe(Je),
                    Ol(),
                    (e = t.flags),
                    (e & 65536) !== 0 && (e & 128) === 0
                        ? ((t.flags = (e & -65537) | 128), t)
                        : null
                );
            case 5:
                return (Il(t), null);
            case 13:
                if ((xe(Ce), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
                    if (t.alternate === null) throw Error(o(340));
                    Jr();
                }
                return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null);
            case 19:
                return (xe(Ce), null);
            case 4:
                return (rn(), null);
            case 10:
                return (Nl(t.type._context), null);
            case 22:
            case 23:
                return (vs(), null);
            case 24:
                return null;
            default:
                return null;
        }
    }
    var Zo = !1,
        tt = !1,
        xp = typeof WeakSet == "function" ? WeakSet : Set,
        X = null;
    function on(e, t) {
        var r = e.ref;
        if (r !== null)
            if (typeof r == "function")
                try {
                    r(null);
                } catch (l) {
                    Ne(e, t, l);
                }
            else r.current = null;
    }
    function ns(e, t, r) {
        try {
            r();
        } catch (l) {
            Ne(e, t, l);
        }
    }
    var Tc = !1;
    function Sp(e, t) {
        if (((vl = wo), (e = iu()), sl(e))) {
            if ("selectionStart" in e) var r = { start: e.selectionStart, end: e.selectionEnd };
            else
                e: {
                    r = ((r = e.ownerDocument) && r.defaultView) || window;
                    var l = r.getSelection && r.getSelection();
                    if (l && l.rangeCount !== 0) {
                        r = l.anchorNode;
                        var s = l.anchorOffset,
                            u = l.focusNode;
                        l = l.focusOffset;
                        try {
                            (r.nodeType, u.nodeType);
                        } catch {
                            r = null;
                            break e;
                        }
                        var d = 0,
                            g = -1,
                            w = -1,
                            z = 0,
                            j = 0,
                            I = e,
                            R = null;
                        t: for (;;) {
                            for (
                                var $;
                                I !== r || (s !== 0 && I.nodeType !== 3) || (g = d + s),
                                    I !== u || (l !== 0 && I.nodeType !== 3) || (w = d + l),
                                    I.nodeType === 3 && (d += I.nodeValue.length),
                                    ($ = I.firstChild) !== null;
                            )
                                ((R = I), (I = $));
                            for (;;) {
                                if (I === e) break t;
                                if (
                                    (R === r && ++z === s && (g = d),
                                    R === u && ++j === l && (w = d),
                                    ($ = I.nextSibling) !== null)
                                )
                                    break;
                                ((I = R), (R = I.parentNode));
                            }
                            I = $;
                        }
                        r = g === -1 || w === -1 ? null : { start: g, end: w };
                    } else r = null;
                }
            r = r || { start: 0, end: 0 };
        } else r = null;
        for (ml = { focusedElem: e, selectionRange: r }, wo = !1, X = t; X !== null; )
            if (((t = X), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null))
                ((e.return = t), (X = e));
            else
                for (; X !== null; ) {
                    t = X;
                    try {
                        var J = t.alternate;
                        if ((t.flags & 1024) !== 0)
                            switch (t.tag) {
                                case 0:
                                case 11:
                                case 15:
                                    break;
                                case 1:
                                    if (J !== null) {
                                        var Z = J.memoizedProps,
                                            Ie = J.memoizedState,
                                            B = t.stateNode,
                                            _ = B.getSnapshotBeforeUpdate(
                                                t.elementType === t.type ? Z : Ct(t.type, Z),
                                                Ie
                                            );
                                        B.__reactInternalSnapshotBeforeUpdate = _;
                                    }
                                    break;
                                case 3:
                                    var T = t.stateNode.containerInfo;
                                    T.nodeType === 1
                                        ? (T.textContent = "")
                                        : T.nodeType === 9 &&
                                          T.documentElement &&
                                          T.removeChild(T.documentElement);
                                    break;
                                case 5:
                                case 6:
                                case 4:
                                case 17:
                                    break;
                                default:
                                    throw Error(o(163));
                            }
                    } catch (O) {
                        Ne(t, t.return, O);
                    }
                    if (((e = t.sibling), e !== null)) {
                        ((e.return = t.return), (X = e));
                        break;
                    }
                    X = t.return;
                }
        return ((J = Tc), (Tc = !1), J);
    }
    function $n(e, t, r) {
        var l = t.updateQueue;
        if (((l = l !== null ? l.lastEffect : null), l !== null)) {
            var s = (l = l.next);
            do {
                if ((s.tag & e) === e) {
                    var u = s.destroy;
                    ((s.destroy = void 0), u !== void 0 && ns(t, r, u));
                }
                s = s.next;
            } while (s !== l);
        }
    }
    function ei(e, t) {
        if (((t = t.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)) {
            var r = (t = t.next);
            do {
                if ((r.tag & e) === e) {
                    var l = r.create;
                    r.destroy = l();
                }
                r = r.next;
            } while (r !== t);
        }
    }
    function os(e) {
        var t = e.ref;
        if (t !== null) {
            var r = e.stateNode;
            switch (e.tag) {
                case 5:
                    e = r;
                    break;
                default:
                    e = r;
            }
            typeof t == "function" ? t(e) : (t.current = e);
        }
    }
    function Cc(e) {
        var t = e.alternate;
        (t !== null && ((e.alternate = null), Cc(t)),
            (e.child = null),
            (e.deletions = null),
            (e.sibling = null),
            e.tag === 5 &&
                ((t = e.stateNode),
                t !== null &&
                    (delete t[Dt], delete t[Dn], delete t[bl], delete t[lp], delete t[sp])),
            (e.stateNode = null),
            (e.return = null),
            (e.dependencies = null),
            (e.memoizedProps = null),
            (e.memoizedState = null),
            (e.pendingProps = null),
            (e.stateNode = null),
            (e.updateQueue = null));
    }
    function zc(e) {
        return e.tag === 5 || e.tag === 3 || e.tag === 4;
    }
    function Nc(e) {
        e: for (;;) {
            for (; e.sibling === null; ) {
                if (e.return === null || zc(e.return)) return null;
                e = e.return;
            }
            for (
                e.sibling.return = e.return, e = e.sibling;
                e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
            ) {
                if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
                ((e.child.return = e), (e = e.child));
            }
            if (!(e.flags & 2)) return e.stateNode;
        }
    }
    function is(e, t, r) {
        var l = e.tag;
        if (l === 5 || l === 6)
            ((e = e.stateNode),
                t
                    ? r.nodeType === 8
                        ? r.parentNode.insertBefore(e, t)
                        : r.insertBefore(e, t)
                    : (r.nodeType === 8
                          ? ((t = r.parentNode), t.insertBefore(e, r))
                          : ((t = r), t.appendChild(e)),
                      (r = r._reactRootContainer),
                      r != null || t.onclick !== null || (t.onclick = Po)));
        else if (l !== 4 && ((e = e.child), e !== null))
            for (is(e, t, r), e = e.sibling; e !== null; ) (is(e, t, r), (e = e.sibling));
    }
    function ls(e, t, r) {
        var l = e.tag;
        if (l === 5 || l === 6) ((e = e.stateNode), t ? r.insertBefore(e, t) : r.appendChild(e));
        else if (l !== 4 && ((e = e.child), e !== null))
            for (ls(e, t, r), e = e.sibling; e !== null; ) (ls(e, t, r), (e = e.sibling));
    }
    var Ge = null,
        zt = !1;
    function cr(e, t, r) {
        for (r = r.child; r !== null; ) (Pc(e, t, r), (r = r.sibling));
    }
    function Pc(e, t, r) {
        if (It && typeof It.onCommitFiberUnmount == "function")
            try {
                It.onCommitFiberUnmount(ho, r);
            } catch {}
        switch (r.tag) {
            case 5:
                tt || on(r, t);
            case 6:
                var l = Ge,
                    s = zt;
                ((Ge = null),
                    cr(e, t, r),
                    (Ge = l),
                    (zt = s),
                    Ge !== null &&
                        (zt
                            ? ((e = Ge),
                              (r = r.stateNode),
                              e.nodeType === 8 ? e.parentNode.removeChild(r) : e.removeChild(r))
                            : Ge.removeChild(r.stateNode)));
                break;
            case 18:
                Ge !== null &&
                    (zt
                        ? ((e = Ge),
                          (r = r.stateNode),
                          e.nodeType === 8 ? wl(e.parentNode, r) : e.nodeType === 1 && wl(e, r),
                          Bn(e))
                        : wl(Ge, r.stateNode));
                break;
            case 4:
                ((l = Ge),
                    (s = zt),
                    (Ge = r.stateNode.containerInfo),
                    (zt = !0),
                    cr(e, t, r),
                    (Ge = l),
                    (zt = s));
                break;
            case 0:
            case 11:
            case 14:
            case 15:
                if (!tt && ((l = r.updateQueue), l !== null && ((l = l.lastEffect), l !== null))) {
                    s = l = l.next;
                    do {
                        var u = s,
                            d = u.destroy;
                        ((u = u.tag),
                            d !== void 0 && ((u & 2) !== 0 || (u & 4) !== 0) && ns(r, t, d),
                            (s = s.next));
                    } while (s !== l);
                }
                cr(e, t, r);
                break;
            case 1:
                if (
                    !tt &&
                    (on(r, t), (l = r.stateNode), typeof l.componentWillUnmount == "function")
                )
                    try {
                        ((l.props = r.memoizedProps),
                            (l.state = r.memoizedState),
                            l.componentWillUnmount());
                    } catch (g) {
                        Ne(r, t, g);
                    }
                cr(e, t, r);
                break;
            case 21:
                cr(e, t, r);
                break;
            case 22:
                r.mode & 1
                    ? ((tt = (l = tt) || r.memoizedState !== null), cr(e, t, r), (tt = l))
                    : cr(e, t, r);
                break;
            default:
                cr(e, t, r);
        }
    }
    function Fc(e) {
        var t = e.updateQueue;
        if (t !== null) {
            e.updateQueue = null;
            var r = e.stateNode;
            (r === null && (r = e.stateNode = new xp()),
                t.forEach(function (l) {
                    var s = Rp.bind(null, e, l);
                    r.has(l) || (r.add(l), l.then(s, s));
                }));
        }
    }
    function Nt(e, t) {
        var r = t.deletions;
        if (r !== null)
            for (var l = 0; l < r.length; l++) {
                var s = r[l];
                try {
                    var u = e,
                        d = t,
                        g = d;
                    e: for (; g !== null; ) {
                        switch (g.tag) {
                            case 5:
                                ((Ge = g.stateNode), (zt = !1));
                                break e;
                            case 3:
                                ((Ge = g.stateNode.containerInfo), (zt = !0));
                                break e;
                            case 4:
                                ((Ge = g.stateNode.containerInfo), (zt = !0));
                                break e;
                        }
                        g = g.return;
                    }
                    if (Ge === null) throw Error(o(160));
                    (Pc(u, d, s), (Ge = null), (zt = !1));
                    var w = s.alternate;
                    (w !== null && (w.return = null), (s.return = null));
                } catch (z) {
                    Ne(s, t, z);
                }
            }
        if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) (Rc(t, e), (t = t.sibling));
    }
    function Rc(e, t) {
        var r = e.alternate,
            l = e.flags;
        switch (e.tag) {
            case 0:
            case 11:
            case 14:
            case 15:
                if ((Nt(t, e), Mt(e), l & 4)) {
                    try {
                        ($n(3, e, e.return), ei(3, e));
                    } catch (Z) {
                        Ne(e, e.return, Z);
                    }
                    try {
                        $n(5, e, e.return);
                    } catch (Z) {
                        Ne(e, e.return, Z);
                    }
                }
                break;
            case 1:
                (Nt(t, e), Mt(e), l & 512 && r !== null && on(r, r.return));
                break;
            case 5:
                if ((Nt(t, e), Mt(e), l & 512 && r !== null && on(r, r.return), e.flags & 32)) {
                    var s = e.stateNode;
                    try {
                        pn(s, "");
                    } catch (Z) {
                        Ne(e, e.return, Z);
                    }
                }
                if (l & 4 && ((s = e.stateNode), s != null)) {
                    var u = e.memoizedProps,
                        d = r !== null ? r.memoizedProps : u,
                        g = e.type,
                        w = e.updateQueue;
                    if (((e.updateQueue = null), w !== null))
                        try {
                            (g === "input" && u.type === "radio" && u.name != null && sa(s, u),
                                Oi(g, d));
                            var z = Oi(g, u);
                            for (d = 0; d < w.length; d += 2) {
                                var j = w[d],
                                    I = w[d + 1];
                                j === "style"
                                    ? va(s, I)
                                    : j === "dangerouslySetInnerHTML"
                                      ? ha(s, I)
                                      : j === "children"
                                        ? pn(s, I)
                                        : D(s, j, I, z);
                            }
                            switch (g) {
                                case "input":
                                    Fi(s, u);
                                    break;
                                case "textarea":
                                    ca(s, u);
                                    break;
                                case "select":
                                    var R = s._wrapperState.wasMultiple;
                                    s._wrapperState.wasMultiple = !!u.multiple;
                                    var $ = u.value;
                                    $ != null
                                        ? Or(s, !!u.multiple, $, !1)
                                        : R !== !!u.multiple &&
                                          (u.defaultValue != null
                                              ? Or(s, !!u.multiple, u.defaultValue, !0)
                                              : Or(s, !!u.multiple, u.multiple ? [] : "", !1));
                            }
                            s[Dn] = u;
                        } catch (Z) {
                            Ne(e, e.return, Z);
                        }
                }
                break;
            case 6:
                if ((Nt(t, e), Mt(e), l & 4)) {
                    if (e.stateNode === null) throw Error(o(162));
                    ((s = e.stateNode), (u = e.memoizedProps));
                    try {
                        s.nodeValue = u;
                    } catch (Z) {
                        Ne(e, e.return, Z);
                    }
                }
                break;
            case 3:
                if ((Nt(t, e), Mt(e), l & 4 && r !== null && r.memoizedState.isDehydrated))
                    try {
                        Bn(t.containerInfo);
                    } catch (Z) {
                        Ne(e, e.return, Z);
                    }
                break;
            case 4:
                (Nt(t, e), Mt(e));
                break;
            case 13:
                (Nt(t, e),
                    Mt(e),
                    (s = e.child),
                    s.flags & 8192 &&
                        ((u = s.memoizedState !== null),
                        (s.stateNode.isHidden = u),
                        !u ||
                            (s.alternate !== null && s.alternate.memoizedState !== null) ||
                            (us = je())),
                    l & 4 && Fc(e));
                break;
            case 22:
                if (
                    ((j = r !== null && r.memoizedState !== null),
                    e.mode & 1 ? ((tt = (z = tt) || j), Nt(t, e), (tt = z)) : Nt(t, e),
                    Mt(e),
                    l & 8192)
                ) {
                    if (
                        ((z = e.memoizedState !== null),
                        (e.stateNode.isHidden = z) && !j && (e.mode & 1) !== 0)
                    )
                        for (X = e, j = e.child; j !== null; ) {
                            for (I = X = j; X !== null; ) {
                                switch (((R = X), ($ = R.child), R.tag)) {
                                    case 0:
                                    case 11:
                                    case 14:
                                    case 15:
                                        $n(4, R, R.return);
                                        break;
                                    case 1:
                                        on(R, R.return);
                                        var J = R.stateNode;
                                        if (typeof J.componentWillUnmount == "function") {
                                            ((l = R), (r = R.return));
                                            try {
                                                ((t = l),
                                                    (J.props = t.memoizedProps),
                                                    (J.state = t.memoizedState),
                                                    J.componentWillUnmount());
                                            } catch (Z) {
                                                Ne(l, r, Z);
                                            }
                                        }
                                        break;
                                    case 5:
                                        on(R, R.return);
                                        break;
                                    case 22:
                                        if (R.memoizedState !== null) {
                                            Dc(I);
                                            continue;
                                        }
                                }
                                $ !== null ? (($.return = R), (X = $)) : Dc(I);
                            }
                            j = j.sibling;
                        }
                    e: for (j = null, I = e; ; ) {
                        if (I.tag === 5) {
                            if (j === null) {
                                j = I;
                                try {
                                    ((s = I.stateNode),
                                        z
                                            ? ((u = s.style),
                                              typeof u.setProperty == "function"
                                                  ? u.setProperty("display", "none", "important")
                                                  : (u.display = "none"))
                                            : ((g = I.stateNode),
                                              (w = I.memoizedProps.style),
                                              (d =
                                                  w != null && w.hasOwnProperty("display")
                                                      ? w.display
                                                      : null),
                                              (g.style.display = pa("display", d))));
                                } catch (Z) {
                                    Ne(e, e.return, Z);
                                }
                            }
                        } else if (I.tag === 6) {
                            if (j === null)
                                try {
                                    I.stateNode.nodeValue = z ? "" : I.memoizedProps;
                                } catch (Z) {
                                    Ne(e, e.return, Z);
                                }
                        } else if (
                            ((I.tag !== 22 && I.tag !== 23) ||
                                I.memoizedState === null ||
                                I === e) &&
                            I.child !== null
                        ) {
                            ((I.child.return = I), (I = I.child));
                            continue;
                        }
                        if (I === e) break e;
                        for (; I.sibling === null; ) {
                            if (I.return === null || I.return === e) break e;
                            (j === I && (j = null), (I = I.return));
                        }
                        (j === I && (j = null), (I.sibling.return = I.return), (I = I.sibling));
                    }
                }
                break;
            case 19:
                (Nt(t, e), Mt(e), l & 4 && Fc(e));
                break;
            case 21:
                break;
            default:
                (Nt(t, e), Mt(e));
        }
    }
    function Mt(e) {
        var t = e.flags;
        if (t & 2) {
            try {
                e: {
                    for (var r = e.return; r !== null; ) {
                        if (zc(r)) {
                            var l = r;
                            break e;
                        }
                        r = r.return;
                    }
                    throw Error(o(160));
                }
                switch (l.tag) {
                    case 5:
                        var s = l.stateNode;
                        l.flags & 32 && (pn(s, ""), (l.flags &= -33));
                        var u = Nc(e);
                        ls(e, u, s);
                        break;
                    case 3:
                    case 4:
                        var d = l.stateNode.containerInfo,
                            g = Nc(e);
                        is(e, g, d);
                        break;
                    default:
                        throw Error(o(161));
                }
            } catch (w) {
                Ne(e, e.return, w);
            }
            e.flags &= -3;
        }
        t & 4096 && (e.flags &= -4097);
    }
    function Bp(e, t, r) {
        ((X = e), jc(e));
    }
    function jc(e, t, r) {
        for (var l = (e.mode & 1) !== 0; X !== null; ) {
            var s = X,
                u = s.child;
            if (s.tag === 22 && l) {
                var d = s.memoizedState !== null || Zo;
                if (!d) {
                    var g = s.alternate,
                        w = (g !== null && g.memoizedState !== null) || tt;
                    g = Zo;
                    var z = tt;
                    if (((Zo = d), (tt = w) && !z))
                        for (X = s; X !== null; )
                            ((d = X),
                                (w = d.child),
                                d.tag === 22 && d.memoizedState !== null
                                    ? Oc(s)
                                    : w !== null
                                      ? ((w.return = d), (X = w))
                                      : Oc(s));
                    for (; u !== null; ) ((X = u), jc(u), (u = u.sibling));
                    ((X = s), (Zo = g), (tt = z));
                }
                Ic(e);
            } else (s.subtreeFlags & 8772) !== 0 && u !== null ? ((u.return = s), (X = u)) : Ic(e);
        }
    }
    function Ic(e) {
        for (; X !== null; ) {
            var t = X;
            if ((t.flags & 8772) !== 0) {
                var r = t.alternate;
                try {
                    if ((t.flags & 8772) !== 0)
                        switch (t.tag) {
                            case 0:
                            case 11:
                            case 15:
                                tt || ei(5, t);
                                break;
                            case 1:
                                var l = t.stateNode;
                                if (t.flags & 4 && !tt)
                                    if (r === null) l.componentDidMount();
                                    else {
                                        var s =
                                            t.elementType === t.type
                                                ? r.memoizedProps
                                                : Ct(t.type, r.memoizedProps);
                                        l.componentDidUpdate(
                                            s,
                                            r.memoizedState,
                                            l.__reactInternalSnapshotBeforeUpdate
                                        );
                                    }
                                var u = t.updateQueue;
                                u !== null && Du(t, u, l);
                                break;
                            case 3:
                                var d = t.updateQueue;
                                if (d !== null) {
                                    if (((r = null), t.child !== null))
                                        switch (t.child.tag) {
                                            case 5:
                                                r = t.child.stateNode;
                                                break;
                                            case 1:
                                                r = t.child.stateNode;
                                        }
                                    Du(t, d, r);
                                }
                                break;
                            case 5:
                                var g = t.stateNode;
                                if (r === null && t.flags & 4) {
                                    r = g;
                                    var w = t.memoizedProps;
                                    switch (t.type) {
                                        case "button":
                                        case "input":
                                        case "select":
                                        case "textarea":
                                            w.autoFocus && r.focus();
                                            break;
                                        case "img":
                                            w.src && (r.src = w.src);
                                    }
                                }
                                break;
                            case 6:
                                break;
                            case 4:
                                break;
                            case 12:
                                break;
                            case 13:
                                if (t.memoizedState === null) {
                                    var z = t.alternate;
                                    if (z !== null) {
                                        var j = z.memoizedState;
                                        if (j !== null) {
                                            var I = j.dehydrated;
                                            I !== null && Bn(I);
                                        }
                                    }
                                }
                                break;
                            case 19:
                            case 17:
                            case 21:
                            case 22:
                            case 23:
                            case 25:
                                break;
                            default:
                                throw Error(o(163));
                        }
                    tt || (t.flags & 512 && os(t));
                } catch (R) {
                    Ne(t, t.return, R);
                }
            }
            if (t === e) {
                X = null;
                break;
            }
            if (((r = t.sibling), r !== null)) {
                ((r.return = t.return), (X = r));
                break;
            }
            X = t.return;
        }
    }
    function Dc(e) {
        for (; X !== null; ) {
            var t = X;
            if (t === e) {
                X = null;
                break;
            }
            var r = t.sibling;
            if (r !== null) {
                ((r.return = t.return), (X = r));
                break;
            }
            X = t.return;
        }
    }
    function Oc(e) {
        for (; X !== null; ) {
            var t = X;
            try {
                switch (t.tag) {
                    case 0:
                    case 11:
                    case 15:
                        var r = t.return;
                        try {
                            ei(4, t);
                        } catch (w) {
                            Ne(t, r, w);
                        }
                        break;
                    case 1:
                        var l = t.stateNode;
                        if (typeof l.componentDidMount == "function") {
                            var s = t.return;
                            try {
                                l.componentDidMount();
                            } catch (w) {
                                Ne(t, s, w);
                            }
                        }
                        var u = t.return;
                        try {
                            os(t);
                        } catch (w) {
                            Ne(t, u, w);
                        }
                        break;
                    case 5:
                        var d = t.return;
                        try {
                            os(t);
                        } catch (w) {
                            Ne(t, d, w);
                        }
                }
            } catch (w) {
                Ne(t, t.return, w);
            }
            if (t === e) {
                X = null;
                break;
            }
            var g = t.sibling;
            if (g !== null) {
                ((g.return = t.return), (X = g));
                break;
            }
            X = t.return;
        }
    }
    var Ep = Math.ceil,
        ti = Q.ReactCurrentDispatcher,
        ss = Q.ReactCurrentOwner,
        xt = Q.ReactCurrentBatchConfig,
        de = 0,
        Ke = null,
        Le = null,
        Xe = 0,
        mt = 0,
        ln = ir(0),
        We = 0,
        Qn = null,
        Pr = 0,
        ri = 0,
        as = 0,
        Gn = null,
        ut = null,
        us = 0,
        sn = 1 / 0,
        Qt = null,
        ni = !1,
        cs = null,
        fr = null,
        oi = !1,
        dr = null,
        ii = 0,
        Xn = 0,
        fs = null,
        li = -1,
        si = 0;
    function ot() {
        return (de & 6) !== 0 ? je() : li !== -1 ? li : (li = je());
    }
    function hr(e) {
        return (e.mode & 1) === 0
            ? 1
            : (de & 2) !== 0 && Xe !== 0
              ? Xe & -Xe
              : up.transition !== null
                ? (si === 0 && (si = Na()), si)
                : ((e = ge),
                  e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : Ma(e.type))),
                  e);
    }
    function Pt(e, t, r, l) {
        if (50 < Xn) throw ((Xn = 0), (fs = null), Error(o(185)));
        (bn(e, r, l),
            ((de & 2) === 0 || e !== Ke) &&
                (e === Ke && ((de & 2) === 0 && (ri |= r), We === 4 && pr(e, Xe)),
                ct(e, l),
                r === 1 && de === 0 && (t.mode & 1) === 0 && ((sn = je() + 500), Io && sr())));
    }
    function ct(e, t) {
        var r = e.callbackNode;
        uh(e, t);
        var l = mo(e, e === Ke ? Xe : 0);
        if (l === 0) (r !== null && Ta(r), (e.callbackNode = null), (e.callbackPriority = 0));
        else if (((t = l & -l), e.callbackPriority !== t)) {
            if ((r != null && Ta(r), t === 1))
                (e.tag === 0 ? ap(Mc.bind(null, e)) : Su(Mc.bind(null, e)),
                    op(function () {
                        (de & 6) === 0 && sr();
                    }),
                    (r = null));
            else {
                switch (Pa(l)) {
                    case 1:
                        r = Ui;
                        break;
                    case 4:
                        r = Ca;
                        break;
                    case 16:
                        r = fo;
                        break;
                    case 536870912:
                        r = za;
                        break;
                    default:
                        r = fo;
                }
                r = $c(r, Lc.bind(null, e));
            }
            ((e.callbackPriority = t), (e.callbackNode = r));
        }
    }
    function Lc(e, t) {
        if (((li = -1), (si = 0), (de & 6) !== 0)) throw Error(o(327));
        var r = e.callbackNode;
        if (an() && e.callbackNode !== r) return null;
        var l = mo(e, e === Ke ? Xe : 0);
        if (l === 0) return null;
        if ((l & 30) !== 0 || (l & e.expiredLanes) !== 0 || t) t = ai(e, l);
        else {
            t = l;
            var s = de;
            de |= 2;
            var u = qc();
            (Ke !== e || Xe !== t) && ((Qt = null), (sn = je() + 500), Rr(e, t));
            do
                try {
                    zp();
                    break;
                } catch (g) {
                    Ac(e, g);
                }
            while (!0);
            (zl(),
                (ti.current = u),
                (de = s),
                Le !== null ? (t = 0) : ((Ke = null), (Xe = 0), (t = We)));
        }
        if (t !== 0) {
            if ((t === 2 && ((s = Vi(e)), s !== 0 && ((l = s), (t = ds(e, s)))), t === 1))
                throw ((r = Qn), Rr(e, 0), pr(e, l), ct(e, je()), r);
            if (t === 6) pr(e, l);
            else {
                if (
                    ((s = e.current.alternate),
                    (l & 30) === 0 &&
                        !Tp(s) &&
                        ((t = ai(e, l)),
                        t === 2 && ((u = Vi(e)), u !== 0 && ((l = u), (t = ds(e, u)))),
                        t === 1))
                )
                    throw ((r = Qn), Rr(e, 0), pr(e, l), ct(e, je()), r);
                switch (((e.finishedWork = s), (e.finishedLanes = l), t)) {
                    case 0:
                    case 1:
                        throw Error(o(345));
                    case 2:
                        jr(e, ut, Qt);
                        break;
                    case 3:
                        if ((pr(e, l), (l & 130023424) === l && ((t = us + 500 - je()), 10 < t))) {
                            if (mo(e, 0) !== 0) break;
                            if (((s = e.suspendedLanes), (s & l) !== l)) {
                                (ot(), (e.pingedLanes |= e.suspendedLanes & s));
                                break;
                            }
                            e.timeoutHandle = yl(jr.bind(null, e, ut, Qt), t);
                            break;
                        }
                        jr(e, ut, Qt);
                        break;
                    case 4:
                        if ((pr(e, l), (l & 4194240) === l)) break;
                        for (t = e.eventTimes, s = -1; 0 < l; ) {
                            var d = 31 - Bt(l);
                            ((u = 1 << d), (d = t[d]), d > s && (s = d), (l &= ~u));
                        }
                        if (
                            ((l = s),
                            (l = je() - l),
                            (l =
                                (120 > l
                                    ? 120
                                    : 480 > l
                                      ? 480
                                      : 1080 > l
                                        ? 1080
                                        : 1920 > l
                                          ? 1920
                                          : 3e3 > l
                                            ? 3e3
                                            : 4320 > l
                                              ? 4320
                                              : 1960 * Ep(l / 1960)) - l),
                            10 < l)
                        ) {
                            e.timeoutHandle = yl(jr.bind(null, e, ut, Qt), l);
                            break;
                        }
                        jr(e, ut, Qt);
                        break;
                    case 5:
                        jr(e, ut, Qt);
                        break;
                    default:
                        throw Error(o(329));
                }
            }
        }
        return (ct(e, je()), e.callbackNode === r ? Lc.bind(null, e) : null);
    }
    function ds(e, t) {
        var r = Gn;
        return (
            e.current.memoizedState.isDehydrated && (Rr(e, t).flags |= 256),
            (e = ai(e, t)),
            e !== 2 && ((t = ut), (ut = r), t !== null && hs(t)),
            e
        );
    }
    function hs(e) {
        ut === null ? (ut = e) : ut.push.apply(ut, e);
    }
    function Tp(e) {
        for (var t = e; ; ) {
            if (t.flags & 16384) {
                var r = t.updateQueue;
                if (r !== null && ((r = r.stores), r !== null))
                    for (var l = 0; l < r.length; l++) {
                        var s = r[l],
                            u = s.getSnapshot;
                        s = s.value;
                        try {
                            if (!Et(u(), s)) return !1;
                        } catch {
                            return !1;
                        }
                    }
            }
            if (((r = t.child), t.subtreeFlags & 16384 && r !== null)) ((r.return = t), (t = r));
            else {
                if (t === e) break;
                for (; t.sibling === null; ) {
                    if (t.return === null || t.return === e) return !0;
                    t = t.return;
                }
                ((t.sibling.return = t.return), (t = t.sibling));
            }
        }
        return !0;
    }
    function pr(e, t) {
        for (
            t &= ~as, t &= ~ri, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes;
            0 < t;
        ) {
            var r = 31 - Bt(t),
                l = 1 << r;
            ((e[r] = -1), (t &= ~l));
        }
    }
    function Mc(e) {
        if ((de & 6) !== 0) throw Error(o(327));
        an();
        var t = mo(e, 0);
        if ((t & 1) === 0) return (ct(e, je()), null);
        var r = ai(e, t);
        if (e.tag !== 0 && r === 2) {
            var l = Vi(e);
            l !== 0 && ((t = l), (r = ds(e, l)));
        }
        if (r === 1) throw ((r = Qn), Rr(e, 0), pr(e, t), ct(e, je()), r);
        if (r === 6) throw Error(o(345));
        return (
            (e.finishedWork = e.current.alternate),
            (e.finishedLanes = t),
            jr(e, ut, Qt),
            ct(e, je()),
            null
        );
    }
    function ps(e, t) {
        var r = de;
        de |= 1;
        try {
            return e(t);
        } finally {
            ((de = r), de === 0 && ((sn = je() + 500), Io && sr()));
        }
    }
    function Fr(e) {
        dr !== null && dr.tag === 0 && (de & 6) === 0 && an();
        var t = de;
        de |= 1;
        var r = xt.transition,
            l = ge;
        try {
            if (((xt.transition = null), (ge = 1), e)) return e();
        } finally {
            ((ge = l), (xt.transition = r), (de = t), (de & 6) === 0 && sr());
        }
    }
    function vs() {
        ((mt = ln.current), xe(ln));
    }
    function Rr(e, t) {
        ((e.finishedWork = null), (e.finishedLanes = 0));
        var r = e.timeoutHandle;
        if ((r !== -1 && ((e.timeoutHandle = -1), np(r)), Le !== null))
            for (r = Le.return; r !== null; ) {
                var l = r;
                switch ((Sl(l), l.tag)) {
                    case 1:
                        ((l = l.type.childContextTypes), l != null && Ro());
                        break;
                    case 3:
                        (rn(), xe(lt), xe(Je), Ol());
                        break;
                    case 5:
                        Il(l);
                        break;
                    case 4:
                        rn();
                        break;
                    case 13:
                        xe(Ce);
                        break;
                    case 19:
                        xe(Ce);
                        break;
                    case 10:
                        Nl(l.type._context);
                        break;
                    case 22:
                    case 23:
                        vs();
                }
                r = r.return;
            }
        if (
            ((Ke = e),
            (Le = e = vr(e.current, null)),
            (Xe = mt = t),
            (We = 0),
            (Qn = null),
            (as = ri = Pr = 0),
            (ut = Gn = null),
            Cr !== null)
        ) {
            for (t = 0; t < Cr.length; t++)
                if (((r = Cr[t]), (l = r.interleaved), l !== null)) {
                    r.interleaved = null;
                    var s = l.next,
                        u = r.pending;
                    if (u !== null) {
                        var d = u.next;
                        ((u.next = s), (l.next = d));
                    }
                    r.pending = l;
                }
            Cr = null;
        }
        return e;
    }
    function Ac(e, t) {
        do {
            var r = Le;
            try {
                if ((zl(), (Vo.current = Go), Ko)) {
                    for (var l = ze.memoizedState; l !== null; ) {
                        var s = l.queue;
                        (s !== null && (s.pending = null), (l = l.next));
                    }
                    Ko = !1;
                }
                if (
                    ((Nr = 0),
                    (Ve = He = ze = null),
                    (Hn = !1),
                    (Wn = 0),
                    (ss.current = null),
                    r === null || r.return === null)
                ) {
                    ((We = 1), (Qn = t), (Le = null));
                    break;
                }
                e: {
                    var u = e,
                        d = r.return,
                        g = r,
                        w = t;
                    if (
                        ((t = Xe),
                        (g.flags |= 32768),
                        w !== null && typeof w == "object" && typeof w.then == "function")
                    ) {
                        var z = w,
                            j = g,
                            I = j.tag;
                        if ((j.mode & 1) === 0 && (I === 0 || I === 11 || I === 15)) {
                            var R = j.alternate;
                            R
                                ? ((j.updateQueue = R.updateQueue),
                                  (j.memoizedState = R.memoizedState),
                                  (j.lanes = R.lanes))
                                : ((j.updateQueue = null), (j.memoizedState = null));
                        }
                        var $ = fc(d);
                        if ($ !== null) {
                            (($.flags &= -257),
                                dc($, d, g, u, t),
                                $.mode & 1 && cc(u, z, t),
                                (t = $),
                                (w = z));
                            var J = t.updateQueue;
                            if (J === null) {
                                var Z = new Set();
                                (Z.add(w), (t.updateQueue = Z));
                            } else J.add(w);
                            break e;
                        } else {
                            if ((t & 1) === 0) {
                                (cc(u, z, t), ms());
                                break e;
                            }
                            w = Error(o(426));
                        }
                    } else if (Be && g.mode & 1) {
                        var Ie = fc(d);
                        if (Ie !== null) {
                            ((Ie.flags & 65536) === 0 && (Ie.flags |= 256),
                                dc(Ie, d, g, u, t),
                                Tl(nn(w, g)));
                            break e;
                        }
                    }
                    ((u = w = nn(w, g)),
                        We !== 4 && (We = 2),
                        Gn === null ? (Gn = [u]) : Gn.push(u),
                        (u = d));
                    do {
                        switch (u.tag) {
                            case 3:
                                ((u.flags |= 65536), (t &= -t), (u.lanes |= t));
                                var B = ac(u, w, t);
                                Iu(u, B);
                                break e;
                            case 1:
                                g = w;
                                var _ = u.type,
                                    T = u.stateNode;
                                if (
                                    (u.flags & 128) === 0 &&
                                    (typeof _.getDerivedStateFromError == "function" ||
                                        (T !== null &&
                                            typeof T.componentDidCatch == "function" &&
                                            (fr === null || !fr.has(T))))
                                ) {
                                    ((u.flags |= 65536), (t &= -t), (u.lanes |= t));
                                    var O = uc(u, g, t);
                                    Iu(u, O);
                                    break e;
                                }
                        }
                        u = u.return;
                    } while (u !== null);
                }
                Wc(r);
            } catch (te) {
                ((t = te), Le === r && r !== null && (Le = r = r.return));
                continue;
            }
            break;
        } while (!0);
    }
    function qc() {
        var e = ti.current;
        return ((ti.current = Go), e === null ? Go : e);
    }
    function ms() {
        ((We === 0 || We === 3 || We === 2) && (We = 4),
            Ke === null || ((Pr & 268435455) === 0 && (ri & 268435455) === 0) || pr(Ke, Xe));
    }
    function ai(e, t) {
        var r = de;
        de |= 2;
        var l = qc();
        (Ke !== e || Xe !== t) && ((Qt = null), Rr(e, t));
        do
            try {
                Cp();
                break;
            } catch (s) {
                Ac(e, s);
            }
        while (!0);
        if ((zl(), (de = r), (ti.current = l), Le !== null)) throw Error(o(261));
        return ((Ke = null), (Xe = 0), We);
    }
    function Cp() {
        for (; Le !== null; ) Hc(Le);
    }
    function zp() {
        for (; Le !== null && !eh(); ) Hc(Le);
    }
    function Hc(e) {
        var t = Kc(e.alternate, e, mt);
        ((e.memoizedProps = e.pendingProps), t === null ? Wc(e) : (Le = t), (ss.current = null));
    }
    function Wc(e) {
        var t = e;
        do {
            var r = t.alternate;
            if (((e = t.return), (t.flags & 32768) === 0)) {
                if (((r = _p(r, t, mt)), r !== null)) {
                    Le = r;
                    return;
                }
            } else {
                if (((r = kp(r, t)), r !== null)) {
                    ((r.flags &= 32767), (Le = r));
                    return;
                }
                if (e !== null) ((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
                else {
                    ((We = 6), (Le = null));
                    return;
                }
            }
            if (((t = t.sibling), t !== null)) {
                Le = t;
                return;
            }
            Le = t = e;
        } while (t !== null);
        We === 0 && (We = 5);
    }
    function jr(e, t, r) {
        var l = ge,
            s = xt.transition;
        try {
            ((xt.transition = null), (ge = 1), Np(e, t, r, l));
        } finally {
            ((xt.transition = s), (ge = l));
        }
        return null;
    }
    function Np(e, t, r, l) {
        do an();
        while (dr !== null);
        if ((de & 6) !== 0) throw Error(o(327));
        r = e.finishedWork;
        var s = e.finishedLanes;
        if (r === null) return null;
        if (((e.finishedWork = null), (e.finishedLanes = 0), r === e.current)) throw Error(o(177));
        ((e.callbackNode = null), (e.callbackPriority = 0));
        var u = r.lanes | r.childLanes;
        if (
            (ch(e, u),
            e === Ke && ((Le = Ke = null), (Xe = 0)),
            ((r.subtreeFlags & 2064) === 0 && (r.flags & 2064) === 0) ||
                oi ||
                ((oi = !0),
                $c(fo, function () {
                    return (an(), null);
                })),
            (u = (r.flags & 15990) !== 0),
            (r.subtreeFlags & 15990) !== 0 || u)
        ) {
            ((u = xt.transition), (xt.transition = null));
            var d = ge;
            ge = 1;
            var g = de;
            ((de |= 4),
                (ss.current = null),
                Sp(e, r),
                Rc(r, e),
                Xh(ml),
                (wo = !!vl),
                (ml = vl = null),
                (e.current = r),
                Bp(r),
                th(),
                (de = g),
                (ge = d),
                (xt.transition = u));
        } else e.current = r;
        if (
            (oi && ((oi = !1), (dr = e), (ii = s)),
            (u = e.pendingLanes),
            u === 0 && (fr = null),
            oh(r.stateNode),
            ct(e, je()),
            t !== null)
        )
            for (l = e.onRecoverableError, r = 0; r < t.length; r++)
                ((s = t[r]), l(s.value, { componentStack: s.stack, digest: s.digest }));
        if (ni) throw ((ni = !1), (e = cs), (cs = null), e);
        return (
            (ii & 1) !== 0 && e.tag !== 0 && an(),
            (u = e.pendingLanes),
            (u & 1) !== 0 ? (e === fs ? Xn++ : ((Xn = 0), (fs = e))) : (Xn = 0),
            sr(),
            null
        );
    }
    function an() {
        if (dr !== null) {
            var e = Pa(ii),
                t = xt.transition,
                r = ge;
            try {
                if (((xt.transition = null), (ge = 16 > e ? 16 : e), dr === null)) var l = !1;
                else {
                    if (((e = dr), (dr = null), (ii = 0), (de & 6) !== 0)) throw Error(o(331));
                    var s = de;
                    for (de |= 4, X = e.current; X !== null; ) {
                        var u = X,
                            d = u.child;
                        if ((X.flags & 16) !== 0) {
                            var g = u.deletions;
                            if (g !== null) {
                                for (var w = 0; w < g.length; w++) {
                                    var z = g[w];
                                    for (X = z; X !== null; ) {
                                        var j = X;
                                        switch (j.tag) {
                                            case 0:
                                            case 11:
                                            case 15:
                                                $n(8, j, u);
                                        }
                                        var I = j.child;
                                        if (I !== null) ((I.return = j), (X = I));
                                        else
                                            for (; X !== null; ) {
                                                j = X;
                                                var R = j.sibling,
                                                    $ = j.return;
                                                if ((Cc(j), j === z)) {
                                                    X = null;
                                                    break;
                                                }
                                                if (R !== null) {
                                                    ((R.return = $), (X = R));
                                                    break;
                                                }
                                                X = $;
                                            }
                                    }
                                }
                                var J = u.alternate;
                                if (J !== null) {
                                    var Z = J.child;
                                    if (Z !== null) {
                                        J.child = null;
                                        do {
                                            var Ie = Z.sibling;
                                            ((Z.sibling = null), (Z = Ie));
                                        } while (Z !== null);
                                    }
                                }
                                X = u;
                            }
                        }
                        if ((u.subtreeFlags & 2064) !== 0 && d !== null) ((d.return = u), (X = d));
                        else
                            e: for (; X !== null; ) {
                                if (((u = X), (u.flags & 2048) !== 0))
                                    switch (u.tag) {
                                        case 0:
                                        case 11:
                                        case 15:
                                            $n(9, u, u.return);
                                    }
                                var B = u.sibling;
                                if (B !== null) {
                                    ((B.return = u.return), (X = B));
                                    break e;
                                }
                                X = u.return;
                            }
                    }
                    var _ = e.current;
                    for (X = _; X !== null; ) {
                        d = X;
                        var T = d.child;
                        if ((d.subtreeFlags & 2064) !== 0 && T !== null) ((T.return = d), (X = T));
                        else
                            e: for (d = _; X !== null; ) {
                                if (((g = X), (g.flags & 2048) !== 0))
                                    try {
                                        switch (g.tag) {
                                            case 0:
                                            case 11:
                                            case 15:
                                                ei(9, g);
                                        }
                                    } catch (te) {
                                        Ne(g, g.return, te);
                                    }
                                if (g === d) {
                                    X = null;
                                    break e;
                                }
                                var O = g.sibling;
                                if (O !== null) {
                                    ((O.return = g.return), (X = O));
                                    break e;
                                }
                                X = g.return;
                            }
                    }
                    if (((de = s), sr(), It && typeof It.onPostCommitFiberRoot == "function"))
                        try {
                            It.onPostCommitFiberRoot(ho, e);
                        } catch {}
                    l = !0;
                }
                return l;
            } finally {
                ((ge = r), (xt.transition = t));
            }
        }
        return !1;
    }
    function Uc(e, t, r) {
        ((t = nn(r, t)),
            (t = ac(e, t, 1)),
            (e = ur(e, t, 1)),
            (t = ot()),
            e !== null && (bn(e, 1, t), ct(e, t)));
    }
    function Ne(e, t, r) {
        if (e.tag === 3) Uc(e, e, r);
        else
            for (; t !== null; ) {
                if (t.tag === 3) {
                    Uc(t, e, r);
                    break;
                } else if (t.tag === 1) {
                    var l = t.stateNode;
                    if (
                        typeof t.type.getDerivedStateFromError == "function" ||
                        (typeof l.componentDidCatch == "function" && (fr === null || !fr.has(l)))
                    ) {
                        ((e = nn(r, e)),
                            (e = uc(t, e, 1)),
                            (t = ur(t, e, 1)),
                            (e = ot()),
                            t !== null && (bn(t, 1, e), ct(t, e)));
                        break;
                    }
                }
                t = t.return;
            }
    }
    function Pp(e, t, r) {
        var l = e.pingCache;
        (l !== null && l.delete(t),
            (t = ot()),
            (e.pingedLanes |= e.suspendedLanes & r),
            Ke === e &&
                (Xe & r) === r &&
                (We === 4 || (We === 3 && (Xe & 130023424) === Xe && 500 > je() - us)
                    ? Rr(e, 0)
                    : (as |= r)),
            ct(e, t));
    }
    function Vc(e, t) {
        t === 0 &&
            ((e.mode & 1) === 0
                ? (t = 1)
                : ((t = vo), (vo <<= 1), (vo & 130023424) === 0 && (vo = 4194304)));
        var r = ot();
        ((e = Vt(e, t)), e !== null && (bn(e, t, r), ct(e, r)));
    }
    function Fp(e) {
        var t = e.memoizedState,
            r = 0;
        (t !== null && (r = t.retryLane), Vc(e, r));
    }
    function Rp(e, t) {
        var r = 0;
        switch (e.tag) {
            case 13:
                var l = e.stateNode,
                    s = e.memoizedState;
                s !== null && (r = s.retryLane);
                break;
            case 19:
                l = e.stateNode;
                break;
            default:
                throw Error(o(314));
        }
        (l !== null && l.delete(t), Vc(e, r));
    }
    var Kc;
    Kc = function (e, t, r) {
        if (e !== null)
            if (e.memoizedProps !== t.pendingProps || lt.current) at = !0;
            else {
                if ((e.lanes & r) === 0 && (t.flags & 128) === 0) return ((at = !1), bp(e, t, r));
                at = (e.flags & 131072) !== 0;
            }
        else ((at = !1), Be && (t.flags & 1048576) !== 0 && Bu(t, Oo, t.index));
        switch (((t.lanes = 0), t.tag)) {
            case 2:
                var l = t.type;
                (Jo(e, t), (e = t.pendingProps));
                var s = Gr(t, Je.current);
                (tn(t, r), (s = Al(null, t, l, e, s, r)));
                var u = ql();
                return (
                    (t.flags |= 1),
                    typeof s == "object" &&
                    s !== null &&
                    typeof s.render == "function" &&
                    s.$$typeof === void 0
                        ? ((t.tag = 1),
                          (t.memoizedState = null),
                          (t.updateQueue = null),
                          st(l) ? ((u = !0), jo(t)) : (u = !1),
                          (t.memoizedState =
                              s.state !== null && s.state !== void 0 ? s.state : null),
                          Rl(t),
                          (s.updater = Xo),
                          (t.stateNode = s),
                          (s._reactInternals = t),
                          $l(t, l, e, r),
                          (t = Yl(null, t, l, !0, u, r)))
                        : ((t.tag = 0), Be && u && xl(t), nt(null, t, s, r), (t = t.child)),
                    t
                );
            case 16:
                l = t.elementType;
                e: {
                    switch (
                        (Jo(e, t),
                        (e = t.pendingProps),
                        (s = l._init),
                        (l = s(l._payload)),
                        (t.type = l),
                        (s = t.tag = Ip(l)),
                        (e = Ct(l, e)),
                        s)
                    ) {
                        case 0:
                            t = Xl(null, t, l, e, r);
                            break e;
                        case 1:
                            t = yc(null, t, l, e, r);
                            break e;
                        case 11:
                            t = hc(null, t, l, e, r);
                            break e;
                        case 14:
                            t = pc(null, t, l, Ct(l.type, e), r);
                            break e;
                    }
                    throw Error(o(306, l, ""));
                }
                return t;
            case 0:
                return (
                    (l = t.type),
                    (s = t.pendingProps),
                    (s = t.elementType === l ? s : Ct(l, s)),
                    Xl(e, t, l, s, r)
                );
            case 1:
                return (
                    (l = t.type),
                    (s = t.pendingProps),
                    (s = t.elementType === l ? s : Ct(l, s)),
                    yc(e, t, l, s, r)
                );
            case 3:
                e: {
                    if ((wc(t), e === null)) throw Error(o(387));
                    ((l = t.pendingProps),
                        (u = t.memoizedState),
                        (s = u.element),
                        ju(e, t),
                        Wo(t, l, null, r));
                    var d = t.memoizedState;
                    if (((l = d.element), u.isDehydrated))
                        if (
                            ((u = {
                                element: l,
                                isDehydrated: !1,
                                cache: d.cache,
                                pendingSuspenseBoundaries: d.pendingSuspenseBoundaries,
                                transitions: d.transitions,
                            }),
                            (t.updateQueue.baseState = u),
                            (t.memoizedState = u),
                            t.flags & 256)
                        ) {
                            ((s = nn(Error(o(423)), t)), (t = bc(e, t, l, r, s)));
                            break e;
                        } else if (l !== s) {
                            ((s = nn(Error(o(424)), t)), (t = bc(e, t, l, r, s)));
                            break e;
                        } else
                            for (
                                vt = or(t.stateNode.containerInfo.firstChild),
                                    pt = t,
                                    Be = !0,
                                    Tt = null,
                                    r = Fu(t, null, l, r),
                                    t.child = r;
                                r;
                            )
                                ((r.flags = (r.flags & -3) | 4096), (r = r.sibling));
                    else {
                        if ((Jr(), l === s)) {
                            t = $t(e, t, r);
                            break e;
                        }
                        nt(e, t, l, r);
                    }
                    t = t.child;
                }
                return t;
            case 5:
                return (
                    Ou(t),
                    e === null && El(t),
                    (l = t.type),
                    (s = t.pendingProps),
                    (u = e !== null ? e.memoizedProps : null),
                    (d = s.children),
                    gl(l, s) ? (d = null) : u !== null && gl(l, u) && (t.flags |= 32),
                    gc(e, t),
                    nt(e, t, d, r),
                    t.child
                );
            case 6:
                return (e === null && El(t), null);
            case 13:
                return _c(e, t, r);
            case 4:
                return (
                    jl(t, t.stateNode.containerInfo),
                    (l = t.pendingProps),
                    e === null ? (t.child = Zr(t, null, l, r)) : nt(e, t, l, r),
                    t.child
                );
            case 11:
                return (
                    (l = t.type),
                    (s = t.pendingProps),
                    (s = t.elementType === l ? s : Ct(l, s)),
                    hc(e, t, l, s, r)
                );
            case 7:
                return (nt(e, t, t.pendingProps, r), t.child);
            case 8:
                return (nt(e, t, t.pendingProps.children, r), t.child);
            case 12:
                return (nt(e, t, t.pendingProps.children, r), t.child);
            case 10:
                e: {
                    if (
                        ((l = t.type._context),
                        (s = t.pendingProps),
                        (u = t.memoizedProps),
                        (d = s.value),
                        be(Ao, l._currentValue),
                        (l._currentValue = d),
                        u !== null)
                    )
                        if (Et(u.value, d)) {
                            if (u.children === s.children && !lt.current) {
                                t = $t(e, t, r);
                                break e;
                            }
                        } else
                            for (u = t.child, u !== null && (u.return = t); u !== null; ) {
                                var g = u.dependencies;
                                if (g !== null) {
                                    d = u.child;
                                    for (var w = g.firstContext; w !== null; ) {
                                        if (w.context === l) {
                                            if (u.tag === 1) {
                                                ((w = Kt(-1, r & -r)), (w.tag = 2));
                                                var z = u.updateQueue;
                                                if (z !== null) {
                                                    z = z.shared;
                                                    var j = z.pending;
                                                    (j === null
                                                        ? (w.next = w)
                                                        : ((w.next = j.next), (j.next = w)),
                                                        (z.pending = w));
                                                }
                                            }
                                            ((u.lanes |= r),
                                                (w = u.alternate),
                                                w !== null && (w.lanes |= r),
                                                Pl(u.return, r, t),
                                                (g.lanes |= r));
                                            break;
                                        }
                                        w = w.next;
                                    }
                                } else if (u.tag === 10) d = u.type === t.type ? null : u.child;
                                else if (u.tag === 18) {
                                    if (((d = u.return), d === null)) throw Error(o(341));
                                    ((d.lanes |= r),
                                        (g = d.alternate),
                                        g !== null && (g.lanes |= r),
                                        Pl(d, r, t),
                                        (d = u.sibling));
                                } else d = u.child;
                                if (d !== null) d.return = u;
                                else
                                    for (d = u; d !== null; ) {
                                        if (d === t) {
                                            d = null;
                                            break;
                                        }
                                        if (((u = d.sibling), u !== null)) {
                                            ((u.return = d.return), (d = u));
                                            break;
                                        }
                                        d = d.return;
                                    }
                                u = d;
                            }
                    (nt(e, t, s.children, r), (t = t.child));
                }
                return t;
            case 9:
                return (
                    (s = t.type),
                    (l = t.pendingProps.children),
                    tn(t, r),
                    (s = _t(s)),
                    (l = l(s)),
                    (t.flags |= 1),
                    nt(e, t, l, r),
                    t.child
                );
            case 14:
                return (
                    (l = t.type),
                    (s = Ct(l, t.pendingProps)),
                    (s = Ct(l.type, s)),
                    pc(e, t, l, s, r)
                );
            case 15:
                return vc(e, t, t.type, t.pendingProps, r);
            case 17:
                return (
                    (l = t.type),
                    (s = t.pendingProps),
                    (s = t.elementType === l ? s : Ct(l, s)),
                    Jo(e, t),
                    (t.tag = 1),
                    st(l) ? ((e = !0), jo(t)) : (e = !1),
                    tn(t, r),
                    lc(t, l, s),
                    $l(t, l, s, r),
                    Yl(null, t, l, !0, e, r)
                );
            case 19:
                return xc(e, t, r);
            case 22:
                return mc(e, t, r);
        }
        throw Error(o(156, t.tag));
    };
    function $c(e, t) {
        return Ea(e, t);
    }
    function jp(e, t, r, l) {
        ((this.tag = e),
            (this.key = r),
            (this.sibling =
                this.child =
                this.return =
                this.stateNode =
                this.type =
                this.elementType =
                    null),
            (this.index = 0),
            (this.ref = null),
            (this.pendingProps = t),
            (this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
            (this.mode = l),
            (this.subtreeFlags = this.flags = 0),
            (this.deletions = null),
            (this.childLanes = this.lanes = 0),
            (this.alternate = null));
    }
    function St(e, t, r, l) {
        return new jp(e, t, r, l);
    }
    function gs(e) {
        return ((e = e.prototype), !(!e || !e.isReactComponent));
    }
    function Ip(e) {
        if (typeof e == "function") return gs(e) ? 1 : 0;
        if (e != null) {
            if (((e = e.$$typeof), e === Te)) return 11;
            if (e === qe) return 14;
        }
        return 2;
    }
    function vr(e, t) {
        var r = e.alternate;
        return (
            r === null
                ? ((r = St(e.tag, t, e.key, e.mode)),
                  (r.elementType = e.elementType),
                  (r.type = e.type),
                  (r.stateNode = e.stateNode),
                  (r.alternate = e),
                  (e.alternate = r))
                : ((r.pendingProps = t),
                  (r.type = e.type),
                  (r.flags = 0),
                  (r.subtreeFlags = 0),
                  (r.deletions = null)),
            (r.flags = e.flags & 14680064),
            (r.childLanes = e.childLanes),
            (r.lanes = e.lanes),
            (r.child = e.child),
            (r.memoizedProps = e.memoizedProps),
            (r.memoizedState = e.memoizedState),
            (r.updateQueue = e.updateQueue),
            (t = e.dependencies),
            (r.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
            (r.sibling = e.sibling),
            (r.index = e.index),
            (r.ref = e.ref),
            r
        );
    }
    function ui(e, t, r, l, s, u) {
        var d = 2;
        if (((l = e), typeof e == "function")) gs(e) && (d = 1);
        else if (typeof e == "string") d = 5;
        else
            e: switch (e) {
                case ee:
                    return Ir(r.children, s, u, t);
                case U:
                    ((d = 8), (s |= 8));
                    break;
                case ie:
                    return ((e = St(12, r, t, s | 2)), (e.elementType = ie), (e.lanes = u), e);
                case Oe:
                    return ((e = St(13, r, t, s)), (e.elementType = Oe), (e.lanes = u), e);
                case Qe:
                    return ((e = St(19, r, t, s)), (e.elementType = Qe), (e.lanes = u), e);
                case Y:
                    return ci(r, s, u, t);
                default:
                    if (typeof e == "object" && e !== null)
                        switch (e.$$typeof) {
                            case fe:
                                d = 10;
                                break e;
                            case Ue:
                                d = 9;
                                break e;
                            case Te:
                                d = 11;
                                break e;
                            case qe:
                                d = 14;
                                break e;
                            case A:
                                ((d = 16), (l = null));
                                break e;
                        }
                    throw Error(o(130, e == null ? e : typeof e, ""));
            }
        return ((t = St(d, r, t, s)), (t.elementType = e), (t.type = l), (t.lanes = u), t);
    }
    function Ir(e, t, r, l) {
        return ((e = St(7, e, l, t)), (e.lanes = r), e);
    }
    function ci(e, t, r, l) {
        return (
            (e = St(22, e, l, t)),
            (e.elementType = Y),
            (e.lanes = r),
            (e.stateNode = { isHidden: !1 }),
            e
        );
    }
    function ys(e, t, r) {
        return ((e = St(6, e, null, t)), (e.lanes = r), e);
    }
    function ws(e, t, r) {
        return (
            (t = St(4, e.children !== null ? e.children : [], e.key, t)),
            (t.lanes = r),
            (t.stateNode = {
                containerInfo: e.containerInfo,
                pendingChildren: null,
                implementation: e.implementation,
            }),
            t
        );
    }
    function Dp(e, t, r, l, s) {
        ((this.tag = t),
            (this.containerInfo = e),
            (this.finishedWork = this.pingCache = this.current = this.pendingChildren = null),
            (this.timeoutHandle = -1),
            (this.callbackNode = this.pendingContext = this.context = null),
            (this.callbackPriority = 0),
            (this.eventTimes = Ki(0)),
            (this.expirationTimes = Ki(-1)),
            (this.entangledLanes =
                this.finishedLanes =
                this.mutableReadLanes =
                this.expiredLanes =
                this.pingedLanes =
                this.suspendedLanes =
                this.pendingLanes =
                    0),
            (this.entanglements = Ki(0)),
            (this.identifierPrefix = l),
            (this.onRecoverableError = s),
            (this.mutableSourceEagerHydrationData = null));
    }
    function bs(e, t, r, l, s, u, d, g, w) {
        return (
            (e = new Dp(e, t, r, g, w)),
            t === 1 ? ((t = 1), u === !0 && (t |= 8)) : (t = 0),
            (u = St(3, null, null, t)),
            (e.current = u),
            (u.stateNode = e),
            (u.memoizedState = {
                element: l,
                isDehydrated: r,
                cache: null,
                transitions: null,
                pendingSuspenseBoundaries: null,
            }),
            Rl(u),
            e
        );
    }
    function Op(e, t, r) {
        var l = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
        return {
            $$typeof: G,
            key: l == null ? null : "" + l,
            children: e,
            containerInfo: t,
            implementation: r,
        };
    }
    function Qc(e) {
        if (!e) return lr;
        e = e._reactInternals;
        e: {
            if (xr(e) !== e || e.tag !== 1) throw Error(o(170));
            var t = e;
            do {
                switch (t.tag) {
                    case 3:
                        t = t.stateNode.context;
                        break e;
                    case 1:
                        if (st(t.type)) {
                            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
                            break e;
                        }
                }
                t = t.return;
            } while (t !== null);
            throw Error(o(171));
        }
        if (e.tag === 1) {
            var r = e.type;
            if (st(r)) return ku(e, r, t);
        }
        return t;
    }
    function Gc(e, t, r, l, s, u, d, g, w) {
        return (
            (e = bs(r, l, !0, e, s, u, d, g, w)),
            (e.context = Qc(null)),
            (r = e.current),
            (l = ot()),
            (s = hr(r)),
            (u = Kt(l, s)),
            (u.callback = t ?? null),
            ur(r, u, s),
            (e.current.lanes = s),
            bn(e, s, l),
            ct(e, l),
            e
        );
    }
    function fi(e, t, r, l) {
        var s = t.current,
            u = ot(),
            d = hr(s);
        return (
            (r = Qc(r)),
            t.context === null ? (t.context = r) : (t.pendingContext = r),
            (t = Kt(u, d)),
            (t.payload = { element: e }),
            (l = l === void 0 ? null : l),
            l !== null && (t.callback = l),
            (e = ur(s, t, d)),
            e !== null && (Pt(e, s, d, u), Ho(e, s, d)),
            d
        );
    }
    function di(e) {
        if (((e = e.current), !e.child)) return null;
        switch (e.child.tag) {
            case 5:
                return e.child.stateNode;
            default:
                return e.child.stateNode;
        }
    }
    function Xc(e, t) {
        if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
            var r = e.retryLane;
            e.retryLane = r !== 0 && r < t ? r : t;
        }
    }
    function _s(e, t) {
        (Xc(e, t), (e = e.alternate) && Xc(e, t));
    }
    function Lp() {
        return null;
    }
    var Yc =
        typeof reportError == "function"
            ? reportError
            : function (e) {
                  console.error(e);
              };
    function ks(e) {
        this._internalRoot = e;
    }
    ((hi.prototype.render = ks.prototype.render =
        function (e) {
            var t = this._internalRoot;
            if (t === null) throw Error(o(409));
            fi(e, t, null, null);
        }),
        (hi.prototype.unmount = ks.prototype.unmount =
            function () {
                var e = this._internalRoot;
                if (e !== null) {
                    this._internalRoot = null;
                    var t = e.containerInfo;
                    (Fr(function () {
                        fi(null, e, null, null);
                    }),
                        (t[qt] = null));
                }
            }));
    function hi(e) {
        this._internalRoot = e;
    }
    hi.prototype.unstable_scheduleHydration = function (e) {
        if (e) {
            var t = ja();
            e = { blockedOn: null, target: e, priority: t };
            for (var r = 0; r < tr.length && t !== 0 && t < tr[r].priority; r++);
            (tr.splice(r, 0, e), r === 0 && Oa(e));
        }
    };
    function xs(e) {
        return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
    }
    function pi(e) {
        return !(
            !e ||
            (e.nodeType !== 1 &&
                e.nodeType !== 9 &&
                e.nodeType !== 11 &&
                (e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "))
        );
    }
    function Jc() {}
    function Mp(e, t, r, l, s) {
        if (s) {
            if (typeof l == "function") {
                var u = l;
                l = function () {
                    var z = di(d);
                    u.call(z);
                };
            }
            var d = Gc(t, l, e, 0, null, !1, !1, "", Jc);
            return (
                (e._reactRootContainer = d),
                (e[qt] = d.current),
                jn(e.nodeType === 8 ? e.parentNode : e),
                Fr(),
                d
            );
        }
        for (; (s = e.lastChild); ) e.removeChild(s);
        if (typeof l == "function") {
            var g = l;
            l = function () {
                var z = di(w);
                g.call(z);
            };
        }
        var w = bs(e, 0, !1, null, null, !1, !1, "", Jc);
        return (
            (e._reactRootContainer = w),
            (e[qt] = w.current),
            jn(e.nodeType === 8 ? e.parentNode : e),
            Fr(function () {
                fi(t, w, r, l);
            }),
            w
        );
    }
    function vi(e, t, r, l, s) {
        var u = r._reactRootContainer;
        if (u) {
            var d = u;
            if (typeof s == "function") {
                var g = s;
                s = function () {
                    var w = di(d);
                    g.call(w);
                };
            }
            fi(t, d, e, s);
        } else d = Mp(r, t, e, s, l);
        return di(d);
    }
    ((Fa = function (e) {
        switch (e.tag) {
            case 3:
                var t = e.stateNode;
                if (t.current.memoizedState.isDehydrated) {
                    var r = wn(t.pendingLanes);
                    r !== 0 &&
                        ($i(t, r | 1), ct(t, je()), (de & 6) === 0 && ((sn = je() + 500), sr()));
                }
                break;
            case 13:
                (Fr(function () {
                    var l = Vt(e, 1);
                    if (l !== null) {
                        var s = ot();
                        Pt(l, e, 1, s);
                    }
                }),
                    _s(e, 1));
        }
    }),
        (Qi = function (e) {
            if (e.tag === 13) {
                var t = Vt(e, 134217728);
                if (t !== null) {
                    var r = ot();
                    Pt(t, e, 134217728, r);
                }
                _s(e, 134217728);
            }
        }),
        (Ra = function (e) {
            if (e.tag === 13) {
                var t = hr(e),
                    r = Vt(e, t);
                if (r !== null) {
                    var l = ot();
                    Pt(r, e, t, l);
                }
                _s(e, t);
            }
        }),
        (ja = function () {
            return ge;
        }),
        (Ia = function (e, t) {
            var r = ge;
            try {
                return ((ge = e), t());
            } finally {
                ge = r;
            }
        }),
        (Ai = function (e, t, r) {
            switch (t) {
                case "input":
                    if ((Fi(e, r), (t = r.name), r.type === "radio" && t != null)) {
                        for (r = e; r.parentNode; ) r = r.parentNode;
                        for (
                            r = r.querySelectorAll(
                                "input[name=" + JSON.stringify("" + t) + '][type="radio"]'
                            ),
                                t = 0;
                            t < r.length;
                            t++
                        ) {
                            var l = r[t];
                            if (l !== e && l.form === e.form) {
                                var s = Fo(l);
                                if (!s) throw Error(o(90));
                                (ia(l), Fi(l, s));
                            }
                        }
                    }
                    break;
                case "textarea":
                    ca(e, r);
                    break;
                case "select":
                    ((t = r.value), t != null && Or(e, !!r.multiple, t, !1));
            }
        }),
        (wa = ps),
        (ba = Fr));
    var Ap = { usingClientEntryPoint: !1, Events: [On, $r, Fo, ga, ya, ps] },
        Yn = {
            findFiberByHostInstance: Sr,
            bundleType: 0,
            version: "18.3.1",
            rendererPackageName: "react-dom",
        },
        qp = {
            bundleType: Yn.bundleType,
            version: Yn.version,
            rendererPackageName: Yn.rendererPackageName,
            rendererConfig: Yn.rendererConfig,
            overrideHookState: null,
            overrideHookStateDeletePath: null,
            overrideHookStateRenamePath: null,
            overrideProps: null,
            overridePropsDeletePath: null,
            overridePropsRenamePath: null,
            setErrorHandler: null,
            setSuspenseHandler: null,
            scheduleUpdate: null,
            currentDispatcherRef: Q.ReactCurrentDispatcher,
            findHostInstanceByFiber: function (e) {
                return ((e = Sa(e)), e === null ? null : e.stateNode);
            },
            findFiberByHostInstance: Yn.findFiberByHostInstance || Lp,
            findHostInstancesForRefresh: null,
            scheduleRefresh: null,
            scheduleRoot: null,
            setRefreshHandler: null,
            getCurrentFiber: null,
            reconcilerVersion: "18.3.1-next-f1338f8080-20240426",
        };
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
        var mi = __REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!mi.isDisabled && mi.supportsFiber)
            try {
                ((ho = mi.inject(qp)), (It = mi));
            } catch {}
    }
    return (
        (ft.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Ap),
        (ft.createPortal = function (e, t) {
            var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
            if (!xs(t)) throw Error(o(200));
            return Op(e, t, null, r);
        }),
        (ft.createRoot = function (e, t) {
            if (!xs(e)) throw Error(o(299));
            var r = !1,
                l = "",
                s = Yc;
            return (
                t != null &&
                    (t.unstable_strictMode === !0 && (r = !0),
                    t.identifierPrefix !== void 0 && (l = t.identifierPrefix),
                    t.onRecoverableError !== void 0 && (s = t.onRecoverableError)),
                (t = bs(e, 1, !1, null, null, r, !1, l, s)),
                (e[qt] = t.current),
                jn(e.nodeType === 8 ? e.parentNode : e),
                new ks(t)
            );
        }),
        (ft.findDOMNode = function (e) {
            if (e == null) return null;
            if (e.nodeType === 1) return e;
            var t = e._reactInternals;
            if (t === void 0)
                throw typeof e.render == "function"
                    ? Error(o(188))
                    : ((e = Object.keys(e).join(",")), Error(o(268, e)));
            return ((e = Sa(t)), (e = e === null ? null : e.stateNode), e);
        }),
        (ft.flushSync = function (e) {
            return Fr(e);
        }),
        (ft.hydrate = function (e, t, r) {
            if (!pi(t)) throw Error(o(200));
            return vi(null, e, t, !0, r);
        }),
        (ft.hydrateRoot = function (e, t, r) {
            if (!xs(e)) throw Error(o(405));
            var l = (r != null && r.hydratedSources) || null,
                s = !1,
                u = "",
                d = Yc;
            if (
                (r != null &&
                    (r.unstable_strictMode === !0 && (s = !0),
                    r.identifierPrefix !== void 0 && (u = r.identifierPrefix),
                    r.onRecoverableError !== void 0 && (d = r.onRecoverableError)),
                (t = Gc(t, null, e, 1, r ?? null, s, !1, u, d)),
                (e[qt] = t.current),
                jn(e),
                l)
            )
                for (e = 0; e < l.length; e++)
                    ((r = l[e]),
                        (s = r._getVersion),
                        (s = s(r._source)),
                        t.mutableSourceEagerHydrationData == null
                            ? (t.mutableSourceEagerHydrationData = [r, s])
                            : t.mutableSourceEagerHydrationData.push(r, s));
            return new hi(t);
        }),
        (ft.render = function (e, t, r) {
            if (!pi(t)) throw Error(o(200));
            return vi(null, e, t, !1, r);
        }),
        (ft.unmountComponentAtNode = function (e) {
            if (!pi(e)) throw Error(o(40));
            return e._reactRootContainer
                ? (Fr(function () {
                      vi(null, null, e, !1, function () {
                          ((e._reactRootContainer = null), (e[qt] = null));
                      });
                  }),
                  !0)
                : !1;
        }),
        (ft.unstable_batchedUpdates = ps),
        (ft.unstable_renderSubtreeIntoContainer = function (e, t, r, l) {
            if (!pi(r)) throw Error(o(200));
            if (e == null || e._reactInternals === void 0) throw Error(o(38));
            return vi(e, t, r, !1, l);
        }),
        (ft.version = "18.3.1-next-f1338f8080-20240426"),
        ft
    );
}
var sf;
function Yp() {
    if (sf) return Es.exports;
    sf = 1;
    function i() {
        if (
            !(
                typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
                typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
            )
        )
            try {
                __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i);
            } catch (n) {
                console.error(n);
            }
    }
    return (i(), (Es.exports = Xp()), Es.exports);
}
var af;
function Jp() {
    if (af) return gi;
    af = 1;
    var i = Yp();
    return ((gi.createRoot = i.createRoot), (gi.hydrateRoot = i.hydrateRoot), gi);
}
var Zp = Jp();
const zs = typeof window > "u" ? global : window,
    Ns = "@griffel/";
function ev(i, n) {
    return (zs[Symbol.for(Ns + i)] || (zs[Symbol.for(Ns + i)] = n), zs[Symbol.for(Ns + i)]);
}
const As = ev("DEFINITION_LOOKUP_TABLE", {}),
    Zn = "data-make-styles-bucket",
    tv = "data-priority",
    qs = 7,
    Qs = "___",
    rv = Qs.length + qs,
    nv = 0,
    ov = 1;
function iv(i) {
    for (var n = 0, o, a = 0, c = i.length; c >= 4; ++a, c -= 4)
        ((o =
            (i.charCodeAt(a) & 255) |
            ((i.charCodeAt(++a) & 255) << 8) |
            ((i.charCodeAt(++a) & 255) << 16) |
            ((i.charCodeAt(++a) & 255) << 24)),
            (o = (o & 65535) * 1540483477 + (((o >>> 16) * 59797) << 16)),
            (o ^= o >>> 24),
            (n =
                ((o & 65535) * 1540483477 + (((o >>> 16) * 59797) << 16)) ^
                ((n & 65535) * 1540483477 + (((n >>> 16) * 59797) << 16))));
    switch (c) {
        case 3:
            n ^= (i.charCodeAt(a + 2) & 255) << 16;
        case 2:
            n ^= (i.charCodeAt(a + 1) & 255) << 8;
        case 1:
            ((n ^= i.charCodeAt(a) & 255),
                (n = (n & 65535) * 1540483477 + (((n >>> 16) * 59797) << 16)));
    }
    return (
        (n ^= n >>> 13),
        (n = (n & 65535) * 1540483477 + (((n >>> 16) * 59797) << 16)),
        ((n ^ (n >>> 15)) >>> 0).toString(36)
    );
}
function lv(i) {
    const n = i.length;
    if (n === qs) return i;
    for (let o = n; o < qs; o++) i += "0";
    return i;
}
function Mf(i, n, o = []) {
    return Qs + lv(iv(i + n));
}
function Af(i, n) {
    let o = "",
        a = "";
    for (const c in i) {
        const f = i[c];
        if (f === 0) {
            a += c + " ";
            continue;
        }
        const h = Array.isArray(f),
            p = n === "rtl" ? (h ? f[1] : f) + " " : (h ? f[0] : f) + " ";
        ((o += p), (a += p));
    }
    return [o.slice(0, -1), a.slice(0, -1)];
}
function uf(i, n) {
    const o = {};
    for (const a in i) {
        const [c, f] = Af(i[a], n);
        if (f === "") {
            o[a] = "";
            continue;
        }
        const h = Mf(f, n),
            p = h + (c === "" ? "" : " " + c);
        ((As[h] = [i[a], n]), (o[a] = p));
    }
    return o;
}
const cf = {};
function Ee() {
    let i = null,
        n = "",
        o = "";
    const a = new Array(arguments.length);
    for (let y = 0; y < arguments.length; y++) {
        const k = arguments[y];
        if (typeof k == "string" && k !== "") {
            const S = k.indexOf(Qs);
            if (S === -1) n += k + " ";
            else {
                const C = k.substr(S, rv);
                (S > 0 && (n += k.slice(0, S)), (o += C), (a[y] = C));
            }
        }
    }
    if (o === "") return n.slice(0, -1);
    const c = cf[o];
    if (c !== void 0) return n + c;
    const f = [];
    for (let y = 0; y < arguments.length; y++) {
        const k = a[y];
        if (k) {
            const S = As[k];
            S && (f.push(S[nv]), (i = S[ov]));
        }
    }
    const h = Object.assign.apply(Object, [{}].concat(f)),
        [p, m] = Af(h, i),
        v = Mf(m, i, a),
        b = v + " " + p;
    return ((cf[o] = b), (As[v] = [h, i]), n + b);
}
function sv(i) {
    return Array.isArray(i) ? i : [i];
}
function av(i, n, o, a) {
    const c = [];
    if (((a[Zn] = n), (a[tv] = String(o)), i)) for (const h in a) i.setAttribute(h, a[h]);
    function f(h) {
        return i != null && i.sheet ? i.sheet.insertRule(h, i.sheet.cssRules.length) : c.push(h);
    }
    return {
        elementAttributes: a,
        insertRule: f,
        element: i,
        bucketName: n,
        cssRules() {
            return i != null && i.sheet ? Array.from(i.sheet.cssRules).map((h) => h.cssText) : c;
        },
    };
}
const uv = ["r", "d", "l", "v", "w", "f", "i", "h", "a", "s", "k", "t", "m", "c"],
    ff = uv.reduce((i, n, o) => ((i[n] = o), i), {});
function cv(i, n, o) {
    return (i === "m" ? i + n : i) + o;
}
function fv(i, n, o, a, c = {}) {
    var f, h;
    const p = i === "m",
        m = (f = c.m) !== null && f !== void 0 ? f : "0",
        v = (h = c.p) !== null && h !== void 0 ? h : 0,
        b = cv(i, m, v);
    if (!a.stylesheets[b]) {
        const y = n && n.createElement("style"),
            k = av(y, i, v, Object.assign({}, a.styleElementAttributes, p && { media: m }));
        ((a.stylesheets[b] = k),
            n != null && n.head && y && n.head.insertBefore(y, hv(n, o, i, a, c)));
    }
    return a.stylesheets[b];
}
function dv(i, n, o) {
    var a, c;
    const f = n + ((a = o.m) !== null && a !== void 0 ? a : ""),
        h = i.getAttribute(Zn) + ((c = i.media) !== null && c !== void 0 ? c : "");
    return f === h;
}
function hv(i, n, o, a, c = {}) {
    var f, h;
    const p = ff[o],
        m = (f = c.m) !== null && f !== void 0 ? f : "",
        v = (h = c.p) !== null && h !== void 0 ? h : 0;
    let b = (E) => p - ff[E.getAttribute(Zn)],
        y = i.head.querySelectorAll(`[${Zn}]`);
    if (o === "m") {
        const E = i.head.querySelectorAll(`[${Zn}="${o}"]`);
        E.length && ((y = E), (b = (N) => a.compareMediaQueries(m, N.media)));
    }
    const k = (E) => (dv(E, o, c) ? v - Number(E.getAttribute("data-priority")) : b(E)),
        S = y.length;
    let C = S - 1;
    for (; C >= 0; ) {
        const E = y.item(C);
        if (k(E) > 0) return E.nextSibling;
        C--;
    }
    return S > 0 ? y.item(0) : n ? n.nextSibling : null;
}
function df(i, n) {
    try {
        i.insertRule(n);
    } catch {}
}
let pv = 0;
const vv = (i, n) => (i < n ? -1 : i > n ? 1 : 0);
function mv(i = typeof document > "u" ? void 0 : document, n = {}) {
    const {
            classNameHashSalt: o,
            unstable_filterCSSRule: a,
            insertionPoint: c,
            styleElementAttributes: f,
            compareMediaQueries: h = vv,
        } = n,
        p = {
            classNameHashSalt: o,
            insertionCache: {},
            stylesheets: {},
            styleElementAttributes: Object.freeze(f),
            compareMediaQueries: h,
            id: `d${pv++}`,
            insertCSSRules(m) {
                for (const v in m) {
                    const b = m[v];
                    for (let y = 0, k = b.length; y < k; y++) {
                        const [S, C] = sv(b[y]),
                            E = fv(v, i, c || null, p, C);
                        p.insertionCache[S] ||
                            ((p.insertionCache[S] = v), a ? a(S) && df(E, S) : df(E, S));
                    }
                }
            },
        };
    return p;
}
const qf = () => {
    const i = {};
    return function (o, a) {
        i[o.id] === void 0 && (o.insertCSSRules(a), (i[o.id] = !0));
    };
};
function Hf(i, n, o = qf) {
    const a = o();
    let c = null,
        f = null;
    function h(p) {
        const { dir: m, renderer: v } = p,
            b = m === "ltr";
        return (
            b ? c === null && (c = uf(i, m)) : f === null && (f = uf(i, m)),
            a(v, n),
            b ? c : f
        );
    }
    return h;
}
function gv(i, n, o, a = qf) {
    const c = a();
    function f(h) {
        const { dir: p, renderer: m } = h,
            v = p === "ltr" ? i : n || i;
        return (c(m, Array.isArray(o) ? { r: o } : o), v);
    }
    return f;
}
function yv() {
    return typeof window < "u" && !!(window.document && window.document.createElement);
}
var M = $s();
const Wf = Lf(M),
    Hs = Of({ __proto__: null, default: Wf }, [M]),
    hf = Hs.useInsertionEffect ? Hs.useInsertionEffect : void 0,
    Uf = () => {
        const i = {};
        return function (o, a) {
            if (hf && yv()) {
                hf(() => {
                    o.insertCSSRules(a);
                }, [o, a]);
                return;
            }
            i[o.id] === void 0 && (o.insertCSSRules(a), (i[o.id] = !0));
        };
    },
    wv = M.createContext(mv());
function Ei() {
    return M.useContext(wv);
}
const Vf = M.createContext("ltr"),
    bv = ({ children: i, dir: n }) => M.createElement(Vf.Provider, { value: n }, i);
function Kf() {
    return M.useContext(Vf);
}
function ve(i, n) {
    const o = Hf(i, n, Uf);
    return function () {
        const c = Kf(),
            f = Ei();
        return o({ dir: c, renderer: f });
    };
}
function no(i, n, o) {
    const a = gv(i, n, o, Uf);
    return function () {
        const f = Kf(),
            h = Ei();
        return a({ dir: f, renderer: h });
    };
}
const _v = { "<": "\\3C ", ">": "\\3E " };
function kv(i) {
    return i.replace(/[<>]/g, (n) => _v[n]);
}
function xv(i, n) {
    if (n) {
        const o = Object.keys(n).reduce((a, c) => `${a}--${c}: ${n[c]}; `, "");
        return `${i} { ${kv(o)} }`;
    }
    return `${i} {}`;
}
const $f = Symbol.for("fui.slotRenderFunction"),
    Ti = Symbol.for("fui.slotElementType"),
    Qf = Symbol.for("fui.slotClassNameProp");
function rt(i, n) {
    const { defaultProps: o, elementType: a } = n,
        c = Sv(i),
        f = {
            ...o,
            ...c,
            [Ti]: a,
            [Qf]: (c == null ? void 0 : c.className) || (o == null ? void 0 : o.className),
        };
    return (
        c &&
            typeof c.children == "function" &&
            ((f[$f] = c.children), (f.children = o == null ? void 0 : o.children)),
        f
    );
}
function eo(i, n) {
    if (!(i === null || (i === void 0 && !n.renderByDefault))) return rt(i, n);
}
function Sv(i) {
    return typeof i == "string" || typeof i == "number" || Bv(i) || M.isValidElement(i)
        ? { children: i }
        : i;
}
const Bv = (i) => typeof i == "object" && i !== null && Symbol.iterator in i;
function pf(i) {
    return !!(i != null && i.hasOwnProperty(Ti));
}
const _e = (...i) => {
        const n = {};
        for (const o of i) {
            const a = Array.isArray(o) ? o : Object.keys(o);
            for (const c of a) n[c] = 1;
        }
        return n;
    },
    Ev = _e([
        "onAuxClick",
        "onAnimationEnd",
        "onAnimationStart",
        "onCopy",
        "onCut",
        "onPaste",
        "onCompositionEnd",
        "onCompositionStart",
        "onCompositionUpdate",
        "onFocus",
        "onFocusCapture",
        "onBlur",
        "onBlurCapture",
        "onChange",
        "onInput",
        "onSubmit",
        "onLoad",
        "onError",
        "onKeyDown",
        "onKeyDownCapture",
        "onKeyPress",
        "onKeyUp",
        "onAbort",
        "onCanPlay",
        "onCanPlayThrough",
        "onDurationChange",
        "onEmptied",
        "onEncrypted",
        "onEnded",
        "onLoadedData",
        "onLoadedMetadata",
        "onLoadStart",
        "onPause",
        "onPlay",
        "onPlaying",
        "onProgress",
        "onRateChange",
        "onSeeked",
        "onSeeking",
        "onStalled",
        "onSuspend",
        "onTimeUpdate",
        "onVolumeChange",
        "onWaiting",
        "onClick",
        "onClickCapture",
        "onContextMenu",
        "onDoubleClick",
        "onDrag",
        "onDragEnd",
        "onDragEnter",
        "onDragExit",
        "onDragLeave",
        "onDragOver",
        "onDragStart",
        "onDrop",
        "onMouseDown",
        "onMouseDownCapture",
        "onMouseEnter",
        "onMouseLeave",
        "onMouseMove",
        "onMouseOut",
        "onMouseOver",
        "onMouseUp",
        "onMouseUpCapture",
        "onSelect",
        "onTouchCancel",
        "onTouchEnd",
        "onTouchMove",
        "onTouchStart",
        "onScroll",
        "onWheel",
        "onPointerCancel",
        "onPointerDown",
        "onPointerEnter",
        "onPointerLeave",
        "onPointerMove",
        "onPointerOut",
        "onPointerOver",
        "onPointerUp",
        "onGotPointerCapture",
        "onLostPointerCapture",
    ]),
    Tv = _e([
        "accessKey",
        "children",
        "className",
        "contentEditable",
        "dir",
        "draggable",
        "hidden",
        "htmlFor",
        "id",
        "lang",
        "popover",
        "focusgroup",
        "ref",
        "role",
        "style",
        "tabIndex",
        "title",
        "translate",
        "spellCheck",
        "name",
    ]),
    Cv = _e(["itemID", "itemProp", "itemRef", "itemScope", "itemType"]),
    Ae = _e(Tv, Ev, Cv),
    zv = _e(Ae, ["form"]),
    Gf = _e(Ae, ["height", "loop", "muted", "preload", "src", "width"]),
    Nv = _e(Gf, ["poster"]),
    Pv = _e(Ae, ["start"]),
    Fv = _e(Ae, ["value"]),
    Rv = _e(Ae, [
        "download",
        "href",
        "hrefLang",
        "media",
        "referrerPolicy",
        "rel",
        "target",
        "type",
    ]),
    jv = _e(Ae, ["dateTime"]),
    Ci = _e(Ae, [
        "autoFocus",
        "disabled",
        "form",
        "formAction",
        "formEncType",
        "formMethod",
        "formNoValidate",
        "formTarget",
        "popoverTarget",
        "popoverTargetAction",
        "type",
        "value",
    ]),
    Iv = _e(Ci, [
        "accept",
        "alt",
        "autoCorrect",
        "autoCapitalize",
        "autoComplete",
        "checked",
        "dirname",
        "form",
        "height",
        "inputMode",
        "list",
        "max",
        "maxLength",
        "min",
        "minLength",
        "multiple",
        "pattern",
        "placeholder",
        "readOnly",
        "required",
        "src",
        "step",
        "size",
        "type",
        "value",
        "width",
    ]),
    Dv = _e(Ci, [
        "autoCapitalize",
        "cols",
        "dirname",
        "form",
        "maxLength",
        "placeholder",
        "readOnly",
        "required",
        "rows",
        "wrap",
    ]),
    Ov = _e(Ci, ["form", "multiple", "required"]),
    Lv = _e(Ae, ["selected", "value"]),
    Mv = _e(Ae, ["cellPadding", "cellSpacing"]),
    Av = Ae,
    qv = _e(Ae, ["colSpan", "rowSpan", "scope"]),
    Hv = _e(Ae, ["colSpan", "headers", "rowSpan", "scope"]),
    Wv = _e(Ae, ["span"]),
    Uv = _e(Ae, ["span"]),
    Vv = _e(Ae, ["disabled", "form"]),
    Kv = _e(Ae, [
        "acceptCharset",
        "action",
        "encType",
        "encType",
        "method",
        "noValidate",
        "target",
    ]),
    $v = _e(Ae, [
        "allow",
        "allowFullScreen",
        "allowPaymentRequest",
        "allowTransparency",
        "csp",
        "height",
        "importance",
        "referrerPolicy",
        "sandbox",
        "src",
        "srcDoc",
        "width",
    ]),
    Qv = _e(Ae, ["alt", "crossOrigin", "height", "src", "srcSet", "useMap", "width"]),
    Gv = _e(Ae, ["open", "onCancel", "onClose"]);
function Xv(i, n, o) {
    const a = Array.isArray(n),
        c = {},
        f = Object.keys(i);
    for (const h of f)
        ((!a && n[h]) ||
            (a && n.indexOf(h) >= 0) ||
            h.indexOf("data-") === 0 ||
            h.indexOf("aria-") === 0) &&
            (!o || (o == null ? void 0 : o.indexOf(h)) === -1) &&
            (c[h] = i[h]);
    return c;
}
const Yv = {
    label: zv,
    audio: Gf,
    video: Nv,
    ol: Pv,
    li: Fv,
    a: Rv,
    button: Ci,
    input: Iv,
    textarea: Dv,
    select: Ov,
    option: Lv,
    table: Mv,
    tr: Av,
    th: qv,
    td: Hv,
    colGroup: Wv,
    col: Uv,
    fieldset: Vv,
    form: Kv,
    iframe: $v,
    img: Qv,
    time: jv,
    dialog: Gv,
};
function Xf(i, n, o) {
    const a = (i && Yv[i]) || Ae;
    return ((a.as = 1), Xv(n, a, o));
}
const Yf = ({ primarySlotTagName: i, props: n, excludedPropNames: o }) => ({
        root: { style: n.style, className: n.className },
        primary: Xf(i, n, [...(o || []), "style", "className"]),
    }),
    Xt = (i, n, o) => {
        var a;
        return Xf((a = n.as) !== null && a !== void 0 ? a : i, n, o);
    },
    Jf = M.createContext(void 0),
    Jv = Jf.Provider,
    Zv = M.createContext(void 0),
    e0 = Zv.Provider,
    t0 = M.createContext(void 0),
    r0 = t0.Provider,
    Zf = M.createContext(void 0),
    n0 = { targetDocument: typeof document == "object" ? document : void 0, dir: "ltr" },
    o0 = Zf.Provider;
function zi() {
    var i;
    return (i = M.useContext(Zf)) !== null && i !== void 0 ? i : n0;
}
const ed = M.createContext(void 0),
    i0 = ed.Provider;
function Gs() {
    var i;
    return (i = M.useContext(ed)) !== null && i !== void 0 ? i : {};
}
const Xs = M.createContext(void 0),
    l0 = () => {},
    s0 = Xs.Provider,
    jt = (i) => {
        var n, o;
        return (o = (n = M.useContext(Xs)) === null || n === void 0 ? void 0 : n[i]) !== null &&
            o !== void 0
            ? o
            : l0;
    };
function a0(i) {
    return typeof i == "function";
}
const Ys = (i) => {
    "use no memo";
    const [n, o] = M.useState(() =>
            i.defaultState === void 0
                ? i.initialState
                : u0(i.defaultState)
                  ? i.defaultState()
                  : i.defaultState
        ),
        a = M.useRef(i.state);
    M.useEffect(() => {
        a.current = i.state;
    }, [i.state]);
    const c = M.useCallback((f) => {
        a0(f) && f(a.current);
    }, []);
    return c0(i.state) ? [i.state, c] : [n, o];
};
function u0(i) {
    return typeof i == "function";
}
const c0 = (i) => {
    "use no memo";
    const [n] = M.useState(() => i !== void 0);
    return n;
};
function td() {
    return typeof window < "u" && !!(window.document && window.document.createElement);
}
const f0 = { current: 0 },
    d0 = M.createContext(void 0);
function h0() {
    var i;
    return (i = M.useContext(d0)) !== null && i !== void 0 ? i : f0;
}
const Ni = td() ? M.useLayoutEffect : M.useEffect,
    br = (i) => {
        const n = M.useRef(() => {
            throw new Error("Cannot call an event handler while rendering");
        });
        return (
            Ni(() => {
                n.current = i;
            }, [i]),
            M.useCallback(
                (...o) => {
                    const a = n.current;
                    return a(...o);
                },
                [n]
            )
        );
    },
    rd = M.createContext(void 0);
rd.Provider;
function p0() {
    return M.useContext(rd) || "";
}
function v0(i = "fui-", n) {
    "use no memo";
    const o = h0(),
        a = p0(),
        c = Hs.useId;
    if (c) {
        const f = c(),
            h = M.useMemo(() => f.replace(/:/g, ""), [f]);
        return n || `${a}${i}${h}`;
    }
    return M.useMemo(() => `${a}${i}${++o.current}`, [a, i, n, o]);
}
function Js(...i) {
    "use no memo";
    const n = M.useCallback(
        (o) => {
            n.current = o;
            for (const a of i) typeof a == "function" ? a(o) : a && (a.current = o);
        },
        [...i]
    );
    return n;
}
function vf(i, n) {
    var o;
    const a = i;
    var c;
    return !!(
        !(a == null || (o = a.ownerDocument) === null || o === void 0) &&
        o.defaultView &&
        a instanceof
            a.ownerDocument.defaultView[(c = void 0) !== null && c !== void 0 ? c : "HTMLElement"]
    );
}
function m0(i) {
    return i && !!i._virtual;
}
function g0(i) {
    return (m0(i) && i._virtual.parent) || null;
}
function y0(i, n = {}) {
    if (!i) return null;
    if (!n.skipVirtual) {
        const a = g0(i);
        if (a) return a;
    }
    const o = i.parentNode;
    return o && o.nodeType === 11 ? o.host : o;
}
function w0(i, n) {
    return { ...n, [Ti]: i };
}
function nd(i, n) {
    return function (a, c, f, h, p) {
        return pf(c) ? n(w0(a, c), null, f, h, p) : pf(a) ? n(a, c, f, h, p) : i(a, c, f, h, p);
    };
}
function od(i) {
    const { as: n, [Qf]: o, [Ti]: a, [$f]: c, ...f } = i,
        h = f,
        p = typeof a == "string" ? (n ?? a) : a;
    return (
        typeof p != "string" && n && (h.as = n),
        { elementType: p, props: h, renderFunction: c }
    );
}
const Dr = $p,
    b0 = (i, n, o) => {
        const { elementType: a, renderFunction: c, props: f } = od(i),
            h = { ...f, ...n };
        return c ? Dr.jsx(M.Fragment, { children: c(a, h) }, o) : Dr.jsx(a, h, o);
    },
    _0 = (i, n, o) => {
        const { elementType: a, renderFunction: c, props: f } = od(i),
            h = { ...f, ...n };
        return c
            ? Dr.jsx(
                  M.Fragment,
                  {
                      children: c(a, {
                          ...h,
                          children: Dr.jsxs(M.Fragment, { children: h.children }, void 0),
                      }),
                  },
                  o
              )
            : Dr.jsxs(a, h, o);
    },
    ye = nd(Dr.jsx, b0),
    to = nd(Dr.jsxs, _0),
    id = M.createContext(void 0),
    k0 = {},
    x0 = id.Provider,
    S0 = () => {
        const i = M.useContext(id);
        return i ?? k0;
    },
    B0 = (i, n) =>
        ye(o0, {
            value: n.provider,
            children: ye(Jv, {
                value: n.theme,
                children: ye(e0, {
                    value: n.themeClassName,
                    children: ye(s0, {
                        value: n.customStyleHooks_unstable,
                        children: ye(r0, {
                            value: n.tooltip,
                            children: ye(bv, {
                                dir: n.textDirection,
                                children: ye(x0, {
                                    value: n.iconDirection,
                                    children: ye(i0, {
                                        value: n.overrides_unstable,
                                        children: to(i.root, {
                                            children: [
                                                td()
                                                    ? null
                                                    : ye("style", {
                                                          dangerouslySetInnerHTML: {
                                                              __html: i.serverStyleProps.cssRule,
                                                          },
                                                          ...i.serverStyleProps.attributes,
                                                      }),
                                                i.root.children,
                                            ],
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            }),
        });
var E0 = typeof WeakRef < "u",
    mf = class {
        constructor(i) {
            E0 && typeof i == "object" ? (this._weakRef = new WeakRef(i)) : (this._instance = i);
        }
        deref() {
            var i, n;
            let o;
            return (
                this._weakRef
                    ? ((o = (i = this._weakRef) == null ? void 0 : i.deref()),
                      o || delete this._weakRef)
                    : ((o = this._instance),
                      (n = o == null ? void 0 : o.isDisposed) != null &&
                          n.call(o) &&
                          delete this._instance),
                o
            );
        }
    },
    Rt = "keyborg:focusin",
    ro = "keyborg:focusout";
function T0(i) {
    const n = i.HTMLElement,
        o = n.prototype.focus;
    let a = !1;
    return (
        (n.prototype.focus = function () {
            a = !0;
        }),
        i.document.createElement("button").focus(),
        (n.prototype.focus = o),
        a
    );
}
var Ps = !1;
function kr(i) {
    const n = i.focus;
    n.__keyborgNativeFocus ? n.__keyborgNativeFocus.call(i) : i.focus();
}
function C0(i) {
    const n = i;
    Ps || (Ps = T0(n));
    const o = n.HTMLElement.prototype.focus;
    if (o.__keyborgNativeFocus) return;
    n.HTMLElement.prototype.focus = m;
    const a = new Set(),
        c = (b) => {
            const y = b.target;
            if (!y) return;
            const k = new CustomEvent(ro, {
                cancelable: !0,
                bubbles: !0,
                composed: !0,
                detail: { originalEvent: b },
            });
            y.dispatchEvent(k);
        },
        f = (b) => {
            const y = b.target;
            if (!y) return;
            let k = b.composedPath()[0];
            const S = new Set();
            for (; k; )
                k.nodeType === Node.DOCUMENT_FRAGMENT_NODE
                    ? (S.add(k), (k = k.host))
                    : (k = k.parentNode);
            for (const C of a) {
                const E = C.deref();
                (!E || !S.has(E)) &&
                    (a.delete(C),
                    E &&
                        (E.removeEventListener("focusin", f, !0),
                        E.removeEventListener("focusout", c, !0)));
            }
            h(y, b.relatedTarget || void 0);
        },
        h = (b, y, k) => {
            var S;
            const C = b.shadowRoot;
            if (C) {
                for (const q of a) if (q.deref() === C) return;
                (C.addEventListener("focusin", f, !0),
                    C.addEventListener("focusout", c, !0),
                    a.add(new mf(C)));
                return;
            }
            const E = { relatedTarget: y, originalEvent: k },
                N = new CustomEvent(Rt, { cancelable: !0, bubbles: !0, composed: !0, detail: E });
            ((N.details = E),
                (Ps || p.lastFocusedProgrammatically) &&
                    ((E.isFocusedProgrammatically =
                        b === ((S = p.lastFocusedProgrammatically) == null ? void 0 : S.deref())),
                    (p.lastFocusedProgrammatically = void 0)),
                b.dispatchEvent(N));
        },
        p = (n.__keyborgData = { focusInHandler: f, focusOutHandler: c, shadowTargets: a });
    (n.document.addEventListener("focusin", n.__keyborgData.focusInHandler, !0),
        n.document.addEventListener("focusout", n.__keyborgData.focusOutHandler, !0));
    function m() {
        const b = n.__keyborgData;
        return (b && (b.lastFocusedProgrammatically = new mf(this)), o.apply(this, arguments));
    }
    let v = n.document.activeElement;
    for (; v && v.shadowRoot; ) (h(v), (v = v.shadowRoot.activeElement));
    m.__keyborgNativeFocus = o;
}
function z0(i) {
    const n = i,
        o = n.HTMLElement.prototype,
        a = o.focus.__keyborgNativeFocus,
        c = n.__keyborgData;
    if (c) {
        (n.document.removeEventListener("focusin", c.focusInHandler, !0),
            n.document.removeEventListener("focusout", c.focusOutHandler, !0));
        for (const f of c.shadowTargets) {
            const h = f.deref();
            h &&
                (h.removeEventListener("focusin", c.focusInHandler, !0),
                h.removeEventListener("focusout", c.focusOutHandler, !0));
        }
        (c.shadowTargets.clear(), delete n.__keyborgData);
    }
    a && (o.focus = a);
}
var N0 = 500,
    ld = 0,
    P0 = class {
        constructor(i, n) {
            ((this._isNavigatingWithKeyboard_DO_NOT_USE = !1),
                (this._onFocusIn = (a) => {
                    if (this._isMouseOrTouchUsedTimer || this.isNavigatingWithKeyboard) return;
                    const c = a.detail;
                    c.relatedTarget &&
                        (c.isFocusedProgrammatically ||
                            c.isFocusedProgrammatically === void 0 ||
                            (this.isNavigatingWithKeyboard = !0));
                }),
                (this._onMouseDown = (a) => {
                    a.buttons === 0 ||
                        (a.clientX === 0 &&
                            a.clientY === 0 &&
                            a.screenX === 0 &&
                            a.screenY === 0) ||
                        this._onMouseOrTouch();
                }),
                (this._onMouseOrTouch = () => {
                    const a = this._win;
                    (a &&
                        (this._isMouseOrTouchUsedTimer &&
                            a.clearTimeout(this._isMouseOrTouchUsedTimer),
                        (this._isMouseOrTouchUsedTimer = a.setTimeout(() => {
                            delete this._isMouseOrTouchUsedTimer;
                        }, 1e3))),
                        (this.isNavigatingWithKeyboard = !1));
                }),
                (this._onKeyDown = (a) => {
                    this.isNavigatingWithKeyboard
                        ? this._shouldDismissKeyboardNavigation(a) && this._scheduleDismiss()
                        : this._shouldTriggerKeyboardNavigation(a) &&
                          (this.isNavigatingWithKeyboard = !0);
                }),
                (this.id = "c" + ++ld),
                (this._win = i));
            const o = i.document;
            if (n) {
                const a = n.triggerKeys,
                    c = n.dismissKeys;
                (a != null && a.length && (this._triggerKeys = new Set(a)),
                    c != null && c.length && (this._dismissKeys = new Set(c)));
            }
            (o.addEventListener(Rt, this._onFocusIn, !0),
                o.addEventListener("mousedown", this._onMouseDown, !0),
                i.addEventListener("keydown", this._onKeyDown, !0),
                o.addEventListener("touchstart", this._onMouseOrTouch, !0),
                o.addEventListener("touchend", this._onMouseOrTouch, !0),
                o.addEventListener("touchcancel", this._onMouseOrTouch, !0),
                C0(i));
        }
        get isNavigatingWithKeyboard() {
            return this._isNavigatingWithKeyboard_DO_NOT_USE;
        }
        set isNavigatingWithKeyboard(i) {
            this._isNavigatingWithKeyboard_DO_NOT_USE !== i &&
                ((this._isNavigatingWithKeyboard_DO_NOT_USE = i), this.update());
        }
        dispose() {
            const i = this._win;
            if (i) {
                (this._isMouseOrTouchUsedTimer &&
                    (i.clearTimeout(this._isMouseOrTouchUsedTimer),
                    (this._isMouseOrTouchUsedTimer = void 0)),
                    this._dismissTimer &&
                        (i.clearTimeout(this._dismissTimer), (this._dismissTimer = void 0)),
                    z0(i));
                const n = i.document;
                (n.removeEventListener(Rt, this._onFocusIn, !0),
                    n.removeEventListener("mousedown", this._onMouseDown, !0),
                    i.removeEventListener("keydown", this._onKeyDown, !0),
                    n.removeEventListener("touchstart", this._onMouseOrTouch, !0),
                    n.removeEventListener("touchend", this._onMouseOrTouch, !0),
                    n.removeEventListener("touchcancel", this._onMouseOrTouch, !0),
                    delete this._win);
            }
        }
        isDisposed() {
            return !!this._win;
        }
        update() {
            var i, n;
            const o =
                (n = (i = this._win) == null ? void 0 : i.__keyborg) == null ? void 0 : n.refs;
            if (o) for (const a of Object.keys(o)) Zs.update(o[a], this.isNavigatingWithKeyboard);
        }
        _shouldTriggerKeyboardNavigation(i) {
            var n;
            if (i.key === "Tab") return !0;
            const o = (n = this._win) == null ? void 0 : n.document.activeElement,
                a = !this._triggerKeys || this._triggerKeys.has(i.keyCode),
                c = o && (o.tagName === "INPUT" || o.tagName === "TEXTAREA" || o.isContentEditable);
            return a && !c;
        }
        _shouldDismissKeyboardNavigation(i) {
            var n;
            return (n = this._dismissKeys) == null ? void 0 : n.has(i.keyCode);
        }
        _scheduleDismiss() {
            const i = this._win;
            if (i) {
                this._dismissTimer &&
                    (i.clearTimeout(this._dismissTimer), (this._dismissTimer = void 0));
                const n = i.document.activeElement;
                this._dismissTimer = i.setTimeout(() => {
                    this._dismissTimer = void 0;
                    const o = i.document.activeElement;
                    n && o && n === o && (this.isNavigatingWithKeyboard = !1);
                }, N0);
            }
        }
    },
    Zs = class sd {
        constructor(n, o) {
            ((this._cb = []), (this._id = "k" + ++ld), (this._win = n));
            const a = n.__keyborg;
            a
                ? ((this._core = a.core), (a.refs[this._id] = this))
                : ((this._core = new P0(n, o)),
                  (n.__keyborg = { core: this._core, refs: { [this._id]: this } }));
        }
        static create(n, o) {
            return new sd(n, o);
        }
        static dispose(n) {
            n.dispose();
        }
        static update(n, o) {
            n._cb.forEach((a) => a(o));
        }
        dispose() {
            var n;
            const o = (n = this._win) == null ? void 0 : n.__keyborg;
            (o != null &&
                o.refs[this._id] &&
                (delete o.refs[this._id],
                Object.keys(o.refs).length === 0 && (o.core.dispose(), delete this._win.__keyborg)),
                (this._cb = []),
                delete this._core,
                delete this._win);
        }
        isNavigatingWithKeyboard() {
            var n;
            return !!((n = this._core) != null && n.isNavigatingWithKeyboard);
        }
        subscribe(n) {
            this._cb.push(n);
        }
        unsubscribe(n) {
            const o = this._cb.indexOf(n);
            o >= 0 && this._cb.splice(o, 1);
        }
        setVal(n) {
            this._core && (this._core.isNavigatingWithKeyboard = n);
        }
    };
function ea(i, n) {
    return Zs.create(i, n);
}
function ta(i) {
    Zs.dispose(i);
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 *//*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const _r = "data-tabster",
    F0 = "data-tabster-dummy",
    ad = `:is(${["a[href]", "button", "input", "select", "textarea", "*[tabindex]", "*[contenteditable]", "details > summary", "audio[controls]", "video[controls]"].join(", ")}):not(:disabled)`,
    Fs = { EscapeGroupper: 1, Restorer: 2, Deloser: 3 },
    gr = { Invisible: 0, PartiallyVisible: 1, Visible: 2 },
    Ft = { Both: 0, Vertical: 1, Horizontal: 2, Grid: 3, GridLinear: 4 },
    De = {
        ArrowUp: 1,
        ArrowDown: 2,
        ArrowLeft: 3,
        ArrowRight: 4,
        PageUp: 5,
        PageDown: 6,
        Home: 7,
        End: 8,
    },
    R0 = { Outside: 2 };
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ function At(i, n) {
    var o;
    return (o = i.storageEntry(n)) === null || o === void 0 ? void 0 : o.tabster;
}
function ud(i, n, o) {
    var a, c, f;
    const h = o || i._noop ? void 0 : n.getAttribute(_r);
    let p = i.storageEntry(n),
        m;
    if (h)
        if (h !== ((a = p == null ? void 0 : p.attr) === null || a === void 0 ? void 0 : a.string))
            try {
                const k = JSON.parse(h);
                if (typeof k != "object")
                    throw new Error(`Value is not a JSON object, got '${h}'.`);
                m = { string: h, object: k };
            } catch {}
        else return;
    else if (!p) return;
    (p || (p = i.storageEntry(n, !0)), p.tabster || (p.tabster = {}));
    const v = p.tabster || {},
        b = ((c = p.attr) === null || c === void 0 ? void 0 : c.object) || {},
        y = (m == null ? void 0 : m.object) || {};
    for (const k of Object.keys(b))
        if (!y[k]) {
            if (k === "root") {
                const S = v[k];
                S && i.root.onRoot(S, !0);
            }
            switch (k) {
                case "deloser":
                case "root":
                case "groupper":
                case "modalizer":
                case "restorer":
                case "mover":
                    const S = v[k];
                    S && (S.dispose(), delete v[k]);
                    break;
                case "observed":
                    (delete v[k],
                        i.observedElement && i.observedElement.onObservedElementUpdate(n));
                    break;
                case "focusable":
                case "outline":
                case "uncontrolled":
                case "sys":
                    delete v[k];
                    break;
            }
        }
    for (const k of Object.keys(y)) {
        const S = y.sys;
        switch (k) {
            case "deloser":
                v.deloser
                    ? v.deloser.setProps(y.deloser)
                    : i.deloser && (v.deloser = i.deloser.createDeloser(n, y.deloser));
                break;
            case "root":
                (v.root ? v.root.setProps(y.root) : (v.root = i.root.createRoot(n, y.root, S)),
                    i.root.onRoot(v.root));
                break;
            case "modalizer":
                {
                    let C;
                    const E = i.modalizer;
                    if (v.modalizer) {
                        const N = y.modalizer,
                            q = N.id;
                        q &&
                        ((f = b == null ? void 0 : b.modalizer) === null || f === void 0
                            ? void 0
                            : f.id) !== q
                            ? (v.modalizer.dispose(), (C = N))
                            : v.modalizer.setProps(N);
                    } else E && (C = y.modalizer);
                    E && C && (v.modalizer = E.createModalizer(n, C, S));
                }
                break;
            case "restorer":
                v.restorer
                    ? v.restorer.setProps(y.restorer)
                    : i.restorer &&
                      y.restorer &&
                      (v.restorer = i.restorer.createRestorer(n, y.restorer));
                break;
            case "focusable":
                v.focusable = y.focusable;
                break;
            case "groupper":
                v.groupper
                    ? v.groupper.setProps(y.groupper)
                    : i.groupper && (v.groupper = i.groupper.createGroupper(n, y.groupper, S));
                break;
            case "mover":
                v.mover
                    ? v.mover.setProps(y.mover)
                    : i.mover && (v.mover = i.mover.createMover(n, y.mover, S));
                break;
            case "observed":
                i.observedElement &&
                    ((v.observed = y.observed), i.observedElement.onObservedElementUpdate(n));
                break;
            case "uncontrolled":
                v.uncontrolled = y.uncontrolled;
                break;
            case "outline":
                i.outline && (v.outline = y.outline);
                break;
            case "sys":
                v.sys = y.sys;
                break;
            default:
                console.error(`Unknown key '${k}' in data-tabster attribute value.`);
        }
    }
    m
        ? (p.attr = m)
        : (Object.keys(v).length === 0 && (delete p.tabster, delete p.attr), i.storageEntry(n, !1));
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const j0 = "tabster:focusin",
    I0 = "tabster:focusout",
    D0 = "tabster:movefocus",
    O0 = "tabster:mover:state",
    gf = "tabster:mover:movefocus",
    yf = "tabster:mover:memorized-element",
    L0 = "tabster:root:focus",
    M0 = "tabster:root:blur",
    A0 = typeof CustomEvent < "u" ? CustomEvent : function () {};
class cn extends A0 {
    constructor(n, o) {
        (super(n, { bubbles: !0, cancelable: !0, composed: !0, detail: o }), (this.details = o));
    }
}
class q0 extends cn {
    constructor(n) {
        super(j0, n);
    }
}
class H0 extends cn {
    constructor(n) {
        super(I0, n);
    }
}
class un extends cn {
    constructor(n) {
        super(D0, n);
    }
}
class wf extends cn {
    constructor(n) {
        super(O0, n);
    }
}
class W0 extends cn {
    constructor(n) {
        super(L0, n);
    }
}
class U0 extends cn {
    constructor(n) {
        super(M0, n);
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const V0 = (i) => new MutationObserver(i),
    K0 = (i, n, o, a) => i.createTreeWalker(n, o, a),
    $0 = (i) => (i ? i.parentNode : null),
    Q0 = (i) => (i ? i.parentElement : null),
    G0 = (i, n) => !!(n && i != null && i.contains(n)),
    X0 = (i) => i.activeElement,
    Y0 = (i, n) => i.querySelector(n),
    J0 = (i, n) => Array.prototype.slice.call(i.querySelectorAll(n), 0),
    Z0 = (i, n) => i.getElementById(n),
    em = (i) => (i == null ? void 0 : i.firstChild) || null,
    tm = (i) => (i == null ? void 0 : i.lastChild) || null,
    rm = (i) => (i == null ? void 0 : i.nextSibling) || null,
    nm = (i) => (i == null ? void 0 : i.previousSibling) || null,
    om = (i) => (i == null ? void 0 : i.firstElementChild) || null,
    im = (i) => (i == null ? void 0 : i.lastElementChild) || null,
    lm = (i) => (i == null ? void 0 : i.nextElementSibling) || null,
    sm = (i) => (i == null ? void 0 : i.previousElementSibling) || null,
    am = (i, n) => i.appendChild(n),
    um = (i, n, o) => i.insertBefore(n, o),
    cm = (i) => {
        var n;
        return ((n = i.ownerDocument) === null || n === void 0 ? void 0 : n.getSelection()) || null;
    },
    fm = (i, n) => i.ownerDocument.getElementsByName(n),
    K = {
        createMutationObserver: V0,
        createTreeWalker: K0,
        getParentNode: $0,
        getParentElement: Q0,
        nodeContains: G0,
        getActiveElement: X0,
        querySelector: Y0,
        querySelectorAll: J0,
        getElementById: Z0,
        getFirstChild: em,
        getLastChild: tm,
        getNextSibling: rm,
        getPreviousSibling: nm,
        getFirstElementChild: om,
        getLastElementChild: im,
        getNextElementSibling: lm,
        getPreviousElementSibling: sm,
        appendChild: am,
        insertBefore: um,
        getSelection: cm,
        getElementsByName: fm,
    };
function dm(i) {
    for (const n of Object.keys(i)) K[n] = i[n];
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ let Ws;
const bf =
    typeof DOMRect < "u"
        ? DOMRect
        : class {
              constructor(i, n, o, a) {
                  ((this.left = i || 0),
                      (this.top = n || 0),
                      (this.right = (i || 0) + (o || 0)),
                      (this.bottom = (n || 0) + (a || 0)));
              }
          };
let hm = 0;
try {
    (document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT), (Ws = !1));
} catch {
    Ws = !0;
}
const Rs = 100;
function Yt(i) {
    const n = i();
    let o = n.__tabsterInstanceContext;
    return (
        o ||
            ((o = {
                elementByUId: {},
                basics: { Promise: n.Promise || void 0, WeakRef: n.WeakRef || void 0 },
                containerBoundingRectCache: {},
                lastContainerBoundingRectCacheId: 0,
                fakeWeakRefs: [],
                fakeWeakRefsStarted: !1,
            }),
            (n.__tabsterInstanceContext = o)),
        o
    );
}
function pm(i) {
    const n = i.__tabsterInstanceContext;
    n &&
        ((n.elementByUId = {}),
        delete n.WeakRef,
        (n.containerBoundingRectCache = {}),
        n.containerBoundingRectCacheTimer && i.clearTimeout(n.containerBoundingRectCacheTimer),
        n.fakeWeakRefsTimer && i.clearTimeout(n.fakeWeakRefsTimer),
        (n.fakeWeakRefs = []),
        delete i.__tabsterInstanceContext);
}
function vm(i) {
    const n = i.__tabsterInstanceContext;
    return new ((n == null ? void 0 : n.basics.WeakMap) || WeakMap)();
}
function mm(i) {
    return !!i.querySelector(ad);
}
class cd {
    constructor(n) {
        this._target = n;
    }
    deref() {
        return this._target;
    }
    static cleanup(n, o) {
        return n._target
            ? o || !na(n._target.ownerDocument, n._target)
                ? (delete n._target, !0)
                : !1
            : !0;
    }
}
class Gt {
    constructor(n, o, a) {
        const c = Yt(n);
        let f;
        (c.WeakRef ? (f = new c.WeakRef(o)) : ((f = new cd(o)), c.fakeWeakRefs.push(f)),
            (this._ref = f),
            (this._data = a));
    }
    get() {
        const n = this._ref;
        let o;
        return (n && ((o = n.deref()), o || delete this._ref), o);
    }
    getData() {
        return this._data;
    }
}
function fd(i, n) {
    const o = Yt(i);
    o.fakeWeakRefs = o.fakeWeakRefs.filter((a) => !cd.cleanup(a, n));
}
function dd(i) {
    const n = Yt(i);
    (n.fakeWeakRefsStarted || ((n.fakeWeakRefsStarted = !0), (n.WeakRef = km(n))),
        n.fakeWeakRefsTimer ||
            (n.fakeWeakRefsTimer = i().setTimeout(() => {
                ((n.fakeWeakRefsTimer = void 0), fd(i), dd(i));
            }, 120 * 1e3)));
}
function gm(i) {
    const n = Yt(i);
    ((n.fakeWeakRefsStarted = !1),
        n.fakeWeakRefsTimer &&
            (i().clearTimeout(n.fakeWeakRefsTimer),
            (n.fakeWeakRefsTimer = void 0),
            (n.fakeWeakRefs = [])));
}
function ra(i, n, o) {
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const a = Ws ? o : { acceptNode: o };
    return K.createTreeWalker(i, n, NodeFilter.SHOW_ELEMENT, a, !1);
}
function hd(i, n) {
    let o = n.__tabsterCacheId;
    const a = Yt(i),
        c = o ? a.containerBoundingRectCache[o] : void 0;
    if (c) return c.rect;
    const f = n.ownerDocument && n.ownerDocument.documentElement;
    if (!f) return new bf();
    let h = 0,
        p = 0,
        m = f.clientWidth,
        v = f.clientHeight;
    if (n !== f) {
        const y = n.getBoundingClientRect();
        ((h = Math.max(h, y.left)),
            (p = Math.max(p, y.top)),
            (m = Math.min(m, y.right)),
            (v = Math.min(v, y.bottom)));
    }
    const b = new bf(h < m ? h : -1, p < v ? p : -1, h < m ? m - h : 0, p < v ? v - p : 0);
    return (
        o || ((o = "r-" + ++a.lastContainerBoundingRectCacheId), (n.__tabsterCacheId = o)),
        (a.containerBoundingRectCache[o] = { rect: b, element: n }),
        a.containerBoundingRectCacheTimer ||
            (a.containerBoundingRectCacheTimer = window.setTimeout(() => {
                a.containerBoundingRectCacheTimer = void 0;
                for (const y of Object.keys(a.containerBoundingRectCache))
                    delete a.containerBoundingRectCache[y].element.__tabsterCacheId;
                a.containerBoundingRectCache = {};
            }, 50)),
        b
    );
}
function _f(i, n, o) {
    const a = pd(n);
    if (!a) return !1;
    const c = hd(i, a),
        f = n.getBoundingClientRect(),
        h = f.height * (1 - o),
        p = Math.max(0, c.top - f.top),
        m = Math.max(0, f.bottom - c.bottom),
        v = p + m;
    return v === 0 || v <= h;
}
function ym(i, n, o) {
    const a = pd(n);
    if (a) {
        const c = hd(i, a),
            f = n.getBoundingClientRect();
        o ? (a.scrollTop += f.top - c.top) : (a.scrollTop += f.bottom - c.bottom);
    }
}
function pd(i) {
    const n = i.ownerDocument;
    if (n) {
        for (let o = K.getParentElement(i); o; o = K.getParentElement(o))
            if (o.scrollWidth > o.clientWidth || o.scrollHeight > o.clientHeight) return o;
        return n.documentElement;
    }
    return null;
}
function wm(i) {
    i.__shouldIgnoreFocus = !0;
}
function vd(i) {
    return !!i.__shouldIgnoreFocus;
}
function bm(i) {
    const n = new Uint32Array(4);
    if (i.crypto && i.crypto.getRandomValues) i.crypto.getRandomValues(n);
    else if (i.msCrypto && i.msCrypto.getRandomValues) i.msCrypto.getRandomValues(n);
    else for (let a = 0; a < n.length; a++) n[a] = 4294967295 * Math.random();
    const o = [];
    for (let a = 0; a < n.length; a++) o.push(n[a].toString(36));
    return (
        o.push("|"),
        o.push((++hm).toString(36)),
        o.push("|"),
        o.push(Date.now().toString(36)),
        o.join("")
    );
}
function _i(i, n) {
    const o = Yt(i);
    let a = n.__tabsterElementUID;
    return (
        a || (a = n.__tabsterElementUID = bm(i())),
        !o.elementByUId[a] && na(n.ownerDocument, n) && (o.elementByUId[a] = new Gt(i, n)),
        a
    );
}
function kf(i, n) {
    const o = Yt(i);
    for (const a of Object.keys(o.elementByUId)) {
        const c = o.elementByUId[a],
            f = c && c.get();
        (f && n && !K.nodeContains(n, f)) || delete o.elementByUId[a];
    }
}
function na(i, n) {
    return K.nodeContains(i == null ? void 0 : i.body, n);
}
function md(i, n) {
    const o = i.matches || i.matchesSelector || i.msMatchesSelector || i.webkitMatchesSelector;
    return o && o.call(i, n);
}
function _m(i) {
    const n = Yt(i);
    if (n.basics.Promise) return n.basics.Promise;
    throw new Error("No Promise defined.");
}
function km(i) {
    return i.basics.WeakRef;
}
let xm = 0;
class gd {
    constructor(n, o, a) {
        const c = n.getWindow;
        ((this._tabster = n),
            (this._element = new Gt(c, o)),
            (this._props = { ...a }),
            (this.id = "i" + ++xm));
    }
    getElement() {
        return this._element.get();
    }
    getProps() {
        return this._props;
    }
    setProps(n) {
        this._props = { ...n };
    }
}
class xi {
    constructor(n, o, a, c, f) {
        var h;
        ((this._focusIn = (b) => {
            if (this._fixedTarget) {
                const k = this._fixedTarget.get();
                k && kr(k);
                return;
            }
            const y = this.input;
            if (this.onFocusIn && y) {
                const k = b.relatedTarget;
                this.onFocusIn(this, this._isBackward(!0, y, k), k);
            }
        }),
            (this._focusOut = (b) => {
                if (this._fixedTarget) return;
                this.useDefaultAction = !1;
                const y = this.input;
                if (this.onFocusOut && y) {
                    const k = b.relatedTarget;
                    this.onFocusOut(this, this._isBackward(!1, y, k), k);
                }
            }));
        const p = n(),
            m = p.document.createElement("i");
        ((m.tabIndex = 0),
            m.setAttribute("role", "none"),
            m.setAttribute(F0, ""),
            m.setAttribute("aria-hidden", "true"));
        const v = m.style;
        ((v.position = "fixed"),
            (v.width = v.height = "1px"),
            (v.opacity = "0.001"),
            (v.zIndex = "-1"),
            v.setProperty("content-visibility", "hidden"),
            wm(m),
            (this.input = m),
            (this.isFirst = a.isFirst),
            (this.isOutside = o),
            (this._isPhantom = (h = a.isPhantom) !== null && h !== void 0 ? h : !1),
            (this._fixedTarget = f),
            m.addEventListener("focusin", this._focusIn),
            m.addEventListener("focusout", this._focusOut),
            (m.__tabsterDummyContainer = c),
            this._isPhantom &&
                ((this._disposeTimer = p.setTimeout(() => {
                    (delete this._disposeTimer, this.dispose());
                }, 0)),
                (this._clearDisposeTimeout = () => {
                    (this._disposeTimer &&
                        (p.clearTimeout(this._disposeTimer), delete this._disposeTimer),
                        delete this._clearDisposeTimeout);
                })));
    }
    dispose() {
        var n;
        this._clearDisposeTimeout && this._clearDisposeTimeout();
        const o = this.input;
        o &&
            (delete this._fixedTarget,
            delete this.onFocusIn,
            delete this.onFocusOut,
            delete this.input,
            o.removeEventListener("focusin", this._focusIn),
            o.removeEventListener("focusout", this._focusOut),
            delete o.__tabsterDummyContainer,
            (n = K.getParentNode(o)) === null || n === void 0 || n.removeChild(o));
    }
    setTopLeft(n, o) {
        var a;
        const c = (a = this.input) === null || a === void 0 ? void 0 : a.style;
        c && ((c.top = `${n}px`), (c.left = `${o}px`));
    }
    _isBackward(n, o, a) {
        return n && !a
            ? !this.isFirst
            : !!(a && o.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
    }
}
const yd = { Root: 1, Mover: 3 };
class Si {
    constructor(n, o, a, c, f, h) {
        ((this._element = o), (this._instance = new Bm(n, o, this, a, c, f, h)));
    }
    _setHandlers(n, o) {
        ((this._onFocusIn = n), (this._onFocusOut = o));
    }
    moveOut(n) {
        var o;
        (o = this._instance) === null || o === void 0 || o.moveOut(n);
    }
    moveOutWithDefaultAction(n, o) {
        var a;
        (a = this._instance) === null || a === void 0 || a.moveOutWithDefaultAction(n, o);
    }
    getHandler(n) {
        return n ? this._onFocusIn : this._onFocusOut;
    }
    setTabbable(n) {
        var o;
        (o = this._instance) === null || o === void 0 || o.setTabbable(this, n);
    }
    dispose() {
        (this._instance && (this._instance.dispose(this), delete this._instance),
            delete this._onFocusIn,
            delete this._onFocusOut);
    }
    static moveWithPhantomDummy(n, o, a, c, f) {
        const p = new xi(n.getWindow, !0, { isPhantom: !0, isFirst: !0 }).input;
        if (p) {
            let m, v;
            if (o.tagName === "BODY")
                ((m = o), (v = (a && c) || (!a && !c) ? K.getFirstElementChild(o) : null));
            else {
                a && (!c || (c && !n.focusable.isFocusable(o, !1, !0, !0)))
                    ? ((m = o), (v = c ? o.firstElementChild : null))
                    : ((m = K.getParentElement(o)),
                      (v = (a && c) || (!a && !c) ? o : K.getNextElementSibling(o)));
                let b, y;
                do
                    ((b = (a && c) || (!a && !c) ? K.getPreviousElementSibling(v) : v),
                        (y = Bi(b)),
                        y === o
                            ? (v = (a && c) || (!a && !c) ? b : K.getNextElementSibling(b))
                            : (y = null));
                while (y);
            }
            m != null &&
                m.dispatchEvent(new un({ by: "root", owner: m, next: null, relatedEvent: f })) &&
                (K.insertBefore(m, p, v), kr(p));
        }
    }
    static addPhantomDummyWithTarget(n, o, a, c) {
        const h = new xi(
            n.getWindow,
            !0,
            { isPhantom: !0, isFirst: !0 },
            void 0,
            new Gt(n.getWindow, c)
        ).input;
        if (h) {
            let p, m;
            (mm(o) && !a
                ? ((p = o), (m = K.getFirstElementChild(o)))
                : ((p = K.getParentElement(o)), (m = a ? o : K.getNextElementSibling(o))),
                p && K.insertBefore(p, h, m));
        }
    }
}
class Sm {
    constructor(n) {
        ((this._updateQueue = new Set()),
            (this._lastUpdateQueueTime = 0),
            (this._changedParents = new WeakSet()),
            (this._dummyElements = []),
            (this._dummyCallbacks = new WeakMap()),
            (this._domChanged = (o) => {
                var a;
                this._changedParents.has(o) ||
                    (this._changedParents.add(o),
                    !this._updateDummyInputsTimer &&
                        (this._updateDummyInputsTimer =
                            (a = this._win) === null || a === void 0
                                ? void 0
                                : a.call(this).setTimeout(() => {
                                      delete this._updateDummyInputsTimer;
                                      for (const c of this._dummyElements) {
                                          const f = c.get();
                                          if (f) {
                                              const h = this._dummyCallbacks.get(f);
                                              if (h) {
                                                  const p = K.getParentNode(f);
                                                  (!p || this._changedParents.has(p)) && h();
                                              }
                                          }
                                      }
                                      this._changedParents = new WeakSet();
                                  }, Rs)));
            }),
            (this._win = n));
    }
    add(n, o) {
        !this._dummyCallbacks.has(n) &&
            this._win &&
            (this._dummyElements.push(new Gt(this._win, n)),
            this._dummyCallbacks.set(n, o),
            (this.domChanged = this._domChanged));
    }
    remove(n) {
        ((this._dummyElements = this._dummyElements.filter((o) => {
            const a = o.get();
            return a && a !== n;
        })),
            this._dummyCallbacks.delete(n),
            this._dummyElements.length === 0 && delete this.domChanged);
    }
    dispose() {
        var n;
        const o = (n = this._win) === null || n === void 0 ? void 0 : n.call(this);
        (this._updateTimer &&
            (o == null || o.clearTimeout(this._updateTimer), delete this._updateTimer),
            this._updateDummyInputsTimer &&
                (o == null || o.clearTimeout(this._updateDummyInputsTimer),
                delete this._updateDummyInputsTimer),
            (this._changedParents = new WeakSet()),
            (this._dummyCallbacks = new WeakMap()),
            (this._dummyElements = []),
            this._updateQueue.clear(),
            delete this.domChanged,
            delete this._win);
    }
    updatePositions(n) {
        this._win &&
            (this._updateQueue.add(n),
            (this._lastUpdateQueueTime = Date.now()),
            this._scheduledUpdatePositions());
    }
    _scheduledUpdatePositions() {
        var n;
        this._updateTimer ||
            (this._updateTimer =
                (n = this._win) === null || n === void 0
                    ? void 0
                    : n.call(this).setTimeout(() => {
                          if (
                              (delete this._updateTimer,
                              this._lastUpdateQueueTime + Rs <= Date.now())
                          ) {
                              const o = new Map(),
                                  a = [];
                              for (const c of this._updateQueue) a.push(c(o));
                              this._updateQueue.clear();
                              for (const c of a) c();
                              o.clear();
                          } else this._scheduledUpdatePositions();
                      }, Rs));
    }
}
class Bm {
    constructor(n, o, a, c, f, h, p) {
        ((this._wrappers = []),
            (this._isOutside = !1),
            (this._transformElements = new Set()),
            (this._onFocusIn = (S, C, E) => {
                this._onFocus(!0, S, C, E);
            }),
            (this._onFocusOut = (S, C, E) => {
                this._onFocus(!1, S, C, E);
            }),
            (this.moveOut = (S) => {
                var C;
                const E = this._firstDummy,
                    N = this._lastDummy;
                if (E && N) {
                    this._ensurePosition();
                    const q = E.input,
                        H = N.input,
                        D = (C = this._element) === null || C === void 0 ? void 0 : C.get();
                    if (q && H && D) {
                        let Q;
                        (S ? ((q.tabIndex = 0), (Q = q)) : ((H.tabIndex = 0), (Q = H)), Q && kr(Q));
                    }
                }
            }),
            (this.moveOutWithDefaultAction = (S, C) => {
                var E;
                const N = this._firstDummy,
                    q = this._lastDummy;
                if (N && q) {
                    this._ensurePosition();
                    const H = N.input,
                        D = q.input,
                        Q = (E = this._element) === null || E === void 0 ? void 0 : E.get();
                    if (H && D && Q) {
                        let re;
                        (S
                            ? !N.isOutside && this._tabster.focusable.isFocusable(Q, !0, !0, !0)
                                ? (re = Q)
                                : ((N.useDefaultAction = !0), (H.tabIndex = 0), (re = H))
                            : ((q.useDefaultAction = !0), (D.tabIndex = 0), (re = D)),
                            re &&
                                Q.dispatchEvent(
                                    new un({ by: "root", owner: Q, next: null, relatedEvent: C })
                                ) &&
                                kr(re));
                    }
                }
            }),
            (this.setTabbable = (S, C) => {
                var E, N;
                for (const H of this._wrappers)
                    if (H.manager === S) {
                        H.tabbable = C;
                        break;
                    }
                const q = this._getCurrent();
                if (q) {
                    const H = q.tabbable ? 0 : -1;
                    let D = (E = this._firstDummy) === null || E === void 0 ? void 0 : E.input;
                    (D && (D.tabIndex = H),
                        (D = (N = this._lastDummy) === null || N === void 0 ? void 0 : N.input),
                        D && (D.tabIndex = H));
                }
            }),
            (this._addDummyInputs = () => {
                this._addTimer ||
                    (this._addTimer = this._getWindow().setTimeout(() => {
                        (delete this._addTimer,
                            this._ensurePosition(),
                            this._addTransformOffsets());
                    }, 0));
            }),
            (this._addTransformOffsets = () => {
                this._tabster._dummyObserver.updatePositions(this._computeTransformOffsets);
            }),
            (this._computeTransformOffsets = (S) => {
                var C, E;
                const N =
                        ((C = this._firstDummy) === null || C === void 0 ? void 0 : C.input) ||
                        ((E = this._lastDummy) === null || E === void 0 ? void 0 : E.input),
                    q = this._transformElements,
                    H = new Set();
                let D = 0,
                    Q = 0;
                const re = this._getWindow();
                for (let G = N; G && G.nodeType === Node.ELEMENT_NODE; G = K.getParentElement(G)) {
                    let ee = S.get(G);
                    if (ee === void 0) {
                        const U = re.getComputedStyle(G).transform;
                        (U &&
                            U !== "none" &&
                            (ee = { scrollTop: G.scrollTop, scrollLeft: G.scrollLeft }),
                            S.set(G, ee || null));
                    }
                    ee &&
                        (H.add(G),
                        q.has(G) || G.addEventListener("scroll", this._addTransformOffsets),
                        (D += ee.scrollTop),
                        (Q += ee.scrollLeft));
                }
                for (const G of q)
                    H.has(G) || G.removeEventListener("scroll", this._addTransformOffsets);
                return (
                    (this._transformElements = H),
                    () => {
                        var G, ee;
                        ((G = this._firstDummy) === null || G === void 0 || G.setTopLeft(D, Q),
                            (ee = this._lastDummy) === null ||
                                ee === void 0 ||
                                ee.setTopLeft(D, Q));
                    }
                );
            }));
        const m = o.get();
        if (!m) throw new Error("No element");
        ((this._tabster = n), (this._getWindow = n.getWindow), (this._callForDefaultAction = p));
        const v = m.__tabsterDummy;
        if (((v || this)._wrappers.push({ manager: a, priority: c, tabbable: !0 }), v)) return v;
        m.__tabsterDummy = this;
        const b = f == null ? void 0 : f.dummyInputsPosition,
            y = m.tagName;
        ((this._isOutside = b
            ? b === R0.Outside
            : (h || y === "UL" || y === "OL" || y === "TABLE") &&
              !(y === "LI" || y === "TD" || y === "TH")),
            (this._firstDummy = new xi(this._getWindow, this._isOutside, { isFirst: !0 }, o)),
            (this._lastDummy = new xi(this._getWindow, this._isOutside, { isFirst: !1 }, o)));
        const k = this._firstDummy.input;
        (k && n._dummyObserver.add(k, this._addDummyInputs),
            (this._firstDummy.onFocusIn = this._onFocusIn),
            (this._firstDummy.onFocusOut = this._onFocusOut),
            (this._lastDummy.onFocusIn = this._onFocusIn),
            (this._lastDummy.onFocusOut = this._onFocusOut),
            (this._element = o),
            this._addDummyInputs());
    }
    dispose(n, o) {
        var a, c, f, h;
        if ((this._wrappers = this._wrappers.filter((m) => m.manager !== n && !o)).length === 0) {
            delete ((a = this._element) === null || a === void 0 ? void 0 : a.get()).__tabsterDummy;
            for (const b of this._transformElements)
                b.removeEventListener("scroll", this._addTransformOffsets);
            this._transformElements.clear();
            const m = this._getWindow();
            this._addTimer && (m.clearTimeout(this._addTimer), delete this._addTimer);
            const v = (c = this._firstDummy) === null || c === void 0 ? void 0 : c.input;
            (v && this._tabster._dummyObserver.remove(v),
                (f = this._firstDummy) === null || f === void 0 || f.dispose(),
                (h = this._lastDummy) === null || h === void 0 || h.dispose());
        }
    }
    _onFocus(n, o, a, c) {
        var f;
        const h = this._getCurrent();
        h &&
            (!o.useDefaultAction || this._callForDefaultAction) &&
            ((f = h.manager.getHandler(n)) === null || f === void 0 || f(o, a, c));
    }
    _getCurrent() {
        return (
            this._wrappers.sort((n, o) =>
                n.tabbable !== o.tabbable ? (n.tabbable ? -1 : 1) : n.priority - o.priority
            ),
            this._wrappers[0]
        );
    }
    _ensurePosition() {
        var n, o, a;
        const c = (n = this._element) === null || n === void 0 ? void 0 : n.get(),
            f = (o = this._firstDummy) === null || o === void 0 ? void 0 : o.input,
            h = (a = this._lastDummy) === null || a === void 0 ? void 0 : a.input;
        if (!(!c || !f || !h))
            if (this._isOutside) {
                const p = K.getParentNode(c);
                if (p) {
                    const m = K.getNextSibling(c);
                    (m !== h && K.insertBefore(p, h, m),
                        K.getPreviousElementSibling(c) !== f && K.insertBefore(p, f, c));
                }
            } else {
                K.getLastElementChild(c) !== h && K.appendChild(c, h);
                const p = K.getFirstElementChild(c);
                p && p !== f && p.parentNode && K.insertBefore(p.parentNode, f, p);
            }
    }
}
function wd(i) {
    let n = null;
    for (let o = K.getLastElementChild(i); o; o = K.getLastElementChild(o)) n = o;
    return n || void 0;
}
function Em(i) {
    var n, o;
    const a = i.ownerDocument,
        c = (n = a.defaultView) === null || n === void 0 ? void 0 : n.getComputedStyle(i);
    return (
        (i.offsetParent === null &&
            a.body !== i &&
            (c == null ? void 0 : c.position) !== "fixed") ||
        (c == null ? void 0 : c.visibility) === "hidden" ||
        ((c == null ? void 0 : c.position) === "fixed" &&
            (c.display === "none" ||
                (((o = i.parentElement) === null || o === void 0 ? void 0 : o.offsetParent) ===
                    null &&
                    a.body !== i.parentElement)))
    );
}
function Us(i) {
    return i.tagName === "INPUT" && !!i.name && i.type === "radio";
}
function Tm(i) {
    if (!Us(i)) return;
    const n = i.name;
    let o = Array.from(K.getElementsByName(i, n)),
        a;
    return (
        (o = o.filter((c) => (Us(c) ? (c.checked && (a = c), !0) : !1))),
        { name: n, buttons: new Set(o), checked: a }
    );
}
function Bi(i) {
    var n;
    return (
        ((n = i == null ? void 0 : i.__tabsterDummyContainer) === null || n === void 0
            ? void 0
            : n.get()) || null
    );
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ function bd(i, n) {
    return JSON.stringify(i);
}
function Cm(i, n) {
    for (const o of Object.keys(n)) {
        const a = n[o];
        a ? (i[o] = a) : delete i[o];
    }
}
function zm(i, n, o) {
    let a;
    {
        const c = i.getAttribute(_r);
        if (c)
            try {
                a = JSON.parse(c);
            } catch {}
    }
    (a || (a = {}),
        Cm(a, n),
        Object.keys(a).length > 0 ? i.setAttribute(_r, bd(a)) : i.removeAttribute(_r));
}
class xf extends Si {
    constructor(n, o, a, c) {
        (super(n, o, yd.Root, c, void 0, !0),
            (this._onDummyInputFocus = (f) => {
                var h;
                if (f.useDefaultAction) this._setFocused(!1);
                else {
                    this._tabster.keyboardNavigation.setNavigatingWithKeyboard(!0);
                    const p = this._element.get();
                    if (p) {
                        this._setFocused(!0);
                        const m = this._tabster.focusedElement.getFirstOrLastTabbable(f.isFirst, {
                            container: p,
                            ignoreAccessibility: !0,
                        });
                        if (m) {
                            kr(m);
                            return;
                        }
                    }
                    (h = f.input) === null || h === void 0 || h.blur();
                }
            }),
            this._setHandlers(this._onDummyInputFocus),
            (this._tabster = n),
            (this._setFocused = a));
    }
}
class Nm extends gd {
    constructor(n, o, a, c, f) {
        (super(n, o, c),
            (this._isFocused = !1),
            (this._setFocused = (v) => {
                var b;
                if (
                    (this._setFocusedTimer &&
                        (this._tabster.getWindow().clearTimeout(this._setFocusedTimer),
                        delete this._setFocusedTimer),
                    this._isFocused === v)
                )
                    return;
                const y = this._element.get();
                y &&
                    (v
                        ? ((this._isFocused = !0),
                          (b = this._dummyManager) === null || b === void 0 || b.setTabbable(!1),
                          y.dispatchEvent(new W0({ element: y })))
                        : (this._setFocusedTimer = this._tabster.getWindow().setTimeout(() => {
                              var k;
                              (delete this._setFocusedTimer,
                                  (this._isFocused = !1),
                                  (k = this._dummyManager) === null ||
                                      k === void 0 ||
                                      k.setTabbable(!0),
                                  y.dispatchEvent(new U0({ element: y })));
                          }, 0)));
            }),
            (this._onFocusIn = (v) => {
                const b = this._tabster.getParent,
                    y = this._element.get();
                let k = v.composedPath()[0];
                do {
                    if (k === y) {
                        this._setFocused(!0);
                        return;
                    }
                    k = k && b(k);
                } while (k);
            }),
            (this._onFocusOut = () => {
                this._setFocused(!1);
            }),
            (this._onDispose = a));
        const h = n.getWindow;
        ((this.uid = _i(h, o)),
            (this._sys = f),
            (n.controlTab || n.rootDummyInputs) && this.addDummyInputs());
        const m = h().document;
        (m.addEventListener(Rt, this._onFocusIn),
            m.addEventListener(ro, this._onFocusOut),
            this._add());
    }
    addDummyInputs() {
        this._dummyManager ||
            (this._dummyManager = new xf(
                this._tabster,
                this._element,
                this._setFocused,
                this._sys
            ));
    }
    dispose() {
        var n;
        this._onDispose(this);
        const o = this._tabster.getWindow(),
            a = o.document;
        (a.removeEventListener(Rt, this._onFocusIn),
            a.removeEventListener(ro, this._onFocusOut),
            this._setFocusedTimer &&
                (o.clearTimeout(this._setFocusedTimer), delete this._setFocusedTimer),
            (n = this._dummyManager) === null || n === void 0 || n.dispose(),
            this._remove());
    }
    moveOutWithDefaultAction(n, o) {
        const a = this._dummyManager;
        if (a) a.moveOutWithDefaultAction(n, o);
        else {
            const c = this.getElement();
            c && xf.moveWithPhantomDummy(this._tabster, c, !0, n, o);
        }
    }
    _add() {}
    _remove() {}
}
class yt {
    constructor(n, o) {
        ((this._autoRootWaiting = !1),
            (this._roots = {}),
            (this._forceDummy = !1),
            (this.rootById = {}),
            (this._autoRootCreate = () => {
                var a;
                const c = this._win().document,
                    f = c.body;
                if (f) {
                    this._autoRootUnwait(c);
                    const h = this._autoRoot;
                    if (h)
                        return (
                            zm(f, { root: h }),
                            ud(this._tabster, f),
                            (a = At(this._tabster, f)) === null || a === void 0 ? void 0 : a.root
                        );
                } else
                    this._autoRootWaiting ||
                        ((this._autoRootWaiting = !0),
                        c.addEventListener("readystatechange", this._autoRootCreate));
            }),
            (this._onRootDispose = (a) => {
                delete this._roots[a.id];
            }),
            (this._tabster = n),
            (this._win = n.getWindow),
            (this._autoRoot = o),
            n.queueInit(() => {
                this._autoRoot && this._autoRootCreate();
            }));
    }
    _autoRootUnwait(n) {
        (n.removeEventListener("readystatechange", this._autoRootCreate),
            (this._autoRootWaiting = !1));
    }
    dispose() {
        const n = this._win();
        (this._autoRootUnwait(n.document),
            delete this._autoRoot,
            Object.keys(this._roots).forEach((o) => {
                this._roots[o] && (this._roots[o].dispose(), delete this._roots[o]);
            }),
            (this.rootById = {}));
    }
    createRoot(n, o, a) {
        const c = new Nm(this._tabster, n, this._onRootDispose, o, a);
        return ((this._roots[c.id] = c), this._forceDummy && c.addDummyInputs(), c);
    }
    addDummyInputs() {
        this._forceDummy = !0;
        const n = this._roots;
        for (const o of Object.keys(n)) n[o].addDummyInputs();
    }
    static getRootByUId(n, o) {
        const a = n().__tabsterInstance;
        return a && a.root.rootById[o];
    }
    static getTabsterContext(n, o, a = {}) {
        var c, f, h, p;
        if (!o.ownerDocument) return;
        const { checkRtl: m, referenceElement: v } = a,
            b = n.getParent;
        n.drainInitQueue();
        let y,
            k,
            S,
            C,
            E = !1,
            N,
            q,
            H,
            D,
            Q = v || o;
        const re = {};
        for (; Q && (!y || m); ) {
            const ee = At(n, Q);
            if (m && H === void 0) {
                const Te = Q.dir;
                Te && (H = Te.toLowerCase() === "rtl");
            }
            if (!ee) {
                Q = b(Q);
                continue;
            }
            const U = Q.tagName;
            ((ee.uncontrolled || U === "IFRAME" || U === "WEBVIEW") &&
                n.focusable.isVisible(Q) &&
                (D = Q),
                !C &&
                    !((c = ee.focusable) === null || c === void 0) &&
                    c.excludeFromMover &&
                    !S &&
                    (E = !0));
            const ie = ee.modalizer,
                fe = ee.groupper,
                Ue = ee.mover;
            (!k && ie && (k = ie),
                !S &&
                    fe &&
                    (!k || ie) &&
                    (k
                        ? (!fe.isActive() &&
                              fe.getProps().tabbability &&
                              k.userId !==
                                  ((f = n.modalizer) === null || f === void 0
                                      ? void 0
                                      : f.activeId) &&
                              ((k = void 0), (S = fe)),
                          (q = fe))
                        : (S = fe)),
                !C &&
                    Ue &&
                    (!k || ie) &&
                    (!fe || Q !== o) &&
                    Q.contains(o) &&
                    ((C = Ue), (N = !!S && S !== fe)),
                ee.root && (y = ee.root),
                !((h = ee.focusable) === null || h === void 0) &&
                    h.ignoreKeydown &&
                    Object.assign(re, ee.focusable.ignoreKeydown),
                (Q = b(Q)));
        }
        if (!y) {
            const ee = n.root;
            ee._autoRoot &&
                !((p = o.ownerDocument) === null || p === void 0) &&
                p.body &&
                (y = ee._autoRootCreate());
        }
        return (
            S && !C && (N = !0),
            y
                ? {
                      root: y,
                      modalizer: k,
                      groupper: S,
                      mover: C,
                      groupperBeforeMover: N,
                      modalizerInGroupper: q,
                      rtl: m ? !!H : void 0,
                      uncontrolled: D,
                      excludedFromMover: E,
                      ignoreKeydown: (ee) => !!re[ee.key],
                  }
                : void 0
        );
    }
    static getRoot(n, o) {
        var a;
        const c = n.getParent;
        for (let f = o; f; f = c(f)) {
            const h = (a = At(n, f)) === null || a === void 0 ? void 0 : a.root;
            if (h) return h;
        }
    }
    onRoot(n, o) {
        o ? delete this.rootById[n.uid] : (this.rootById[n.uid] = n);
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class _d {
    constructor() {
        this._callbacks = [];
    }
    dispose() {
        ((this._callbacks = []), delete this._val);
    }
    subscribe(n) {
        const o = this._callbacks;
        o.indexOf(n) < 0 && o.push(n);
    }
    subscribeFirst(n) {
        const o = this._callbacks,
            a = o.indexOf(n);
        (a >= 0 && o.splice(a, 1), o.unshift(n));
    }
    unsubscribe(n) {
        const o = this._callbacks.indexOf(n);
        o >= 0 && this._callbacks.splice(o, 1);
    }
    setVal(n, o) {
        this._val !== n && ((this._val = n), this._callCallbacks(n, o));
    }
    getVal() {
        return this._val;
    }
    trigger(n, o) {
        this._callCallbacks(n, o);
    }
    _callCallbacks(n, o) {
        this._callbacks.forEach((a) => a(n, o));
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class Pm {
    constructor(n) {
        this._tabster = n;
    }
    dispose() {}
    getProps(n) {
        const o = At(this._tabster, n);
        return (o && o.focusable) || {};
    }
    isFocusable(n, o, a, c) {
        return md(n, ad) && (o || n.tabIndex !== -1)
            ? (a || this.isVisible(n)) && (c || this.isAccessible(n))
            : !1;
    }
    isVisible(n) {
        if (!n.ownerDocument || n.nodeType !== Node.ELEMENT_NODE || Em(n)) return !1;
        const o = n.ownerDocument.body.getBoundingClientRect();
        return !(o.width === 0 && o.height === 0);
    }
    isAccessible(n) {
        var o;
        for (let a = n; a; a = K.getParentElement(a)) {
            const c = At(this._tabster, a);
            if (
                this._isHidden(a) ||
                (!((o = c == null ? void 0 : c.focusable) === null || o === void 0
                    ? void 0
                    : o.ignoreAriaDisabled) &&
                    this._isDisabled(a))
            )
                return !1;
        }
        return !0;
    }
    _isDisabled(n) {
        return n.hasAttribute("disabled");
    }
    _isHidden(n) {
        var o;
        const a = n.getAttribute("aria-hidden");
        return !!(
            a &&
            a.toLowerCase() === "true" &&
            !(!((o = this._tabster.modalizer) === null || o === void 0) && o.isAugmented(n))
        );
    }
    findFirst(n, o) {
        return this.findElement({ ...n }, o);
    }
    findLast(n, o) {
        return this.findElement({ isBackward: !0, ...n }, o);
    }
    findNext(n, o) {
        return this.findElement({ ...n }, o);
    }
    findPrev(n, o) {
        return this.findElement({ ...n, isBackward: !0 }, o);
    }
    findDefault(n, o) {
        return (
            this.findElement(
                {
                    ...n,
                    acceptCondition: (a) =>
                        this.isFocusable(a, n.includeProgrammaticallyFocusable) &&
                        !!this.getProps(a).isDefault,
                },
                o
            ) || null
        );
    }
    findAll(n) {
        return this._findElements(!0, n) || [];
    }
    findElement(n, o) {
        const a = this._findElements(!1, n, o);
        return a && a[0];
    }
    _findElements(n, o, a) {
        var c, f, h;
        const {
            container: p,
            currentElement: m = null,
            includeProgrammaticallyFocusable: v,
            useActiveModalizer: b,
            ignoreAccessibility: y,
            modalizerId: k,
            isBackward: S,
            onElement: C,
        } = o;
        a || (a = {});
        const E = [];
        let { acceptCondition: N } = o;
        const q = !!N;
        if (!p) return null;
        N || (N = (re) => this.isFocusable(re, v, !1, y));
        const H = {
                container: p,
                modalizerUserId:
                    k === void 0 && b
                        ? (c = this._tabster.modalizer) === null || c === void 0
                            ? void 0
                            : c.activeId
                        : k ||
                          ((h =
                              (f = yt.getTabsterContext(this._tabster, p)) === null || f === void 0
                                  ? void 0
                                  : f.modalizer) === null || h === void 0
                              ? void 0
                              : h.userId),
                from: m || p,
                isBackward: S,
                isFindAll: n,
                acceptCondition: N,
                hasCustomCondition: q,
                includeProgrammaticallyFocusable: v,
                ignoreAccessibility: y,
                cachedGrouppers: {},
                cachedRadioGroups: {},
            },
            D = ra(p.ownerDocument, p, (re) => this._acceptElement(re, H));
        if (!D) return null;
        const Q = (re) => {
            var G, ee;
            const U = (G = H.foundElement) !== null && G !== void 0 ? G : H.foundBackward;
            return (
                U && E.push(U),
                n
                    ? U &&
                      ((H.found = !1),
                      delete H.foundElement,
                      delete H.foundBackward,
                      delete H.fromCtx,
                      (H.from = U),
                      C && !C(U))
                        ? !1
                        : !!(U || re)
                    : (U &&
                          a &&
                          (a.uncontrolled =
                              (ee = yt.getTabsterContext(this._tabster, U)) === null ||
                              ee === void 0
                                  ? void 0
                                  : ee.uncontrolled),
                      !!(re && !U))
            );
        };
        if ((m || (a.outOfDOMOrder = !0), m && K.nodeContains(p, m))) D.currentNode = m;
        else if (S) {
            const re = wd(p);
            if (!re) return null;
            if (this._acceptElement(re, H) === NodeFilter.FILTER_ACCEPT && !Q(!0))
                return (H.skippedFocusable && (a.outOfDOMOrder = !0), E);
            D.currentNode = re;
        }
        do S ? D.previousNode() : D.nextNode();
        while (Q());
        return (H.skippedFocusable && (a.outOfDOMOrder = !0), E.length ? E : null);
    }
    _acceptElement(n, o) {
        var a, c, f;
        if (o.found) return NodeFilter.FILTER_ACCEPT;
        const h = o.foundBackward;
        if (h && (n === h || !K.nodeContains(h, n)))
            return ((o.found = !0), (o.foundElement = h), NodeFilter.FILTER_ACCEPT);
        const p = o.container;
        if (n === p) return NodeFilter.FILTER_SKIP;
        if (!K.nodeContains(p, n) || Bi(n) || K.nodeContains(o.rejectElementsFrom, n))
            return NodeFilter.FILTER_REJECT;
        const m = (o.currentCtx = yt.getTabsterContext(this._tabster, n));
        if (!m) return NodeFilter.FILTER_SKIP;
        if (vd(n))
            return (
                this.isFocusable(n, void 0, !0, !0) && (o.skippedFocusable = !0),
                NodeFilter.FILTER_SKIP
            );
        if (!o.hasCustomCondition && (n.tagName === "IFRAME" || n.tagName === "WEBVIEW"))
            return this.isVisible(n) &&
                ((a = m.modalizer) === null || a === void 0 ? void 0 : a.userId) ===
                    ((c = this._tabster.modalizer) === null || c === void 0 ? void 0 : c.activeId)
                ? ((o.found = !0),
                  (o.rejectElementsFrom = o.foundElement = n),
                  NodeFilter.FILTER_ACCEPT)
                : NodeFilter.FILTER_REJECT;
        if (!o.ignoreAccessibility && !this.isAccessible(n))
            return (
                this.isFocusable(n, !1, !0, !0) && (o.skippedFocusable = !0),
                NodeFilter.FILTER_REJECT
            );
        let v,
            b = o.fromCtx;
        b || (b = o.fromCtx = yt.getTabsterContext(this._tabster, o.from));
        const y = b == null ? void 0 : b.mover;
        let k = m.groupper,
            S = m.mover;
        if (
            ((v =
                (f = this._tabster.modalizer) === null || f === void 0
                    ? void 0
                    : f.acceptElement(n, o)),
            v !== void 0 && (o.skippedFocusable = !0),
            v === void 0 && (k || S || y))
        ) {
            const C = k == null ? void 0 : k.getElement(),
                E = y == null ? void 0 : y.getElement();
            let N = S == null ? void 0 : S.getElement();
            if (
                (N &&
                    K.nodeContains(E, N) &&
                    K.nodeContains(p, E) &&
                    (!C || !S || K.nodeContains(E, C)) &&
                    ((S = y), (N = E)),
                C)
            ) {
                if (C === p || !K.nodeContains(p, C)) k = void 0;
                else if (!K.nodeContains(C, n)) return NodeFilter.FILTER_REJECT;
            }
            if (N) {
                if (!K.nodeContains(p, N)) S = void 0;
                else if (!K.nodeContains(N, n)) return NodeFilter.FILTER_REJECT;
            }
            (k && S && (N && C && !K.nodeContains(C, N) ? (S = void 0) : (k = void 0)),
                k && (v = k.acceptElement(n, o)),
                S && (v = S.acceptElement(n, o)));
        }
        if (
            (v === void 0 &&
                ((v = o.acceptCondition(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
                v === NodeFilter.FILTER_SKIP &&
                    this.isFocusable(n, !1, !0, !0) &&
                    (o.skippedFocusable = !0)),
            v === NodeFilter.FILTER_ACCEPT && !o.found)
        ) {
            if (!o.isFindAll && Us(n) && !n.checked) {
                const C = n.name;
                let E = o.cachedRadioGroups[C];
                if (
                    (E || ((E = Tm(n)), E && (o.cachedRadioGroups[C] = E)),
                    E != null && E.checked && E.checked !== n)
                )
                    return NodeFilter.FILTER_SKIP;
            }
            o.isBackward
                ? ((o.foundBackward = n), (v = NodeFilter.FILTER_SKIP))
                : ((o.found = !0), (o.foundElement = n));
        }
        return v;
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const Ye = {
    Tab: "Tab",
    PageUp: "PageUp",
    PageDown: "PageDown",
    End: "End",
    Home: "Home",
    ArrowLeft: "ArrowLeft",
    ArrowUp: "ArrowUp",
    ArrowRight: "ArrowRight",
    ArrowDown: "ArrowDown",
};
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ function Fm(i, n) {
    var o;
    const a = i.getParent;
    let c = n;
    do {
        const f = (o = At(i, c)) === null || o === void 0 ? void 0 : o.uncontrolled;
        if (f && i.uncontrolled.isUncontrolledCompletely(c, !!f.completely)) return c;
        c = a(c);
    } while (c);
}
const Sf = { [Fs.Restorer]: 0, [Fs.Deloser]: 1, [Fs.EscapeGroupper]: 2 };
class Me extends _d {
    constructor(n, o) {
        (super(),
            (this._init = () => {
                const a = this._win(),
                    c = a.document;
                (c.addEventListener(Rt, this._onFocusIn, !0),
                    c.addEventListener(ro, this._onFocusOut, !0),
                    a.addEventListener("keydown", this._onKeyDown, !0));
                const f = K.getActiveElement(c);
                (f && f !== c.body && this._setFocusedElement(f), this.subscribe(this._onChanged));
            }),
            (this._onFocusIn = (a) => {
                const c = a.composedPath()[0];
                c &&
                    this._setFocusedElement(
                        c,
                        a.detail.relatedTarget,
                        a.detail.isFocusedProgrammatically
                    );
            }),
            (this._onFocusOut = (a) => {
                var c;
                this._setFocusedElement(
                    void 0,
                    (c = a.detail) === null || c === void 0 ? void 0 : c.originalEvent.relatedTarget
                );
            }),
            (this._validateFocusedElement = (a) => {}),
            (this._onKeyDown = (a) => {
                if (a.key !== Ye.Tab || a.ctrlKey) return;
                const c = this.getVal();
                if (!c || !c.ownerDocument || c.contentEditable === "true") return;
                const f = this._tabster,
                    h = f.controlTab,
                    p = yt.getTabsterContext(f, c);
                if (!p || p.ignoreKeydown(a)) return;
                const m = a.shiftKey,
                    v = Me.findNextTabbable(f, p, void 0, c, void 0, m, !0),
                    b = p.root.getElement();
                if (!b) return;
                const y = v == null ? void 0 : v.element,
                    k = Fm(f, c);
                if (y) {
                    const S = v.uncontrolled;
                    if (p.uncontrolled || K.nodeContains(S, c)) {
                        if (
                            (!v.outOfDOMOrder && S === p.uncontrolled) ||
                            (k && !K.nodeContains(k, y))
                        )
                            return;
                        Si.addPhantomDummyWithTarget(f, c, m, y);
                        return;
                    }
                    if (
                        (S && f.focusable.isVisible(S)) ||
                        (y.tagName === "IFRAME" && f.focusable.isVisible(y))
                    ) {
                        b.dispatchEvent(
                            new un({ by: "root", owner: b, next: y, relatedEvent: a })
                        ) && Si.moveWithPhantomDummy(f, S ?? y, !1, m, a);
                        return;
                    }
                    (h || (v != null && v.outOfDOMOrder)) &&
                        b.dispatchEvent(
                            new un({ by: "root", owner: b, next: y, relatedEvent: a })
                        ) &&
                        (a.preventDefault(), a.stopImmediatePropagation(), kr(y));
                } else
                    !k &&
                        b.dispatchEvent(
                            new un({ by: "root", owner: b, next: null, relatedEvent: a })
                        ) &&
                        p.root.moveOutWithDefaultAction(m, a);
            }),
            (this._onChanged = (a, c) => {
                var f, h;
                if (a) a.dispatchEvent(new q0(c));
                else {
                    const p = (f = this._lastVal) === null || f === void 0 ? void 0 : f.get();
                    if (p) {
                        const m = { ...c },
                            v = yt.getTabsterContext(this._tabster, p),
                            b =
                                (h = v == null ? void 0 : v.modalizer) === null || h === void 0
                                    ? void 0
                                    : h.userId;
                        (b && (m.modalizerId = b), p.dispatchEvent(new H0(m)));
                    }
                }
            }),
            (this._tabster = n),
            (this._win = o),
            n.queueInit(this._init));
    }
    dispose() {
        super.dispose();
        const n = this._win(),
            o = n.document;
        (o.removeEventListener(Rt, this._onFocusIn, !0),
            o.removeEventListener(ro, this._onFocusOut, !0),
            n.removeEventListener("keydown", this._onKeyDown, !0),
            this.unsubscribe(this._onChanged));
        const a = this._asyncFocus;
        (a && (n.clearTimeout(a.timeout), delete this._asyncFocus),
            delete Me._lastResetElement,
            delete this._nextVal,
            delete this._lastVal);
    }
    static forgetMemorized(n, o) {
        var a, c;
        let f = Me._lastResetElement,
            h = f && f.get();
        (h && K.nodeContains(o, h) && delete Me._lastResetElement,
            (h =
                (c = (a = n._nextVal) === null || a === void 0 ? void 0 : a.element) === null ||
                c === void 0
                    ? void 0
                    : c.get()),
            h && K.nodeContains(o, h) && delete n._nextVal,
            (f = n._lastVal),
            (h = f && f.get()),
            h && K.nodeContains(o, h) && delete n._lastVal);
    }
    getFocusedElement() {
        return this.getVal();
    }
    getLastFocusedElement() {
        var n;
        let o = (n = this._lastVal) === null || n === void 0 ? void 0 : n.get();
        return ((!o || (o && !na(o.ownerDocument, o))) && (this._lastVal = o = void 0), o);
    }
    focus(n, o, a, c) {
        return this._tabster.focusable.isFocusable(n, o, !1, a)
            ? (n.focus({ preventScroll: c }), !0)
            : !1;
    }
    focusDefault(n) {
        const o = this._tabster.focusable.findDefault({ container: n });
        return o ? (this._tabster.focusedElement.focus(o), !0) : !1;
    }
    getFirstOrLastTabbable(n, o) {
        var a;
        const { container: c, ignoreAccessibility: f } = o;
        let h;
        if (c) {
            const p = yt.getTabsterContext(this._tabster, c);
            p &&
                (h =
                    (a = Me.findNextTabbable(this._tabster, p, c, void 0, void 0, !n, f)) ===
                        null || a === void 0
                        ? void 0
                        : a.element);
        }
        return (h && !K.nodeContains(c, h) && (h = void 0), h || void 0);
    }
    _focusFirstOrLast(n, o) {
        const a = this.getFirstOrLastTabbable(n, o);
        return a ? (this.focus(a, !1, !0), !0) : !1;
    }
    focusFirst(n) {
        return this._focusFirstOrLast(!0, n);
    }
    focusLast(n) {
        return this._focusFirstOrLast(!1, n);
    }
    resetFocus(n) {
        if (!this._tabster.focusable.isVisible(n)) return !1;
        if (this._tabster.focusable.isFocusable(n, !0, !0, !0)) this.focus(n);
        else {
            const o = n.getAttribute("tabindex"),
                a = n.getAttribute("aria-hidden");
            ((n.tabIndex = -1),
                n.setAttribute("aria-hidden", "true"),
                (Me._lastResetElement = new Gt(this._win, n)),
                this.focus(n, !0, !0),
                this._setOrRemoveAttribute(n, "tabindex", o),
                this._setOrRemoveAttribute(n, "aria-hidden", a));
        }
        return !0;
    }
    requestAsyncFocus(n, o, a) {
        const c = this._tabster.getWindow(),
            f = this._asyncFocus;
        if (f) {
            if (Sf[n] > Sf[f.source]) return;
            c.clearTimeout(f.timeout);
        }
        this._asyncFocus = {
            source: n,
            callback: o,
            timeout: c.setTimeout(() => {
                ((this._asyncFocus = void 0), o());
            }, a),
        };
    }
    cancelAsyncFocus(n) {
        const o = this._asyncFocus;
        (o == null ? void 0 : o.source) === n &&
            (this._tabster.getWindow().clearTimeout(o.timeout), (this._asyncFocus = void 0));
    }
    _setOrRemoveAttribute(n, o, a) {
        a === null ? n.removeAttribute(o) : n.setAttribute(o, a);
    }
    _setFocusedElement(n, o, a) {
        var c, f;
        if (this._tabster._noop) return;
        const h = { relatedTarget: o };
        if (n) {
            const m = (c = Me._lastResetElement) === null || c === void 0 ? void 0 : c.get();
            if (((Me._lastResetElement = void 0), m === n || vd(n))) return;
            h.isFocusedProgrammatically = a;
            const v = yt.getTabsterContext(this._tabster, n),
                b =
                    (f = v == null ? void 0 : v.modalizer) === null || f === void 0
                        ? void 0
                        : f.userId;
            b && (h.modalizerId = b);
        }
        const p = (this._nextVal = { element: n ? new Gt(this._win, n) : void 0, detail: h });
        (n && n !== this._val && this._validateFocusedElement(n),
            this._nextVal === p && this.setVal(n, h),
            (this._nextVal = void 0));
    }
    setVal(n, o) {
        (super.setVal(n, o), n && (this._lastVal = new Gt(this._win, n)));
    }
    static findNextTabbable(n, o, a, c, f, h, p) {
        const m = a || o.root.getElement();
        if (!m) return null;
        let v = null;
        const b = Me._isTabbingTimer,
            y = n.getWindow();
        (b && y.clearTimeout(b),
            (Me.isTabbing = !0),
            (Me._isTabbingTimer = y.setTimeout(() => {
                (delete Me._isTabbingTimer, (Me.isTabbing = !1));
            }, 0)));
        const k = o.modalizer,
            S = o.groupper,
            C = o.mover,
            E = (N) => {
                if (((v = N.findNextTabbable(c, f, h, p)), c && !(v != null && v.element))) {
                    const q = N !== k && K.getParentElement(N.getElement());
                    if (q) {
                        const H = yt.getTabsterContext(n, c, { referenceElement: q });
                        if (H) {
                            const D = N.getElement(),
                                Q = h ? D : (D && wd(D)) || D;
                            Q &&
                                ((v = Me.findNextTabbable(n, H, a, Q, q, h, p)),
                                v && (v.outOfDOMOrder = !0));
                        }
                    }
                }
            };
        if (S && C) E(o.groupperBeforeMover ? S : C);
        else if (S) E(S);
        else if (C) E(C);
        else if (k) E(k);
        else {
            const N = {
                    container: m,
                    currentElement: c,
                    referenceElement: f,
                    ignoreAccessibility: p,
                    useActiveModalizer: !0,
                },
                q = {};
            v = {
                element: n.focusable[h ? "findPrev" : "findNext"](N, q),
                outOfDOMOrder: q.outOfDOMOrder,
                uncontrolled: q.uncontrolled,
            };
        }
        return v;
    }
}
Me.isTabbing = !1;
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class Rm extends _d {
    constructor(n) {
        (super(),
            (this._onChange = (o) => {
                this.setVal(o, void 0);
            }),
            (this._keyborg = ea(n())),
            this._keyborg.subscribe(this._onChange));
    }
    dispose() {
        (super.dispose(),
            this._keyborg &&
                (this._keyborg.unsubscribe(this._onChange),
                ta(this._keyborg),
                delete this._keyborg));
    }
    setNavigatingWithKeyboard(n) {
        var o;
        (o = this._keyborg) === null || o === void 0 || o.setVal(n);
    }
    isNavigatingWithKeyboard() {
        var n;
        return !!(!((n = this._keyborg) === null || n === void 0) && n.isNavigatingWithKeyboard());
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const jm = ["input", "textarea", "*[contenteditable]"].join(", ");
class Im extends Si {
    constructor(n, o, a, c) {
        (super(o, n, yd.Mover, c),
            (this._onFocusDummyInput = (f) => {
                var h, p;
                const m = this._element.get(),
                    v = f.input;
                if (m && v) {
                    const b = yt.getTabsterContext(this._tabster, m);
                    let y;
                    b &&
                        (y =
                            (h = Me.findNextTabbable(
                                this._tabster,
                                b,
                                void 0,
                                v,
                                void 0,
                                !f.isFirst,
                                !0
                            )) === null || h === void 0
                                ? void 0
                                : h.element);
                    const k =
                        (p = this._getMemorized()) === null || p === void 0 ? void 0 : p.get();
                    (k && this._tabster.focusable.isFocusable(k) && (y = k), y && kr(y));
                }
            }),
            (this._tabster = o),
            (this._getMemorized = a),
            this._setHandlers(this._onFocusDummyInput));
    }
}
const js = 1,
    Bf = 2,
    Ef = 3;
class Dm extends gd {
    constructor(n, o, a, c, f) {
        var h;
        (super(n, o, c),
            (this._visible = {}),
            (this._onIntersection = (m) => {
                for (const v of m) {
                    const b = v.target,
                        y = _i(this._win, b);
                    let k,
                        S = this._fullyVisible;
                    if (
                        (v.intersectionRatio >= 0.25
                            ? ((k = v.intersectionRatio >= 0.75 ? gr.Visible : gr.PartiallyVisible),
                              k === gr.Visible && (S = y))
                            : (k = gr.Invisible),
                        this._visible[y] !== k)
                    ) {
                        k === void 0
                            ? (delete this._visible[y], S === y && delete this._fullyVisible)
                            : ((this._visible[y] = k), (this._fullyVisible = S));
                        const C = this.getState(b);
                        C && b.dispatchEvent(new wf(C));
                    }
                }
            }),
            (this._win = n.getWindow),
            (this.visibilityTolerance =
                (h = c.visibilityTolerance) !== null && h !== void 0 ? h : 0.8),
            (this._props.trackState || this._props.visibilityAware) &&
                ((this._intersectionObserver = new IntersectionObserver(this._onIntersection, {
                    threshold: [0, 0.25, 0.5, 0.75, 1],
                })),
                this._observeState()),
            (this._onDispose = a));
        const p = () => (c.memorizeCurrent ? this._current : void 0);
        n.controlTab || (this.dummyManager = new Im(this._element, n, p, f));
    }
    dispose() {
        var n;
        (this._onDispose(this),
            this._intersectionObserver &&
                (this._intersectionObserver.disconnect(), delete this._intersectionObserver),
            delete this._current,
            delete this._fullyVisible,
            delete this._allElements,
            delete this._updateQueue,
            this._unobserve && (this._unobserve(), delete this._unobserve));
        const o = this._win();
        (this._setCurrentTimer &&
            (o.clearTimeout(this._setCurrentTimer), delete this._setCurrentTimer),
            this._updateTimer && (o.clearTimeout(this._updateTimer), delete this._updateTimer),
            (n = this.dummyManager) === null || n === void 0 || n.dispose(),
            delete this.dummyManager);
    }
    setCurrent(n) {
        (n ? (this._current = new Gt(this._win, n)) : (this._current = void 0),
            (this._props.trackState || this._props.visibilityAware) &&
                !this._setCurrentTimer &&
                (this._setCurrentTimer = this._win().setTimeout(() => {
                    var o;
                    delete this._setCurrentTimer;
                    const a = [];
                    this._current !== this._prevCurrent &&
                        (a.push(this._current),
                        a.push(this._prevCurrent),
                        (this._prevCurrent = this._current));
                    for (const c of a) {
                        const f = c == null ? void 0 : c.get();
                        if (
                            f &&
                            ((o = this._allElements) === null || o === void 0
                                ? void 0
                                : o.get(f)) === this
                        ) {
                            const h = this._props;
                            if (f && (h.visibilityAware !== void 0 || h.trackState)) {
                                const p = this.getState(f);
                                p && f.dispatchEvent(new wf(p));
                            }
                        }
                    }
                })));
    }
    getCurrent() {
        var n;
        return ((n = this._current) === null || n === void 0 ? void 0 : n.get()) || null;
    }
    findNextTabbable(n, o, a, c) {
        const f = this.getElement(),
            h = f && Bi(n) === f;
        if (!f) return null;
        let p = null,
            m = !1,
            v;
        if (this._props.tabbable || h || (n && !K.nodeContains(f, n))) {
            const b = {
                    currentElement: n,
                    referenceElement: o,
                    container: f,
                    ignoreAccessibility: c,
                    useActiveModalizer: !0,
                },
                y = {};
            ((p = this._tabster.focusable[a ? "findPrev" : "findNext"](b, y)),
                (m = !!y.outOfDOMOrder),
                (v = y.uncontrolled));
        }
        return { element: p, uncontrolled: v, outOfDOMOrder: m };
    }
    acceptElement(n, o) {
        var a, c;
        if (!Me.isTabbing)
            return !((a = o.currentCtx) === null || a === void 0) && a.excludedFromMover
                ? NodeFilter.FILTER_REJECT
                : void 0;
        const { memorizeCurrent: f, visibilityAware: h, hasDefault: p = !0 } = this._props,
            m = this.getElement();
        if (m && (f || h || p) && (!K.nodeContains(m, o.from) || Bi(o.from) === m)) {
            let v;
            if (f) {
                const b = (c = this._current) === null || c === void 0 ? void 0 : c.get();
                b && o.acceptCondition(b) && (v = b);
            }
            if (
                (!v &&
                    p &&
                    (v = this._tabster.focusable.findDefault({
                        container: m,
                        useActiveModalizer: !0,
                    })),
                !v &&
                    h &&
                    (v = this._tabster.focusable.findElement({
                        container: m,
                        useActiveModalizer: !0,
                        isBackward: o.isBackward,
                        acceptCondition: (b) => {
                            var y;
                            const k = _i(this._win, b),
                                S = this._visible[k];
                            return (
                                m !== b &&
                                !!(
                                    !((y = this._allElements) === null || y === void 0) && y.get(b)
                                ) &&
                                o.acceptCondition(b) &&
                                (S === gr.Visible ||
                                    (S === gr.PartiallyVisible &&
                                        (h === gr.PartiallyVisible || !this._fullyVisible)))
                            );
                        },
                    })),
                v)
            )
                return (
                    (o.found = !0),
                    (o.foundElement = v),
                    (o.rejectElementsFrom = m),
                    (o.skippedFocusable = !0),
                    NodeFilter.FILTER_ACCEPT
                );
        }
    }
    _observeState() {
        const n = this.getElement();
        if (this._unobserve || !n || typeof MutationObserver > "u") return;
        const o = this._win(),
            a = (this._allElements = new WeakMap()),
            c = this._tabster.focusable;
        let f = (this._updateQueue = []);
        const h = K.createMutationObserver((S) => {
                for (const C of S) {
                    const E = C.target,
                        N = C.removedNodes,
                        q = C.addedNodes;
                    if (C.type === "attributes")
                        C.attributeName === "tabindex" && f.push({ element: E, type: Bf });
                    else {
                        for (let H = 0; H < N.length; H++) f.push({ element: N[H], type: Ef });
                        for (let H = 0; H < q.length; H++) f.push({ element: q[H], type: js });
                    }
                }
                y();
            }),
            p = (S, C) => {
                var E, N;
                const q = a.get(S);
                (q &&
                    C &&
                    ((E = this._intersectionObserver) === null || E === void 0 || E.unobserve(S),
                    a.delete(S)),
                    !q &&
                        !C &&
                        (a.set(S, this),
                        (N = this._intersectionObserver) === null || N === void 0 || N.observe(S)));
            },
            m = (S) => {
                const C = c.isFocusable(S);
                a.get(S) ? C || p(S, !0) : C && p(S);
            },
            v = (S) => {
                const { mover: C } = k(S);
                if (C && C !== this)
                    if (C.getElement() === S && c.isFocusable(S)) p(S);
                    else return;
                const E = ra(o.document, S, (N) => {
                    const { mover: q, groupper: H } = k(N);
                    if (q && q !== this) return NodeFilter.FILTER_REJECT;
                    const D = H == null ? void 0 : H.getFirst(!0);
                    return H && H.getElement() !== N && D && D !== N
                        ? NodeFilter.FILTER_REJECT
                        : (c.isFocusable(N) && p(N), NodeFilter.FILTER_SKIP);
                });
                if (E) for (E.currentNode = S; E.nextNode(); );
            },
            b = (S) => {
                a.get(S) && p(S, !0);
                for (let E = K.getFirstElementChild(S); E; E = K.getNextElementSibling(E)) b(E);
            },
            y = () => {
                !this._updateTimer &&
                    f.length &&
                    (this._updateTimer = o.setTimeout(() => {
                        delete this._updateTimer;
                        for (const { element: S, type: C } of f)
                            switch (C) {
                                case Bf:
                                    m(S);
                                    break;
                                case js:
                                    v(S);
                                    break;
                                case Ef:
                                    b(S);
                                    break;
                            }
                        f = this._updateQueue = [];
                    }, 0));
            },
            k = (S) => {
                const C = {};
                for (let E = S; E; E = K.getParentElement(E)) {
                    const N = At(this._tabster, E);
                    if (N && (N.groupper && !C.groupper && (C.groupper = N.groupper), N.mover)) {
                        C.mover = N.mover;
                        break;
                    }
                }
                return C;
            };
        (f.push({ element: n, type: js }),
            y(),
            h.observe(n, {
                childList: !0,
                subtree: !0,
                attributes: !0,
                attributeFilter: ["tabindex"],
            }),
            (this._unobserve = () => {
                h.disconnect();
            }));
    }
    getState(n) {
        const o = _i(this._win, n);
        if (o in this._visible) {
            const a = this._visible[o] || gr.Invisible;
            return { isCurrent: this._current ? this._current.get() === n : void 0, visibility: a };
        }
    }
}
function Om(i, n, o, a, c, f, h, p) {
    const m = o < c ? c - o : h < i ? i - h : 0,
        v = a < f ? f - a : p < n ? n - p : 0;
    return m === 0 ? v : v === 0 ? m : Math.sqrt(m * m + v * v);
}
class Lm {
    constructor(n, o) {
        ((this._init = () => {
            const a = this._win();
            (a.addEventListener("keydown", this._onKeyDown, !0),
                a.addEventListener(gf, this._onMoveFocus),
                a.addEventListener(yf, this._onMemorizedElement),
                this._tabster.focusedElement.subscribe(this._onFocus));
        }),
            (this._onMoverDispose = (a) => {
                delete this._movers[a.id];
            }),
            (this._onFocus = (a) => {
                var c;
                let f = a,
                    h = a;
                for (let p = K.getParentElement(a); p; p = K.getParentElement(p)) {
                    const m =
                        (c = At(this._tabster, p)) === null || c === void 0 ? void 0 : c.mover;
                    (m && (m.setCurrent(h), (f = void 0)),
                        !f && this._tabster.focusable.isFocusable(p) && (f = h = p));
                }
            }),
            (this._onKeyDown = async (a) => {
                var c;
                if (
                    (this._ignoredInputTimer &&
                        (this._win().clearTimeout(this._ignoredInputTimer),
                        delete this._ignoredInputTimer),
                    (c = this._ignoredInputResolve) === null || c === void 0 || c.call(this, !1),
                    a.ctrlKey || a.altKey || a.shiftKey || a.metaKey)
                )
                    return;
                const f = a.key;
                let h;
                if (
                    (f === Ye.ArrowDown
                        ? (h = De.ArrowDown)
                        : f === Ye.ArrowRight
                          ? (h = De.ArrowRight)
                          : f === Ye.ArrowUp
                            ? (h = De.ArrowUp)
                            : f === Ye.ArrowLeft
                              ? (h = De.ArrowLeft)
                              : f === Ye.PageDown
                                ? (h = De.PageDown)
                                : f === Ye.PageUp
                                  ? (h = De.PageUp)
                                  : f === Ye.Home
                                    ? (h = De.Home)
                                    : f === Ye.End && (h = De.End),
                    !h)
                )
                    return;
                const p = this._tabster.focusedElement.getFocusedElement();
                !p || (await this._isIgnoredInput(p, f)) || this._moveFocus(p, h, a);
            }),
            (this._onMoveFocus = (a) => {
                var c;
                const f = a.composedPath()[0],
                    h = (c = a.detail) === null || c === void 0 ? void 0 : c.key;
                f &&
                    h !== void 0 &&
                    !a.defaultPrevented &&
                    (this._moveFocus(f, h), a.stopImmediatePropagation());
            }),
            (this._onMemorizedElement = (a) => {
                var c;
                const f = a.composedPath()[0];
                let h = (c = a.detail) === null || c === void 0 ? void 0 : c.memorizedElement;
                if (f) {
                    const p = yt.getTabsterContext(this._tabster, f),
                        m = p == null ? void 0 : p.mover;
                    m &&
                        (h && !K.nodeContains(m.getElement(), h) && (h = void 0),
                        m.setCurrent(h),
                        a.stopImmediatePropagation());
                }
            }),
            (this._tabster = n),
            (this._win = o),
            (this._movers = {}),
            n.queueInit(this._init));
    }
    dispose() {
        var n;
        const o = this._win();
        (this._tabster.focusedElement.unsubscribe(this._onFocus),
            (n = this._ignoredInputResolve) === null || n === void 0 || n.call(this, !1),
            this._ignoredInputTimer &&
                (o.clearTimeout(this._ignoredInputTimer), delete this._ignoredInputTimer),
            o.removeEventListener("keydown", this._onKeyDown, !0),
            o.removeEventListener(gf, this._onMoveFocus),
            o.removeEventListener(yf, this._onMemorizedElement),
            Object.keys(this._movers).forEach((a) => {
                this._movers[a] && (this._movers[a].dispose(), delete this._movers[a]);
            }));
    }
    createMover(n, o, a) {
        const c = new Dm(this._tabster, n, this._onMoverDispose, o, a);
        return ((this._movers[c.id] = c), c);
    }
    moveFocus(n, o) {
        return this._moveFocus(n, o);
    }
    _moveFocus(n, o, a) {
        var c, f;
        const h = this._tabster,
            p = yt.getTabsterContext(h, n, { checkRtl: !0 });
        if (!p || !p.mover || p.excludedFromMover || (a && p.ignoreKeydown(a))) return null;
        const m = p.mover,
            v = m.getElement();
        if (p.groupperBeforeMover) {
            const U = p.groupper;
            if (U && !U.isActive(!0)) {
                for (
                    let ie = K.getParentElement(U.getElement());
                    ie && ie !== v;
                    ie = K.getParentElement(ie)
                )
                    if (
                        !(
                            (f = (c = At(h, ie)) === null || c === void 0 ? void 0 : c.groupper) ===
                                null || f === void 0
                        ) &&
                        f.isActive(!0)
                    )
                        return null;
            } else return null;
        }
        if (!v) return null;
        const b = h.focusable,
            y = m.getProps(),
            k = y.direction || Ft.Both,
            S = k === Ft.Both,
            C = S || k === Ft.Vertical,
            E = S || k === Ft.Horizontal,
            N = k === Ft.GridLinear,
            q = N || k === Ft.Grid,
            H = y.cyclic;
        let D,
            Q,
            re,
            G = 0,
            ee = 0;
        if (
            (q &&
                ((re = n.getBoundingClientRect()),
                (G = Math.ceil(re.left)),
                (ee = Math.floor(re.right))),
            p.rtl &&
                (o === De.ArrowRight
                    ? (o = De.ArrowLeft)
                    : o === De.ArrowLeft && (o = De.ArrowRight)),
            (o === De.ArrowDown && C) || (o === De.ArrowRight && (E || q)))
        )
            if (
                ((D = b.findNext({ currentElement: n, container: v, useActiveModalizer: !0 })),
                D && q)
            ) {
                const U = Math.ceil(D.getBoundingClientRect().left);
                !N && ee > U && (D = void 0);
            } else !D && H && (D = b.findFirst({ container: v, useActiveModalizer: !0 }));
        else if ((o === De.ArrowUp && C) || (o === De.ArrowLeft && (E || q)))
            if (
                ((D = b.findPrev({ currentElement: n, container: v, useActiveModalizer: !0 })),
                D && q)
            ) {
                const U = Math.floor(D.getBoundingClientRect().right);
                !N && U > G && (D = void 0);
            } else !D && H && (D = b.findLast({ container: v, useActiveModalizer: !0 }));
        else if (o === De.Home)
            q
                ? b.findElement({
                      container: v,
                      currentElement: n,
                      useActiveModalizer: !0,
                      isBackward: !0,
                      acceptCondition: (U) => {
                          var ie;
                          if (!b.isFocusable(U)) return !1;
                          const fe = Math.ceil(
                              (ie = U.getBoundingClientRect().left) !== null && ie !== void 0
                                  ? ie
                                  : 0
                          );
                          return U !== n && G <= fe ? !0 : ((D = U), !1);
                      },
                  })
                : (D = b.findFirst({ container: v, useActiveModalizer: !0 }));
        else if (o === De.End)
            q
                ? b.findElement({
                      container: v,
                      currentElement: n,
                      useActiveModalizer: !0,
                      acceptCondition: (U) => {
                          var ie;
                          if (!b.isFocusable(U)) return !1;
                          const fe = Math.ceil(
                              (ie = U.getBoundingClientRect().left) !== null && ie !== void 0
                                  ? ie
                                  : 0
                          );
                          return U !== n && G >= fe ? !0 : ((D = U), !1);
                      },
                  })
                : (D = b.findLast({ container: v, useActiveModalizer: !0 }));
        else if (o === De.PageUp) {
            if (
                (b.findElement({
                    currentElement: n,
                    container: v,
                    useActiveModalizer: !0,
                    isBackward: !0,
                    acceptCondition: (U) =>
                        b.isFocusable(U)
                            ? _f(this._win, U, m.visibilityTolerance)
                                ? ((D = U), !1)
                                : !0
                            : !1,
                }),
                q && D)
            ) {
                const U = Math.ceil(D.getBoundingClientRect().left);
                b.findElement({
                    currentElement: D,
                    container: v,
                    useActiveModalizer: !0,
                    acceptCondition: (ie) => {
                        if (!b.isFocusable(ie)) return !1;
                        const fe = Math.ceil(ie.getBoundingClientRect().left);
                        return G < fe || U >= fe ? !0 : ((D = ie), !1);
                    },
                });
            }
            Q = !1;
        } else if (o === De.PageDown) {
            if (
                (b.findElement({
                    currentElement: n,
                    container: v,
                    useActiveModalizer: !0,
                    acceptCondition: (U) =>
                        b.isFocusable(U)
                            ? _f(this._win, U, m.visibilityTolerance)
                                ? ((D = U), !1)
                                : !0
                            : !1,
                }),
                q && D)
            ) {
                const U = Math.ceil(D.getBoundingClientRect().left);
                b.findElement({
                    currentElement: D,
                    container: v,
                    useActiveModalizer: !0,
                    isBackward: !0,
                    acceptCondition: (ie) => {
                        if (!b.isFocusable(ie)) return !1;
                        const fe = Math.ceil(ie.getBoundingClientRect().left);
                        return G > fe || U <= fe ? !0 : ((D = ie), !1);
                    },
                });
            }
            Q = !0;
        } else if (q) {
            const U = o === De.ArrowUp,
                ie = G,
                fe = Math.ceil(re.top),
                Ue = ee,
                Te = Math.floor(re.bottom);
            let Oe,
                Qe,
                qe = 0;
            (b.findAll({
                container: v,
                currentElement: n,
                isBackward: U,
                onElement: (A) => {
                    const Y = A.getBoundingClientRect(),
                        P = Math.ceil(Y.left),
                        V = Math.ceil(Y.top),
                        L = Math.floor(Y.right),
                        x = Math.floor(Y.bottom);
                    if ((U && fe < x) || (!U && Te > V)) return !0;
                    const F = Math.ceil(Math.min(Ue, L)) - Math.floor(Math.max(ie, P)),
                        ae = Math.ceil(Math.min(Ue - ie, L - P));
                    if (F > 0 && ae >= F) {
                        const le = F / ae;
                        le > qe && ((Oe = A), (qe = le));
                    } else if (qe === 0) {
                        const le = Om(ie, fe, Ue, Te, P, V, L, x);
                        (Qe === void 0 || le < Qe) && ((Qe = le), (Oe = A));
                    } else if (qe > 0) return !1;
                    return !0;
                },
            }),
                (D = Oe));
        }
        return D &&
            (!a ||
                (a && v.dispatchEvent(new un({ by: "mover", owner: v, next: D, relatedEvent: a }))))
            ? (Q !== void 0 && ym(this._win, D, Q),
              a && (a.preventDefault(), a.stopImmediatePropagation()),
              kr(D),
              D)
            : null;
    }
    async _isIgnoredInput(n, o) {
        if (
            n.getAttribute("aria-expanded") === "true" &&
            (n.hasAttribute("aria-activedescendant") || n.getAttribute("role") === "combobox")
        )
            return !0;
        if (md(n, jm)) {
            let a = 0,
                c = 0,
                f = 0,
                h;
            if (n.tagName === "INPUT" || n.tagName === "TEXTAREA") {
                const p = n.type;
                if (((f = (n.value || "").length), p === "email" || p === "number")) {
                    if (f) {
                        const v = K.getSelection(n);
                        if (v) {
                            const b = v.toString().length,
                                y = o === Ye.ArrowLeft || o === Ye.ArrowUp;
                            if (
                                (v.modify("extend", y ? "backward" : "forward", "character"),
                                b !== v.toString().length)
                            )
                                return (
                                    v.modify("extend", y ? "forward" : "backward", "character"),
                                    !0
                                );
                            f = 0;
                        }
                    }
                } else {
                    const v = n.selectionStart;
                    if (v === null) return p === "hidden";
                    ((a = v || 0), (c = n.selectionEnd || 0));
                }
            } else
                n.contentEditable === "true" &&
                    (h = new (_m(this._win))((p) => {
                        this._ignoredInputResolve = (S) => {
                            (delete this._ignoredInputResolve, p(S));
                        };
                        const m = this._win();
                        this._ignoredInputTimer && m.clearTimeout(this._ignoredInputTimer);
                        const {
                            anchorNode: v,
                            focusNode: b,
                            anchorOffset: y,
                            focusOffset: k,
                        } = K.getSelection(n) || {};
                        this._ignoredInputTimer = m.setTimeout(() => {
                            var S, C, E;
                            delete this._ignoredInputTimer;
                            const {
                                anchorNode: N,
                                focusNode: q,
                                anchorOffset: H,
                                focusOffset: D,
                            } = K.getSelection(n) || {};
                            if (N !== v || q !== b || H !== y || D !== k) {
                                (S = this._ignoredInputResolve) === null ||
                                    S === void 0 ||
                                    S.call(this, !1);
                                return;
                            }
                            if (
                                ((a = H || 0),
                                (c = D || 0),
                                (f =
                                    ((C = n.textContent) === null || C === void 0
                                        ? void 0
                                        : C.length) || 0),
                                N && q && K.nodeContains(n, N) && K.nodeContains(n, q) && N !== n)
                            ) {
                                let Q = !1;
                                const re = (G) => {
                                    if (G === N) Q = !0;
                                    else if (G === q) return !0;
                                    const ee = G.textContent;
                                    if (ee && !K.getFirstChild(G)) {
                                        const ie = ee.length;
                                        Q ? q !== N && (c += ie) : ((a += ie), (c += ie));
                                    }
                                    let U = !1;
                                    for (let ie = K.getFirstChild(G); ie && !U; ie = ie.nextSibling)
                                        U = re(ie);
                                    return U;
                                };
                                re(n);
                            }
                            (E = this._ignoredInputResolve) === null ||
                                E === void 0 ||
                                E.call(this, !0);
                        }, 0);
                    }));
            if (
                (h && !(await h)) ||
                a !== c ||
                (a > 0 && (o === Ye.ArrowLeft || o === Ye.ArrowUp || o === Ye.Home)) ||
                (a < f && (o === Ye.ArrowRight || o === Ye.ArrowDown || o === Ye.End))
            )
                return !0;
        }
        return !1;
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ function Mm(i, n, o, a) {
    if (typeof MutationObserver > "u") return () => {};
    const c = n.getWindow;
    let f;
    const h = (b) => {
        var y, k, S, C, E;
        const N = new Set();
        for (const q of b) {
            const H = q.target,
                D = q.removedNodes,
                Q = q.addedNodes;
            if (q.type === "attributes") q.attributeName === _r && (N.has(H) || o(n, H));
            else {
                for (let re = 0; re < D.length; re++) {
                    const G = D[re];
                    (N.add(G),
                        p(G, !0),
                        (k = (y = n._dummyObserver).domChanged) === null ||
                            k === void 0 ||
                            k.call(y, H));
                }
                for (let re = 0; re < Q.length; re++)
                    (p(Q[re]),
                        (C = (S = n._dummyObserver).domChanged) === null ||
                            C === void 0 ||
                            C.call(S, H));
            }
        }
        (N.clear(), (E = n.modalizer) === null || E === void 0 || E.hiddenUpdate());
    };
    function p(b, y) {
        (f || (f = Yt(c).elementByUId), m(b, y));
        const k = ra(i, b, (S) => m(S, y));
        if (k) for (; k.nextNode(); );
    }
    function m(b, y) {
        var k;
        if (!b.getAttribute) return NodeFilter.FILTER_SKIP;
        const S = b.__tabsterElementUID;
        return (
            S &&
                f &&
                (y ? delete f[S] : ((k = f[S]) !== null && k !== void 0) || (f[S] = new Gt(c, b))),
            (At(n, b) || b.hasAttribute(_r)) && o(n, b, y),
            NodeFilter.FILTER_SKIP
        );
    }
    const v = K.createMutationObserver(h);
    return (
        a && p(c().document.body),
        v.observe(i, { childList: !0, subtree: !0, attributes: !0, attributeFilter: [_r] }),
        () => {
            v.disconnect();
        }
    );
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class Am {
    constructor(n) {
        this._isUncontrolledCompletely = n;
    }
    isUncontrolledCompletely(n, o) {
        var a;
        const c =
            (a = this._isUncontrolledCompletely) === null || a === void 0
                ? void 0
                : a.call(this, n, o);
        return c === void 0 ? o : c;
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class qm {
    constructor(n) {
        ((this.keyboardNavigation = n.keyboardNavigation),
            (this.focusedElement = n.focusedElement),
            (this.focusable = n.focusable),
            (this.root = n.root),
            (this.uncontrolled = n.uncontrolled),
            (this.core = n));
    }
}
class Hm {
    constructor(n, o) {
        var a, c;
        ((this._forgetMemorizedElements = []),
            (this._wrappers = new Set()),
            (this._initQueue = []),
            (this._version = "8.7.0"),
            (this._noop = !1),
            (this.getWindow = () => {
                if (!this._win) throw new Error("Using disposed Tabster.");
                return this._win;
            }),
            (this._storage = vm(n)),
            (this._win = n));
        const f = this.getWindow;
        (o != null && o.DOMAPI && dm({ ...o.DOMAPI }),
            (this.keyboardNavigation = new Rm(f)),
            (this.focusedElement = new Me(this, f)),
            (this.focusable = new Pm(this)),
            (this.root = new yt(this, o == null ? void 0 : o.autoRoot)),
            (this.uncontrolled = new Am(
                (o == null ? void 0 : o.checkUncontrolledCompletely) ||
                    (o == null ? void 0 : o.checkUncontrolledTrappingFocus)
            )),
            (this.controlTab =
                (a = o == null ? void 0 : o.controlTab) !== null && a !== void 0 ? a : !0),
            (this.rootDummyInputs = !!(o != null && o.rootDummyInputs)),
            (this._dummyObserver = new Sm(f)),
            (this.getParent =
                (c = o == null ? void 0 : o.getParent) !== null && c !== void 0
                    ? c
                    : K.getParentNode),
            (this.internal = {
                stopObserver: () => {
                    this._unobserve && (this._unobserve(), delete this._unobserve);
                },
                resumeObserver: (h) => {
                    if (!this._unobserve) {
                        const p = f().document;
                        this._unobserve = Mm(p, this, ud, h);
                    }
                },
            }),
            dd(f),
            this.queueInit(() => {
                this.internal.resumeObserver(!0);
            }));
    }
    _mergeProps(n) {
        var o;
        n && (this.getParent = (o = n.getParent) !== null && o !== void 0 ? o : this.getParent);
    }
    createTabster(n, o) {
        const a = new qm(this);
        return (n || this._wrappers.add(a), this._mergeProps(o), a);
    }
    disposeTabster(n, o) {
        (o ? this._wrappers.clear() : this._wrappers.delete(n),
            this._wrappers.size === 0 && this.dispose());
    }
    dispose() {
        var n, o, a, c, f, h, p, m;
        this.internal.stopObserver();
        const v = this._win;
        (v == null || v.clearTimeout(this._initTimer),
            delete this._initTimer,
            (this._initQueue = []),
            (this._forgetMemorizedElements = []),
            v &&
                this._forgetMemorizedTimer &&
                (v.clearTimeout(this._forgetMemorizedTimer), delete this._forgetMemorizedTimer),
            (n = this.outline) === null || n === void 0 || n.dispose(),
            (o = this.crossOrigin) === null || o === void 0 || o.dispose(),
            (a = this.deloser) === null || a === void 0 || a.dispose(),
            (c = this.groupper) === null || c === void 0 || c.dispose(),
            (f = this.mover) === null || f === void 0 || f.dispose(),
            (h = this.modalizer) === null || h === void 0 || h.dispose(),
            (p = this.observedElement) === null || p === void 0 || p.dispose(),
            (m = this.restorer) === null || m === void 0 || m.dispose(),
            this.keyboardNavigation.dispose(),
            this.focusable.dispose(),
            this.focusedElement.dispose(),
            this.root.dispose(),
            this._dummyObserver.dispose(),
            gm(this.getWindow),
            kf(this.getWindow),
            (this._storage = new WeakMap()),
            this._wrappers.clear(),
            v && (pm(v), delete v.__tabsterInstance, delete this._win));
    }
    storageEntry(n, o) {
        const a = this._storage;
        let c = a.get(n);
        return (
            c
                ? o === !1 && Object.keys(c).length === 0 && a.delete(n)
                : o === !0 && ((c = {}), a.set(n, c)),
            c
        );
    }
    forceCleanup() {
        this._win &&
            (this._forgetMemorizedElements.push(this._win.document.body),
            !this._forgetMemorizedTimer &&
                ((this._forgetMemorizedTimer = this._win.setTimeout(() => {
                    delete this._forgetMemorizedTimer;
                    for (
                        let n = this._forgetMemorizedElements.shift();
                        n;
                        n = this._forgetMemorizedElements.shift()
                    )
                        (kf(this.getWindow, n), Me.forgetMemorized(this.focusedElement, n));
                }, 0)),
                fd(this.getWindow, !0)));
    }
    queueInit(n) {
        var o;
        this._win &&
            (this._initQueue.push(n),
            this._initTimer ||
                (this._initTimer =
                    (o = this._win) === null || o === void 0
                        ? void 0
                        : o.setTimeout(() => {
                              (delete this._initTimer, this.drainInitQueue());
                          }, 0)));
    }
    drainInitQueue() {
        if (!this._win) return;
        const n = this._initQueue;
        ((this._initQueue = []), n.forEach((o) => o()));
    }
}
function Wm(i, n) {
    let o = Km(i);
    return o
        ? o.createTabster(!1, n)
        : ((o = new Hm(i, n)), (i.__tabsterInstance = o), o.createTabster());
}
function Um(i) {
    const n = i.core;
    return (n.mover || (n.mover = new Lm(n, n.getWindow)), n.mover);
}
function Vm(i, n) {
    i.core.disposeTabster(i, n);
}
function Km(i) {
    return i.__tabsterInstance;
}
const $m = (i) => i;
function Qm(i) {
    const n = (i == null ? void 0 : i.defaultView) || void 0,
        o = n == null ? void 0 : n.__tabsterShadowDOMAPI;
    if (n)
        return Wm(n, {
            autoRoot: {},
            controlTab: !1,
            getParent: y0,
            checkUncontrolledCompletely: (a) => {
                var c;
                return (
                    ((c = a.firstElementChild) === null || c === void 0
                        ? void 0
                        : c.hasAttribute("data-is-focus-trap-zone-bumper")) === !0 || void 0
                );
            },
            DOMAPI: o,
        });
}
function kd(i = $m) {
    const { targetDocument: n } = zi(),
        o = M.useRef(null);
    return (
        Ni(() => {
            const a = Qm(n);
            if (a)
                return (
                    (o.current = i(a)),
                    () => {
                        (Vm(a), (o.current = null));
                    }
                );
        }, [n, i]),
        o
    );
}
const Gm = (i) => {
        kd();
        const n = bd(i);
        return M.useMemo(() => ({ [_r]: n }), [n]);
    },
    Xm = (i = {}) => {
        const {
            circular: n,
            axis: o,
            memorizeCurrent: a = !0,
            tabbable: c,
            ignoreDefaultKeydown: f,
            unstable_hasDefault: h,
        } = i;
        return (
            kd(Um),
            Gm({
                mover: {
                    cyclic: !!n,
                    direction: Ym(o ?? "vertical"),
                    memorizeCurrent: a,
                    tabbable: c,
                    hasDefault: h,
                },
                ...(f && { focusable: { ignoreKeydown: f } }),
            })
        );
    };
function Ym(i) {
    switch (i) {
        case "horizontal":
            return Ft.Horizontal;
        case "grid":
            return Ft.Grid;
        case "grid-linear":
            return Ft.GridLinear;
        case "both":
            return Ft.Both;
        case "vertical":
        default:
            return Ft.Vertical;
    }
}
const Tf = "data-fui-focus-visible",
    xd = "data-fui-focus-within";
function Jm(i, n) {
    if (Sd(i)) return () => {};
    const o = { current: void 0 },
        a = ea(n);
    function c(m) {
        a.isNavigatingWithKeyboard() && vf(m) && ((o.current = m), m.setAttribute(Tf, ""));
    }
    function f() {
        o.current && (o.current.removeAttribute(Tf), (o.current = void 0));
    }
    a.subscribe((m) => {
        m ? c(n.document.activeElement) : f();
    });
    const h = (m) => {
            f();
            const v = m.composedPath()[0];
            c(v);
        },
        p = (m) => {
            (!m.relatedTarget || (vf(m.relatedTarget) && !i.contains(m.relatedTarget))) && f();
        };
    return (
        i.addEventListener(Rt, h),
        i.addEventListener("focusout", p),
        (i.focusVisible = !0),
        i.contains(n.document.activeElement) && c(n.document.activeElement),
        () => {
            (f(),
                i.removeEventListener(Rt, h),
                i.removeEventListener("focusout", p),
                (i.focusVisible = void 0),
                ta(a));
        }
    );
}
function Sd(i) {
    return i ? (i.focusVisible ? !0 : Sd(i == null ? void 0 : i.parentElement)) : !1;
}
function Bd(i = {}) {
    const n = zi(),
        o = M.useRef(null);
    var a;
    const c = (a = i.targetDocument) !== null && a !== void 0 ? a : n.targetDocument;
    return (
        M.useEffect(() => {
            if (c != null && c.defaultView && o.current) return Jm(o.current, c.defaultView);
        }, [o, c]),
        o
    );
}
function Zm(i, n) {
    const o = ea(n);
    o.subscribe((f) => {
        f || Cf(i);
    });
    const a = (f) => {
            o.isNavigatingWithKeyboard() && zf(f.target) && eg(i);
        },
        c = (f) => {
            (!f.relatedTarget || (zf(f.relatedTarget) && !i.contains(f.relatedTarget))) && Cf(i);
        };
    return (
        i.addEventListener(Rt, a),
        i.addEventListener("focusout", c),
        () => {
            (i.removeEventListener(Rt, a), i.removeEventListener("focusout", c), ta(o));
        }
    );
}
function eg(i) {
    i.setAttribute(xd, "");
}
function Cf(i) {
    i.removeAttribute(xd);
}
function zf(i) {
    return i ? !!(i && typeof i == "object" && "classList" in i && "contains" in i) : !1;
}
function Ed() {
    const { targetDocument: i } = zi(),
        n = M.useRef(null);
    return (
        M.useEffect(() => {
            if (i != null && i.defaultView && n.current) return Zm(n.current, i.defaultView);
        }, [n, i]),
        n
    );
}
const W = {
        12: "#1f1f1f",
        14: "#242424",
        16: "#292929",
        20: "#333333",
        22: "#383838",
        24: "#3d3d3d",
        26: "#424242",
        30: "#4d4d4d",
        34: "#575757",
        38: "#616161",
        44: "#707070",
        70: "#b3b3b3",
        74: "#bdbdbd",
        78: "#c7c7c7",
        82: "#d1d1d1",
        84: "#d6d6d6",
        86: "#dbdbdb",
        88: "#e0e0e0",
        90: "#e6e6e6",
        92: "#ebebeb",
        94: "#f0f0f0",
        96: "#f5f5f5",
        98: "#fafafa",
        99: "#fcfcfc",
    },
    yr = {
        10: "rgba(255, 255, 255, 0.1)",
        20: "rgba(255, 255, 255, 0.2)",
        40: "rgba(255, 255, 255, 0.4)",
        50: "rgba(255, 255, 255, 0.5)",
        70: "rgba(255, 255, 255, 0.7)",
        80: "rgba(255, 255, 255, 0.8)",
    },
    wr = {
        5: "rgba(0, 0, 0, 0.05)",
        10: "rgba(0, 0, 0, 0.1)",
        20: "rgba(0, 0, 0, 0.2)",
        30: "rgba(0, 0, 0, 0.3)",
        40: "rgba(0, 0, 0, 0.4)",
        50: "rgba(0, 0, 0, 0.5)",
    },
    Pe = "#ffffff",
    tg = "#000000",
    rg = {
        shade50: "#130204",
        shade40: "#230308",
        shade30: "#420610",
        shade20: "#590815",
        shade10: "#690a19",
        primary: "#750b1c",
        tint10: "#861b2c",
        tint20: "#962f3f",
        tint30: "#ac4f5e",
        tint40: "#d69ca5",
        tint50: "#e9c7cd",
        tint60: "#f9f0f2",
    },
    Td = {
        shade50: "#200205",
        shade40: "#3b0509",
        shade30: "#6e0811",
        shade20: "#960b18",
        shade10: "#b10e1c",
        primary: "#c50f1f",
        tint10: "#cc2635",
        tint20: "#d33f4c",
        tint30: "#dc626d",
        tint40: "#eeacb2",
        tint50: "#f6d1d5",
        tint60: "#fdf3f4",
    },
    ng = {
        shade50: "#210809",
        shade40: "#3f1011",
        shade30: "#751d1f",
        shade20: "#9f282b",
        shade10: "#bc2f32",
        primary: "#d13438",
        tint10: "#d7494c",
        tint20: "#dc5e62",
        tint30: "#e37d80",
        tint40: "#f1bbbc",
        tint50: "#f8dadb",
        tint60: "#fdf6f6",
    },
    og = {
        shade50: "#230900",
        shade40: "#411200",
        shade30: "#7a2101",
        shade20: "#a62d01",
        shade10: "#c43501",
        primary: "#da3b01",
        tint10: "#de501c",
        tint20: "#e36537",
        tint30: "#e9835e",
        tint40: "#f4bfab",
        tint50: "#f9dcd1",
        tint60: "#fdf6f3",
    },
    ig = {
        shade50: "#200d03",
        shade40: "#3d1805",
        shade30: "#712d09",
        shade20: "#9a3d0c",
        shade10: "#b6480e",
        primary: "#ca5010",
        tint10: "#d06228",
        tint20: "#d77440",
        tint30: "#df8e64",
        tint40: "#efc4ad",
        tint50: "#f7dfd2",
        tint60: "#fdf7f4",
    },
    lg = {
        shade50: "#271002",
        shade40: "#4a1e04",
        shade30: "#8a3707",
        shade20: "#bc4b09",
        shade10: "#de590b",
        primary: "#f7630c",
        tint10: "#f87528",
        tint20: "#f98845",
        tint30: "#faa06b",
        tint40: "#fdcfb4",
        tint50: "#fee5d7",
        tint60: "#fff9f5",
    },
    sg = {
        shade50: "#291600",
        shade40: "#4d2a00",
        shade30: "#8f4e00",
        shade20: "#c26a00",
        shade10: "#e67e00",
        primary: "#ff8c00",
        tint10: "#ff9a1f",
        tint20: "#ffa83d",
        tint30: "#ffba66",
        tint40: "#ffddb3",
        tint50: "#ffedd6",
        tint60: "#fffaf5",
    },
    ag = {
        shade50: "#251a00",
        shade40: "#463100",
        shade30: "#835b00",
        shade20: "#b27c00",
        shade10: "#d39300",
        primary: "#eaa300",
        tint10: "#edad1c",
        tint20: "#efb839",
        tint30: "#f2c661",
        tint40: "#f9e2ae",
        tint50: "#fcefd3",
        tint60: "#fefbf4",
    },
    ug = {
        shade50: "#282400",
        shade40: "#4c4400",
        shade30: "#817400",
        shade20: "#c0ad00",
        shade10: "#e4cc00",
        primary: "#fde300",
        tint10: "#fde61e",
        tint20: "#fdea3d",
        tint30: "#feee66",
        tint40: "#fef7b2",
        tint50: "#fffad6",
        tint60: "#fffef5",
    },
    cg = {
        shade50: "#1f1900",
        shade40: "#3a2f00",
        shade30: "#6c5700",
        shade20: "#937700",
        shade10: "#ae8c00",
        primary: "#c19c00",
        tint10: "#c8a718",
        tint20: "#d0b232",
        tint30: "#dac157",
        tint40: "#ecdfa5",
        tint50: "#f5eece",
        tint60: "#fdfbf2",
    },
    fg = {
        shade50: "#181202",
        shade40: "#2e2103",
        shade30: "#553e06",
        shade20: "#745408",
        shade10: "#89640a",
        primary: "#986f0b",
        tint10: "#a47d1e",
        tint20: "#b18c34",
        tint30: "#c1a256",
        tint40: "#e0cea2",
        tint50: "#efe4cb",
        tint60: "#fbf8f2",
    },
    dg = {
        shade50: "#170e07",
        shade40: "#2b1a0e",
        shade30: "#50301a",
        shade20: "#6c4123",
        shade10: "#804d29",
        primary: "#8e562e",
        tint10: "#9c663f",
        tint20: "#a97652",
        tint30: "#bb8f6f",
        tint40: "#ddc3b0",
        tint50: "#edded3",
        tint60: "#faf7f4",
    },
    hg = {
        shade50: "#0c1501",
        shade40: "#162702",
        shade30: "#294903",
        shade20: "#376304",
        shade10: "#427505",
        primary: "#498205",
        tint10: "#599116",
        tint20: "#6ba02b",
        tint30: "#85b44c",
        tint40: "#bdd99b",
        tint50: "#dbebc7",
        tint60: "#f6faf0",
    },
    pg = {
        shade50: "#002111",
        shade40: "#003d20",
        shade30: "#00723b",
        shade20: "#009b51",
        shade10: "#00b85f",
        primary: "#00cc6a",
        tint10: "#19d279",
        tint20: "#34d889",
        tint30: "#5ae0a0",
        tint40: "#a8f0cd",
        tint50: "#cff7e4",
        tint60: "#f3fdf8",
    },
    vg = {
        shade50: "#031a02",
        shade40: "#063004",
        shade30: "#0b5a08",
        shade20: "#0e7a0b",
        shade10: "#11910d",
        primary: "#13a10e",
        tint10: "#27ac22",
        tint20: "#3db838",
        tint30: "#5ec75a",
        tint40: "#a7e3a5",
        tint50: "#cef0cd",
        tint60: "#f2fbf2",
    },
    Cd = {
        shade50: "#031403",
        shade40: "#052505",
        shade30: "#094509",
        shade20: "#0c5e0c",
        shade10: "#0e700e",
        primary: "#107c10",
        tint10: "#218c21",
        tint20: "#359b35",
        tint30: "#54b054",
        tint40: "#9fd89f",
        tint50: "#c9eac9",
        tint60: "#f1faf1",
    },
    mg = {
        shade50: "#021102",
        shade40: "#032003",
        shade30: "#063b06",
        shade20: "#085108",
        shade10: "#0a5f0a",
        primary: "#0b6a0b",
        tint10: "#1a7c1a",
        tint20: "#2d8e2d",
        tint30: "#4da64d",
        tint40: "#9ad29a",
        tint50: "#c6e7c6",
        tint60: "#f0f9f0",
    },
    gg = {
        shade50: "#001d1f",
        shade40: "#00373a",
        shade30: "#00666d",
        shade20: "#008b94",
        shade10: "#00a5af",
        primary: "#00b7c3",
        tint10: "#18bfca",
        tint20: "#32c8d1",
        tint30: "#58d3db",
        tint40: "#a6e9ed",
        tint50: "#cef3f5",
        tint60: "#f2fcfd",
    },
    yg = {
        shade50: "#001516",
        shade40: "#012728",
        shade30: "#02494c",
        shade20: "#026467",
        shade10: "#037679",
        primary: "#038387",
        tint10: "#159195",
        tint20: "#2aa0a4",
        tint30: "#4cb4b7",
        tint40: "#9bd9db",
        tint50: "#c7ebec",
        tint60: "#f0fafa",
    },
    wg = {
        shade50: "#000f12",
        shade40: "#001b22",
        shade30: "#00333f",
        shade20: "#004555",
        shade10: "#005265",
        primary: "#005b70",
        tint10: "#0f6c81",
        tint20: "#237d92",
        tint30: "#4496a9",
        tint40: "#94c8d4",
        tint50: "#c3e1e8",
        tint60: "#eff7f9",
    },
    bg = {
        shade50: "#001322",
        shade40: "#002440",
        shade30: "#004377",
        shade20: "#005ba1",
        shade10: "#006cbf",
        primary: "#0078d4",
        tint10: "#1a86d9",
        tint20: "#3595de",
        tint30: "#5caae5",
        tint40: "#a9d3f2",
        tint50: "#d0e7f8",
        tint60: "#f3f9fd",
    },
    _g = {
        shade50: "#000c16",
        shade40: "#00172a",
        shade30: "#002c4e",
        shade20: "#003b6a",
        shade10: "#00467e",
        primary: "#004e8c",
        tint10: "#125e9a",
        tint20: "#286fa8",
        tint30: "#4a89ba",
        tint40: "#9abfdc",
        tint50: "#c7dced",
        tint60: "#f0f6fa",
    },
    kg = {
        shade50: "#0d1126",
        shade40: "#182047",
        shade30: "#2c3c85",
        shade20: "#3c51b4",
        shade10: "#4760d5",
        primary: "#4f6bed",
        tint10: "#637cef",
        tint20: "#778df1",
        tint30: "#93a4f4",
        tint40: "#c8d1fa",
        tint50: "#e1e6fc",
        tint60: "#f7f9fe",
    },
    xg = {
        shade50: "#00061d",
        shade40: "#000c36",
        shade30: "#001665",
        shade20: "#001e89",
        shade10: "#0023a2",
        primary: "#0027b4",
        tint10: "#173bbd",
        tint20: "#3050c6",
        tint30: "#546fd2",
        tint40: "#a3b2e8",
        tint50: "#ccd5f3",
        tint60: "#f2f4fc",
    },
    Sg = {
        shade50: "#120f25",
        shade40: "#221d46",
        shade30: "#3f3682",
        shade20: "#5649b0",
        shade10: "#6656d1",
        primary: "#7160e8",
        tint10: "#8172eb",
        tint20: "#9184ee",
        tint30: "#a79cf1",
        tint40: "#d2ccf8",
        tint50: "#e7e4fb",
        tint60: "#f9f8fe",
    },
    Bg = {
        shade50: "#0f0717",
        shade40: "#1c0e2b",
        shade30: "#341a51",
        shade20: "#46236e",
        shade10: "#532982",
        primary: "#5c2e91",
        tint10: "#6b3f9e",
        tint20: "#7c52ab",
        tint30: "#9470bd",
        tint40: "#c6b1de",
        tint50: "#e0d3ed",
        tint60: "#f7f4fb",
    },
    Eg = {
        shade50: "#160418",
        shade40: "#29072e",
        shade30: "#4c0d55",
        shade20: "#671174",
        shade10: "#7a1589",
        primary: "#881798",
        tint10: "#952aa4",
        tint20: "#a33fb1",
        tint30: "#b55fc1",
        tint40: "#d9a7e0",
        tint50: "#eaceef",
        tint60: "#faf2fb",
    },
    Tg = {
        shade50: "#1f091d",
        shade40: "#3a1136",
        shade30: "#6d2064",
        shade20: "#932b88",
        shade10: "#af33a1",
        primary: "#c239b3",
        tint10: "#c94cbc",
        tint20: "#d161c4",
        tint30: "#da7ed0",
        tint40: "#edbbe7",
        tint50: "#f5daf2",
        tint60: "#fdf5fc",
    },
    Cg = {
        shade50: "#1c0b1f",
        shade40: "#35153a",
        shade30: "#63276d",
        shade20: "#863593",
        shade10: "#9f3faf",
        primary: "#b146c2",
        tint10: "#ba58c9",
        tint20: "#c36bd1",
        tint30: "#cf87da",
        tint40: "#e6bfed",
        tint50: "#f2dcf5",
        tint60: "#fcf6fd",
    },
    zg = {
        shade50: "#24091b",
        shade40: "#441232",
        shade30: "#80215d",
        shade20: "#ad2d7e",
        shade10: "#cd3595",
        primary: "#e43ba6",
        tint10: "#e750b0",
        tint20: "#ea66ba",
        tint30: "#ef85c8",
        tint40: "#f7c0e3",
        tint50: "#fbddf0",
        tint60: "#fef6fb",
    },
    Ng = {
        shade50: "#1f0013",
        shade40: "#390024",
        shade30: "#6b0043",
        shade20: "#91005a",
        shade10: "#ac006b",
        primary: "#bf0077",
        tint10: "#c71885",
        tint20: "#ce3293",
        tint30: "#d957a8",
        tint40: "#eca5d1",
        tint50: "#f5cee6",
        tint60: "#fcf2f9",
    },
    Pg = {
        shade50: "#13000c",
        shade40: "#240017",
        shade30: "#43002b",
        shade20: "#5a003b",
        shade10: "#6b0045",
        primary: "#77004d",
        tint10: "#87105d",
        tint20: "#98246f",
        tint30: "#ad4589",
        tint40: "#d696c0",
        tint50: "#e9c4dc",
        tint60: "#faf0f6",
    },
    Fg = {
        shade50: "#141313",
        shade40: "#252323",
        shade30: "#444241",
        shade20: "#5d5958",
        shade10: "#6e6968",
        primary: "#7a7574",
        tint10: "#8a8584",
        tint20: "#9a9594",
        tint30: "#afabaa",
        tint40: "#d7d4d4",
        tint50: "#eae8e8",
        tint60: "#faf9f9",
    },
    Rg = {
        shade50: "#0f0e0e",
        shade40: "#1c1b1a",
        shade30: "#343231",
        shade20: "#474443",
        shade10: "#54514f",
        primary: "#5d5a58",
        tint10: "#706d6b",
        tint20: "#84817e",
        tint30: "#9e9b99",
        tint40: "#cecccb",
        tint50: "#e5e4e3",
        tint60: "#f8f8f8",
    },
    jg = {
        shade50: "#111314",
        shade40: "#1f2426",
        shade30: "#3b4447",
        shade20: "#505c60",
        shade10: "#5f6d71",
        primary: "#69797e",
        tint10: "#79898d",
        tint20: "#89989d",
        tint30: "#a0adb2",
        tint40: "#cdd6d8",
        tint50: "#e4e9ea",
        tint60: "#f8f9fa",
    },
    Ig = {
        shade50: "#090a0b",
        shade40: "#111315",
        shade30: "#202427",
        shade20: "#2b3135",
        shade10: "#333a3f",
        primary: "#394146",
        tint10: "#4d565c",
        tint20: "#626c72",
        tint30: "#808a90",
        tint40: "#bcc3c7",
        tint50: "#dbdfe1",
        tint60: "#f6f7f8",
    },
    gt = {
        red: ng,
        green: Cd,
        darkOrange: og,
        yellow: ug,
        berry: Tg,
        lightGreen: vg,
        marigold: ag,
    },
    Is = {
        darkRed: rg,
        cranberry: Td,
        pumpkin: ig,
        peach: sg,
        gold: cg,
        brass: fg,
        brown: dg,
        forest: hg,
        seafoam: pg,
        darkGreen: mg,
        lightTeal: gg,
        teal: yg,
        steel: wg,
        blue: bg,
        royalBlue: _g,
        cornflower: kg,
        navy: xg,
        lavender: Sg,
        purple: Bg,
        grape: Eg,
        lilac: Cg,
        pink: zg,
        magenta: Ng,
        plum: Pg,
        beige: Fg,
        mink: Rg,
        platinum: jg,
        anchor: Ig,
    },
    it = { cranberry: Td, green: Cd, orange: lg },
    Dg = ["red", "green", "darkOrange", "yellow", "berry", "lightGreen", "marigold"],
    Og = [
        "darkRed",
        "cranberry",
        "pumpkin",
        "peach",
        "gold",
        "brass",
        "brown",
        "forest",
        "seafoam",
        "darkGreen",
        "lightTeal",
        "teal",
        "steel",
        "blue",
        "royalBlue",
        "cornflower",
        "navy",
        "lavender",
        "purple",
        "grape",
        "lilac",
        "pink",
        "magenta",
        "plum",
        "beige",
        "mink",
        "platinum",
        "anchor",
    ],
    fn = { success: "green", warning: "orange", danger: "cranberry" },
    oo = Dg.reduce((i, n) => {
        const o = n.slice(0, 1).toUpperCase() + n.slice(1),
            a = {
                [`colorPalette${o}Background1`]: gt[n].tint60,
                [`colorPalette${o}Background2`]: gt[n].tint40,
                [`colorPalette${o}Background3`]: gt[n].primary,
                [`colorPalette${o}Foreground1`]: gt[n].shade10,
                [`colorPalette${o}Foreground2`]: gt[n].shade30,
                [`colorPalette${o}Foreground3`]: gt[n].primary,
                [`colorPalette${o}BorderActive`]: gt[n].primary,
                [`colorPalette${o}Border1`]: gt[n].tint40,
                [`colorPalette${o}Border2`]: gt[n].primary,
            };
        return Object.assign(i, a);
    }, {});
oo.colorPaletteYellowForeground1 = gt.yellow.shade30;
oo.colorPaletteRedForegroundInverted = gt.red.tint20;
oo.colorPaletteGreenForegroundInverted = gt.green.tint20;
oo.colorPaletteYellowForegroundInverted = gt.yellow.tint40;
const Lg = Og.reduce((i, n) => {
        const o = n.slice(0, 1).toUpperCase() + n.slice(1),
            a = {
                [`colorPalette${o}Background2`]: Is[n].tint40,
                [`colorPalette${o}Foreground2`]: Is[n].shade30,
                [`colorPalette${o}BorderActive`]: Is[n].primary,
            };
        return Object.assign(i, a);
    }, {}),
    Mg = { ...oo, ...Lg },
    dn = Object.entries(fn).reduce((i, [n, o]) => {
        const a = n.slice(0, 1).toUpperCase() + n.slice(1),
            c = {
                [`colorStatus${a}Background1`]: it[o].tint60,
                [`colorStatus${a}Background2`]: it[o].tint40,
                [`colorStatus${a}Background3`]: it[o].primary,
                [`colorStatus${a}Foreground1`]: it[o].shade10,
                [`colorStatus${a}Foreground2`]: it[o].shade30,
                [`colorStatus${a}Foreground3`]: it[o].primary,
                [`colorStatus${a}ForegroundInverted`]: it[o].tint30,
                [`colorStatus${a}BorderActive`]: it[o].primary,
                [`colorStatus${a}Border1`]: it[o].tint40,
                [`colorStatus${a}Border2`]: it[o].primary,
            };
        return Object.assign(i, c);
    }, {});
dn.colorStatusDangerBackground3Hover = it[fn.danger].shade10;
dn.colorStatusDangerBackground3Pressed = it[fn.danger].shade20;
dn.colorStatusWarningForeground1 = it[fn.warning].shade20;
dn.colorStatusWarningForeground3 = it[fn.warning].shade20;
dn.colorStatusWarningBorder2 = it[fn.warning].shade20;
const Ag = (i) => ({
        colorNeutralForeground1: W[14],
        colorNeutralForeground1Hover: W[14],
        colorNeutralForeground1Pressed: W[14],
        colorNeutralForeground1Selected: W[14],
        colorNeutralForeground2: W[26],
        colorNeutralForeground2Hover: W[14],
        colorNeutralForeground2Pressed: W[14],
        colorNeutralForeground2Selected: W[14],
        colorNeutralForeground2BrandHover: i[80],
        colorNeutralForeground2BrandPressed: i[70],
        colorNeutralForeground2BrandSelected: i[80],
        colorNeutralForeground3: W[38],
        colorNeutralForeground3Hover: W[26],
        colorNeutralForeground3Pressed: W[26],
        colorNeutralForeground3Selected: W[26],
        colorNeutralForeground3BrandHover: i[80],
        colorNeutralForeground3BrandPressed: i[70],
        colorNeutralForeground3BrandSelected: i[80],
        colorNeutralForeground4: W[44],
        colorNeutralForeground5: W[38],
        colorNeutralForeground5Hover: W[14],
        colorNeutralForeground5Pressed: W[14],
        colorNeutralForeground5Selected: W[14],
        colorNeutralForegroundDisabled: W[74],
        colorNeutralForegroundInvertedDisabled: yr[40],
        colorBrandForegroundLink: i[70],
        colorBrandForegroundLinkHover: i[60],
        colorBrandForegroundLinkPressed: i[40],
        colorBrandForegroundLinkSelected: i[70],
        colorNeutralForeground2Link: W[26],
        colorNeutralForeground2LinkHover: W[14],
        colorNeutralForeground2LinkPressed: W[14],
        colorNeutralForeground2LinkSelected: W[14],
        colorCompoundBrandForeground1: i[80],
        colorCompoundBrandForeground1Hover: i[70],
        colorCompoundBrandForeground1Pressed: i[60],
        colorBrandForeground1: i[80],
        colorBrandForeground2: i[70],
        colorBrandForeground2Hover: i[60],
        colorBrandForeground2Pressed: i[30],
        colorNeutralForeground1Static: W[14],
        colorNeutralForegroundStaticInverted: Pe,
        colorNeutralForegroundInverted: Pe,
        colorNeutralForegroundInvertedHover: Pe,
        colorNeutralForegroundInvertedPressed: Pe,
        colorNeutralForegroundInvertedSelected: Pe,
        colorNeutralForegroundInverted2: Pe,
        colorNeutralForegroundOnBrand: Pe,
        colorNeutralForegroundInvertedLink: Pe,
        colorNeutralForegroundInvertedLinkHover: Pe,
        colorNeutralForegroundInvertedLinkPressed: Pe,
        colorNeutralForegroundInvertedLinkSelected: Pe,
        colorBrandForegroundInverted: i[100],
        colorBrandForegroundInvertedHover: i[110],
        colorBrandForegroundInvertedPressed: i[100],
        colorBrandForegroundOnLight: i[80],
        colorBrandForegroundOnLightHover: i[70],
        colorBrandForegroundOnLightPressed: i[50],
        colorBrandForegroundOnLightSelected: i[60],
        colorNeutralBackground1: Pe,
        colorNeutralBackground1Hover: W[96],
        colorNeutralBackground1Pressed: W[88],
        colorNeutralBackground1Selected: W[92],
        colorNeutralBackground2: W[98],
        colorNeutralBackground2Hover: W[94],
        colorNeutralBackground2Pressed: W[86],
        colorNeutralBackground2Selected: W[90],
        colorNeutralBackground3: W[96],
        colorNeutralBackground3Hover: W[92],
        colorNeutralBackground3Pressed: W[84],
        colorNeutralBackground3Selected: W[88],
        colorNeutralBackground4: W[94],
        colorNeutralBackground4Hover: W[98],
        colorNeutralBackground4Pressed: W[96],
        colorNeutralBackground4Selected: Pe,
        colorNeutralBackground5: W[92],
        colorNeutralBackground5Hover: W[96],
        colorNeutralBackground5Pressed: W[94],
        colorNeutralBackground5Selected: W[98],
        colorNeutralBackground6: W[90],
        colorNeutralBackground7: "#00000000",
        colorNeutralBackground7Hover: W[92],
        colorNeutralBackground7Pressed: W[84],
        colorNeutralBackground7Selected: "#00000000",
        colorNeutralBackground8: W[99],
        colorNeutralBackgroundInverted: W[16],
        colorNeutralBackgroundInvertedHover: W[24],
        colorNeutralBackgroundInvertedPressed: W[12],
        colorNeutralBackgroundInvertedSelected: W[22],
        colorNeutralBackgroundStatic: W[20],
        colorNeutralBackgroundAlpha: yr[50],
        colorNeutralBackgroundAlpha2: yr[80],
        colorSubtleBackground: "transparent",
        colorSubtleBackgroundHover: W[96],
        colorSubtleBackgroundPressed: W[88],
        colorSubtleBackgroundSelected: W[92],
        colorSubtleBackgroundLightAlphaHover: yr[70],
        colorSubtleBackgroundLightAlphaPressed: yr[50],
        colorSubtleBackgroundLightAlphaSelected: "transparent",
        colorSubtleBackgroundInverted: "transparent",
        colorSubtleBackgroundInvertedHover: wr[10],
        colorSubtleBackgroundInvertedPressed: wr[30],
        colorSubtleBackgroundInvertedSelected: wr[20],
        colorTransparentBackground: "transparent",
        colorTransparentBackgroundHover: "transparent",
        colorTransparentBackgroundPressed: "transparent",
        colorTransparentBackgroundSelected: "transparent",
        colorNeutralBackgroundDisabled: W[94],
        colorNeutralBackgroundDisabled2: Pe,
        colorNeutralBackgroundInvertedDisabled: yr[10],
        colorNeutralStencil1: W[90],
        colorNeutralStencil2: W[98],
        colorNeutralStencil1Alpha: wr[10],
        colorNeutralStencil2Alpha: wr[5],
        colorBackgroundOverlay: wr[40],
        colorScrollbarOverlay: wr[50],
        colorBrandBackground: i[80],
        colorBrandBackgroundHover: i[70],
        colorBrandBackgroundPressed: i[40],
        colorBrandBackgroundSelected: i[60],
        colorCompoundBrandBackground: i[80],
        colorCompoundBrandBackgroundHover: i[70],
        colorCompoundBrandBackgroundPressed: i[60],
        colorBrandBackgroundStatic: i[80],
        colorBrandBackground2: i[160],
        colorBrandBackground2Hover: i[150],
        colorBrandBackground2Pressed: i[130],
        colorBrandBackground3Static: i[60],
        colorBrandBackground4Static: i[40],
        colorBrandBackgroundInverted: Pe,
        colorBrandBackgroundInvertedHover: i[160],
        colorBrandBackgroundInvertedPressed: i[140],
        colorBrandBackgroundInvertedSelected: i[150],
        colorNeutralCardBackground: W[98],
        colorNeutralCardBackgroundHover: Pe,
        colorNeutralCardBackgroundPressed: W[96],
        colorNeutralCardBackgroundSelected: W[92],
        colorNeutralCardBackgroundDisabled: W[94],
        colorNeutralStrokeAccessible: W[38],
        colorNeutralStrokeAccessibleHover: W[34],
        colorNeutralStrokeAccessiblePressed: W[30],
        colorNeutralStrokeAccessibleSelected: i[80],
        colorNeutralStroke1: W[82],
        colorNeutralStroke1Hover: W[78],
        colorNeutralStroke1Pressed: W[70],
        colorNeutralStroke1Selected: W[74],
        colorNeutralStroke2: W[88],
        colorNeutralStroke3: W[94],
        colorNeutralStroke4: W[92],
        colorNeutralStroke4Hover: W[88],
        colorNeutralStroke4Pressed: W[84],
        colorNeutralStroke4Selected: W[92],
        colorNeutralStrokeSubtle: W[88],
        colorNeutralStrokeOnBrand: Pe,
        colorNeutralStrokeOnBrand2: Pe,
        colorNeutralStrokeOnBrand2Hover: Pe,
        colorNeutralStrokeOnBrand2Pressed: Pe,
        colorNeutralStrokeOnBrand2Selected: Pe,
        colorBrandStroke1: i[80],
        colorBrandStroke2: i[140],
        colorBrandStroke2Hover: i[120],
        colorBrandStroke2Pressed: i[80],
        colorBrandStroke2Contrast: i[140],
        colorCompoundBrandStroke: i[80],
        colorCompoundBrandStrokeHover: i[70],
        colorCompoundBrandStrokePressed: i[60],
        colorNeutralStrokeDisabled: W[88],
        colorNeutralStrokeDisabled2: W[92],
        colorNeutralStrokeInvertedDisabled: yr[40],
        colorTransparentStroke: "transparent",
        colorTransparentStrokeInteractive: "transparent",
        colorTransparentStrokeDisabled: "transparent",
        colorNeutralStrokeAlpha: wr[5],
        colorNeutralStrokeAlpha2: yr[20],
        colorStrokeFocus1: Pe,
        colorStrokeFocus2: tg,
        colorNeutralShadowAmbient: "rgba(0,0,0,0.12)",
        colorNeutralShadowKey: "rgba(0,0,0,0.14)",
        colorNeutralShadowAmbientLighter: "rgba(0,0,0,0.06)",
        colorNeutralShadowKeyLighter: "rgba(0,0,0,0.07)",
        colorNeutralShadowAmbientDarker: "rgba(0,0,0,0.20)",
        colorNeutralShadowKeyDarker: "rgba(0,0,0,0.24)",
        colorBrandShadowAmbient: "rgba(0,0,0,0.30)",
        colorBrandShadowKey: "rgba(0,0,0,0.25)",
    }),
    qg = {
        borderRadiusNone: "0",
        borderRadiusSmall: "2px",
        borderRadiusMedium: "4px",
        borderRadiusLarge: "6px",
        borderRadiusXLarge: "8px",
        borderRadius2XLarge: "12px",
        borderRadius3XLarge: "16px",
        borderRadius4XLarge: "24px",
        borderRadius5XLarge: "32px",
        borderRadius6XLarge: "40px",
        borderRadiusCircular: "10000px",
    },
    Hg = {
        curveAccelerateMax: "cubic-bezier(0.9,0.1,1,0.2)",
        curveAccelerateMid: "cubic-bezier(1,0,1,1)",
        curveAccelerateMin: "cubic-bezier(0.8,0,0.78,1)",
        curveDecelerateMax: "cubic-bezier(0.1,0.9,0.2,1)",
        curveDecelerateMid: "cubic-bezier(0,0,0,1)",
        curveDecelerateMin: "cubic-bezier(0.33,0,0.1,1)",
        curveEasyEaseMax: "cubic-bezier(0.8,0,0.2,1)",
        curveEasyEase: "cubic-bezier(0.33,0,0.67,1)",
        curveLinear: "cubic-bezier(0,0,1,1)",
    },
    Wg = {
        durationUltraFast: "50ms",
        durationFaster: "100ms",
        durationFast: "150ms",
        durationNormal: "200ms",
        durationGentle: "250ms",
        durationSlow: "300ms",
        durationSlower: "400ms",
        durationUltraSlow: "500ms",
    },
    Ug = {
        fontSizeBase100: "10px",
        fontSizeBase200: "12px",
        fontSizeBase300: "14px",
        fontSizeBase400: "16px",
        fontSizeBase500: "20px",
        fontSizeBase600: "24px",
        fontSizeHero700: "28px",
        fontSizeHero800: "32px",
        fontSizeHero900: "40px",
        fontSizeHero1000: "68px",
    },
    Vg = {
        lineHeightBase100: "14px",
        lineHeightBase200: "16px",
        lineHeightBase300: "20px",
        lineHeightBase400: "22px",
        lineHeightBase500: "28px",
        lineHeightBase600: "32px",
        lineHeightHero700: "36px",
        lineHeightHero800: "40px",
        lineHeightHero900: "52px",
        lineHeightHero1000: "92px",
    },
    Kg = {
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightSemibold: 600,
        fontWeightBold: 700,
    },
    $g = {
        fontFamilyBase:
            "'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
        fontFamilyMonospace: "Consolas, 'Courier New', Courier, monospace",
        fontFamilyNumeric:
            "Bahnschrift, 'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
    },
    Re = {
        none: "0",
        xxs: "2px",
        xs: "4px",
        sNudge: "6px",
        s: "8px",
        mNudge: "10px",
        m: "12px",
        l: "16px",
        xl: "20px",
        xxl: "24px",
        xxxl: "32px",
    },
    Qg = {
        spacingHorizontalNone: Re.none,
        spacingHorizontalXXS: Re.xxs,
        spacingHorizontalXS: Re.xs,
        spacingHorizontalSNudge: Re.sNudge,
        spacingHorizontalS: Re.s,
        spacingHorizontalMNudge: Re.mNudge,
        spacingHorizontalM: Re.m,
        spacingHorizontalL: Re.l,
        spacingHorizontalXL: Re.xl,
        spacingHorizontalXXL: Re.xxl,
        spacingHorizontalXXXL: Re.xxxl,
    },
    Gg = {
        spacingVerticalNone: Re.none,
        spacingVerticalXXS: Re.xxs,
        spacingVerticalXS: Re.xs,
        spacingVerticalSNudge: Re.sNudge,
        spacingVerticalS: Re.s,
        spacingVerticalMNudge: Re.mNudge,
        spacingVerticalM: Re.m,
        spacingVerticalL: Re.l,
        spacingVerticalXL: Re.xl,
        spacingVerticalXXL: Re.xxl,
        spacingVerticalXXXL: Re.xxxl,
    },
    Xg = {
        strokeWidthThin: "1px",
        strokeWidthThick: "2px",
        strokeWidthThicker: "3px",
        strokeWidthThickest: "4px",
    };
function Nf(i, n, o = "") {
    return {
        [`shadow2${o}`]: `0 0 2px ${i}, 0 1px 2px ${n}`,
        [`shadow4${o}`]: `0 0 2px ${i}, 0 2px 4px ${n}`,
        [`shadow8${o}`]: `0 0 2px ${i}, 0 4px 8px ${n}`,
        [`shadow16${o}`]: `0 0 2px ${i}, 0 8px 16px ${n}`,
        [`shadow28${o}`]: `0 0 8px ${i}, 0 14px 28px ${n}`,
        [`shadow64${o}`]: `0 0 8px ${i}, 0 32px 64px ${n}`,
    };
}
const Yg = (i) => {
        const n = Ag(i);
        return {
            ...qg,
            ...Ug,
            ...Vg,
            ...$g,
            ...Kg,
            ...Xg,
            ...Qg,
            ...Gg,
            ...Wg,
            ...Hg,
            ...n,
            ...Mg,
            ...dn,
            ...Nf(n.colorNeutralShadowAmbient, n.colorNeutralShadowKey),
            ...Nf(n.colorBrandShadowAmbient, n.colorBrandShadowKey, "Brand"),
        };
    },
    Jg = {
        30: "#0a2e4a",
        40: "#0c3b5e",
        50: "#0e4775",
        60: "#0f548c",
        70: "#115ea3",
        80: "#0f6cbd",
        100: "#479ef5",
        110: "#62abf5",
        120: "#77b7f7",
        130: "#96c6fa",
        140: "#b4d6fa",
        150: "#cfe4fa",
        160: "#ebf3fc",
    },
    Zg = Yg(Jg),
    zd = { root: "fui-FluentProvider" },
    e1 = Hf(
        {
            root: {
                sj55zd: "f19n0e5",
                De3pzq: "fxugw4r",
                fsow6f: ["f1o700av", "fes3tcz"],
                Bahqtrf: "fk6fouc",
                Be2twd7: "fkhj508",
                Bhrd7zp: "figsok6",
                Bg96gwp: "f1i3iumi",
            },
        },
        {
            d: [
                ".f19n0e5{color:var(--colorNeutralForeground1);}",
                ".fxugw4r{background-color:var(--colorNeutralBackground1);}",
                ".f1o700av{text-align:left;}",
                ".fes3tcz{text-align:right;}",
                ".fk6fouc{font-family:var(--fontFamilyBase);}",
                ".fkhj508{font-size:var(--fontSizeBase300);}",
                ".figsok6{font-weight:var(--fontWeightRegular);}",
                ".f1i3iumi{line-height:var(--lineHeightBase300);}",
            ],
        }
    ),
    t1 = (i) => {
        "use no memo";
        const n = Ei(),
            o = e1({ dir: i.dir, renderer: n });
        return ((i.root.className = Ee(zd.root, i.themeClassName, o.root, i.root.className)), i);
    },
    r1 = M.useInsertionEffect ? M.useInsertionEffect : Ni,
    n1 = (i, n) => {
        if (!(i != null && i.head)) return;
        const o = i.createElement("style");
        return (
            Object.keys(n).forEach((a) => {
                o.setAttribute(a, n[a]);
            }),
            i.head.appendChild(o),
            o
        );
    },
    o1 = (i, n) => {
        const o = i.sheet;
        o && (o.cssRules.length > 0 && o.deleteRule(0), o.insertRule(n, 0));
    },
    i1 = (i) => {
        "use no memo";
        const { targetDocument: n, theme: o, rendererAttributes: a } = i,
            c = M.useRef(void 0),
            f = v0(zd.root),
            h = a,
            p = M.useMemo(() => xv(`.${f}`, o), [o, f]);
        return (
            l1(n, f),
            r1(() => {
                const m = n == null ? void 0 : n.getElementById(f);
                return (
                    m
                        ? (c.current = m)
                        : ((c.current = n1(n, { ...h, id: f })), c.current && o1(c.current, p)),
                    () => {
                        var v;
                        (v = c.current) === null || v === void 0 || v.remove();
                    }
                );
            }, [f, n, p, h]),
            { styleTagId: f, rule: p }
        );
    };
function l1(i, n) {
    M.useState(() => {
        if (!i) return;
        const o = i.getElementById(n);
        o && i.head.append(o);
    });
}
const s1 = {},
    a1 = {},
    u1 = (i, n) => {
        "use no memo";
        const o = zi(),
            a = c1(),
            c = Gs(),
            f = M.useContext(Xs) || s1,
            {
                applyStylesToPortals: h = !0,
                customStyleHooks_unstable: p,
                dir: m = o.dir,
                targetDocument: v = o.targetDocument,
                theme: b,
                overrides_unstable: y = {},
            } = i,
            k = Ds(a, b),
            S = Ds(c, y),
            C = Ds(f, p),
            E = Ei();
        var N;
        const { styleTagId: q, rule: H } = i1({
            theme: k,
            targetDocument: v,
            rendererAttributes: (N = E.styleElementAttributes) !== null && N !== void 0 ? N : a1,
        });
        return {
            applyStylesToPortals: h,
            customStyleHooks_unstable: C,
            dir: m,
            targetDocument: v,
            theme: k,
            overrides_unstable: S,
            themeClassName: q,
            components: { root: "div" },
            root: rt(Xt("div", { ...i, dir: m, ref: Js(n, Bd({ targetDocument: v })) }), {
                elementType: "div",
            }),
            serverStyleProps: { cssRule: H, attributes: { ...E.styleElementAttributes, id: q } },
        };
    };
function Ds(i, n) {
    return i && n ? { ...i, ...n } : i || n;
}
function c1() {
    return M.useContext(Jf);
}
function f1(i) {
    const {
            applyStylesToPortals: n,
            customStyleHooks_unstable: o,
            dir: a,
            root: c,
            targetDocument: f,
            theme: h,
            themeClassName: p,
            overrides_unstable: m,
        } = i,
        v = M.useMemo(() => ({ dir: a, targetDocument: f }), [a, f]),
        [b] = M.useState(() => ({})),
        y = M.useMemo(() => ({ textDirection: a }), [a]);
    return {
        customStyleHooks_unstable: o,
        overrides_unstable: m,
        provider: v,
        textDirection: a,
        iconDirection: y,
        tooltip: b,
        theme: h,
        themeClassName: n ? c.className : p,
    };
}
const Nd = M.forwardRef((i, n) => {
    const o = u1(i, n);
    t1(o);
    const a = f1(o);
    return B0(o, a);
});
Nd.displayName = "FluentProvider";
var Os = { exports: {} },
    Ls = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Pf;
function d1() {
    return (
        Pf ||
            ((Pf = 1),
            (function (i) {
                function n(A, Y) {
                    var P = A.length;
                    A.push(Y);
                    e: for (; 0 < P; ) {
                        var V = (P - 1) >>> 1,
                            L = A[V];
                        if (0 < c(L, Y)) ((A[V] = Y), (A[P] = L), (P = V));
                        else break e;
                    }
                }
                function o(A) {
                    return A.length === 0 ? null : A[0];
                }
                function a(A) {
                    if (A.length === 0) return null;
                    var Y = A[0],
                        P = A.pop();
                    if (P !== Y) {
                        A[0] = P;
                        e: for (var V = 0, L = A.length, x = L >>> 1; V < x; ) {
                            var F = 2 * (V + 1) - 1,
                                ae = A[F],
                                le = F + 1,
                                ce = A[le];
                            if (0 > c(ae, P))
                                le < L && 0 > c(ce, ae)
                                    ? ((A[V] = ce), (A[le] = P), (V = le))
                                    : ((A[V] = ae), (A[F] = P), (V = F));
                            else if (le < L && 0 > c(ce, P)) ((A[V] = ce), (A[le] = P), (V = le));
                            else break e;
                        }
                    }
                    return Y;
                }
                function c(A, Y) {
                    var P = A.sortIndex - Y.sortIndex;
                    return P !== 0 ? P : A.id - Y.id;
                }
                if (
                    ((i.unstable_now = void 0),
                    typeof performance == "object" && typeof performance.now == "function")
                ) {
                    var f = performance;
                    i.unstable_now = function () {
                        return f.now();
                    };
                } else {
                    var h = Date,
                        p = h.now();
                    i.unstable_now = function () {
                        return h.now() - p;
                    };
                }
                var m = [],
                    v = [],
                    b = 1,
                    y = null,
                    k = 3,
                    S = !1,
                    C = !1,
                    E = !1,
                    N = !1,
                    q = typeof setTimeout == "function" ? setTimeout : null,
                    H = typeof clearTimeout == "function" ? clearTimeout : null,
                    D = typeof setImmediate < "u" ? setImmediate : null;
                function Q(A) {
                    for (var Y = o(v); Y !== null; ) {
                        if (Y.callback === null) a(v);
                        else if (Y.startTime <= A)
                            (a(v), (Y.sortIndex = Y.expirationTime), n(m, Y));
                        else break;
                        Y = o(v);
                    }
                }
                function re(A) {
                    if (((E = !1), Q(A), !C))
                        if (o(m) !== null) ((C = !0), G || ((G = !0), Te()));
                        else {
                            var Y = o(v);
                            Y !== null && qe(re, Y.startTime - A);
                        }
                }
                var G = !1,
                    ee = -1,
                    U = 5,
                    ie = -1;
                function fe() {
                    return N ? !0 : !(i.unstable_now() - ie < U);
                }
                function Ue() {
                    if (((N = !1), G)) {
                        var A = i.unstable_now();
                        ie = A;
                        var Y = !0;
                        try {
                            e: {
                                ((C = !1), E && ((E = !1), H(ee), (ee = -1)), (S = !0));
                                var P = k;
                                try {
                                    t: {
                                        for (
                                            Q(A), y = o(m);
                                            y !== null && !(y.expirationTime > A && fe());
                                        ) {
                                            var V = y.callback;
                                            if (typeof V == "function") {
                                                ((y.callback = null), (k = y.priorityLevel));
                                                var L = V(y.expirationTime <= A);
                                                if (
                                                    ((A = i.unstable_now()), typeof L == "function")
                                                ) {
                                                    ((y.callback = L), Q(A), (Y = !0));
                                                    break t;
                                                }
                                                (y === o(m) && a(m), Q(A));
                                            } else a(m);
                                            y = o(m);
                                        }
                                        if (y !== null) Y = !0;
                                        else {
                                            var x = o(v);
                                            (x !== null && qe(re, x.startTime - A), (Y = !1));
                                        }
                                    }
                                    break e;
                                } finally {
                                    ((y = null), (k = P), (S = !1));
                                }
                                Y = void 0;
                            }
                        } finally {
                            Y ? Te() : (G = !1);
                        }
                    }
                }
                var Te;
                if (typeof D == "function")
                    Te = function () {
                        D(Ue);
                    };
                else if (typeof MessageChannel < "u") {
                    var Oe = new MessageChannel(),
                        Qe = Oe.port2;
                    ((Oe.port1.onmessage = Ue),
                        (Te = function () {
                            Qe.postMessage(null);
                        }));
                } else
                    Te = function () {
                        q(Ue, 0);
                    };
                function qe(A, Y) {
                    ee = q(function () {
                        A(i.unstable_now());
                    }, Y);
                }
                ((i.unstable_IdlePriority = 5),
                    (i.unstable_ImmediatePriority = 1),
                    (i.unstable_LowPriority = 4),
                    (i.unstable_NormalPriority = 3),
                    (i.unstable_Profiling = null),
                    (i.unstable_UserBlockingPriority = 2),
                    (i.unstable_cancelCallback = function (A) {
                        A.callback = null;
                    }),
                    (i.unstable_forceFrameRate = function (A) {
                        0 > A || 125 < A
                            ? console.error(
                                  "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
                              )
                            : (U = 0 < A ? Math.floor(1e3 / A) : 5);
                    }),
                    (i.unstable_getCurrentPriorityLevel = function () {
                        return k;
                    }),
                    (i.unstable_next = function (A) {
                        switch (k) {
                            case 1:
                            case 2:
                            case 3:
                                var Y = 3;
                                break;
                            default:
                                Y = k;
                        }
                        var P = k;
                        k = Y;
                        try {
                            return A();
                        } finally {
                            k = P;
                        }
                    }),
                    (i.unstable_requestPaint = function () {
                        N = !0;
                    }),
                    (i.unstable_runWithPriority = function (A, Y) {
                        switch (A) {
                            case 1:
                            case 2:
                            case 3:
                            case 4:
                            case 5:
                                break;
                            default:
                                A = 3;
                        }
                        var P = k;
                        k = A;
                        try {
                            return Y();
                        } finally {
                            k = P;
                        }
                    }),
                    (i.unstable_scheduleCallback = function (A, Y, P) {
                        var V = i.unstable_now();
                        switch (
                            (typeof P == "object" && P !== null
                                ? ((P = P.delay), (P = typeof P == "number" && 0 < P ? V + P : V))
                                : (P = V),
                            A)
                        ) {
                            case 1:
                                var L = -1;
                                break;
                            case 2:
                                L = 250;
                                break;
                            case 5:
                                L = 1073741823;
                                break;
                            case 4:
                                L = 1e4;
                                break;
                            default:
                                L = 5e3;
                        }
                        return (
                            (L = P + L),
                            (A = {
                                id: b++,
                                callback: Y,
                                priorityLevel: A,
                                startTime: P,
                                expirationTime: L,
                                sortIndex: -1,
                            }),
                            P > V
                                ? ((A.sortIndex = P),
                                  n(v, A),
                                  o(m) === null &&
                                      A === o(v) &&
                                      (E ? (H(ee), (ee = -1)) : (E = !0), qe(re, P - V)))
                                : ((A.sortIndex = L),
                                  n(m, A),
                                  C || S || ((C = !0), G || ((G = !0), Te()))),
                            A
                        );
                    }),
                    (i.unstable_shouldYield = fe),
                    (i.unstable_wrapCallback = function (A) {
                        var Y = k;
                        return function () {
                            var P = k;
                            k = Y;
                            try {
                                return A.apply(this, arguments);
                            } finally {
                                k = P;
                            }
                        };
                    }));
            })(Ls)),
        Ls
    );
}
var Ff;
function h1() {
    return (Ff || ((Ff = 1), (Os.exports = d1())), Os.exports);
}
var Rf = h1();
const p1 = (i) => (o) => {
        const a = M.useRef(o.value),
            c = M.useRef(0),
            f = M.useRef(null);
        return (
            f.current || (f.current = { value: a, version: c, listeners: [] }),
            Ni(() => {
                ((a.current = o.value),
                    (c.current += 1),
                    Rf.unstable_runWithPriority(Rf.unstable_NormalPriority, () => {
                        f.current.listeners.forEach((h) => {
                            h([c.current, o.value]);
                        });
                    }));
            }, [o.value]),
            M.createElement(i, { value: f.current }, o.children)
        );
    },
    v1 = (i) => {
        const n = M.createContext({
            value: { current: i },
            version: { current: -1 },
            listeners: [],
        });
        return ((n.Provider = p1(n.Provider)), delete n.Consumer, n);
    },
    Ms = "Enter",
    yi = " ";
function Pd(i, n) {
    const {
            disabled: o,
            disabledFocusable: a = !1,
            ["aria-disabled"]: c,
            onClick: f,
            onKeyDown: h,
            onKeyUp: p,
            ...m
        } = n ?? {},
        v = typeof c == "string" ? c === "true" : c,
        b = o || a || v,
        y = br((C) => {
            b ? (C.preventDefault(), C.stopPropagation()) : f == null || f(C);
        }),
        k = br((C) => {
            if ((h == null || h(C), C.isDefaultPrevented())) return;
            const E = C.key;
            if (b && (E === Ms || E === yi)) {
                (C.preventDefault(), C.stopPropagation());
                return;
            }
            if (E === yi) {
                C.preventDefault();
                return;
            } else E === Ms && (C.preventDefault(), C.currentTarget.click());
        }),
        S = br((C) => {
            if ((p == null || p(C), C.isDefaultPrevented())) return;
            const E = C.key;
            if (b && (E === Ms || E === yi)) {
                (C.preventDefault(), C.stopPropagation());
                return;
            }
            E === yi && (C.preventDefault(), C.currentTarget.click());
        });
    if (i === "button" || i === void 0)
        return {
            ...m,
            disabled: o && !a,
            "aria-disabled": a ? !0 : v,
            onClick: a ? void 0 : y,
            onKeyUp: a ? void 0 : p,
            onKeyDown: a ? void 0 : h,
        };
    {
        const C = !!m.href;
        let E = C ? void 0 : "button";
        !E && b && (E = "link");
        const N = {
            role: E,
            tabIndex: a || (!C && !o) ? 0 : void 0,
            ...m,
            onClick: y,
            onKeyUp: S,
            onKeyDown: k,
            "aria-disabled": b,
        };
        return (i === "a" && b && (N.href = void 0), N);
    }
}
const m1 = ve(
        { root: { mc9l5x: "f1w7gpdv", Bg96gwp: "fez10in" }, rtl: { Bz10aip: "f13rod7r" } },
        {
            d: [
                ".f1w7gpdv{display:inline;}",
                ".fez10in{line-height:0;}",
                ".f13rod7r{transform:scaleX(-1);}",
            ],
        }
    ),
    g1 = (i, n) => {
        const { filled: o, title: a, primaryFill: c = "currentColor", ...f } = i,
            h = { ...f, fill: c },
            p = m1(),
            m = S0();
        return (
            (h.className = Ee(
                p.root,
                (n == null ? void 0 : n.flipInRtl) &&
                    (m == null ? void 0 : m.textDirection) === "rtl" &&
                    p.rtl,
                h.className
            )),
            a && (h["aria-label"] = a),
            !h["aria-label"] && !h["aria-labelledby"] ? (h["aria-hidden"] = !0) : (h.role = "img"),
            h
        );
    },
    y1 = ve(
        { root: { B8gzw0y: "f1dd5bof" } },
        {
            m: [
                [
                    "@media (forced-colors: active){.f1dd5bof{forced-color-adjust:auto;}}",
                    { m: "(forced-colors: active)" },
                ],
            ],
        }
    ),
    w1 = "fui-Icon",
    Fd = (i, n, o, a) => {
        const f = M.forwardRef((h, p) => {
            const m = y1(),
                v = g1(h, { flipInRtl: a == null ? void 0 : a.flipInRtl }),
                b = {
                    ...v,
                    className: Ee(w1, v.className, m.root),
                    ref: p,
                    width: n,
                    height: n,
                    viewBox: "0 0 20 20",
                    xmlns: "http://www.w3.org/2000/svg",
                };
            return typeof o == "string"
                ? M.createElement("svg", { ...b, dangerouslySetInnerHTML: { __html: o } })
                : M.createElement(
                      "svg",
                      b,
                      ...o.map((y) => M.createElement("path", { d: y, fill: b.fill }))
                  );
        });
        return ((f.displayName = i), f);
    },
    b1 = Fd("ArrowDownRegular", "1em", [
        "M16.87 10.84a.5.5 0 1 0-.74-.68l-5.63 6.17V2.5a.5.5 0 0 0-1 0v13.83l-5.63-6.17a.5.5 0 0 0-.74.68l6.31 6.91a.75.75 0 0 0 1.11 0l6.32-6.91Z",
    ]),
    _1 = Fd(
        "ArrowUpRegular",
        "1em",
        [
            "M3.13 9.16a.5.5 0 1 0 .74.68L9.5 3.67V17.5a.5.5 0 1 0 1 0V3.67l5.63 6.17a.5.5 0 0 0 .74-.68l-6.32-6.92a.75.75 0 0 0-1.1 0L3.13 9.16Z",
        ],
        { flipInRtl: !0 }
    ),
    k1 = (i) => {
        const { iconOnly: n, iconPosition: o } = i;
        return to(i.root, {
            children: [
                o !== "after" && i.icon && ye(i.icon, {}),
                !n && i.root.children,
                o === "after" && i.icon && ye(i.icon, {}),
            ],
        });
    },
    Rd = M.createContext(void 0),
    x1 = {};
Rd.Provider;
const S1 = () => {
        var i;
        return (i = M.useContext(Rd)) !== null && i !== void 0 ? i : x1;
    },
    B1 = (i, n) => {
        const { size: o } = S1(),
            {
                appearance: a = "secondary",
                shape: c = "rounded",
                size: f = o ?? "medium",
                ...h
            } = i,
            p = E1(h, n);
        return { appearance: a, shape: c, size: f, ...p };
    },
    E1 = (i, n) => {
        const { icon: o, iconPosition: a = "before", ...c } = i,
            f = eo(o, { elementType: "span" });
        var h, p;
        return {
            disabled: (h = i.disabled) !== null && h !== void 0 ? h : !1,
            disabledFocusable: (p = i.disabledFocusable) !== null && p !== void 0 ? p : !1,
            iconPosition: a,
            iconOnly: !!(f != null && f.children && !i.children),
            components: { root: "button", icon: "span" },
            root: rt(Pd(c.as, c), {
                elementType: "button",
                defaultProps: { ref: n, type: i.as !== "a" ? "button" : void 0 },
            }),
            icon: f,
        };
    },
    jf = { root: "fui-Button", icon: "fui-Button__icon" },
    T1 = no("r1f29ykk", null, {
        r: [
            ".r1f29ykk{align-items:center;box-sizing:border-box;display:inline-flex;justify-content:center;text-decoration-line:none;vertical-align:middle;margin:0;overflow:hidden;background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);border:var(--strokeWidthThin) solid var(--colorNeutralStroke1);font-family:var(--fontFamilyBase);outline-style:none;padding:5px var(--spacingHorizontalM);min-width:96px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:var(--fontWeightSemibold);line-height:var(--lineHeightBase300);transition-duration:var(--durationFaster);transition-property:background,border,color;transition-timing-function:var(--curveEasyEase);}",
            ".r1f29ykk:hover{background-color:var(--colorNeutralBackground1Hover);border-color:var(--colorNeutralStroke1Hover);color:var(--colorNeutralForeground1Hover);cursor:pointer;}",
            ".r1f29ykk:hover:active,.r1f29ykk:active:focus-visible{background-color:var(--colorNeutralBackground1Pressed);border-color:var(--colorNeutralStroke1Pressed);color:var(--colorNeutralForeground1Pressed);outline-style:none;}",
            ".r1f29ykk[data-fui-focus-visible]{border-color:var(--colorStrokeFocus2);border-radius:var(--borderRadiusMedium);border-width:1px;outline:var(--strokeWidthThick) solid var(--colorTransparentStroke);box-shadow:0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset;z-index:1;}",
        ],
        s: [
            "@media screen and (prefers-reduced-motion: reduce){.r1f29ykk{transition-duration:0.01ms;}}",
            "@media (forced-colors: active){.r1f29ykk:focus{border-color:ButtonText;}.r1f29ykk:hover{background-color:HighlightText;border-color:Highlight;color:Highlight;forced-color-adjust:none;}.r1f29ykk:hover:active,.r1f29ykk:active:focus-visible{background-color:HighlightText;border-color:Highlight;color:Highlight;forced-color-adjust:none;}}",
            "@supports (-moz-appearance:button){.r1f29ykk[data-fui-focus-visible]{box-shadow:0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset;}}",
        ],
    }),
    C1 = no("rywnvv2", null, [
        ".rywnvv2{align-items:center;display:inline-flex;justify-content:center;font-size:20px;height:20px;width:20px;--fui-Button__icon--spacing:var(--spacingHorizontalSNudge);}",
    ]),
    z1 = ve(
        {
            outline: { De3pzq: "f1c21dwh", Jwef8y: "fjxutwb", Bpjbzib: "fkoldzo" },
            primary: {
                De3pzq: "ffp7eso",
                g2u3we: "f1p3nwhy",
                h3c5rm: ["f11589ue", "f1pdflbu"],
                B9xav0g: "f1q5o8ev",
                zhjwy3: ["f1pdflbu", "f11589ue"],
                sj55zd: "f1phragk",
                Jwef8y: "f15wkkf3",
                Bgoe8wy: "f1s2uweq",
                Bwzppfd: ["fr80ssc", "fecsdlb"],
                oetu4i: "f1ukrpxl",
                gg5e9n: ["fecsdlb", "fr80ssc"],
                Bi91k9c: "f1rq72xc",
                Bpjbzib: "f1ksv2xa",
                im15vp: "fhvnf4x",
                Hjvxdg: ["fb6swo4", "f232fm2"],
                Gpfmf1: "f1klyf7k",
                ustxxc: ["f232fm2", "fb6swo4"],
                Brsut9c: "f1d6mv4x",
                By8wz76: "f1nz3ub2",
                Bcq6wej: "fag2qd2",
                Jcjdmf: ["fmvhcg7", "f14bpyus"],
                sc4o1m: "f1o3dhpw",
                Bosien3: ["f14bpyus", "fmvhcg7"],
                B7iucu3: "fqc85l4",
                B8gzw0y: "f1h3a8gf",
                Bbkh6qg: "fkiggi6",
                F230oe: "f8gmj8i",
                Bdw8ktp: ["f1ap8nzx", "fjag8bx"],
                Bj1xduy: "f1igan7k",
                Bhh2cfd: ["fjag8bx", "f1ap8nzx"],
                Bahaeuw: "f1v3eptx",
                Bv2bamp: "f1ysmecq",
                vxuvv6: "faulsx",
                Bli9q98: ["f79t15f", "f8qmx7k"],
                Bx2tt8t: "fbtzoaq",
                yad0b3: ["f8qmx7k", "f79t15f"],
                j2fop7: "fd4bjan",
            },
            secondary: {},
            subtle: {
                De3pzq: "fhovq9v",
                g2u3we: "f1p3nwhy",
                h3c5rm: ["f11589ue", "f1pdflbu"],
                B9xav0g: "f1q5o8ev",
                zhjwy3: ["f1pdflbu", "f11589ue"],
                sj55zd: "fkfq4zb",
                Jwef8y: "f1t94bn6",
                Bgoe8wy: "f1s2uweq",
                Bwzppfd: ["fr80ssc", "fecsdlb"],
                oetu4i: "f1ukrpxl",
                gg5e9n: ["fecsdlb", "fr80ssc"],
                Bi91k9c: "fnwyq0v",
                Bk3fhr4: "ft1hn21",
                Bmfj8id: "fuxngvv",
                Bbdnnc7: "fy5bs14",
                Bpjbzib: "f1q1yqic",
                im15vp: "fhvnf4x",
                Hjvxdg: ["fb6swo4", "f232fm2"],
                Gpfmf1: "f1klyf7k",
                ustxxc: ["f232fm2", "fb6swo4"],
                Brsut9c: "fwga7ee",
                Bqou3pl: "f1nhwcv0",
                Bsnehw8: "f1gm6xmp",
                wsxvnf: "f1xxsver",
                Bahaeuw: "f1v3eptx",
                Buhizc3: "fivsta0",
                j2fop7: "fd4bjan",
                Bqabnb4: "f3m6zum",
            },
            transparent: {
                De3pzq: "f1c21dwh",
                g2u3we: "f1p3nwhy",
                h3c5rm: ["f11589ue", "f1pdflbu"],
                B9xav0g: "f1q5o8ev",
                zhjwy3: ["f1pdflbu", "f11589ue"],
                sj55zd: "fkfq4zb",
                Jwef8y: "fjxutwb",
                Bgoe8wy: "f1s2uweq",
                Bwzppfd: ["fr80ssc", "fecsdlb"],
                oetu4i: "f1ukrpxl",
                gg5e9n: ["fecsdlb", "fr80ssc"],
                Bi91k9c: "f139oj5f",
                Bk3fhr4: "ft1hn21",
                Bmfj8id: "fuxngvv",
                Bpjbzib: "fkoldzo",
                im15vp: "fhvnf4x",
                Hjvxdg: ["fb6swo4", "f232fm2"],
                Gpfmf1: "f1klyf7k",
                ustxxc: ["f232fm2", "fb6swo4"],
                Brsut9c: "f1l983o9",
                Bqou3pl: "f1nhwcv0",
                Bsnehw8: "f1gm6xmp",
                Bbkh6qg: "fxoo9op",
                Bahaeuw: "f1v3eptx",
                Bv2bamp: "f1i0gk12",
                j2fop7: "fd4bjan",
            },
            circular: { Beyfa6y: 0, Bbmb7ep: 0, Btl43ni: 0, B7oj6ja: 0, Dimara: "f44lkw9" },
            rounded: {},
            square: { Beyfa6y: 0, Bbmb7ep: 0, Btl43ni: 0, B7oj6ja: 0, Dimara: "f1fabniw" },
            small: {
                Bf4jedk: "fh7ncta",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "fneth5b",
                Beyfa6y: 0,
                Bbmb7ep: 0,
                Btl43ni: 0,
                B7oj6ja: 0,
                Dimara: "ft85np5",
                Be2twd7: "fy9rknc",
                Bhrd7zp: "figsok6",
                Bg96gwp: "fwrc4pm",
            },
            smallWithIcon: { Byoj8tv: "f1brlhvm", z8tnut: "f1sl3k7w" },
            medium: {},
            large: {
                Bf4jedk: "f14es27b",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f4db1ww",
                Beyfa6y: 0,
                Bbmb7ep: 0,
                Btl43ni: 0,
                B7oj6ja: 0,
                Dimara: "ft85np5",
                Be2twd7: "fod5ikn",
                Bhrd7zp: "fl43uef",
                Bg96gwp: "faaz57k",
            },
            largeWithIcon: { Byoj8tv: "fy7v416", z8tnut: "f1a1bwwz" },
        },
        {
            d: [
                ".f1c21dwh{background-color:var(--colorTransparentBackground);}",
                ".ffp7eso{background-color:var(--colorBrandBackground);}",
                ".f1p3nwhy{border-top-color:transparent;}",
                ".f11589ue{border-right-color:transparent;}",
                ".f1pdflbu{border-left-color:transparent;}",
                ".f1q5o8ev{border-bottom-color:transparent;}",
                ".f1phragk{color:var(--colorNeutralForegroundOnBrand);}",
                ".fhovq9v{background-color:var(--colorSubtleBackground);}",
                ".fkfq4zb{color:var(--colorNeutralForeground2);}",
                [".f44lkw9{border-radius:var(--borderRadiusCircular);}", { p: -1 }],
                [".f1fabniw{border-radius:var(--borderRadiusNone);}", { p: -1 }],
                ".fh7ncta{min-width:64px;}",
                [".fneth5b{padding:3px var(--spacingHorizontalS);}", { p: -1 }],
                [".ft85np5{border-radius:var(--borderRadiusMedium);}", { p: -1 }],
                ".fy9rknc{font-size:var(--fontSizeBase200);}",
                ".figsok6{font-weight:var(--fontWeightRegular);}",
                ".fwrc4pm{line-height:var(--lineHeightBase200);}",
                ".f1brlhvm{padding-bottom:1px;}",
                ".f1sl3k7w{padding-top:1px;}",
                ".f14es27b{min-width:96px;}",
                [".f4db1ww{padding:8px var(--spacingHorizontalL);}", { p: -1 }],
                [".ft85np5{border-radius:var(--borderRadiusMedium);}", { p: -1 }],
                ".fod5ikn{font-size:var(--fontSizeBase400);}",
                ".fl43uef{font-weight:var(--fontWeightSemibold);}",
                ".faaz57k{line-height:var(--lineHeightBase400);}",
                ".fy7v416{padding-bottom:7px;}",
                ".f1a1bwwz{padding-top:7px;}",
            ],
            h: [
                ".fjxutwb:hover{background-color:var(--colorTransparentBackgroundHover);}",
                ".fkoldzo:hover:active,.fkoldzo:active:focus-visible{background-color:var(--colorTransparentBackgroundPressed);}",
                ".f15wkkf3:hover{background-color:var(--colorBrandBackgroundHover);}",
                ".f1s2uweq:hover{border-top-color:transparent;}",
                ".fr80ssc:hover{border-right-color:transparent;}",
                ".fecsdlb:hover{border-left-color:transparent;}",
                ".f1ukrpxl:hover{border-bottom-color:transparent;}",
                ".f1rq72xc:hover{color:var(--colorNeutralForegroundOnBrand);}",
                ".f1ksv2xa:hover:active,.f1ksv2xa:active:focus-visible{background-color:var(--colorBrandBackgroundPressed);}",
                ".fhvnf4x:hover:active,.fhvnf4x:active:focus-visible{border-top-color:transparent;}",
                ".fb6swo4:hover:active,.fb6swo4:active:focus-visible{border-right-color:transparent;}",
                ".f232fm2:hover:active,.f232fm2:active:focus-visible{border-left-color:transparent;}",
                ".f1klyf7k:hover:active,.f1klyf7k:active:focus-visible{border-bottom-color:transparent;}",
                ".f1d6mv4x:hover:active,.f1d6mv4x:active:focus-visible{color:var(--colorNeutralForegroundOnBrand);}",
                ".f1t94bn6:hover{background-color:var(--colorSubtleBackgroundHover);}",
                ".fnwyq0v:hover{color:var(--colorNeutralForeground2Hover);}",
                ".ft1hn21:hover .fui-Icon-filled{display:inline;}",
                ".fuxngvv:hover .fui-Icon-regular{display:none;}",
                ".fy5bs14:hover .fui-Button__icon{color:var(--colorNeutralForeground2BrandHover);}",
                ".f1q1yqic:hover:active,.f1q1yqic:active:focus-visible{background-color:var(--colorSubtleBackgroundPressed);}",
                ".fwga7ee:hover:active,.fwga7ee:active:focus-visible{color:var(--colorNeutralForeground2Pressed);}",
                ".f1nhwcv0:hover:active .fui-Icon-filled,.f1nhwcv0:active:focus-visible .fui-Icon-filled{display:inline;}",
                ".f1gm6xmp:hover:active .fui-Icon-regular,.f1gm6xmp:active:focus-visible .fui-Icon-regular{display:none;}",
                ".f1xxsver:hover:active .fui-Button__icon,.f1xxsver:active:focus-visible .fui-Button__icon{color:var(--colorNeutralForeground2BrandPressed);}",
                ".f139oj5f:hover{color:var(--colorNeutralForeground2BrandHover);}",
                ".f1l983o9:hover:active,.f1l983o9:active:focus-visible{color:var(--colorNeutralForeground2BrandPressed);}",
            ],
            m: [
                [
                    "@media (forced-colors: active){.f1nz3ub2{background-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fag2qd2{border-top-color:HighlightText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f14bpyus{border-left-color:HighlightText;}.fmvhcg7{border-right-color:HighlightText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1o3dhpw{border-bottom-color:HighlightText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fqc85l4{color:HighlightText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1h3a8gf{forced-color-adjust:none;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fkiggi6:hover{background-color:HighlightText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f8gmj8i:hover{border-top-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1ap8nzx:hover{border-right-color:Highlight;}.fjag8bx:hover{border-left-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1igan7k:hover{border-bottom-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1v3eptx:hover{color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1ysmecq:hover:active,.f1ysmecq:active:focus-visible{background-color:HighlightText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.faulsx:hover:active,.faulsx:active:focus-visible{border-top-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f79t15f:hover:active,.f79t15f:active:focus-visible{border-right-color:Highlight;}.f8qmx7k:hover:active,.f8qmx7k:active:focus-visible{border-left-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fbtzoaq:hover:active,.fbtzoaq:active:focus-visible{border-bottom-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fd4bjan:hover:active,.fd4bjan:active:focus-visible{color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fivsta0:hover .fui-Button__icon{color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f3m6zum:hover:active .fui-Button__icon,.f3m6zum:active:focus-visible .fui-Button__icon{color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fxoo9op:hover{background-color:var(--colorTransparentBackground);}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1i0gk12:hover:active,.f1i0gk12:active:focus-visible{background-color:var(--colorTransparentBackground);}}",
                    { m: "(forced-colors: active)" },
                ],
            ],
        }
    ),
    N1 = ve(
        {
            base: {
                De3pzq: "f1bg9a2p",
                g2u3we: "f1jj8ep1",
                h3c5rm: ["f15xbau", "fy0fskl"],
                B9xav0g: "f4ikngz",
                zhjwy3: ["fy0fskl", "f15xbau"],
                sj55zd: "f1s2aq7o",
                Bceei9c: "fdrzuqr",
                Bfinmwp: "f15x8b5r",
                Jwef8y: "f1falr9n",
                Bgoe8wy: "f12mpcsy",
                Bwzppfd: ["f1gwvigk", "f18rmfxp"],
                oetu4i: "f1jnshp0",
                gg5e9n: ["f18rmfxp", "f1gwvigk"],
                Bi91k9c: "fvgxktp",
                eoavqd: "fphbwmw",
                Bk3fhr4: "f19vpps7",
                Bmfj8id: "fv5swzo",
                Bbdnnc7: "f1al02dq",
                Bpjbzib: "f1jct5ie",
                im15vp: "f13txml0",
                Hjvxdg: ["f1ncddno", "f1axfvow"],
                Gpfmf1: "f1z04ada",
                ustxxc: ["f1axfvow", "f1ncddno"],
                Brsut9c: "f1uhomfy",
                Bses4qk: "fy9mucy",
                Bqou3pl: "f1g9va8i",
                Bsnehw8: "fwgvudy",
                wsxvnf: "fom6jww",
            },
            highContrast: {
                By8wz76: "f14ptb23",
                Bcq6wej: "f9dbb4x",
                Jcjdmf: ["f3qs60o", "f5u9ap2"],
                sc4o1m: "fwd1oij",
                Bosien3: ["f5u9ap2", "f3qs60o"],
                B7iucu3: "f1cyfu5x",
                Grqk0h: "f127ot8j",
                h3ptyc: "f19etb0b",
                Buw724y: ["f4f984j", "fw441p0"],
                Buk7464: "f3d22hf",
                Hwei09: ["fw441p0", "f4f984j"],
                Bbkh6qg: "fj8k9ua",
                F230oe: "fifrq0d",
                Bdw8ktp: ["f196mwp7", "fnekfq"],
                Bj1xduy: "f1l6uprw",
                Bhh2cfd: ["fnekfq", "f196mwp7"],
                Bahaeuw: "fa9u7a5",
                Buhizc3: "f1m71e0y",
                Bv2bamp: "fw24f3",
                vxuvv6: "f1nznrny",
                Bli9q98: ["fq8nxuu", "f1ao3jkc"],
                Bx2tt8t: "ftoixeo",
                yad0b3: ["f1ao3jkc", "fq8nxuu"],
                j2fop7: "fpmuzpx",
                Bqabnb4: "f168odog",
            },
            outline: { De3pzq: "f1c21dwh", Jwef8y: "f9ql6rf", Bpjbzib: "f9r0db0" },
            primary: {
                g2u3we: "f1p3nwhy",
                h3c5rm: ["f11589ue", "f1pdflbu"],
                B9xav0g: "f1q5o8ev",
                zhjwy3: ["f1pdflbu", "f11589ue"],
                Bgoe8wy: "f1s2uweq",
                Bwzppfd: ["fr80ssc", "fecsdlb"],
                oetu4i: "f1ukrpxl",
                gg5e9n: ["fecsdlb", "fr80ssc"],
                im15vp: "fhvnf4x",
                Hjvxdg: ["fb6swo4", "f232fm2"],
                Gpfmf1: "f1klyf7k",
                ustxxc: ["f232fm2", "fb6swo4"],
            },
            secondary: {},
            subtle: {
                De3pzq: "f1c21dwh",
                g2u3we: "f1p3nwhy",
                h3c5rm: ["f11589ue", "f1pdflbu"],
                B9xav0g: "f1q5o8ev",
                zhjwy3: ["f1pdflbu", "f11589ue"],
                Jwef8y: "f9ql6rf",
                Bgoe8wy: "f1s2uweq",
                Bwzppfd: ["fr80ssc", "fecsdlb"],
                oetu4i: "f1ukrpxl",
                gg5e9n: ["fecsdlb", "fr80ssc"],
                Bpjbzib: "f9r0db0",
                im15vp: "fhvnf4x",
                Hjvxdg: ["fb6swo4", "f232fm2"],
                Gpfmf1: "f1klyf7k",
                ustxxc: ["f232fm2", "fb6swo4"],
            },
            transparent: {
                De3pzq: "f1c21dwh",
                g2u3we: "f1p3nwhy",
                h3c5rm: ["f11589ue", "f1pdflbu"],
                B9xav0g: "f1q5o8ev",
                zhjwy3: ["f1pdflbu", "f11589ue"],
                Jwef8y: "f9ql6rf",
                Bgoe8wy: "f1s2uweq",
                Bwzppfd: ["fr80ssc", "fecsdlb"],
                oetu4i: "f1ukrpxl",
                gg5e9n: ["fecsdlb", "fr80ssc"],
                Bpjbzib: "f9r0db0",
                im15vp: "fhvnf4x",
                Hjvxdg: ["fb6swo4", "f232fm2"],
                Gpfmf1: "f1klyf7k",
                ustxxc: ["f232fm2", "fb6swo4"],
            },
        },
        {
            d: [
                ".f1bg9a2p{background-color:var(--colorNeutralBackgroundDisabled);}",
                ".f1jj8ep1{border-top-color:var(--colorNeutralStrokeDisabled);}",
                ".f15xbau{border-right-color:var(--colorNeutralStrokeDisabled);}",
                ".fy0fskl{border-left-color:var(--colorNeutralStrokeDisabled);}",
                ".f4ikngz{border-bottom-color:var(--colorNeutralStrokeDisabled);}",
                ".f1s2aq7o{color:var(--colorNeutralForegroundDisabled);}",
                ".fdrzuqr{cursor:not-allowed;}",
                ".f15x8b5r .fui-Button__icon{color:var(--colorNeutralForegroundDisabled);}",
                ".f1c21dwh{background-color:var(--colorTransparentBackground);}",
                ".f1p3nwhy{border-top-color:transparent;}",
                ".f11589ue{border-right-color:transparent;}",
                ".f1pdflbu{border-left-color:transparent;}",
                ".f1q5o8ev{border-bottom-color:transparent;}",
            ],
            h: [
                ".f1falr9n:hover{background-color:var(--colorNeutralBackgroundDisabled);}",
                ".f12mpcsy:hover{border-top-color:var(--colorNeutralStrokeDisabled);}",
                ".f1gwvigk:hover{border-right-color:var(--colorNeutralStrokeDisabled);}",
                ".f18rmfxp:hover{border-left-color:var(--colorNeutralStrokeDisabled);}",
                ".f1jnshp0:hover{border-bottom-color:var(--colorNeutralStrokeDisabled);}",
                ".fvgxktp:hover{color:var(--colorNeutralForegroundDisabled);}",
                ".fphbwmw:hover{cursor:not-allowed;}",
                ".f19vpps7:hover .fui-Icon-filled{display:none;}",
                ".fv5swzo:hover .fui-Icon-regular{display:inline;}",
                ".f1al02dq:hover .fui-Button__icon{color:var(--colorNeutralForegroundDisabled);}",
                ".f1jct5ie:hover:active,.f1jct5ie:active:focus-visible{background-color:var(--colorNeutralBackgroundDisabled);}",
                ".f13txml0:hover:active,.f13txml0:active:focus-visible{border-top-color:var(--colorNeutralStrokeDisabled);}",
                ".f1ncddno:hover:active,.f1ncddno:active:focus-visible{border-right-color:var(--colorNeutralStrokeDisabled);}",
                ".f1axfvow:hover:active,.f1axfvow:active:focus-visible{border-left-color:var(--colorNeutralStrokeDisabled);}",
                ".f1z04ada:hover:active,.f1z04ada:active:focus-visible{border-bottom-color:var(--colorNeutralStrokeDisabled);}",
                ".f1uhomfy:hover:active,.f1uhomfy:active:focus-visible{color:var(--colorNeutralForegroundDisabled);}",
                ".fy9mucy:hover:active,.fy9mucy:active:focus-visible{cursor:not-allowed;}",
                ".f1g9va8i:hover:active .fui-Icon-filled,.f1g9va8i:active:focus-visible .fui-Icon-filled{display:none;}",
                ".fwgvudy:hover:active .fui-Icon-regular,.fwgvudy:active:focus-visible .fui-Icon-regular{display:inline;}",
                ".fom6jww:hover:active .fui-Button__icon,.fom6jww:active:focus-visible .fui-Button__icon{color:var(--colorNeutralForegroundDisabled);}",
                ".f9ql6rf:hover{background-color:var(--colorTransparentBackground);}",
                ".f9r0db0:hover:active,.f9r0db0:active:focus-visible{background-color:var(--colorTransparentBackground);}",
                ".f1s2uweq:hover{border-top-color:transparent;}",
                ".fr80ssc:hover{border-right-color:transparent;}",
                ".fecsdlb:hover{border-left-color:transparent;}",
                ".f1ukrpxl:hover{border-bottom-color:transparent;}",
                ".fhvnf4x:hover:active,.fhvnf4x:active:focus-visible{border-top-color:transparent;}",
                ".fb6swo4:hover:active,.fb6swo4:active:focus-visible{border-right-color:transparent;}",
                ".f232fm2:hover:active,.f232fm2:active:focus-visible{border-left-color:transparent;}",
                ".f1klyf7k:hover:active,.f1klyf7k:active:focus-visible{border-bottom-color:transparent;}",
            ],
            m: [
                [
                    "@media (forced-colors: active){.f14ptb23{background-color:ButtonFace;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f9dbb4x{border-top-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f3qs60o{border-right-color:GrayText;}.f5u9ap2{border-left-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fwd1oij{border-bottom-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1cyfu5x{color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f127ot8j .fui-Button__icon{color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f19etb0b:focus{border-top-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f4f984j:focus{border-right-color:GrayText;}.fw441p0:focus{border-left-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f3d22hf:focus{border-bottom-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fj8k9ua:hover{background-color:ButtonFace;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fifrq0d:hover{border-top-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f196mwp7:hover{border-right-color:GrayText;}.fnekfq:hover{border-left-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1l6uprw:hover{border-bottom-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fa9u7a5:hover{color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1m71e0y:hover .fui-Button__icon{color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fw24f3:hover:active,.fw24f3:active:focus-visible{background-color:ButtonFace;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1nznrny:hover:active,.f1nznrny:active:focus-visible{border-top-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1ao3jkc:hover:active,.f1ao3jkc:active:focus-visible{border-left-color:GrayText;}.fq8nxuu:hover:active,.fq8nxuu:active:focus-visible{border-right-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.ftoixeo:hover:active,.ftoixeo:active:focus-visible{border-bottom-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fpmuzpx:hover:active,.fpmuzpx:active:focus-visible{color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f168odog:hover:active .fui-Button__icon,.f168odog:active:focus-visible .fui-Button__icon{color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
            ],
        }
    ),
    P1 = ve(
        {
            circular: { Bw81rd7: 0, kdpuga: 0, dm238s: 0, B6xbmo0: 0, B3whbx2: "f1062rbf" },
            rounded: {},
            square: { Bw81rd7: 0, kdpuga: 0, dm238s: 0, B6xbmo0: 0, B3whbx2: "fj0ryk1" },
            primary: {
                B8q5s1w: "f17t0x8g",
                Bci5o5g: ["f194v5ow", "fk7jm04"],
                n8qw10: "f1qgg65p",
                Bdrgwmp: ["fk7jm04", "f194v5ow"],
                j6ew2k: ["fhgccpy", "fjo7pq6"],
                he4mth: "f32wu9k",
                Byr4aka: "fu5nqqq",
                lks7q5: ["f13prjl2", "f1nl83rv"],
                Bnan3qt: "f1czftr5",
                k1dn9: ["f1nl83rv", "f13prjl2"],
                Bqsb82s: ["fixhny3", "f18mfu3r"],
                jg1oma: "feygou5",
            },
            small: { Bw81rd7: 0, kdpuga: 0, dm238s: 0, B6xbmo0: 0, B3whbx2: "fazmxh" },
            medium: {},
            large: { Bw81rd7: 0, kdpuga: 0, dm238s: 0, B6xbmo0: 0, B3whbx2: "f1b6alqh" },
        },
        {
            d: [
                [
                    ".f1062rbf[data-fui-focus-visible]{border-radius:var(--borderRadiusCircular);}",
                    { p: -1 },
                ],
                [
                    ".fj0ryk1[data-fui-focus-visible]{border-radius:var(--borderRadiusNone);}",
                    { p: -1 },
                ],
                ".f17t0x8g[data-fui-focus-visible]{border-top-color:var(--colorStrokeFocus2);}",
                ".f194v5ow[data-fui-focus-visible]{border-right-color:var(--colorStrokeFocus2);}",
                ".fk7jm04[data-fui-focus-visible]{border-left-color:var(--colorStrokeFocus2);}",
                ".f1qgg65p[data-fui-focus-visible]{border-bottom-color:var(--colorStrokeFocus2);}",
                ".fhgccpy[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}",
                ".fjo7pq6[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}",
                ".f32wu9k[data-fui-focus-visible]:hover{box-shadow:var(--shadow2),0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset;}",
                ".fu5nqqq[data-fui-focus-visible]:hover{border-top-color:var(--colorStrokeFocus2);}",
                ".f13prjl2[data-fui-focus-visible]:hover{border-right-color:var(--colorStrokeFocus2);}",
                ".f1nl83rv[data-fui-focus-visible]:hover{border-left-color:var(--colorStrokeFocus2);}",
                ".f1czftr5[data-fui-focus-visible]:hover{border-bottom-color:var(--colorStrokeFocus2);}",
                [
                    ".fazmxh[data-fui-focus-visible]{border-radius:var(--borderRadiusSmall);}",
                    { p: -1 },
                ],
                [
                    ".f1b6alqh[data-fui-focus-visible]{border-radius:var(--borderRadiusLarge);}",
                    { p: -1 },
                ],
            ],
            t: [
                "@supports (-moz-appearance:button){.f18mfu3r[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}.fixhny3[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}}",
                "@supports (-moz-appearance:button){.feygou5[data-fui-focus-visible]:hover{box-shadow:var(--shadow2),0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset;}}",
            ],
        }
    ),
    F1 = ve(
        {
            small: {
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "fu97m5z",
                Bf4jedk: "f17fgpbq",
                B2u0y6b: "f1jt17bm",
            },
            medium: {
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f18ktai2",
                Bf4jedk: "fwbmr0d",
                B2u0y6b: "f44c6la",
            },
            large: {
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f1hbd1aw",
                Bf4jedk: "f12clzc2",
                B2u0y6b: "fjy1crr",
            },
        },
        {
            d: [
                [".fu97m5z{padding:1px;}", { p: -1 }],
                ".f17fgpbq{min-width:24px;}",
                ".f1jt17bm{max-width:24px;}",
                [".f18ktai2{padding:5px;}", { p: -1 }],
                ".fwbmr0d{min-width:32px;}",
                ".f44c6la{max-width:32px;}",
                [".f1hbd1aw{padding:7px;}", { p: -1 }],
                ".f12clzc2{min-width:40px;}",
                ".fjy1crr{max-width:40px;}",
            ],
        }
    ),
    R1 = ve(
        {
            small: {
                Be2twd7: "fe5j1ua",
                Bqenvij: "fjamq6b",
                a9b677: "f64fuq3",
                Bqrlyyl: "fbaiahx",
            },
            medium: {},
            large: {
                Be2twd7: "f1rt2boy",
                Bqenvij: "frvgh55",
                a9b677: "fq4mcun",
                Bqrlyyl: "f1exjqw5",
            },
            before: { t21cq0: ["f1nizpg2", "f1a695kz"] },
            after: { Frg6f3: ["f1a695kz", "f1nizpg2"] },
        },
        {
            d: [
                ".fe5j1ua{font-size:20px;}",
                ".fjamq6b{height:20px;}",
                ".f64fuq3{width:20px;}",
                ".fbaiahx{--fui-Button__icon--spacing:var(--spacingHorizontalXS);}",
                ".f1rt2boy{font-size:24px;}",
                ".frvgh55{height:24px;}",
                ".fq4mcun{width:24px;}",
                ".f1exjqw5{--fui-Button__icon--spacing:var(--spacingHorizontalSNudge);}",
                ".f1nizpg2{margin-right:var(--fui-Button__icon--spacing);}",
                ".f1a695kz{margin-left:var(--fui-Button__icon--spacing);}",
            ],
        }
    ),
    j1 = (i) => {
        "use no memo";
        const n = T1(),
            o = C1(),
            a = z1(),
            c = N1(),
            f = P1(),
            h = F1(),
            p = R1(),
            {
                appearance: m,
                disabled: v,
                disabledFocusable: b,
                icon: y,
                iconOnly: k,
                iconPosition: S,
                shape: C,
                size: E,
            } = i;
        return (
            (i.root.className = Ee(
                jf.root,
                n,
                m && a[m],
                a[E],
                y && E === "small" && a.smallWithIcon,
                y && E === "large" && a.largeWithIcon,
                a[C],
                (v || b) && c.base,
                (v || b) && c.highContrast,
                m && (v || b) && c[m],
                m === "primary" && f.primary,
                f[E],
                f[C],
                k && h[E],
                i.root.className
            )),
            i.icon &&
                (i.icon.className = Ee(
                    jf.icon,
                    o,
                    !!i.root.children && p[S],
                    p[E],
                    i.icon.className
                )),
            i
        );
    },
    jd = M.createContext(void 0);
jd.Provider;
const I1 = () => M.useContext(jd);
function Id(i, n) {
    return D1(I1(), i, n);
}
function D1(i, n, o) {
    if (!i) return n;
    n = { ...n };
    const {
        generatedControlId: a,
        hintId: c,
        labelFor: f,
        labelId: h,
        required: p,
        validationMessageId: m,
        validationState: v,
    } = i;
    if (a) {
        var b, y;
        ((y = (b = n).id) !== null && y !== void 0) || (b.id = a);
    }
    if (h && (!(o != null && o.supportsLabelFor) || f !== n.id)) {
        var k, S, C;
        ((C = (k = n)[(S = "aria-labelledby")]) !== null && C !== void 0) || (k[S] = h);
    }
    if (
        ((m || c) &&
            (n["aria-describedby"] = [m, c, n == null ? void 0 : n["aria-describedby"]]
                .filter(Boolean)
                .join(" ")),
        v === "error")
    ) {
        var E, N, q;
        ((q = (E = n)[(N = "aria-invalid")]) !== null && q !== void 0) || (E[N] = !0);
    }
    if (p)
        if (o != null && o.supportsRequired) {
            var H, D;
            ((D = (H = n).required) !== null && D !== void 0) || (H.required = !0);
        } else {
            var Q, re, G;
            ((G = (Q = n)[(re = "aria-required")]) !== null && G !== void 0) || (Q[re] = !0);
        }
    if (o != null && o.supportsSize) {
        var ee, U;
        ((U = (ee = n).size) !== null && U !== void 0) || (ee.size = i.size);
    }
    return n;
}
const O1 = (i, n) => {
        i = Id(i, { supportsLabelFor: !0, supportsRequired: !0, supportsSize: !0 });
        const o = Gs();
        var a;
        const {
                size: c = "medium",
                appearance: f = (a = o.inputDefaultAppearance) !== null && a !== void 0
                    ? a
                    : "outline",
                onChange: h,
            } = i,
            [p, m] = Ys({ state: i.value, defaultState: i.defaultValue, initialState: "" }),
            v = Yf({
                props: i,
                primarySlotTagName: "input",
                excludedPropNames: ["size", "onChange", "value", "defaultValue"],
            }),
            b = {
                size: c,
                appearance: f,
                components: {
                    root: "span",
                    input: "input",
                    contentBefore: "span",
                    contentAfter: "span",
                },
                input: rt(i.input, {
                    defaultProps: { type: "text", ref: n, ...v.primary },
                    elementType: "input",
                }),
                contentAfter: eo(i.contentAfter, { elementType: "span" }),
                contentBefore: eo(i.contentBefore, { elementType: "span" }),
                root: rt(i.root, { defaultProps: v.root, elementType: "span" }),
            };
        return (
            (b.input.value = p),
            (b.input.onChange = br((y) => {
                const k = y.target.value;
                (h == null || h(y, { value: k }), m(k));
            })),
            b
        );
    },
    L1 = (i) =>
        to(i.root, {
            children: [
                i.contentBefore && ye(i.contentBefore, {}),
                ye(i.input, {}),
                i.contentAfter && ye(i.contentAfter, {}),
            ],
        }),
    wi = {
        root: "fui-Input",
        input: "fui-Input__input",
        contentBefore: "fui-Input__contentBefore",
        contentAfter: "fui-Input__contentAfter",
    },
    M1 = no("r1oeeo9n", "r9sxh5", {
        r: [
            ".r1oeeo9n{display:inline-flex;align-items:center;flex-wrap:nowrap;gap:var(--spacingHorizontalXXS);border-radius:var(--borderRadiusMedium);position:relative;box-sizing:border-box;vertical-align:middle;min-height:32px;font-family:var(--fontFamilyBase);font-size:var(--fontSizeBase300);font-weight:var(--fontWeightRegular);line-height:var(--lineHeightBase300);background-color:var(--colorNeutralBackground1);border:1px solid var(--colorNeutralStroke1);border-bottom-color:var(--colorNeutralStrokeAccessible);}",
            '.r1oeeo9n::after{box-sizing:border-box;content:"";position:absolute;left:-1px;bottom:-1px;right:-1px;height:max(2px, var(--borderRadiusMedium));border-bottom-left-radius:var(--borderRadiusMedium);border-bottom-right-radius:var(--borderRadiusMedium);border-bottom:2px solid var(--colorCompoundBrandStroke);clip-path:inset(calc(100% - 2px) 0 0 0);transform:scaleX(0);transition-property:transform;transition-duration:var(--durationUltraFast);transition-delay:var(--curveAccelerateMid);}',
            ".r1oeeo9n:focus-within::after{transform:scaleX(1);transition-property:transform;transition-duration:var(--durationNormal);transition-delay:var(--curveDecelerateMid);}",
            ".r1oeeo9n:focus-within:active::after{border-bottom-color:var(--colorCompoundBrandStrokePressed);}",
            ".r1oeeo9n:focus-within{outline:2px solid transparent;}",
            ".r9sxh5{display:inline-flex;align-items:center;flex-wrap:nowrap;gap:var(--spacingHorizontalXXS);border-radius:var(--borderRadiusMedium);position:relative;box-sizing:border-box;vertical-align:middle;min-height:32px;font-family:var(--fontFamilyBase);font-size:var(--fontSizeBase300);font-weight:var(--fontWeightRegular);line-height:var(--lineHeightBase300);background-color:var(--colorNeutralBackground1);border:1px solid var(--colorNeutralStroke1);border-bottom-color:var(--colorNeutralStrokeAccessible);}",
            '.r9sxh5::after{box-sizing:border-box;content:"";position:absolute;right:-1px;bottom:-1px;left:-1px;height:max(2px, var(--borderRadiusMedium));border-bottom-right-radius:var(--borderRadiusMedium);border-bottom-left-radius:var(--borderRadiusMedium);border-bottom:2px solid var(--colorCompoundBrandStroke);clip-path:inset(calc(100% - 2px) 0 0 0);transform:scaleX(0);transition-property:transform;transition-duration:var(--durationUltraFast);transition-delay:var(--curveAccelerateMid);}',
            ".r9sxh5:focus-within::after{transform:scaleX(1);transition-property:transform;transition-duration:var(--durationNormal);transition-delay:var(--curveDecelerateMid);}",
            ".r9sxh5:focus-within:active::after{border-bottom-color:var(--colorCompoundBrandStrokePressed);}",
            ".r9sxh5:focus-within{outline:2px solid transparent;}",
        ],
        s: [
            "@media screen and (prefers-reduced-motion: reduce){.r1oeeo9n::after{transition-duration:0.01ms;transition-delay:0.01ms;}}",
            "@media screen and (prefers-reduced-motion: reduce){.r1oeeo9n:focus-within::after{transition-duration:0.01ms;transition-delay:0.01ms;}}",
            "@media screen and (prefers-reduced-motion: reduce){.r9sxh5::after{transition-duration:0.01ms;transition-delay:0.01ms;}}",
            "@media screen and (prefers-reduced-motion: reduce){.r9sxh5:focus-within::after{transition-duration:0.01ms;transition-delay:0.01ms;}}",
        ],
    }),
    A1 = ve(
        {
            small: {
                sshi5w: "f1pha7fy",
                Bahqtrf: "fk6fouc",
                Be2twd7: "fy9rknc",
                Bhrd7zp: "figsok6",
                Bg96gwp: "fwrc4pm",
            },
            medium: {},
            large: {
                sshi5w: "f1w5jphr",
                Bahqtrf: "fk6fouc",
                Be2twd7: "fod5ikn",
                Bhrd7zp: "figsok6",
                Bg96gwp: "faaz57k",
                i8kkvl: 0,
                Belr9w4: 0,
                rmohyg: "f1eyhf9v",
            },
            outline: {},
            outlineInteractive: {
                Bgoe8wy: "fvcxoqz",
                Bwzppfd: ["f1ub3y4t", "f1m52nbi"],
                oetu4i: "f1l4zc64",
                gg5e9n: ["f1m52nbi", "f1ub3y4t"],
                Drbcw7: "f8vnjqi",
                udz0bu: ["fz1etlk", "f1hc16gm"],
                Be8ivqh: "f1klwx88",
                ofdepl: ["f1hc16gm", "fz1etlk"],
            },
            underline: {
                De3pzq: "f1c21dwh",
                Beyfa6y: 0,
                Bbmb7ep: 0,
                Btl43ni: 0,
                B7oj6ja: 0,
                Dimara: "fokr779",
                icvyot: "f1ern45e",
                vrafjx: ["f1n71otn", "f1deefiw"],
                wvpqe5: ["f1deefiw", "f1n71otn"],
                Eqx8gd: ["f1n6gb5g", "f15yvnhg"],
                B1piin3: ["f15yvnhg", "f1n6gb5g"],
            },
            underlineInteractive: {
                oetu4i: "f1l4zc64",
                Be8ivqh: "f1klwx88",
                d9w3h3: 0,
                B3778ie: 0,
                B4j8arr: 0,
                Bl18szs: 0,
                Blrzh8d: "f2ale1x",
            },
            filled: {
                g2u3we: "fghlq4f",
                h3c5rm: ["f1gn591s", "fjscplz"],
                B9xav0g: "fb073pr",
                zhjwy3: ["fjscplz", "f1gn591s"],
            },
            filledInteractive: {
                q7v0qe: "ftmjh5b",
                kmh5ft: ["f17blpuu", "fsrcdbj"],
                nagaa4: "f1tpwn32",
                B1yhkcb: ["fsrcdbj", "f17blpuu"],
            },
            invalid: {
                tvckwq: "fs4k3qj",
                gk2u95: ["fcee079", "fmyw78r"],
                hhx65j: "f1fgmyf4",
                Bxowmz0: ["fmyw78r", "fcee079"],
            },
            "filled-darker": { De3pzq: "f16xq7d1" },
            "filled-lighter": { De3pzq: "fxugw4r" },
            "filled-darker-shadow": { De3pzq: "f16xq7d1", E5pizo: "fyed02w" },
            "filled-lighter-shadow": { De3pzq: "fxugw4r", E5pizo: "fyed02w" },
            disabled: {
                Bceei9c: "fdrzuqr",
                De3pzq: "f1c21dwh",
                g2u3we: "f1jj8ep1",
                h3c5rm: ["f15xbau", "fy0fskl"],
                B9xav0g: "f4ikngz",
                zhjwy3: ["fy0fskl", "f15xbau"],
                Bcq6wej: "f9dbb4x",
                Jcjdmf: ["f3qs60o", "f5u9ap2"],
                sc4o1m: "fwd1oij",
                Bosien3: ["f5u9ap2", "f3qs60o"],
                Bsft5z2: "fhr9occ",
                Bduesf4: "f99w1ws",
            },
            smallWithContentBefore: { uwmqm3: ["fk8j09s", "fdw0yi8"] },
            smallWithContentAfter: { z189sj: ["fdw0yi8", "fk8j09s"] },
            mediumWithContentBefore: { uwmqm3: ["f1ng84yb", "f11gcy0p"] },
            mediumWithContentAfter: { z189sj: ["f11gcy0p", "f1ng84yb"] },
            largeWithContentBefore: { uwmqm3: ["f1uw59to", "fw5db7e"] },
            largeWithContentAfter: { z189sj: ["fw5db7e", "f1uw59to"] },
        },
        {
            d: [
                ".f1pha7fy{min-height:24px;}",
                ".fk6fouc{font-family:var(--fontFamilyBase);}",
                ".fy9rknc{font-size:var(--fontSizeBase200);}",
                ".figsok6{font-weight:var(--fontWeightRegular);}",
                ".fwrc4pm{line-height:var(--lineHeightBase200);}",
                ".f1w5jphr{min-height:40px;}",
                ".fod5ikn{font-size:var(--fontSizeBase400);}",
                ".faaz57k{line-height:var(--lineHeightBase400);}",
                [".f1eyhf9v{gap:var(--spacingHorizontalSNudge);}", { p: -1 }],
                ".f1c21dwh{background-color:var(--colorTransparentBackground);}",
                [".fokr779{border-radius:0;}", { p: -1 }],
                ".f1ern45e{border-top-style:none;}",
                ".f1n71otn{border-right-style:none;}",
                ".f1deefiw{border-left-style:none;}",
                ".f1n6gb5g::after{left:0;}",
                ".f15yvnhg::after{right:0;}",
                [".f2ale1x::after{border-radius:0;}", { p: -1 }],
                ".fghlq4f{border-top-color:var(--colorTransparentStroke);}",
                ".f1gn591s{border-right-color:var(--colorTransparentStroke);}",
                ".fjscplz{border-left-color:var(--colorTransparentStroke);}",
                ".fb073pr{border-bottom-color:var(--colorTransparentStroke);}",
                ".fs4k3qj:not(:focus-within),.fs4k3qj:hover:not(:focus-within){border-top-color:var(--colorPaletteRedBorder2);}",
                ".fcee079:not(:focus-within),.fcee079:hover:not(:focus-within){border-right-color:var(--colorPaletteRedBorder2);}",
                ".fmyw78r:not(:focus-within),.fmyw78r:hover:not(:focus-within){border-left-color:var(--colorPaletteRedBorder2);}",
                ".f1fgmyf4:not(:focus-within),.f1fgmyf4:hover:not(:focus-within){border-bottom-color:var(--colorPaletteRedBorder2);}",
                ".f16xq7d1{background-color:var(--colorNeutralBackground3);}",
                ".fxugw4r{background-color:var(--colorNeutralBackground1);}",
                ".fyed02w{box-shadow:var(--shadow2);}",
                ".fdrzuqr{cursor:not-allowed;}",
                ".f1jj8ep1{border-top-color:var(--colorNeutralStrokeDisabled);}",
                ".f15xbau{border-right-color:var(--colorNeutralStrokeDisabled);}",
                ".fy0fskl{border-left-color:var(--colorNeutralStrokeDisabled);}",
                ".f4ikngz{border-bottom-color:var(--colorNeutralStrokeDisabled);}",
                ".fhr9occ::after{content:unset;}",
                ".fk8j09s{padding-left:var(--spacingHorizontalSNudge);}",
                ".fdw0yi8{padding-right:var(--spacingHorizontalSNudge);}",
                ".f1ng84yb{padding-left:var(--spacingHorizontalMNudge);}",
                ".f11gcy0p{padding-right:var(--spacingHorizontalMNudge);}",
                ".f1uw59to{padding-left:var(--spacingHorizontalM);}",
                ".fw5db7e{padding-right:var(--spacingHorizontalM);}",
            ],
            h: [
                ".fvcxoqz:hover{border-top-color:var(--colorNeutralStroke1Hover);}",
                ".f1ub3y4t:hover{border-right-color:var(--colorNeutralStroke1Hover);}",
                ".f1m52nbi:hover{border-left-color:var(--colorNeutralStroke1Hover);}",
                ".f1l4zc64:hover{border-bottom-color:var(--colorNeutralStrokeAccessibleHover);}",
                ".ftmjh5b:hover,.ftmjh5b:focus-within{border-top-color:var(--colorTransparentStrokeInteractive);}",
                ".f17blpuu:hover,.f17blpuu:focus-within{border-right-color:var(--colorTransparentStrokeInteractive);}",
                ".fsrcdbj:hover,.fsrcdbj:focus-within{border-left-color:var(--colorTransparentStrokeInteractive);}",
                ".f1tpwn32:hover,.f1tpwn32:focus-within{border-bottom-color:var(--colorTransparentStrokeInteractive);}",
            ],
            a: [
                ".f8vnjqi:active,.f8vnjqi:focus-within{border-top-color:var(--colorNeutralStroke1Pressed);}",
                ".fz1etlk:active,.fz1etlk:focus-within{border-right-color:var(--colorNeutralStroke1Pressed);}",
                ".f1hc16gm:active,.f1hc16gm:focus-within{border-left-color:var(--colorNeutralStroke1Pressed);}",
                ".f1klwx88:active,.f1klwx88:focus-within{border-bottom-color:var(--colorNeutralStrokeAccessiblePressed);}",
            ],
            m: [
                [
                    "@media (forced-colors: active){.f9dbb4x{border-top-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f3qs60o{border-right-color:GrayText;}.f5u9ap2{border-left-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fwd1oij{border-bottom-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
            ],
            w: [".f99w1ws:focus-within{outline-style:none;}"],
        }
    ),
    q1 = no("r12stul0", null, [
        ".r12stul0{align-self:stretch;box-sizing:border-box;flex-grow:1;min-width:0;border-style:none;padding:0 var(--spacingHorizontalM);color:var(--colorNeutralForeground1);background-color:transparent;outline-style:none;font-family:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;}",
        ".r12stul0::-webkit-input-placeholder{color:var(--colorNeutralForeground4);opacity:1;}",
        ".r12stul0::-moz-placeholder{color:var(--colorNeutralForeground4);opacity:1;}",
        ".r12stul0::placeholder{color:var(--colorNeutralForeground4);opacity:1;}",
    ]),
    H1 = ve(
        {
            small: { uwmqm3: ["f1f5gg8d", "f1vdfbxk"], z189sj: ["f1vdfbxk", "f1f5gg8d"] },
            medium: {},
            large: { uwmqm3: ["fnphzt9", "flt1dlf"], z189sj: ["flt1dlf", "fnphzt9"] },
            smallWithContentBefore: { uwmqm3: ["fgiv446", "ffczdla"] },
            smallWithContentAfter: { z189sj: ["ffczdla", "fgiv446"] },
            mediumWithContentBefore: { uwmqm3: ["fgiv446", "ffczdla"] },
            mediumWithContentAfter: { z189sj: ["ffczdla", "fgiv446"] },
            largeWithContentBefore: { uwmqm3: ["fk8j09s", "fdw0yi8"] },
            largeWithContentAfter: { z189sj: ["fdw0yi8", "fk8j09s"] },
            disabled: {
                sj55zd: "f1s2aq7o",
                De3pzq: "f1c21dwh",
                Bceei9c: "fdrzuqr",
                yvdlaj: "fahhnxm",
            },
        },
        {
            d: [
                ".f1f5gg8d{padding-left:var(--spacingHorizontalS);}",
                ".f1vdfbxk{padding-right:var(--spacingHorizontalS);}",
                ".fnphzt9{padding-left:calc(var(--spacingHorizontalM) + var(--spacingHorizontalSNudge));}",
                ".flt1dlf{padding-right:calc(var(--spacingHorizontalM) + var(--spacingHorizontalSNudge));}",
                ".fgiv446{padding-left:var(--spacingHorizontalXXS);}",
                ".ffczdla{padding-right:var(--spacingHorizontalXXS);}",
                ".fk8j09s{padding-left:var(--spacingHorizontalSNudge);}",
                ".fdw0yi8{padding-right:var(--spacingHorizontalSNudge);}",
                ".f1s2aq7o{color:var(--colorNeutralForegroundDisabled);}",
                ".f1c21dwh{background-color:var(--colorTransparentBackground);}",
                ".fdrzuqr{cursor:not-allowed;}",
                ".fahhnxm::-webkit-input-placeholder{color:var(--colorNeutralForegroundDisabled);}",
                ".fahhnxm::-moz-placeholder{color:var(--colorNeutralForegroundDisabled);}",
            ],
        }
    ),
    W1 = no("r1572tok", null, [
        ".r1572tok{box-sizing:border-box;color:var(--colorNeutralForeground3);display:flex;}",
        ".r1572tok>svg{font-size:20px;}",
    ]),
    U1 = ve(
        {
            disabled: { sj55zd: "f1s2aq7o" },
            small: { Duoase: "f3qv9w" },
            medium: {},
            large: { Duoase: "f16u2scb" },
        },
        {
            d: [
                ".f1s2aq7o{color:var(--colorNeutralForegroundDisabled);}",
                ".f3qv9w>svg{font-size:16px;}",
                ".f16u2scb>svg{font-size:24px;}",
            ],
        }
    ),
    V1 = (i) => {
        "use no memo";
        const { size: n, appearance: o } = i,
            a = i.input.disabled,
            c = `${i.input["aria-invalid"]}` == "true",
            f = o.startsWith("filled"),
            h = A1(),
            p = H1(),
            m = U1();
        ((i.root.className = Ee(
            wi.root,
            M1(),
            h[n],
            i.contentBefore && h[`${n}WithContentBefore`],
            i.contentAfter && h[`${n}WithContentAfter`],
            h[o],
            !a && o === "outline" && h.outlineInteractive,
            !a && o === "underline" && h.underlineInteractive,
            !a && f && h.filledInteractive,
            f && h.filled,
            !a && c && h.invalid,
            a && h.disabled,
            i.root.className
        )),
            (i.input.className = Ee(
                wi.input,
                q1(),
                p[n],
                i.contentBefore && p[`${n}WithContentBefore`],
                i.contentAfter && p[`${n}WithContentAfter`],
                a && p.disabled,
                i.input.className
            )));
        const v = [W1(), a && m.disabled, m[n]];
        return (
            i.contentBefore &&
                (i.contentBefore.className = Ee(wi.contentBefore, ...v, i.contentBefore.className)),
            i.contentAfter &&
                (i.contentAfter.className = Ee(wi.contentAfter, ...v, i.contentAfter.className)),
            i
        );
    },
    Dd = M.forwardRef((i, n) => {
        const o = O1(i, n);
        return (V1(o), jt("useInputStyles_unstable")(o), L1(o));
    });
Dd.displayName = "Input";
const K1 = (i, n) => {
        const {
            wrap: o,
            truncate: a,
            block: c,
            italic: f,
            underline: h,
            strikethrough: p,
            size: m,
            font: v,
            weight: b,
            align: y,
        } = i;
        return {
            align: y ?? "start",
            block: c ?? !1,
            font: v ?? "base",
            italic: f ?? !1,
            size: m ?? 300,
            strikethrough: p ?? !1,
            truncate: a ?? !1,
            underline: h ?? !1,
            weight: b ?? "regular",
            wrap: o ?? !0,
            components: { root: "span" },
            root: rt(Xt("span", { ref: n, ...i }), { elementType: "span" }),
        };
    },
    $1 = (i) => ye(i.root, {}),
    Q1 = { root: "fui-Text" },
    G1 = ve(
        {
            root: {
                Bahqtrf: "fk6fouc",
                Be2twd7: "fkhj508",
                Bg96gwp: "f1i3iumi",
                Bhrd7zp: "figsok6",
                fsow6f: "fpgzoln",
                mc9l5x: "f1w7gpdv",
                Huce71: "f6juhto",
                B68tc82: 0,
                Bmxbyg5: 0,
                Bpg54ce: "f1gl81tg",
                ygn44y: "f2jf649",
            },
            nowrap: { Huce71: "fz5stix", B68tc82: 0, Bmxbyg5: 0, Bpg54ce: "f1a3p1vp" },
            truncate: { ygn44y: "f1cmbuwj" },
            block: { mc9l5x: "ftgm304" },
            italic: { B80ckks: "f1j4dglz" },
            underline: { w71qe1: "f13mvf36" },
            strikethrough: { w71qe1: "fv5q2k7" },
            strikethroughUnderline: { w71qe1: "f1drk4o6" },
            base100: { Be2twd7: "f13mqy1h", Bg96gwp: "fcpl73t" },
            base200: { Be2twd7: "fy9rknc", Bg96gwp: "fwrc4pm" },
            base400: { Be2twd7: "fod5ikn", Bg96gwp: "faaz57k" },
            base500: { Be2twd7: "f1pp30po", Bg96gwp: "f106mvju" },
            base600: { Be2twd7: "f1x0m3f5", Bg96gwp: "fb86gi6" },
            hero700: { Be2twd7: "fojgt09", Bg96gwp: "fcen8rp" },
            hero800: { Be2twd7: "fccw675", Bg96gwp: "f1ebx5kk" },
            hero900: { Be2twd7: "f15afnhw", Bg96gwp: "fr3w3wp" },
            hero1000: { Be2twd7: "fpyltcb", Bg96gwp: "f1ivgwrt" },
            monospace: { Bahqtrf: "f1fedwem" },
            numeric: { Bahqtrf: "f1uq0ln5" },
            weightMedium: { Bhrd7zp: "fdj6btp" },
            weightSemibold: { Bhrd7zp: "fl43uef" },
            weightBold: { Bhrd7zp: "flh3ekv" },
            alignCenter: { fsow6f: "f17mccla" },
            alignEnd: { fsow6f: "f12ymhq5" },
            alignJustify: { fsow6f: "f1j59e10" },
        },
        {
            d: [
                ".fk6fouc{font-family:var(--fontFamilyBase);}",
                ".fkhj508{font-size:var(--fontSizeBase300);}",
                ".f1i3iumi{line-height:var(--lineHeightBase300);}",
                ".figsok6{font-weight:var(--fontWeightRegular);}",
                ".fpgzoln{text-align:start;}",
                ".f1w7gpdv{display:inline;}",
                ".f6juhto{white-space:normal;}",
                [".f1gl81tg{overflow:visible;}", { p: -1 }],
                ".f2jf649{text-overflow:clip;}",
                ".fz5stix{white-space:nowrap;}",
                [".f1a3p1vp{overflow:hidden;}", { p: -1 }],
                ".f1cmbuwj{text-overflow:ellipsis;}",
                ".ftgm304{display:block;}",
                ".f1j4dglz{font-style:italic;}",
                ".f13mvf36{text-decoration-line:underline;}",
                ".fv5q2k7{text-decoration-line:line-through;}",
                ".f1drk4o6{text-decoration-line:line-through underline;}",
                ".f13mqy1h{font-size:var(--fontSizeBase100);}",
                ".fcpl73t{line-height:var(--lineHeightBase100);}",
                ".fy9rknc{font-size:var(--fontSizeBase200);}",
                ".fwrc4pm{line-height:var(--lineHeightBase200);}",
                ".fod5ikn{font-size:var(--fontSizeBase400);}",
                ".faaz57k{line-height:var(--lineHeightBase400);}",
                ".f1pp30po{font-size:var(--fontSizeBase500);}",
                ".f106mvju{line-height:var(--lineHeightBase500);}",
                ".f1x0m3f5{font-size:var(--fontSizeBase600);}",
                ".fb86gi6{line-height:var(--lineHeightBase600);}",
                ".fojgt09{font-size:var(--fontSizeHero700);}",
                ".fcen8rp{line-height:var(--lineHeightHero700);}",
                ".fccw675{font-size:var(--fontSizeHero800);}",
                ".f1ebx5kk{line-height:var(--lineHeightHero800);}",
                ".f15afnhw{font-size:var(--fontSizeHero900);}",
                ".fr3w3wp{line-height:var(--lineHeightHero900);}",
                ".fpyltcb{font-size:var(--fontSizeHero1000);}",
                ".f1ivgwrt{line-height:var(--lineHeightHero1000);}",
                ".f1fedwem{font-family:var(--fontFamilyMonospace);}",
                ".f1uq0ln5{font-family:var(--fontFamilyNumeric);}",
                ".fdj6btp{font-weight:var(--fontWeightMedium);}",
                ".fl43uef{font-weight:var(--fontWeightSemibold);}",
                ".flh3ekv{font-weight:var(--fontWeightBold);}",
                ".f17mccla{text-align:center;}",
                ".f12ymhq5{text-align:end;}",
                ".f1j59e10{text-align:justify;}",
            ],
        }
    ),
    X1 = (i) => {
        "use no memo";
        const n = G1();
        return (
            (i.root.className = Ee(
                Q1.root,
                n.root,
                i.wrap === !1 && n.nowrap,
                i.truncate && n.truncate,
                i.block && n.block,
                i.italic && n.italic,
                i.underline && n.underline,
                i.strikethrough && n.strikethrough,
                i.underline && i.strikethrough && n.strikethroughUnderline,
                i.size === 100 && n.base100,
                i.size === 200 && n.base200,
                i.size === 400 && n.base400,
                i.size === 500 && n.base500,
                i.size === 600 && n.base600,
                i.size === 700 && n.hero700,
                i.size === 800 && n.hero800,
                i.size === 900 && n.hero900,
                i.size === 1e3 && n.hero1000,
                i.font === "monospace" && n.monospace,
                i.font === "numeric" && n.numeric,
                i.weight === "medium" && n.weightMedium,
                i.weight === "semibold" && n.weightSemibold,
                i.weight === "bold" && n.weightBold,
                i.align === "center" && n.alignCenter,
                i.align === "end" && n.alignEnd,
                i.align === "justify" && n.alignJustify,
                i.root.className
            )),
            i
        );
    },
    Vs = M.forwardRef((i, n) => {
        const o = K1(i, n);
        return (X1(o), jt("useTextStyles_unstable")(o), $1(o));
    });
Vs.displayName = "Text";
const Y1 = (i) => ye(i.root, { children: ye(i.textarea, {}) }),
    J1 = (i, n) => {
        i = Id(i, { supportsLabelFor: !0, supportsRequired: !0, supportsSize: !0 });
        const o = Gs();
        var a;
        const {
                size: c = "medium",
                appearance: f = (a = o.inputDefaultAppearance) !== null && a !== void 0
                    ? a
                    : "outline",
                resize: h = "none",
                onChange: p,
            } = i,
            [m, v] = Ys({ state: i.value, defaultState: i.defaultValue, initialState: void 0 }),
            b = Yf({
                props: i,
                primarySlotTagName: "textarea",
                excludedPropNames: ["onChange", "value", "defaultValue"],
            }),
            y = {
                size: c,
                appearance: f,
                resize: h,
                components: { root: "span", textarea: "textarea" },
                textarea: rt(i.textarea, {
                    defaultProps: { ref: n, ...b.primary },
                    elementType: "textarea",
                }),
                root: rt(i.root, { defaultProps: b.root, elementType: "span" }),
            };
        return (
            (y.textarea.value = m),
            (y.textarea.onChange = br((k) => {
                const S = k.target.value;
                (p == null || p(k, { value: S }), v(S));
            })),
            y
        );
    },
    If = { root: "fui-Textarea", textarea: "fui-Textarea__textarea" },
    Z1 = ve(
        {
            base: {
                mc9l5x: "ftuwxu6",
                B7ck84d: "f1ewtqcl",
                qhf8xq: "f10pi13n",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f1yiegib",
                jrapky: 0,
                Frg6f3: 0,
                t21cq0: 0,
                B6of3ja: 0,
                B74szlk: "f1s184ao",
                Beyfa6y: 0,
                Bbmb7ep: 0,
                Btl43ni: 0,
                B7oj6ja: 0,
                Dimara: "ft85np5",
                ha4doy: "f12kltsn",
            },
            disabled: {
                De3pzq: "f1c21dwh",
                Bgfg5da: 0,
                B9xav0g: 0,
                oivjwe: 0,
                Bn0qgzm: 0,
                B4g9neb: 0,
                zhjwy3: 0,
                wvpqe5: 0,
                ibv6hh: 0,
                u1mtju: 0,
                h3c5rm: 0,
                vrafjx: 0,
                Bekrc4i: 0,
                i8vvqc: 0,
                g2u3we: 0,
                icvyot: 0,
                B4j52fo: 0,
                irswps: "ff3nzm7",
                Bcq6wej: "f9dbb4x",
                Jcjdmf: ["f3qs60o", "f5u9ap2"],
                sc4o1m: "fwd1oij",
                Bosien3: ["f5u9ap2", "f3qs60o"],
            },
            interactive: {
                li1rpt: "f1gw3sf2",
                Bsft5z2: "f13zj6fq",
                E3zdtr: "f1mdlcz9",
                Eqx8gd: ["f1a7op3", "f1cjjd47"],
                By385i5: "f1gboi2j",
                B1piin3: ["f1cjjd47", "f1a7op3"],
                Dlnsje: "ffyw7fx",
                d9w3h3: ["f1kp91vd", "f1ibwz09"],
                B3778ie: ["f1ibwz09", "f1kp91vd"],
                B1q35kw: 0,
                Bw17bha: 0,
                Bcgy8vk: 0,
                Bjuhk93: "f1mnjydx",
                Gjdm7m: "fj2g8qd",
                b1kco5: "f1yk9hq",
                Ba2ppi3: "fhwpy7i",
                F2fol1: "f14ee0xe",
                lck23g: "f1xhbsuh",
                wi16st: "fsrmcvb",
                ywj3b2: "f1t3k7v9",
                umuwi5: "fjw5xc1",
                Blcqepd: "f1xdyd5c",
                nplu4u: "fatpbeo",
                Bioka5o: "fb7uyps",
                Bnupc0a: "fx04xgm",
                bing71: "f1c7in40",
                Bercvud: "f1ibeo51",
                Bbr2w1p: "f1vnc8sk",
                Bduesf4: "f3e99gv",
                Bpq79vn: "fhljsf7",
            },
            filled: {
                Bgfg5da: 0,
                B9xav0g: 0,
                oivjwe: 0,
                Bn0qgzm: 0,
                B4g9neb: 0,
                zhjwy3: 0,
                wvpqe5: 0,
                ibv6hh: 0,
                u1mtju: 0,
                h3c5rm: 0,
                vrafjx: 0,
                Bekrc4i: 0,
                i8vvqc: 0,
                g2u3we: 0,
                icvyot: 0,
                B4j52fo: 0,
                irswps: "f88035w",
                q7v0qe: "ftmjh5b",
                kmh5ft: ["f17blpuu", "fsrcdbj"],
                nagaa4: "f1tpwn32",
                B1yhkcb: ["fsrcdbj", "f17blpuu"],
            },
            "filled-darker": { De3pzq: "f16xq7d1" },
            "filled-lighter": { De3pzq: "fxugw4r" },
            "filled-darker-shadow": {
                De3pzq: "f16xq7d1",
                Bgfg5da: 0,
                B9xav0g: 0,
                oivjwe: 0,
                Bn0qgzm: 0,
                B4g9neb: 0,
                zhjwy3: 0,
                wvpqe5: 0,
                ibv6hh: 0,
                u1mtju: 0,
                h3c5rm: 0,
                vrafjx: 0,
                Bekrc4i: 0,
                i8vvqc: 0,
                g2u3we: 0,
                icvyot: 0,
                B4j52fo: 0,
                irswps: "f1gmd7mu",
                E5pizo: "fyed02w",
            },
            "filled-lighter-shadow": {
                De3pzq: "fxugw4r",
                Bgfg5da: 0,
                B9xav0g: 0,
                oivjwe: 0,
                Bn0qgzm: 0,
                B4g9neb: 0,
                zhjwy3: 0,
                wvpqe5: 0,
                ibv6hh: 0,
                u1mtju: 0,
                h3c5rm: 0,
                vrafjx: 0,
                Bekrc4i: 0,
                i8vvqc: 0,
                g2u3we: 0,
                icvyot: 0,
                B4j52fo: 0,
                irswps: "f1gmd7mu",
                E5pizo: "fyed02w",
            },
            outline: {
                De3pzq: "fxugw4r",
                Bgfg5da: 0,
                B9xav0g: "f1c1zstj",
                oivjwe: 0,
                Bn0qgzm: 0,
                B4g9neb: 0,
                zhjwy3: 0,
                wvpqe5: 0,
                ibv6hh: 0,
                u1mtju: 0,
                h3c5rm: 0,
                vrafjx: 0,
                Bekrc4i: 0,
                i8vvqc: 0,
                g2u3we: 0,
                icvyot: 0,
                B4j52fo: 0,
                irswps: "fhz96rm",
            },
            outlineInteractive: {
                kzujx5: 0,
                oetu4i: "f1l4zc64",
                gvrnp0: 0,
                xv9156: 0,
                jek2p4: 0,
                gg5e9n: 0,
                Beu9t3s: 0,
                dt87k2: 0,
                Bt1vbvt: 0,
                Bwzppfd: 0,
                Bop6t4b: 0,
                B2zwrfe: 0,
                Bwp2tzp: 0,
                Bgoe8wy: 0,
                Bf40cpq: 0,
                ckks6v: 0,
                Baalond: "f9mts5e",
                v2iqwr: 0,
                wmxk5l: "f1z0osm6",
                Bj33j0h: 0,
                Bs0cc2w: 0,
                qwjtx1: 0,
                B50zh58: 0,
                f7epvg: 0,
                e1hlit: 0,
                B7mkhst: 0,
                ak43y8: 0,
                Bbcopvn: 0,
                Bvecx4l: 0,
                lwioe0: 0,
                B6oc9vd: 0,
                e2sjt0: 0,
                uqwnxt: 0,
                asj8p9: "f1acnei2",
                Br8fjdy: 0,
                zoxjo1: "f1so894s",
                Bt3ojkv: 0,
                B7pmvfx: 0,
                Bfht2n1: 0,
                an54nd: 0,
                t1ykpo: 0,
                Belqbek: 0,
                bbt1vd: 0,
                Brahy3i: 0,
                r7b1zc: 0,
                rexu52: 0,
                ovtnii: 0,
                Bvq3b66: 0,
                Bawrxx6: 0,
                Bbs6y8j: 0,
                B2qpgjt: "f19ezbcq",
            },
            invalid: {
                tvckwq: "fs4k3qj",
                gk2u95: ["fcee079", "fmyw78r"],
                hhx65j: "f1fgmyf4",
                Bxowmz0: ["fmyw78r", "fcee079"],
            },
        },
        {
            d: [
                ".ftuwxu6{display:inline-flex;}",
                ".f1ewtqcl{box-sizing:border-box;}",
                ".f10pi13n{position:relative;}",
                [".f1yiegib{padding:0 0 var(--strokeWidthThick) 0;}", { p: -1 }],
                [".f1s184ao{margin:0;}", { p: -1 }],
                [".ft85np5{border-radius:var(--borderRadiusMedium);}", { p: -1 }],
                ".f12kltsn{vertical-align:top;}",
                ".f1c21dwh{background-color:var(--colorTransparentBackground);}",
                [
                    ".ff3nzm7{border:var(--strokeWidthThin) solid var(--colorNeutralStrokeDisabled);}",
                    { p: -2 },
                ],
                ".f1gw3sf2::after{box-sizing:border-box;}",
                '.f13zj6fq::after{content:"";}',
                ".f1mdlcz9::after{position:absolute;}",
                ".f1a7op3::after{left:-1px;}",
                ".f1cjjd47::after{right:-1px;}",
                ".f1gboi2j::after{bottom:-1px;}",
                ".ffyw7fx::after{height:max(var(--strokeWidthThick), var(--borderRadiusMedium));}",
                ".f1kp91vd::after{border-bottom-left-radius:var(--borderRadiusMedium);}",
                ".f1ibwz09::after{border-bottom-right-radius:var(--borderRadiusMedium);}",
                [
                    ".f1mnjydx::after{border-bottom:var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);}",
                    { p: -1 },
                ],
                ".fj2g8qd::after{clip-path:inset(calc(100% - var(--strokeWidthThick)) 0 0 0);}",
                ".f1yk9hq::after{transform:scaleX(0);}",
                ".fhwpy7i::after{transition-property:transform;}",
                ".f14ee0xe::after{transition-duration:var(--durationUltraFast);}",
                ".f1xhbsuh::after{transition-delay:var(--curveAccelerateMid);}",
                [
                    ".f88035w{border:var(--strokeWidthThin) solid var(--colorTransparentStroke);}",
                    { p: -2 },
                ],
                ".f16xq7d1{background-color:var(--colorNeutralBackground3);}",
                ".fxugw4r{background-color:var(--colorNeutralBackground1);}",
                [
                    ".f1gmd7mu{border:var(--strokeWidthThin) solid var(--colorTransparentStrokeInteractive);}",
                    { p: -2 },
                ],
                ".fyed02w{box-shadow:var(--shadow2);}",
                [
                    ".f1gmd7mu{border:var(--strokeWidthThin) solid var(--colorTransparentStrokeInteractive);}",
                    { p: -2 },
                ],
                [
                    ".fhz96rm{border:var(--strokeWidthThin) solid var(--colorNeutralStroke1);}",
                    { p: -2 },
                ],
                ".f1c1zstj{border-bottom-color:var(--colorNeutralStrokeAccessible);}",
                ".fs4k3qj:not(:focus-within),.fs4k3qj:hover:not(:focus-within){border-top-color:var(--colorPaletteRedBorder2);}",
                ".fcee079:not(:focus-within),.fcee079:hover:not(:focus-within){border-right-color:var(--colorPaletteRedBorder2);}",
                ".fmyw78r:not(:focus-within),.fmyw78r:hover:not(:focus-within){border-left-color:var(--colorPaletteRedBorder2);}",
                ".f1fgmyf4:not(:focus-within),.f1fgmyf4:hover:not(:focus-within){border-bottom-color:var(--colorPaletteRedBorder2);}",
            ],
            m: [
                [
                    "@media (forced-colors: active){.f9dbb4x{border-top-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f3qs60o{border-right-color:GrayText;}.f5u9ap2{border-left-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fwd1oij{border-bottom-color:GrayText;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media screen and (prefers-reduced-motion: reduce){.fsrmcvb::after{transition-duration:0.01ms;}}",
                    { m: "screen and (prefers-reduced-motion: reduce)" },
                ],
                [
                    "@media screen and (prefers-reduced-motion: reduce){.f1t3k7v9::after{transition-delay:0.01ms;}}",
                    { m: "screen and (prefers-reduced-motion: reduce)" },
                ],
                [
                    "@media screen and (prefers-reduced-motion: reduce){.fx04xgm:focus-within::after{transition-duration:0.01ms;}}",
                    { m: "screen and (prefers-reduced-motion: reduce)" },
                ],
                [
                    "@media screen and (prefers-reduced-motion: reduce){.f1c7in40:focus-within::after{transition-delay:0.01ms;}}",
                    { m: "screen and (prefers-reduced-motion: reduce)" },
                ],
            ],
            w: [
                ".fjw5xc1:focus-within::after{transform:scaleX(1);}",
                ".f1xdyd5c:focus-within::after{transition-property:transform;}",
                ".fatpbeo:focus-within::after{transition-duration:var(--durationNormal);}",
                ".fb7uyps:focus-within::after{transition-delay:var(--curveDecelerateMid);}",
                ".f1ibeo51:focus-within:active::after{border-bottom-color:var(--colorCompoundBrandStrokePressed);}",
                ".f1vnc8sk:focus-within{outline-width:var(--strokeWidthThick);}",
                ".f3e99gv:focus-within{outline-style:solid;}",
                ".fhljsf7:focus-within{outline-color:transparent;}",
                [
                    ".f19ezbcq:focus-within{border:var(--strokeWidthThin) solid var(--colorNeutralStroke1Pressed);}",
                    { p: -2 },
                ],
                ".f1so894s:focus-within{border-bottom-color:var(--colorCompoundBrandStroke);}",
            ],
            h: [
                ".ftmjh5b:hover,.ftmjh5b:focus-within{border-top-color:var(--colorTransparentStrokeInteractive);}",
                ".f17blpuu:hover,.f17blpuu:focus-within{border-right-color:var(--colorTransparentStrokeInteractive);}",
                ".fsrcdbj:hover,.fsrcdbj:focus-within{border-left-color:var(--colorTransparentStrokeInteractive);}",
                ".f1tpwn32:hover,.f1tpwn32:focus-within{border-bottom-color:var(--colorTransparentStrokeInteractive);}",
                [
                    ".f9mts5e:hover{border:var(--strokeWidthThin) solid var(--colorNeutralStroke1Hover);}",
                    { p: -2 },
                ],
                ".f1l4zc64:hover{border-bottom-color:var(--colorNeutralStrokeAccessibleHover);}",
            ],
            a: [
                [
                    ".f1acnei2:active{border:var(--strokeWidthThin) solid var(--colorNeutralStroke1Pressed);}",
                    { p: -2 },
                ],
                ".f1z0osm6:active{border-bottom-color:var(--colorNeutralStrokeAccessiblePressed);}",
            ],
        }
    ),
    ey = ve(
        {
            base: {
                icvyot: "f1ern45e",
                vrafjx: ["f1n71otn", "f1deefiw"],
                oivjwe: "f1h8hb77",
                wvpqe5: ["f1deefiw", "f1n71otn"],
                jrapky: 0,
                Frg6f3: 0,
                t21cq0: 0,
                B6of3ja: 0,
                B74szlk: "f1s184ao",
                De3pzq: "f3rmtva",
                B7ck84d: "f1ewtqcl",
                sj55zd: "f19n0e5",
                Bh6795r: "fqerorx",
                Bahqtrf: "fk6fouc",
                Bqenvij: "f1l02sjl",
                yvdlaj: "fwyc1cq",
                B3o7kgh: "f13ta7ih",
                oeaueh: "f1s6fcnf",
            },
            disabled: { sj55zd: "f1s2aq7o", Bceei9c: "fdrzuqr", yvdlaj: "fahhnxm" },
            small: {
                sshi5w: "f1w5jphr",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f1pnffij",
                Bxyxcbc: "f192z54u",
                Bahqtrf: "fk6fouc",
                Be2twd7: "fy9rknc",
                Bhrd7zp: "figsok6",
                Bg96gwp: "fwrc4pm",
            },
            medium: {
                sshi5w: "fvmd9f",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f1ww82xo",
                Bxyxcbc: "f1if7ixc",
                Bahqtrf: "fk6fouc",
                Be2twd7: "fkhj508",
                Bhrd7zp: "figsok6",
                Bg96gwp: "f1i3iumi",
            },
            large: {
                sshi5w: "f1kfson",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f15hvtkj",
                Bxyxcbc: "f3kip1f",
                Bahqtrf: "fk6fouc",
                Be2twd7: "fod5ikn",
                Bhrd7zp: "figsok6",
                Bg96gwp: "faaz57k",
            },
        },
        {
            d: [
                ".f1ern45e{border-top-style:none;}",
                ".f1n71otn{border-right-style:none;}",
                ".f1deefiw{border-left-style:none;}",
                ".f1h8hb77{border-bottom-style:none;}",
                [".f1s184ao{margin:0;}", { p: -1 }],
                ".f3rmtva{background-color:transparent;}",
                ".f1ewtqcl{box-sizing:border-box;}",
                ".f19n0e5{color:var(--colorNeutralForeground1);}",
                ".fqerorx{flex-grow:1;}",
                ".fk6fouc{font-family:var(--fontFamilyBase);}",
                ".f1l02sjl{height:100%;}",
                ".fwyc1cq::-webkit-input-placeholder{color:var(--colorNeutralForeground4);}",
                ".fwyc1cq::-moz-placeholder{color:var(--colorNeutralForeground4);}",
                ".f13ta7ih::-webkit-input-placeholder{opacity:1;}",
                ".f13ta7ih::-moz-placeholder{opacity:1;}",
                ".f1s6fcnf{outline-style:none;}",
                ".f1s2aq7o{color:var(--colorNeutralForegroundDisabled);}",
                ".fdrzuqr{cursor:not-allowed;}",
                ".fahhnxm::-webkit-input-placeholder{color:var(--colorNeutralForegroundDisabled);}",
                ".fahhnxm::-moz-placeholder{color:var(--colorNeutralForegroundDisabled);}",
                ".f1w5jphr{min-height:40px;}",
                [
                    ".f1pnffij{padding:var(--spacingVerticalXS) calc(var(--spacingHorizontalSNudge) + var(--spacingHorizontalXXS));}",
                    { p: -1 },
                ],
                ".f192z54u{max-height:200px;}",
                ".fy9rknc{font-size:var(--fontSizeBase200);}",
                ".figsok6{font-weight:var(--fontWeightRegular);}",
                ".fwrc4pm{line-height:var(--lineHeightBase200);}",
                ".fvmd9f{min-height:52px;}",
                [
                    ".f1ww82xo{padding:var(--spacingVerticalSNudge) calc(var(--spacingHorizontalMNudge) + var(--spacingHorizontalXXS));}",
                    { p: -1 },
                ],
                ".f1if7ixc{max-height:260px;}",
                ".fkhj508{font-size:var(--fontSizeBase300);}",
                ".f1i3iumi{line-height:var(--lineHeightBase300);}",
                ".f1kfson{min-height:64px;}",
                [
                    ".f15hvtkj{padding:var(--spacingVerticalS) calc(var(--spacingHorizontalM) + var(--spacingHorizontalXXS));}",
                    { p: -1 },
                ],
                ".f3kip1f{max-height:320px;}",
                ".fod5ikn{font-size:var(--fontSizeBase400);}",
                ".faaz57k{line-height:var(--lineHeightBase400);}",
            ],
        }
    ),
    ty = ve(
        {
            none: { B3rzk8w: "f1o1s39h" },
            both: { B3rzk8w: "f1pxm0xe" },
            horizontal: { B3rzk8w: "fq6nmtn" },
            vertical: { B3rzk8w: "f1f5ktr4" },
        },
        {
            d: [
                ".f1o1s39h{resize:none;}",
                ".f1pxm0xe{resize:both;}",
                ".fq6nmtn{resize:horizontal;}",
                ".f1f5ktr4{resize:vertical;}",
            ],
        }
    ),
    ry = (i) => {
        "use no memo";
        const { size: n, appearance: o, resize: a } = i,
            c = i.textarea.disabled,
            f = `${i.textarea["aria-invalid"]}` == "true",
            h = o.startsWith("filled"),
            p = Z1();
        i.root.className = Ee(
            If.root,
            p.base,
            c && p.disabled,
            !c && h && p.filled,
            !c && p[o],
            !c && p.interactive,
            !c && o === "outline" && p.outlineInteractive,
            !c && f && p.invalid,
            i.root.className
        );
        const m = ey(),
            v = ty();
        return (
            (i.textarea.className = Ee(
                If.textarea,
                m.base,
                m[n],
                v[a],
                c && m.disabled,
                i.textarea.className
            )),
            i
        );
    },
    Od = M.forwardRef((i, n) => {
        const o = J1(i, n);
        return (ry(o), jt("useTextareaStyles_unstable")(o), Y1(o));
    });
Od.displayName = "Textarea";
const ny = v1(void 0),
    oy = (i, n) => {
        const { size: o = "medium" } = i,
            a = iy(i, n),
            c = sy();
        return { size: o, ...a, root: { ...a.root, ...c } };
    },
    iy = (i, n) => {
        const { vertical: o = !1 } = i,
            a = {
                vertical: o,
                components: { root: "div" },
                root: rt(
                    Xt("div", {
                        role: "toolbar",
                        ref: n,
                        ...(o && { "aria-orientation": "vertical" }),
                        ...i,
                    }),
                    { elementType: "div" }
                ),
            },
            [c, f] = ly({
                checkedValues: i.checkedValues,
                defaultCheckedValues: i.defaultCheckedValues,
                onCheckedValueChange: i.onCheckedValueChange,
            }),
            h = br((m, v, b, y) => {
                if (v && b) {
                    const S = [...((c == null ? void 0 : c[v]) || [])];
                    (y ? S.splice(S.indexOf(b), 1) : S.push(b),
                        f == null || f(m, { name: v, checkedItems: S }));
                }
            }),
            p = br((m, v, b, y) => {
                v && b && (f == null || f(m, { name: v, checkedItems: [b] }));
            });
        return { ...a, handleToggleButton: h, handleRadio: p, checkedValues: c ?? {} };
    },
    ly = (i) => {
        const [n, o] = Ys({
                state: i.checkedValues,
                defaultState: i.defaultCheckedValues,
                initialState: {},
            }),
            { onCheckedValueChange: a } = i,
            c = br((f, { name: h, checkedItems: p }) => {
                (a && a(f, { name: h, checkedItems: p }),
                    o((m) => (m ? { ...m, [h]: p } : { [h]: p })));
            });
        return [n, c];
    },
    sy = () => Xm({ circular: !0, axis: "both" }),
    ay = (i, n) =>
        ye(ny.Provider, { value: n.toolbar, children: ye(i.root, { children: i.root.children }) }),
    uy = { root: "fui-Toolbar" },
    cy = ve(
        {
            root: {
                mc9l5x: "f22iagw",
                Bt984gj: "f122n59",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f1yqiaad",
            },
            vertical: { Beiy3e4: "f1vx9l62", a9b677: "f1acs6jw" },
            small: { Byoj8tv: 0, uwmqm3: 0, z189sj: 0, z8tnut: 0, B0ocmuz: "fvz760z" },
            medium: { Byoj8tv: 0, uwmqm3: 0, z189sj: 0, z8tnut: 0, B0ocmuz: "f1yqiaad" },
            large: { Byoj8tv: 0, uwmqm3: 0, z189sj: 0, z8tnut: 0, B0ocmuz: "f1ms6bdn" },
        },
        {
            d: [
                ".f22iagw{display:flex;}",
                ".f122n59{align-items:center;}",
                [".f1yqiaad{padding:4px 8px;}", { p: -1 }],
                ".f1vx9l62{flex-direction:column;}",
                ".f1acs6jw{width:fit-content;}",
                [".fvz760z{padding:0px 4px;}", { p: -1 }],
                [".f1yqiaad{padding:4px 8px;}", { p: -1 }],
                [".f1ms6bdn{padding:4px 20px;}", { p: -1 }],
            ],
        }
    ),
    fy = (i) => {
        "use no memo";
        const n = cy(),
            { vertical: o, size: a } = i;
        return (
            (i.root.className = Ee(
                uy.root,
                n.root,
                o && n.vertical,
                a === "small" && !o && n.small,
                a === "medium" && !o && n.medium,
                a === "large" && !o && n.large,
                i.root.className
            )),
            i
        );
    };
function dy(i) {
    const { size: n, handleToggleButton: o, vertical: a, checkedValues: c, handleRadio: f } = i;
    return {
        toolbar: { size: n, vertical: a, handleToggleButton: o, handleRadio: f, checkedValues: c },
    };
}
const Ld = M.forwardRef((i, n) => {
    const o = oy(i, n),
        a = dy(o);
    return (fy(o), jt("useToolbarStyles_unstable")(o), ay(o, a));
});
Ld.displayName = "Toolbar";
const hy = ve(
        {
            vertical: { Beiy3e4: "f1vx9l62" },
            verticalIcon: {
                Be2twd7: "f1rt2boy",
                jrapky: 0,
                Frg6f3: 0,
                t21cq0: 0,
                B6of3ja: 0,
                B74szlk: "f1s184ao",
            },
        },
        {
            d: [
                ".f1vx9l62{flex-direction:column;}",
                ".f1rt2boy{font-size:24px;}",
                [".f1s184ao{margin:0;}", { p: -1 }],
            ],
        }
    ),
    py = (i) => {
        "use no memo";
        const n = hy();
        ((i.root.className = Ee(i.vertical && n.vertical, i.root.className)),
            i.icon && (i.icon.className = Ee(i.vertical && n.verticalIcon, i.icon.className)),
            j1(i));
    },
    vy = (i, n) => ({ appearance: "subtle", size: "medium", shape: "rounded", ...my(i, n) }),
    my = (i, n) => {
        const { vertical: o = !1, ...a } = i,
            c = B1({ appearance: "subtle", ...a, size: "medium" }, n);
        return { vertical: o, ...c };
    },
    ki = M.forwardRef((i, n) => {
        const o = vy(i, n);
        return (py(o), jt("useToolbarButtonStyles_unstable")(o), k1(o));
    });
ki.displayName = "ToolbarButton";
const Md = M.createContext(void 0),
    gy = { size: "medium", noNativeElements: !1, sortable: !1 },
    yy = Md.Provider,
    io = () => {
        var i;
        return (i = M.useContext(Md)) !== null && i !== void 0 ? i : gy;
    },
    wy = (i, n) => {
        const { noNativeElements: o, size: a } = io();
        var c;
        const f = ((c = i.as) !== null && c !== void 0 ? c : o) ? "div" : "td";
        return {
            components: { root: f },
            root: rt(Xt(f, { ref: n, role: f === "div" ? "cell" : void 0, ...i }), {
                elementType: f,
            }),
            noNativeElements: o,
            size: a,
        };
    },
    by = (i) => ye(i.root, {}),
    _y = "fui-TableCell",
    ky = { root: _y },
    xy = ve(
        {
            root: { mc9l5x: "f15pt5es", ha4doy: "fmrv4ls" },
            medium: { Bqenvij: "f1ft4266" },
            small: { Bqenvij: "fbsu25e" },
            "extra-small": { Bqenvij: "frvgh55" },
        },
        {
            d: [
                ".f15pt5es{display:table-cell;}",
                ".fmrv4ls{vertical-align:middle;}",
                ".f1ft4266{height:44px;}",
                ".fbsu25e{height:34px;}",
                ".frvgh55{height:24px;}",
            ],
        }
    ),
    Sy = ve(
        {
            root: {
                mc9l5x: "f22iagw",
                Bf4jedk: "f10tiqix",
                Bt984gj: "f122n59",
                xawz: 0,
                Bh6795r: 0,
                Bnnss6s: 0,
                fkmc3a: "f1izfyrr",
            },
            medium: { sshi5w: "f5pgtk9" },
            small: { sshi5w: "fcep9tg" },
            "extra-small": { sshi5w: "f1pha7fy" },
        },
        {
            d: [
                ".f22iagw{display:flex;}",
                ".f10tiqix{min-width:0px;}",
                ".f122n59{align-items:center;}",
                [".f1izfyrr{flex:1 1 0px;}", { p: -1 }],
                ".f5pgtk9{min-height:44px;}",
                ".fcep9tg{min-height:34px;}",
                ".f1pha7fy{min-height:24px;}",
            ],
        }
    ),
    By = ve(
        {
            root: {
                qhf8xq: "f10pi13n",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f3gpkru",
                Bfpq7zp: 0,
                g9k6zt: 0,
                Bn4voq9: 0,
                giviqs: "f1dxfoyt",
                Bw81rd7: 0,
                kdpuga: 0,
                dm238s: 0,
                B6xbmo0: 0,
                B3whbx2: "f2krc9w",
            },
        },
        {
            d: [
                ".f10pi13n{position:relative;}",
                [".f3gpkru{padding:0px var(--spacingHorizontalS);}", { p: -1 }],
                [
                    ".f1dxfoyt[data-fui-focus-visible]{outline:2px solid var(--colorStrokeFocus2);}",
                    { p: -1 },
                ],
                [
                    ".f2krc9w[data-fui-focus-visible]{border-radius:var(--borderRadiusMedium);}",
                    { p: -1 },
                ],
            ],
        }
    ),
    Ey = (i) => {
        "use no memo";
        const n = By(),
            o = { table: xy(), flex: Sy() };
        return (
            (i.root.className = Ee(
                ky.root,
                n.root,
                i.noNativeElements ? o.flex.root : o.table.root,
                i.noNativeElements ? o.flex[i.size] : o.table[i.size],
                i.root.className
            )),
            i
        );
    },
    Ad = M.forwardRef((i, n) => {
        const o = wy(i, n);
        return (Ey(o), jt("useTableCellStyles_unstable")(o), by(o));
    });
Ad.displayName = "TableCell";
const qd = M.createContext(void 0),
    Ty = "",
    Cy = qd.Provider,
    zy = () => M.useContext(qd) === Ty,
    Ny = (i, n) => {
        const { noNativeElements: o, size: a } = io();
        var c;
        const f = ((c = i.as) !== null && c !== void 0 ? c : o) ? "div" : "tr",
            h = Bd(),
            p = Ed(),
            m = zy();
        var v;
        return {
            components: { root: f },
            root: rt(Xt(f, { ref: Js(n, h, p), role: f === "div" ? "row" : void 0, ...i }), {
                elementType: f,
            }),
            size: a,
            noNativeElements: o,
            appearance: (v = i.appearance) !== null && v !== void 0 ? v : "none",
            isHeaderRow: m,
        };
    },
    Py = (i) => ye(i.root, {}),
    Fy = "fui-TableRow",
    Ry = { root: Fy },
    jy = ve({ root: { mc9l5x: "f1u0rzck" } }, { d: [".f1u0rzck{display:table-row;}"] }),
    Iy = ve(
        { root: { mc9l5x: "f22iagw", Bt984gj: "f122n59" } },
        { d: [".f22iagw{display:flex;}", ".f122n59{align-items:center;}"] }
    ),
    Dy = ve(
        {
            root: {
                sj55zd: "f19n0e5",
                B7ck84d: "f1ewtqcl",
                Bconypa: "f1jazu75",
                B6guboy: "f1xeqee6",
                Bfpq7zp: 0,
                g9k6zt: 0,
                Bn4voq9: 0,
                giviqs: "f1dxfoyt",
                Bw81rd7: 0,
                kdpuga: 0,
                dm238s: 0,
                B6xbmo0: 0,
                B3whbx2: "f2krc9w",
            },
            rootInteractive: {
                B6guboy: "f1xeqee6",
                ecr2s2: "f1wfn5kd",
                lj723h: "f1g4hkjv",
                B43xm9u: "f15ngxrw",
                i921ia: "fjbbrdp",
                Jwef8y: "f1t94bn6",
                Bi91k9c: "feu1g3u",
                Bpt6rm4: "f1uorfem",
                ff6mpl: "fw60kww",
                Bahaeuw: "f1v3eptx",
                F230oe: "f8gmj8i",
                Bdw8ktp: ["f1ap8nzx", "fjag8bx"],
                Bj1xduy: "f1igan7k",
                Bhh2cfd: ["fjag8bx", "f1ap8nzx"],
            },
            medium: { B9xav0g: 0, oivjwe: 0, Bn0qgzm: 0, Bgfg5da: "f1facbz3" },
            small: { B9xav0g: 0, oivjwe: 0, Bn0qgzm: 0, Bgfg5da: "f1facbz3" },
            "extra-small": { Be2twd7: "fy9rknc" },
            brand: {
                De3pzq: "f16xkysk",
                g2u3we: "f1bh3yvw",
                h3c5rm: ["fmi79ni", "f11fozsx"],
                B9xav0g: "fnzw4c6",
                zhjwy3: ["f11fozsx", "fmi79ni"],
                ecr2s2: "f7tkmfy",
                lj723h: "f1r2dosr",
                wmvzou: 0,
                sc4o1m: 0,
                wymq9i: 0,
                u9orzk: 0,
                puiv5t: 0,
                Bosien3: 0,
                b2z72d: 0,
                Beulxaw: 0,
                B57pkaw: 0,
                Jcjdmf: 0,
                B8qgbzl: 0,
                Bbmb0sr: 0,
                B14q8qp: 0,
                Bcq6wej: 0,
                Byz1pjr: 0,
                kr9cjb: 0,
                Ff9ifp: "f1msmgpi",
                Bmclvqj: 0,
                psczho: 0,
                B0tx59b: 0,
                sk7i8k: 0,
                zlwzm7: "fbo0xvd",
                Bkp2nk: "fjuvmhu",
                gy0h4g: "f1kvufhq",
            },
            neutral: {
                wmvzou: 0,
                sc4o1m: 0,
                wymq9i: 0,
                u9orzk: 0,
                puiv5t: 0,
                Bosien3: 0,
                b2z72d: 0,
                Beulxaw: 0,
                B57pkaw: 0,
                Jcjdmf: 0,
                B8qgbzl: 0,
                Bbmb0sr: 0,
                B14q8qp: 0,
                Bcq6wej: 0,
                Byz1pjr: 0,
                kr9cjb: 0,
                Ff9ifp: "f1msmgpi",
                Bmclvqj: 0,
                psczho: 0,
                B0tx59b: 0,
                sk7i8k: 0,
                zlwzm7: "fbo0xvd",
                Bkp2nk: "fjuvmhu",
                gy0h4g: "f1kvufhq",
                De3pzq: "fq5gl1p",
                sj55zd: "f1cgsbmv",
                ecr2s2: "fa9o754",
                g2u3we: "frmsihh",
                h3c5rm: ["frttxa5", "f11o2r7f"],
                B9xav0g: "fem5et0",
                zhjwy3: ["f11o2r7f", "frttxa5"],
            },
            none: {},
        },
        {
            d: [
                ".f19n0e5{color:var(--colorNeutralForeground1);}",
                ".f1ewtqcl{box-sizing:border-box;}",
                ".f1jazu75[data-fui-focus-within]:focus-within .fui-TableSelectionCell{opacity:1;}",
                ".f1xeqee6[data-fui-focus-within]:focus-within .fui-TableCellActions{opacity:1;}",
                [
                    ".f1dxfoyt[data-fui-focus-visible]{outline:2px solid var(--colorStrokeFocus2);}",
                    { p: -1 },
                ],
                [
                    ".f2krc9w[data-fui-focus-visible]{border-radius:var(--borderRadiusMedium);}",
                    { p: -1 },
                ],
                [
                    ".f1facbz3{border-bottom:var(--strokeWidthThin) solid var(--colorNeutralStroke2);}",
                    { p: -1 },
                ],
                [
                    ".f1facbz3{border-bottom:var(--strokeWidthThin) solid var(--colorNeutralStroke2);}",
                    { p: -1 },
                ],
                ".fy9rknc{font-size:var(--fontSizeBase200);}",
                ".f16xkysk{background-color:var(--colorBrandBackground2);}",
                ".f1bh3yvw{border-top-color:var(--colorTransparentStrokeInteractive);}",
                ".fmi79ni{border-right-color:var(--colorTransparentStrokeInteractive);}",
                ".f11fozsx{border-left-color:var(--colorTransparentStrokeInteractive);}",
                ".fnzw4c6{border-bottom-color:var(--colorTransparentStrokeInteractive);}",
                ".fq5gl1p{background-color:var(--colorSubtleBackgroundSelected);}",
                ".f1cgsbmv{color:var(--colorNeutralForeground1Hover);}",
                ".frmsihh{border-top-color:var(--colorNeutralStrokeOnBrand);}",
                ".frttxa5{border-right-color:var(--colorNeutralStrokeOnBrand);}",
                ".f11o2r7f{border-left-color:var(--colorNeutralStrokeOnBrand);}",
                ".fem5et0{border-bottom-color:var(--colorNeutralStrokeOnBrand);}",
            ],
            a: [
                ".f1wfn5kd:active{background-color:var(--colorSubtleBackgroundPressed);}",
                ".f1g4hkjv:active{color:var(--colorNeutralForeground1Pressed);}",
                ".f15ngxrw:active .fui-TableCellActions{opacity:1;}",
                ".fjbbrdp:active .fui-TableSelectionCell{opacity:1;}",
                ".f7tkmfy:active{background-color:var(--colorBrandBackground2);}",
                ".f1r2dosr:active{color:var(--colorNeutralForeground1);}",
                ".fa9o754:active{background-color:var(--colorSubtleBackgroundSelected);}",
            ],
            h: [
                ".f1t94bn6:hover{background-color:var(--colorSubtleBackgroundHover);}",
                ".feu1g3u:hover{color:var(--colorNeutralForeground1Hover);}",
                ".f1uorfem:hover .fui-TableCellActions{opacity:1;}",
                ".fw60kww:hover .fui-TableSelectionCell{opacity:1;}",
            ],
            m: [
                [
                    "@media (forced-colors: active){.f1v3eptx:hover{color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f8gmj8i:hover{border-top-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1ap8nzx:hover{border-right-color:Highlight;}.fjag8bx:hover{border-left-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1igan7k:hover{border-bottom-color:Highlight;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1msmgpi{border:2px solid transparent;}}",
                    { p: -2, m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fbo0xvd{border-radius:var(--borderRadiusMedium);}}",
                    { p: -1, m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.fjuvmhu{box-sizing:border-box;}}",
                    { m: "(forced-colors: active)" },
                ],
                [
                    "@media (forced-colors: active){.f1kvufhq:focus-visible{outline-offset:-4px;}}",
                    { m: "(forced-colors: active)" },
                ],
            ],
        }
    ),
    Oy = (i) => {
        "use no memo";
        const n = Dy(),
            o = { table: jy(), flex: Iy() };
        return (
            (i.root.className = Ee(
                Ry.root,
                n.root,
                !i.isHeaderRow && n.rootInteractive,
                n[i.size],
                i.noNativeElements ? o.flex.root : o.table.root,
                n[i.appearance],
                i.root.className
            )),
            i
        );
    },
    Ks = M.forwardRef((i, n) => {
        const o = Ny(i, n);
        return (Oy(o), jt("useTableRowStyles_unstable")(o), Py(o));
    });
Ks.displayName = "TableRow";
const Ly = (i, n) => {
        const { noNativeElements: o } = io();
        var a;
        const c = ((a = i.as) !== null && a !== void 0 ? a : o) ? "div" : "tbody";
        return {
            components: { root: c },
            root: rt(Xt(c, { ref: n, role: c === "div" ? "rowgroup" : void 0, ...i }), {
                elementType: c,
            }),
            noNativeElements: o,
        };
    },
    My = (i) => ye(i.root, {}),
    Ay = ve({ root: { mc9l5x: "f1tp1avn" } }, { d: [".f1tp1avn{display:table-row-group;}"] }),
    qy = ve({ root: { mc9l5x: "ftgm304" } }, { d: [".ftgm304{display:block;}"] }),
    Hy = "fui-TableBody",
    Wy = (i) => {
        "use no memo";
        const n = { table: Ay(), flex: qy() };
        return (
            (i.root.className = Ee(
                Hy,
                i.noNativeElements ? n.flex.root : n.table.root,
                i.root.className
            )),
            i
        );
    },
    Hd = M.forwardRef((i, n) => {
        const o = Ly(i, n);
        return (Wy(o), jt("useTableBodyStyles_unstable")(o), My(o));
    });
Hd.displayName = "TableBody";
const Uy = (i, n) => {
        var o;
        const a = ((o = i.as) !== null && o !== void 0 ? o : i.noNativeElements) ? "div" : "table";
        var c, f, h;
        return {
            components: { root: a },
            root: rt(Xt(a, { ref: n, role: a === "div" ? "table" : void 0, ...i }), {
                elementType: a,
            }),
            size: (c = i.size) !== null && c !== void 0 ? c : "medium",
            noNativeElements: (f = i.noNativeElements) !== null && f !== void 0 ? f : !1,
            sortable: (h = i.sortable) !== null && h !== void 0 ? h : !1,
        };
    },
    Vy = (i, n) => ye(yy, { value: n.table, children: ye(i.root, {}) }),
    Ky = "fui-Table",
    $y = ve(
        { root: { mc9l5x: "f1w4nmp0", ha4doy: "fmrv4ls", a9b677: "fly5x3f", B73mfa3: "f14m3nip" } },
        {
            d: [
                ".f1w4nmp0{display:table;}",
                ".fmrv4ls{vertical-align:middle;}",
                ".fly5x3f{width:100%;}",
                ".f14m3nip{table-layout:fixed;}",
            ],
        }
    ),
    Qy = ve({ root: { mc9l5x: "ftgm304" } }, { d: [".ftgm304{display:block;}"] }),
    Gy = ve(
        { root: { po53p8: "fgkb47j", De3pzq: "fhovq9v" } },
        {
            d: [
                ".fgkb47j{border-collapse:collapse;}",
                ".fhovq9v{background-color:var(--colorSubtleBackground);}",
            ],
        }
    ),
    Xy = (i) => {
        "use no memo";
        const n = Gy(),
            o = { table: $y(), flex: Qy() };
        return (
            (i.root.className = Ee(
                Ky,
                n.root,
                i.noNativeElements ? o.flex.root : o.table.root,
                i.root.className
            )),
            i
        );
    };
function Yy(i) {
    const { size: n, noNativeElements: o, sortable: a } = i;
    return { table: M.useMemo(() => ({ noNativeElements: o, size: n, sortable: a }), [o, n, a]) };
}
const Wd = M.forwardRef((i, n) => {
    const o = Uy(i, n);
    return (Xy(o), jt("useTableStyles_unstable")(o), Vy(o, Yy(o)));
});
Wd.displayName = "Table";
const Jy = (i, n) => {
        const { noNativeElements: o } = io();
        var a;
        const c = ((a = i.as) !== null && a !== void 0 ? a : o) ? "div" : "thead";
        return {
            components: { root: c },
            root: rt(Xt(c, { ref: n, role: c === "div" ? "rowgroup" : void 0, ...i }), {
                elementType: c,
            }),
            noNativeElements: o,
        };
    },
    Zy = (i) => ye(Cy, { value: "", children: ye(i.root, {}) }),
    ew = "fui-TableHeader",
    tw = ve({ root: { mc9l5x: "ftgm304" } }, { d: [".ftgm304{display:block;}"] }),
    rw = ve({ root: { mc9l5x: "f1tp1avn" } }, { d: [".f1tp1avn{display:table-row-group;}"] }),
    nw = (i) => {
        "use no memo";
        const n = { table: rw(), flex: tw() };
        return (
            (i.root.className = Ee(
                ew,
                i.noNativeElements ? n.flex.root : n.table.root,
                i.root.className
            )),
            i
        );
    },
    Ud = M.forwardRef((i, n) => {
        const o = Jy(i, n);
        return (nw(o), jt("useTableHeaderStyles_unstable")(o), Zy(o));
    });
Ud.displayName = "TableHeader";
const ow = {
        ascending: M.createElement(_1, { fontSize: 12 }),
        descending: M.createElement(b1, { fontSize: 12 }),
    },
    iw = (i, n) => {
        const { noNativeElements: o, sortable: a } = io(),
            { sortable: c = a } = i;
        var f;
        const h = ((f = i.as) !== null && f !== void 0 ? f : o) ? "div" : "th",
            p = rt(i.button, { elementType: "div", defaultProps: { as: "div" } }),
            m = Pd(p.as, p);
        var v;
        return {
            components: { root: h, button: "div", sortIcon: "span", aside: "span" },
            root: rt(
                Xt(h, {
                    ref: Js(n, Ed()),
                    role: h === "div" ? "columnheader" : void 0,
                    "aria-sort": c
                        ? (v = i.sortDirection) !== null && v !== void 0
                            ? v
                            : "none"
                        : void 0,
                    ...i,
                }),
                { elementType: h }
            ),
            aside: eo(i.aside, { elementType: "span" }),
            sortIcon: eo(i.sortIcon, {
                renderByDefault: !!i.sortDirection,
                defaultProps: { children: i.sortDirection ? ow[i.sortDirection] : void 0 },
                elementType: "span",
            }),
            button: c ? m : p,
            sortable: c,
            noNativeElements: o,
        };
    },
    lw = (i) =>
        to(i.root, {
            children: [
                to(i.button, { children: [i.root.children, i.sortIcon && ye(i.sortIcon, {})] }),
                i.aside && ye(i.aside, {}),
            ],
        }),
    bi = {
        root: "fui-TableHeaderCell",
        button: "fui-TableHeaderCell__button",
        sortIcon: "fui-TableHeaderCell__sortIcon",
        aside: "fui-TableHeaderCell__aside",
    },
    sw = ve(
        { root: { mc9l5x: "f15pt5es", ha4doy: "fmrv4ls" } },
        { d: [".f15pt5es{display:table-cell;}", ".fmrv4ls{vertical-align:middle;}"] }
    ),
    aw = ve(
        {
            root: {
                mc9l5x: "f22iagw",
                xawz: 0,
                Bh6795r: 0,
                Bnnss6s: 0,
                fkmc3a: "f1izfyrr",
                Bf4jedk: "f10tiqix",
            },
        },
        {
            d: [
                ".f22iagw{display:flex;}",
                [".f1izfyrr{flex:1 1 0px;}", { p: -1 }],
                ".f10tiqix{min-width:0px;}",
            ],
        }
    ),
    uw = ve(
        {
            root: {
                Bhrd7zp: "figsok6",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f3gpkru",
                robkg1: 0,
                Bmvh20x: 0,
                B3nxjsc: 0,
                Bmkhcsx: "f14ym4q2",
                B8osjzx: 0,
                pehzd3: 0,
                Blsv9te: 0,
                u7xebq: 0,
                Bsvwmf7: "f1euou18",
                qhf8xq: "f10pi13n",
            },
            rootInteractive: {
                Bi91k9c: "feu1g3u",
                Jwef8y: "f1t94bn6",
                lj723h: "f1g4hkjv",
                ecr2s2: "f1wfn5kd",
            },
            resetButton: {
                B3rzk8w: "fq6nmtn",
                B7ck84d: "f1e4lqlz",
                De3pzq: "f1u2r49w",
                sj55zd: "f1ym3bx4",
                Bahqtrf: "f1mo0ibp",
                Be2twd7: "fjoy568",
                Bg96gwp: "fytdu2e",
                B68tc82: 0,
                Bmxbyg5: 0,
                Bpg54ce: "f1gl81tg",
                Byoj8tv: 0,
                uwmqm3: 0,
                z189sj: 0,
                z8tnut: 0,
                B0ocmuz: "f1mk8lai",
                Bgfg5da: 0,
                B9xav0g: 0,
                oivjwe: 0,
                Bn0qgzm: 0,
                B4g9neb: 0,
                zhjwy3: 0,
                wvpqe5: 0,
                ibv6hh: 0,
                u1mtju: 0,
                h3c5rm: 0,
                vrafjx: 0,
                Bekrc4i: 0,
                i8vvqc: 0,
                g2u3we: 0,
                icvyot: 0,
                B4j52fo: 0,
                irswps: "f3bhgqh",
                fsow6f: "fgusgyc",
            },
            button: {
                qhf8xq: "f10pi13n",
                a9b677: "fly5x3f",
                mc9l5x: "f22iagw",
                Bh6795r: 0,
                Bqenvij: "f1l02sjl",
                Bt984gj: "f122n59",
                i8kkvl: 0,
                Belr9w4: 0,
                rmohyg: "fkln5zr",
                sshi5w: "f1nxs5xn",
                xawz: 0,
                Bnnss6s: 0,
                fkmc3a: "f1izfyrr",
                oeaueh: "f1s6fcnf",
            },
            sortable: { Bceei9c: "f1k6fduh" },
            sortIcon: { mc9l5x: "f22iagw", Bt984gj: "f122n59", z8tnut: "fclwglc" },
            resizeHandle: {},
        },
        {
            d: [
                ".figsok6{font-weight:var(--fontWeightRegular);}",
                [".f3gpkru{padding:0px var(--spacingHorizontalS);}", { p: -1 }],
                [
                    ".f14ym4q2[data-fui-focus-within]:focus-within{outline:2px solid var(--colorStrokeFocus2);}",
                    { p: -1 },
                ],
                [
                    ".f1euou18[data-fui-focus-within]:focus-within{border-radius:var(--borderRadiusMedium);}",
                    { p: -1 },
                ],
                ".f10pi13n{position:relative;}",
                ".fq6nmtn{resize:horizontal;}",
                ".f1e4lqlz{box-sizing:content-box;}",
                ".f1u2r49w{background-color:inherit;}",
                ".f1ym3bx4{color:inherit;}",
                ".f1mo0ibp{font-family:inherit;}",
                ".fjoy568{font-size:inherit;}",
                ".fytdu2e{line-height:normal;}",
                [".f1gl81tg{overflow:visible;}", { p: -1 }],
                [".f1mk8lai{padding:0;}", { p: -1 }],
                [".f3bhgqh{border:none;}", { p: -2 }],
                ".fgusgyc{text-align:unset;}",
                ".fly5x3f{width:100%;}",
                ".f22iagw{display:flex;}",
                ".fqerorx{flex-grow:1;}",
                ".f1l02sjl{height:100%;}",
                ".f122n59{align-items:center;}",
                [".fkln5zr{gap:var(--spacingHorizontalXS);}", { p: -1 }],
                ".f1nxs5xn{min-height:32px;}",
                [".f1izfyrr{flex:1 1 0px;}", { p: -1 }],
                ".f1s6fcnf{outline-style:none;}",
                ".f1k6fduh{cursor:pointer;}",
                ".fclwglc{padding-top:var(--spacingVerticalXXS);}",
            ],
            h: [
                ".feu1g3u:hover{color:var(--colorNeutralForeground1Hover);}",
                ".f1t94bn6:hover{background-color:var(--colorSubtleBackgroundHover);}",
            ],
            a: [
                ".f1g4hkjv:active{color:var(--colorNeutralForeground1Pressed);}",
                ".f1wfn5kd:active{background-color:var(--colorSubtleBackgroundPressed);}",
            ],
        }
    ),
    cw = (i) => {
        "use no memo";
        const n = uw(),
            o = { table: sw(), flex: aw() };
        return (
            (i.root.className = Ee(
                bi.root,
                n.root,
                i.sortable && n.rootInteractive,
                i.noNativeElements ? o.flex.root : o.table.root,
                i.root.className
            )),
            (i.button.className = Ee(
                bi.button,
                n.resetButton,
                n.button,
                i.sortable && n.sortable,
                i.button.className
            )),
            i.sortIcon &&
                (i.sortIcon.className = Ee(bi.sortIcon, n.sortIcon, i.sortIcon.className)),
            i.aside && (i.aside.className = Ee(bi.aside, n.resizeHandle, i.aside.className)),
            i
        );
    },
    Vd = M.forwardRef((i, n) => {
        const o = iw(i, n);
        return (cw(o), jt("useTableHeaderCellStyles_unstable")(o), lw(o));
    });
Vd.displayName = "TableHeaderCell";
const oa = [
        ["OPTIONAL MATCH", ""],
        ["LOAD JSON FROM", ""],
        ["LOAD CSV FROM", ""],
        ["LOAD TEXT FROM", ""],
        ["ORDER BY", ""],
        ["STARTS WITH", "\x07"],
        ["ENDS WITH", "\b"],
        ["RETURN", ""],
        ["MATCH", ""],
        ["WHERE", ""],
        ["CREATE", ""],
        ["UNWIND", ""],
        ["COLLECT", ""],
        ["DELETE", ""],
        ["MERGE", ""],
        ["VIRTUAL", ""],
        ["HEADERS", ""],
        ["DISTINCT", ""],
        ["FOREACH", ""],
        ["CONTAINS", ""],
        ["LIMIT", "\x1B"],
        ["YIELD", ""],
        ["UNION", ""],
        ["WITH", ""],
        ["CALL", ""],
    ],
    fw = new RegExp(oa.map(([i]) => `\\b${i.replace(/ /g, "\\s+")}\\b`).join("|"), "gi"),
    Kd = new Map(oa.map(([i, n]) => [n, i])),
    dw = new RegExp([...Kd.keys()].map((i) => i.replace(/[\\]/g, "\\$&")).join("|"), "g");
class Df {
    static preprocess(n) {
        return n.replace(fw, (o) => {
            const a = o.replace(/\s+/g, " ").toUpperCase();
            for (const [c, f] of oa) if (a === c) return f;
            return o;
        });
    }
    static postprocess(n) {
        return n.replace(dw, (o) => Kd.get(o) ?? o);
    }
    static async deflateBytes(n) {
        const o = new Blob([n]).stream().pipeThrough(new CompressionStream("deflate-raw")),
            a = await (await new Response(o).blob()).arrayBuffer();
        return new Uint8Array(a);
    }
    static async inflateBytes(n) {
        const o = new Blob([n]).stream().pipeThrough(new DecompressionStream("deflate-raw")),
            a = await (await new Response(o).blob()).arrayBuffer();
        return new Uint8Array(a);
    }
    static toBase64Url(n) {
        let o = "";
        for (let a = 0; a < n.length; a++) o += String.fromCharCode(n[a]);
        return btoa(o).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    static fromBase64Url(n) {
        let o = n.replace(/-/g, "+").replace(/_/g, "/");
        for (; o.length % 4; ) o += "=";
        const a = atob(o),
            c = new Uint8Array(a.length);
        for (let f = 0; f < a.length; f++) c[f] = a.charCodeAt(f);
        return c;
    }
    static async compress(n) {
        const o = this.preprocess(n),
            a = await this.deflateBytes(new TextEncoder().encode(o));
        return this.toBase64Url(a);
    }
    static async decompress(n) {
        const o = this.fromBase64Url(n),
            a = await this.inflateBytes(o);
        return this.postprocess(new TextDecoder().decode(a));
    }
}
function hw({ results: i }) {
    if (!i || i.length === 0) return null;
    const n = Object.keys(i[0]);
    return Fe.jsxs(Wd, {
        children: [
            Fe.jsx(Ud, {
                children: Fe.jsx(Ks, { children: n.map((o) => Fe.jsx(Vd, { children: o }, o)) }),
            }),
            Fe.jsx(Hd, {
                children: i.map((o, a) =>
                    Fe.jsx(
                        Ks,
                        {
                            children: n.map((c) =>
                                Fe.jsx(
                                    Ad,
                                    {
                                        children:
                                            typeof o[c] == "object"
                                                ? JSON.stringify(o[c])
                                                : String(o[c] ?? ""),
                                    },
                                    c
                                )
                            ),
                        },
                        a
                    )
                ),
            }),
        ],
    });
}
function pw(i) {
    return i
        .split("_")
        .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
        .join(" ");
}
class vw extends Wf.Component {
    constructor() {
        (super(...arguments),
            (this.state = { input: "", results: [], metadata: null, error: null, shareLink: "" }),
            (this.run = async () => {
                this.setState({ error: null, results: [], metadata: null });
                try {
                    const n = new FlowQuery(this.state.input);
                    (await n.run(), this.setState({ results: n.results, metadata: n.metadata }));
                } catch (n) {
                    this.setState({ error: n instanceof Error ? n.message : String(n) });
                }
            }),
            (this.share = async () => {
                if (!this.state.input.trim()) return;
                const n = await Df.compress(this.state.input),
                    o = window.location.origin + window.location.pathname + "?" + n;
                (this.setState({ shareLink: o }), navigator.clipboard.writeText(o).catch(() => {}));
            }),
            (this.clear = () => {
                (window.history.replaceState(null, "", window.location.pathname),
                    this.setState({
                        input: "",
                        results: [],
                        metadata: null,
                        error: null,
                        shareLink: "",
                    }));
            }),
            (this.handleKeyDown = (n) => {
                n.key === "Enter" && n.shiftKey && (n.preventDefault(), this.run());
            }));
    }
    componentDidMount() {
        const n = window.location.search;
        if (n && n.length > 1) {
            const o = n.substring(1);
            Df.decompress(o)
                .then((a) => {
                    this.setState({ input: a });
                    const c = new FlowQuery(a);
                    c.run()
                        .then(() => {
                            this.setState({ results: c.results, metadata: c.metadata });
                        })
                        .catch((f) => {
                            this.setState({ error: f instanceof Error ? f.message : String(f) });
                        });
                })
                .catch((a) => {
                    console.error("Failed to decompress URL query:", a);
                });
        }
    }
    render() {
        const { input: n, results: o, metadata: a, error: c, shareLink: f } = this.state;
        return Fe.jsxs(Nd, {
            theme: Zg,
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                padding: 16,
                boxSizing: "border-box",
            },
            children: [
                Fe.jsx(Od, {
                    value: n,
                    onChange: (h, p) => this.setState({ input: p.value }),
                    onKeyDown: this.handleKeyDown,
                    placeholder:
                        "Type your FlowQuery statement here and press Shift+Enter to run it.",
                    resize: "vertical",
                    textarea: { style: { fontFamily: "monospace", minHeight: 200 } },
                    style: { width: "100%" },
                }),
                Fe.jsxs(Ld, {
                    style: { padding: "8px 0", gap: 4 },
                    children: [
                        Fe.jsx(ki, {
                            appearance: "primary",
                            onClick: this.run,
                            children: "▶ Run (Shift+Enter)",
                        }),
                        Fe.jsx(ki, { onClick: this.share, children: "Share" }),
                        Fe.jsx(ki, { onClick: this.clear, children: "Clear" }),
                        f &&
                            Fe.jsx(Dd, {
                                readOnly: !0,
                                value: f,
                                onClick: (h) => h.target.select(),
                                style: { flexGrow: 1 },
                            }),
                    ],
                }),
                a &&
                    Fe.jsx("div", {
                        style: { display: "flex", gap: 12, padding: "4px 0", flexWrap: "wrap" },
                        children: Object.entries(a)
                            .filter(([, h]) => h !== 0)
                            .map(([h, p]) =>
                                Fe.jsxs(
                                    Vs,
                                    {
                                        size: 200,
                                        font: "monospace",
                                        children: [pw(h), ": ", String(p)],
                                    },
                                    h
                                )
                            ),
                    }),
                c &&
                    Fe.jsx(Vs, {
                        style: { color: "red", fontFamily: "monospace", padding: "4px 0" },
                        children: c,
                    }),
                Fe.jsx("div", {
                    style: { flexGrow: 1, overflowY: "auto", marginTop: 8 },
                    children: Fe.jsx(hw, { results: o }),
                }),
            ],
        });
    }
}
Zp.createRoot(document.getElementById("root")).render(Fe.jsx(vw, {}));
