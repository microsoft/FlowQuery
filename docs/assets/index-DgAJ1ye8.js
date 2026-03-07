function If(o, n) {
    for (var i = 0; i < n.length; i++) {
        const a = n[i];
        if (typeof a != "string" && !Array.isArray(a)) {
            for (const c in a)
                if (c !== "default" && !(c in o)) {
                    const f = Object.getOwnPropertyDescriptor(a, c);
                    f &&
                        Object.defineProperty(
                            o,
                            c,
                            f.get ? f : { enumerable: !0, get: () => a[c] }
                        );
                }
        }
    }
    return Object.freeze(Object.defineProperty(o, Symbol.toStringTag, { value: "Module" }));
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
    function i(c) {
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
        const f = i(c);
        fetch(c.href, f);
    }
})();
function Df(o) {
    return o && o.__esModule && Object.prototype.hasOwnProperty.call(o, "default") ? o.default : o;
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
 */ var Jc;
function Ap() {
    if (Jc) return ue;
    Jc = 1;
    var o = Symbol.for("react.element"),
        n = Symbol.for("react.portal"),
        i = Symbol.for("react.fragment"),
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
        T = {};
    function N(x, F, ae) {
        ((this.props = x), (this.context = F), (this.refs = T), (this.updater = ae || S));
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
        ((this.props = x), (this.context = F), (this.refs = T), (this.updater = ae || S));
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
        return { $$typeof: o, type: x, key: he, ref: we, props: ce, _owner: G.current };
    }
    function ie(x, F) {
        return { $$typeof: o, type: x.type, key: F, ref: x.ref, props: x.props, _owner: x._owner };
    }
    function fe(x) {
        return typeof x == "object" && x !== null && x.$$typeof === o;
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
    var Ee = /\/+/g;
    function Me(x, F) {
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
                        case o:
                        case n:
                            we = !0;
                    }
            }
        if (we)
            return (
                (we = x),
                (ce = ce(we)),
                (x = le === "" ? "." + Me(we, 0) : le),
                Q(ce)
                    ? ((ae = ""),
                      x != null && (ae = x.replace(Ee, "$&/") + "/"),
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
                                      : ("" + ce.key).replace(Ee, "$&/") + "/") +
                                  x
                          )),
                      F.push(ce)),
                1
            );
        if (((we = 0), (le = le === "" ? "." : le + ":"), Q(x)))
            for (var me = 0; me < x.length; me++) {
                he = x[me];
                var Se = le + Me(he, me);
                we += Qe(he, F, ae, Se, ce);
            }
        else if (((Se = k(x)), typeof Se == "function"))
            for (x = Se.call(x), me = 0; !(he = x.next()).done; )
                ((he = he.value), (Se = le + Me(he, me++)), (we += Qe(he, F, ae, Se, ce)));
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
        (ue.Fragment = i),
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
            return { $$typeof: o, type: x.type, key: ce, ref: he, props: le, _owner: we };
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
var Zc;
function $s() {
    return (Zc || ((Zc = 1), (Bs.exports = Ap())), Bs.exports);
}
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ef;
function qp() {
    if (ef) return Jn;
    ef = 1;
    var o = $s(),
        n = Symbol.for("react.element"),
        i = Symbol.for("react.fragment"),
        a = Object.prototype.hasOwnProperty,
        c = o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
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
    return ((Jn.Fragment = i), (Jn.jsx = h), (Jn.jsxs = h), Jn);
}
var tf;
function Hp() {
    return (tf || ((tf = 1), (Ss.exports = qp())), Ss.exports);
}
var Fe = Hp();
const Wp = Df(Fe),
    Up = If({ __proto__: null, default: Wp }, [Fe]);
var gi = {},
    Ts = { exports: {} },
    ft = {},
    Es = { exports: {} },
    Cs = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var rf;
function Vp() {
    return (
        rf ||
            ((rf = 1),
            (function (o) {
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
                function i(P) {
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
                    o.unstable_now = function () {
                        return f.now();
                    };
                } else {
                    var h = Date,
                        p = h.now();
                    o.unstable_now = function () {
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
                    T = !1,
                    N = typeof setTimeout == "function" ? setTimeout : null,
                    q = typeof clearTimeout == "function" ? clearTimeout : null,
                    H = typeof setImmediate < "u" ? setImmediate : null;
                typeof navigator < "u" &&
                    navigator.scheduling !== void 0 &&
                    navigator.scheduling.isInputPending !== void 0 &&
                    navigator.scheduling.isInputPending.bind(navigator.scheduling);
                function D(P) {
                    for (var V = i(v); V !== null; ) {
                        if (V.callback === null) a(v);
                        else if (V.startTime <= P)
                            (a(v), (V.sortIndex = V.expirationTime), n(m, V));
                        else break;
                        V = i(v);
                    }
                }
                function Q(P) {
                    if (((T = !1), D(P), !C))
                        if (i(m) !== null) ((C = !0), A(re));
                        else {
                            var V = i(v);
                            V !== null && Y(Q, V.startTime - P);
                        }
                }
                function re(P, V) {
                    ((C = !1), T && ((T = !1), q(U), (U = -1)), (S = !0));
                    var L = k;
                    try {
                        for (
                            D(V), y = i(m);
                            y !== null && (!(y.expirationTime > V) || (P && !Ue()));
                        ) {
                            var x = y.callback;
                            if (typeof x == "function") {
                                ((y.callback = null), (k = y.priorityLevel));
                                var F = x(y.expirationTime <= V);
                                ((V = o.unstable_now()),
                                    typeof F == "function" ? (y.callback = F) : y === i(m) && a(m),
                                    D(V));
                            } else a(m);
                            y = i(m);
                        }
                        if (y !== null) var ae = !0;
                        else {
                            var le = i(v);
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
                    return !(o.unstable_now() - fe < ie);
                }
                function Ee() {
                    if (ee !== null) {
                        var P = o.unstable_now();
                        fe = P;
                        var V = !0;
                        try {
                            V = ee(!0, P);
                        } finally {
                            V ? Me() : ((G = !1), (ee = null));
                        }
                    } else G = !1;
                }
                var Me;
                if (typeof H == "function")
                    Me = function () {
                        H(Ee);
                    };
                else if (typeof MessageChannel < "u") {
                    var Qe = new MessageChannel(),
                        qe = Qe.port2;
                    ((Qe.port1.onmessage = Ee),
                        (Me = function () {
                            qe.postMessage(null);
                        }));
                } else
                    Me = function () {
                        N(Ee, 0);
                    };
                function A(P) {
                    ((ee = P), G || ((G = !0), Me()));
                }
                function Y(P, V) {
                    U = N(function () {
                        P(o.unstable_now());
                    }, V);
                }
                ((o.unstable_IdlePriority = 5),
                    (o.unstable_ImmediatePriority = 1),
                    (o.unstable_LowPriority = 4),
                    (o.unstable_NormalPriority = 3),
                    (o.unstable_Profiling = null),
                    (o.unstable_UserBlockingPriority = 2),
                    (o.unstable_cancelCallback = function (P) {
                        P.callback = null;
                    }),
                    (o.unstable_continueExecution = function () {
                        C || S || ((C = !0), A(re));
                    }),
                    (o.unstable_forceFrameRate = function (P) {
                        0 > P || 125 < P
                            ? console.error(
                                  "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
                              )
                            : (ie = 0 < P ? Math.floor(1e3 / P) : 5);
                    }),
                    (o.unstable_getCurrentPriorityLevel = function () {
                        return k;
                    }),
                    (o.unstable_getFirstCallbackNode = function () {
                        return i(m);
                    }),
                    (o.unstable_next = function (P) {
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
                    (o.unstable_pauseExecution = function () {}),
                    (o.unstable_requestPaint = function () {}),
                    (o.unstable_runWithPriority = function (P, V) {
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
                    (o.unstable_scheduleCallback = function (P, V, L) {
                        var x = o.unstable_now();
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
                                  i(m) === null &&
                                      P === i(v) &&
                                      (T ? (q(U), (U = -1)) : (T = !0), Y(Q, L - x)))
                                : ((P.sortIndex = F), n(m, P), C || S || ((C = !0), A(re))),
                            P
                        );
                    }),
                    (o.unstable_shouldYield = Ue),
                    (o.unstable_wrapCallback = function (P) {
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
var nf;
function Kp() {
    return (nf || ((nf = 1), (Es.exports = Vp())), Es.exports);
}
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var of;
function $p() {
    if (of) return ft;
    of = 1;
    var o = $s(),
        n = Kp();
    function i(e) {
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
    function T(e, t, r, l, s, u, d) {
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
            N[e] = new T(e, 0, !1, e, null, !1, !1);
        }),
        [
            ["acceptCharset", "accept-charset"],
            ["className", "class"],
            ["htmlFor", "for"],
            ["httpEquiv", "http-equiv"],
        ].forEach(function (e) {
            var t = e[0];
            N[t] = new T(t, 1, !1, e[1], null, !1, !1);
        }),
        ["contentEditable", "draggable", "spellCheck", "value"].forEach(function (e) {
            N[e] = new T(e, 2, !1, e.toLowerCase(), null, !1, !1);
        }),
        ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(
            function (e) {
                N[e] = new T(e, 2, !1, e, null, !1, !1);
            }
        ),
        "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope"
            .split(" ")
            .forEach(function (e) {
                N[e] = new T(e, 3, !1, e.toLowerCase(), null, !1, !1);
            }),
        ["checked", "multiple", "muted", "selected"].forEach(function (e) {
            N[e] = new T(e, 3, !0, e, null, !1, !1);
        }),
        ["capture", "download"].forEach(function (e) {
            N[e] = new T(e, 4, !1, e, null, !1, !1);
        }),
        ["cols", "rows", "size", "span"].forEach(function (e) {
            N[e] = new T(e, 6, !1, e, null, !1, !1);
        }),
        ["rowSpan", "start"].forEach(function (e) {
            N[e] = new T(e, 5, !1, e.toLowerCase(), null, !1, !1);
        }));
    var q = /[\-:]([a-z])/g;
    function H(e) {
        return e[1].toUpperCase();
    }
    ("accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height"
        .split(" ")
        .forEach(function (e) {
            var t = e.replace(q, H);
            N[t] = new T(t, 1, !1, e, null, !1, !1);
        }),
        "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type"
            .split(" ")
            .forEach(function (e) {
                var t = e.replace(q, H);
                N[t] = new T(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
            }),
        ["xml:base", "xml:lang", "xml:space"].forEach(function (e) {
            var t = e.replace(q, H);
            N[t] = new T(t, 1, !1, e, "http://www.w3.org/XML/1998/namespace", !1, !1);
        }),
        ["tabIndex", "crossOrigin"].forEach(function (e) {
            N[e] = new T(e, 1, !1, e.toLowerCase(), null, !1, !1);
        }),
        (N.xlinkHref = new T(
            "xlinkHref",
            1,
            !1,
            "xlink:href",
            "http://www.w3.org/1999/xlink",
            !0,
            !1
        )),
        ["src", "href", "action", "formAction"].forEach(function (e) {
            N[e] = new T(e, 1, !1, e.toLowerCase(), null, !0, !0);
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
    var Q = o.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
        re = Symbol.for("react.element"),
        G = Symbol.for("react.portal"),
        ee = Symbol.for("react.fragment"),
        U = Symbol.for("react.strict_mode"),
        ie = Symbol.for("react.profiler"),
        fe = Symbol.for("react.provider"),
        Ue = Symbol.for("react.context"),
        Ee = Symbol.for("react.forward_ref"),
        Me = Symbol.for("react.suspense"),
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
            case Me:
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
                case Ee:
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
    function oa(e) {
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
    function ia(e, t) {
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
    function la(e, t) {
        ((t = t.checked), t != null && D(e, "checked", t, !1));
    }
    function Fi(e, t) {
        la(e, t);
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
    function sa(e, t, r) {
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
    function Mr(e, t, r, l) {
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
        if (t.dangerouslySetInnerHTML != null) throw Error(i(91));
        return L({}, t, {
            value: void 0,
            defaultValue: void 0,
            children: "" + e._wrapperState.initialValue,
        });
    }
    function aa(e, t) {
        var r = t.value;
        if (r == null) {
            if (((r = t.children), (t = t.defaultValue), r != null)) {
                if (t != null) throw Error(i(92));
                if (hn(r)) {
                    if (1 < r.length) throw Error(i(93));
                    r = r[0];
                }
                t = r;
            }
            (t == null && (t = ""), (r = t));
        }
        e._wrapperState = { initialValue: me(r) };
    }
    function ua(e, t) {
        var r = me(t.value),
            l = me(t.defaultValue);
        (r != null &&
            ((r = "" + r),
            r !== e.value && (e.value = r),
            t.defaultValue == null && e.defaultValue !== r && (e.defaultValue = r)),
            l != null && (e.defaultValue = "" + l));
    }
    function ca(e) {
        var t = e.textContent;
        t === e._wrapperState.initialValue && t !== "" && t !== null && (e.value = t);
    }
    function fa(e) {
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
            ? fa(t)
            : e === "http://www.w3.org/2000/svg" && t === "foreignObject"
              ? "http://www.w3.org/1999/xhtml"
              : e;
    }
    var ao,
        da = (function (e) {
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
        Ud = ["Webkit", "ms", "Moz", "O"];
    Object.keys(vn).forEach(function (e) {
        Ud.forEach(function (t) {
            ((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (vn[t] = vn[e]));
        });
    });
    function ha(e, t, r) {
        return t == null || typeof t == "boolean" || t === ""
            ? ""
            : r || typeof t != "number" || t === 0 || (vn.hasOwnProperty(e) && vn[e])
              ? ("" + t).trim()
              : t + "px";
    }
    function pa(e, t) {
        e = e.style;
        for (var r in t)
            if (t.hasOwnProperty(r)) {
                var l = r.indexOf("--") === 0,
                    s = ha(r, t[r], l);
                (r === "float" && (r = "cssFloat"), l ? e.setProperty(r, s) : (e[r] = s));
            }
    }
    var Vd = L(
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
            if (Vd[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
                throw Error(i(137, e));
            if (t.dangerouslySetInnerHTML != null) {
                if (t.children != null) throw Error(i(60));
                if (
                    typeof t.dangerouslySetInnerHTML != "object" ||
                    !("__html" in t.dangerouslySetInnerHTML)
                )
                    throw Error(i(61));
            }
            if (t.style != null && typeof t.style != "object") throw Error(i(62));
        }
    }
    function Mi(e, t) {
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
    function Oi(e) {
        return (
            (e = e.target || e.srcElement || window),
            e.correspondingUseElement && (e = e.correspondingUseElement),
            e.nodeType === 3 ? e.parentNode : e
        );
    }
    var Ai = null,
        Lr = null,
        Or = null;
    function va(e) {
        if ((e = Mn(e))) {
            if (typeof Ai != "function") throw Error(i(280));
            var t = e.stateNode;
            t && ((t = Fo(t)), Ai(e.stateNode, e.type, t));
        }
    }
    function ma(e) {
        Lr ? (Or ? Or.push(e) : (Or = [e])) : (Lr = e);
    }
    function ga() {
        if (Lr) {
            var e = Lr,
                t = Or;
            if (((Or = Lr = null), va(e), t)) for (e = 0; e < t.length; e++) va(t[e]);
        }
    }
    function ya(e, t) {
        return e(t);
    }
    function wa() {}
    var qi = !1;
    function ba(e, t, r) {
        if (qi) return e(t, r);
        qi = !0;
        try {
            return ya(e, t, r);
        } finally {
            ((qi = !1), (Lr !== null || Or !== null) && (wa(), ga()));
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
        if (r && typeof r != "function") throw Error(i(231, t, typeof r));
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
    function Kd(e, t, r, l, s, u, d, g, w) {
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
        $d = {
            onError: function (e) {
                ((yn = !0), (uo = e));
            },
        };
    function Qd(e, t, r, l, s, u, d, g, w) {
        ((yn = !1), (uo = null), Kd.apply($d, arguments));
    }
    function Gd(e, t, r, l, s, u, d, g, w) {
        if ((Qd.apply(this, arguments), yn)) {
            if (yn) {
                var z = uo;
                ((yn = !1), (uo = null));
            } else throw Error(i(198));
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
    function _a(e) {
        if (e.tag === 13) {
            var t = e.memoizedState;
            if (
                (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null)
            )
                return t.dehydrated;
        }
        return null;
    }
    function ka(e) {
        if (xr(e) !== e) throw Error(i(188));
    }
    function Xd(e) {
        var t = e.alternate;
        if (!t) {
            if (((t = xr(e)), t === null)) throw Error(i(188));
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
                    if (u === r) return (ka(s), e);
                    if (u === l) return (ka(s), t);
                    u = u.sibling;
                }
                throw Error(i(188));
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
                    if (!d) throw Error(i(189));
                }
            }
            if (r.alternate !== l) throw Error(i(190));
        }
        if (r.tag !== 3) throw Error(i(188));
        return r.stateNode.current === r ? e : t;
    }
    function xa(e) {
        return ((e = Xd(e)), e !== null ? Sa(e) : null);
    }
    function Sa(e) {
        if (e.tag === 5 || e.tag === 6) return e;
        for (e = e.child; e !== null; ) {
            var t = Sa(e);
            if (t !== null) return t;
            e = e.sibling;
        }
        return null;
    }
    var Ba = n.unstable_scheduleCallback,
        Ta = n.unstable_cancelCallback,
        Yd = n.unstable_shouldYield,
        Jd = n.unstable_requestPaint,
        je = n.unstable_now,
        Zd = n.unstable_getCurrentPriorityLevel,
        Ui = n.unstable_ImmediatePriority,
        Ea = n.unstable_UserBlockingPriority,
        fo = n.unstable_NormalPriority,
        eh = n.unstable_LowPriority,
        Ca = n.unstable_IdlePriority,
        ho = null,
        It = null;
    function th(e) {
        if (It && typeof It.onCommitFiberRoot == "function")
            try {
                It.onCommitFiberRoot(ho, e, void 0, (e.current.flags & 128) === 128);
            } catch {}
    }
    var Bt = Math.clz32 ? Math.clz32 : oh,
        rh = Math.log,
        nh = Math.LN2;
    function oh(e) {
        return ((e >>>= 0), e === 0 ? 32 : (31 - ((rh(e) / nh) | 0)) | 0);
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
    function ih(e, t) {
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
    function lh(e, t) {
        for (
            var r = e.suspendedLanes, l = e.pingedLanes, s = e.expirationTimes, u = e.pendingLanes;
            0 < u;
        ) {
            var d = 31 - Bt(u),
                g = 1 << d,
                w = s[d];
            (w === -1
                ? ((g & r) === 0 || (g & l) !== 0) && (s[d] = ih(g, t))
                : w <= t && (e.expiredLanes |= g),
                (u &= ~g));
        }
    }
    function Vi(e) {
        return ((e = e.pendingLanes & -1073741825), e !== 0 ? e : e & 1073741824 ? 1073741824 : 0);
    }
    function za() {
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
    function sh(e, t) {
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
    function Na(e) {
        return ((e &= -e), 1 < e ? (4 < e ? ((e & 268435455) !== 0 ? 16 : 536870912) : 4) : 1);
    }
    var Pa,
        Qi,
        Fa,
        Ra,
        ja,
        Gi = !1,
        go = [],
        Jt = null,
        Zt = null,
        er = null,
        _n = new Map(),
        kn = new Map(),
        tr = [],
        ah =
            "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(
                " "
            );
    function Ia(e, t) {
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
              t !== null && ((t = Mn(t)), t !== null && Qi(t)),
              e)
            : ((e.eventSystemFlags |= l),
              (t = e.targetContainers),
              s !== null && t.indexOf(s) === -1 && t.push(s),
              e);
    }
    function uh(e, t, r, l, s) {
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
    function Da(e) {
        var t = Sr(e.target);
        if (t !== null) {
            var r = xr(t);
            if (r !== null) {
                if (((t = r.tag), t === 13)) {
                    if (((t = _a(r)), t !== null)) {
                        ((e.blockedOn = t),
                            ja(e.priority, function () {
                                Fa(r);
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
            } else return ((t = Mn(r)), t !== null && Qi(t), (e.blockedOn = r), !1);
            t.shift();
        }
        return !0;
    }
    function Ma(e, t, r) {
        yo(e) && r.delete(t);
    }
    function ch() {
        ((Gi = !1),
            Jt !== null && yo(Jt) && (Jt = null),
            Zt !== null && yo(Zt) && (Zt = null),
            er !== null && yo(er) && (er = null),
            _n.forEach(Ma),
            kn.forEach(Ma));
    }
    function Sn(e, t) {
        e.blockedOn === t &&
            ((e.blockedOn = null),
            Gi || ((Gi = !0), n.unstable_scheduleCallback(n.unstable_NormalPriority, ch)));
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
            (Da(r), r.blockedOn === null && tr.shift());
    }
    var Ar = Q.ReactCurrentBatchConfig,
        wo = !0;
    function fh(e, t, r, l) {
        var s = ge,
            u = Ar.transition;
        Ar.transition = null;
        try {
            ((ge = 1), Xi(e, t, r, l));
        } finally {
            ((ge = s), (Ar.transition = u));
        }
    }
    function dh(e, t, r, l) {
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
            if (s === null) (pl(e, t, l, bo, r), Ia(e, l));
            else if (uh(s, e, t, r, l)) l.stopPropagation();
            else if ((Ia(e, l), t & 4 && -1 < ah.indexOf(e))) {
                for (; s !== null; ) {
                    var u = Mn(s);
                    if (
                        (u !== null && Pa(u),
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
        if (((bo = null), (e = Oi(l)), (e = Sr(e)), e !== null))
            if (((t = xr(e)), t === null)) e = null;
            else if (((r = t.tag), r === 13)) {
                if (((e = _a(t)), e !== null)) return e;
                e = null;
            } else if (r === 3) {
                if (t.stateNode.current.memoizedState.isDehydrated)
                    return t.tag === 3 ? t.stateNode.containerInfo : null;
                e = null;
            } else t !== e && (e = null);
        return ((bo = e), null);
    }
    function La(e) {
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
                switch (Zd()) {
                    case Ui:
                        return 1;
                    case Ea:
                        return 4;
                    case fo:
                    case eh:
                        return 16;
                    case Ca:
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
    function Oa() {
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
    function Aa() {
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
                    : Aa),
                (this.isPropagationStopped = Aa),
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
        Tn = L({}, qr, { view: 0, detail: 0 }),
        hh = ht(Tn),
        el,
        tl,
        En,
        So = L({}, Tn, {
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
                    : (e !== En &&
                          (En && e.type === "mousemove"
                              ? ((el = e.screenX - En.screenX), (tl = e.screenY - En.screenY))
                              : (tl = el = 0),
                          (En = e)),
                      el);
            },
            movementY: function (e) {
                return "movementY" in e ? e.movementY : tl;
            },
        }),
        qa = ht(So),
        ph = L({}, So, { dataTransfer: 0 }),
        vh = ht(ph),
        mh = L({}, Tn, { relatedTarget: 0 }),
        rl = ht(mh),
        gh = L({}, qr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
        yh = ht(gh),
        wh = L({}, qr, {
            clipboardData: function (e) {
                return "clipboardData" in e ? e.clipboardData : window.clipboardData;
            },
        }),
        bh = ht(wh),
        _h = L({}, qr, { data: 0 }),
        Ha = ht(_h),
        kh = {
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
        xh = {
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
        Sh = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
    function Bh(e) {
        var t = this.nativeEvent;
        return t.getModifierState ? t.getModifierState(e) : (e = Sh[e]) ? !!t[e] : !1;
    }
    function nl() {
        return Bh;
    }
    var Th = L({}, Tn, {
            key: function (e) {
                if (e.key) {
                    var t = kh[e.key] || e.key;
                    if (t !== "Unidentified") return t;
                }
                return e.type === "keypress"
                    ? ((e = ko(e)), e === 13 ? "Enter" : String.fromCharCode(e))
                    : e.type === "keydown" || e.type === "keyup"
                      ? xh[e.keyCode] || "Unidentified"
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
        Eh = ht(Th),
        Ch = L({}, So, {
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
        Wa = ht(Ch),
        zh = L({}, Tn, {
            touches: 0,
            targetTouches: 0,
            changedTouches: 0,
            altKey: 0,
            metaKey: 0,
            ctrlKey: 0,
            shiftKey: 0,
            getModifierState: nl,
        }),
        Nh = ht(zh),
        Ph = L({}, qr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
        Fh = ht(Ph),
        Rh = L({}, So, {
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
        jh = ht(Rh),
        Ih = [9, 13, 27, 32],
        ol = p && "CompositionEvent" in window,
        Cn = null;
    p && "documentMode" in document && (Cn = document.documentMode);
    var Dh = p && "TextEvent" in window && !Cn,
        Ua = p && (!ol || (Cn && 8 < Cn && 11 >= Cn)),
        Va = " ",
        Ka = !1;
    function $a(e, t) {
        switch (e) {
            case "keyup":
                return Ih.indexOf(t.keyCode) !== -1;
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
    function Qa(e) {
        return ((e = e.detail), typeof e == "object" && "data" in e ? e.data : null);
    }
    var Hr = !1;
    function Mh(e, t) {
        switch (e) {
            case "compositionend":
                return Qa(t);
            case "keypress":
                return t.which !== 32 ? null : ((Ka = !0), Va);
            case "textInput":
                return ((e = t.data), e === Va && Ka ? null : e);
            default:
                return null;
        }
    }
    function Lh(e, t) {
        if (Hr)
            return e === "compositionend" || (!ol && $a(e, t))
                ? ((e = Oa()), (_o = Ji = rr = null), (Hr = !1), e)
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
                return Ua && t.locale !== "ko" ? null : t.data;
            default:
                return null;
        }
    }
    var Oh = {
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
    function Ga(e) {
        var t = e && e.nodeName && e.nodeName.toLowerCase();
        return t === "input" ? !!Oh[e.type] : t === "textarea";
    }
    function Xa(e, t, r, l) {
        (ma(l),
            (t = zo(t, "onChange")),
            0 < t.length &&
                ((r = new Zi("onChange", "change", null, r, l)),
                e.push({ event: r, listeners: t })));
    }
    var zn = null,
        Nn = null;
    function Ah(e) {
        pu(e, 0);
    }
    function Bo(e) {
        var t = $r(e);
        if (oa(t)) return e;
    }
    function qh(e, t) {
        if (e === "change") return t;
    }
    var Ya = !1;
    if (p) {
        var il;
        if (p) {
            var ll = "oninput" in document;
            if (!ll) {
                var Ja = document.createElement("div");
                (Ja.setAttribute("oninput", "return;"), (ll = typeof Ja.oninput == "function"));
            }
            il = ll;
        } else il = !1;
        Ya = il && (!document.documentMode || 9 < document.documentMode);
    }
    function Za() {
        zn && (zn.detachEvent("onpropertychange", eu), (Nn = zn = null));
    }
    function eu(e) {
        if (e.propertyName === "value" && Bo(Nn)) {
            var t = [];
            (Xa(t, Nn, e, Oi(e)), ba(Ah, t));
        }
    }
    function Hh(e, t, r) {
        e === "focusin"
            ? (Za(), (zn = t), (Nn = r), zn.attachEvent("onpropertychange", eu))
            : e === "focusout" && Za();
    }
    function Wh(e) {
        if (e === "selectionchange" || e === "keyup" || e === "keydown") return Bo(Nn);
    }
    function Uh(e, t) {
        if (e === "click") return Bo(t);
    }
    function Vh(e, t) {
        if (e === "input" || e === "change") return Bo(t);
    }
    function Kh(e, t) {
        return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
    }
    var Tt = typeof Object.is == "function" ? Object.is : Kh;
    function Pn(e, t) {
        if (Tt(e, t)) return !0;
        if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
        var r = Object.keys(e),
            l = Object.keys(t);
        if (r.length !== l.length) return !1;
        for (l = 0; l < r.length; l++) {
            var s = r[l];
            if (!m.call(t, s) || !Tt(e[s], t[s])) return !1;
        }
        return !0;
    }
    function tu(e) {
        for (; e && e.firstChild; ) e = e.firstChild;
        return e;
    }
    function ru(e, t) {
        var r = tu(e);
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
            r = tu(r);
        }
    }
    function nu(e, t) {
        return e && t
            ? e === t
                ? !0
                : e && e.nodeType === 3
                  ? !1
                  : t && t.nodeType === 3
                    ? nu(e, t.parentNode)
                    : "contains" in e
                      ? e.contains(t)
                      : e.compareDocumentPosition
                        ? !!(e.compareDocumentPosition(t) & 16)
                        : !1
            : !1;
    }
    function ou() {
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
    function $h(e) {
        var t = ou(),
            r = e.focusedElem,
            l = e.selectionRange;
        if (t !== r && r && r.ownerDocument && nu(r.ownerDocument.documentElement, r)) {
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
                        (s = ru(r, u)));
                    var d = ru(r, l);
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
    var Qh = p && "documentMode" in document && 11 >= document.documentMode,
        Wr = null,
        al = null,
        Fn = null,
        ul = !1;
    function iu(e, t, r) {
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
    function To(e, t) {
        var r = {};
        return (
            (r[e.toLowerCase()] = t.toLowerCase()),
            (r["Webkit" + e] = "webkit" + t),
            (r["Moz" + e] = "moz" + t),
            r
        );
    }
    var Ur = {
            animationend: To("Animation", "AnimationEnd"),
            animationiteration: To("Animation", "AnimationIteration"),
            animationstart: To("Animation", "AnimationStart"),
            transitionend: To("Transition", "TransitionEnd"),
        },
        cl = {},
        lu = {};
    p &&
        ((lu = document.createElement("div").style),
        "AnimationEvent" in window ||
            (delete Ur.animationend.animation,
            delete Ur.animationiteration.animation,
            delete Ur.animationstart.animation),
        "TransitionEvent" in window || delete Ur.transitionend.transition);
    function Eo(e) {
        if (cl[e]) return cl[e];
        if (!Ur[e]) return e;
        var t = Ur[e],
            r;
        for (r in t) if (t.hasOwnProperty(r) && r in lu) return (cl[e] = t[r]);
        return e;
    }
    var su = Eo("animationend"),
        au = Eo("animationiteration"),
        uu = Eo("animationstart"),
        cu = Eo("transitionend"),
        fu = new Map(),
        du =
            "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
                " "
            );
    function nr(e, t) {
        (fu.set(e, t), f(t, [e]));
    }
    for (var fl = 0; fl < du.length; fl++) {
        var dl = du[fl],
            Gh = dl.toLowerCase(),
            Xh = dl[0].toUpperCase() + dl.slice(1);
        nr(Gh, "on" + Xh);
    }
    (nr(su, "onAnimationEnd"),
        nr(au, "onAnimationIteration"),
        nr(uu, "onAnimationStart"),
        nr("dblclick", "onDoubleClick"),
        nr("focusin", "onFocus"),
        nr("focusout", "onBlur"),
        nr(cu, "onTransitionEnd"),
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
        Yh = new Set("cancel close invalid load scroll toggle".split(" ").concat(Rn));
    function hu(e, t, r) {
        var l = e.type || "unknown-event";
        ((e.currentTarget = r), Gd(l, t, void 0, e), (e.currentTarget = null));
    }
    function pu(e, t) {
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
                        (hu(s, g, z), (u = w));
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
                        (hu(s, g, z), (u = w));
                    }
            }
        }
        if (co) throw ((e = Wi), (co = !1), (Wi = null), e);
    }
    function ke(e, t) {
        var r = t[bl];
        r === void 0 && (r = t[bl] = new Set());
        var l = e + "__bubble";
        r.has(l) || (vu(t, e, 2, !1), r.add(l));
    }
    function hl(e, t, r) {
        var l = 0;
        (t && (l |= 4), vu(r, e, l, t));
    }
    var Co = "_reactListening" + Math.random().toString(36).slice(2);
    function jn(e) {
        if (!e[Co]) {
            ((e[Co] = !0),
                a.forEach(function (r) {
                    r !== "selectionchange" && (Yh.has(r) || hl(r, !1, e), hl(r, !0, e));
                }));
            var t = e.nodeType === 9 ? e : e.ownerDocument;
            t === null || t[Co] || ((t[Co] = !0), hl("selectionchange", !1, t));
        }
    }
    function vu(e, t, r, l) {
        switch (La(t)) {
            case 1:
                var s = fh;
                break;
            case 4:
                s = dh;
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
        ba(function () {
            var z = u,
                j = Oi(r),
                I = [];
            e: {
                var R = fu.get(e);
                if (R !== void 0) {
                    var $ = Zi,
                        J = e;
                    switch (e) {
                        case "keypress":
                            if (ko(r) === 0) break e;
                        case "keydown":
                        case "keyup":
                            $ = Eh;
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
                            $ = qa;
                            break;
                        case "drag":
                        case "dragend":
                        case "dragenter":
                        case "dragexit":
                        case "dragleave":
                        case "dragover":
                        case "dragstart":
                        case "drop":
                            $ = vh;
                            break;
                        case "touchcancel":
                        case "touchend":
                        case "touchmove":
                        case "touchstart":
                            $ = Nh;
                            break;
                        case su:
                        case au:
                        case uu:
                            $ = yh;
                            break;
                        case cu:
                            $ = Fh;
                            break;
                        case "scroll":
                            $ = hh;
                            break;
                        case "wheel":
                            $ = jh;
                            break;
                        case "copy":
                        case "cut":
                        case "paste":
                            $ = bh;
                            break;
                        case "gotpointercapture":
                        case "lostpointercapture":
                        case "pointercancel":
                        case "pointerdown":
                        case "pointermove":
                        case "pointerout":
                        case "pointerover":
                        case "pointerup":
                            $ = Wa;
                    }
                    var Z = (t & 4) !== 0,
                        Ie = !Z && e === "scroll",
                        B = Z ? (R !== null ? R + "Capture" : null) : R;
                    Z = [];
                    for (var _ = z, E; _ !== null; ) {
                        E = _;
                        var M = E.stateNode;
                        if (
                            (E.tag === 5 &&
                                M !== null &&
                                ((E = M),
                                B !== null && ((M = mn(_, B)), M != null && Z.push(In(_, M, E)))),
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
                            ((Z = qa),
                            (M = "onMouseLeave"),
                            (B = "onMouseEnter"),
                            (_ = "mouse"),
                            (e === "pointerout" || e === "pointerover") &&
                                ((Z = Wa),
                                (M = "onPointerLeave"),
                                (B = "onPointerEnter"),
                                (_ = "pointer")),
                            (Ie = $ == null ? R : $r($)),
                            (E = J == null ? R : $r(J)),
                            (R = new Z(M, _ + "leave", $, r, j)),
                            (R.target = Ie),
                            (R.relatedTarget = E),
                            (M = null),
                            Sr(j) === z &&
                                ((Z = new Z(B, _ + "enter", J, r, j)),
                                (Z.target = E),
                                (Z.relatedTarget = Ie),
                                (M = Z)),
                            (Ie = M),
                            $ && J)
                        )
                            t: {
                                for (Z = $, B = J, _ = 0, E = Z; E; E = Vr(E)) _++;
                                for (E = 0, M = B; M; M = Vr(M)) E++;
                                for (; 0 < _ - E; ) ((Z = Vr(Z)), _--);
                                for (; 0 < E - _; ) ((B = Vr(B)), E--);
                                for (; _--; ) {
                                    if (Z === B || (B !== null && Z === B.alternate)) break t;
                                    ((Z = Vr(Z)), (B = Vr(B)));
                                }
                                Z = null;
                            }
                        else Z = null;
                        ($ !== null && mu(I, R, $, Z, !1),
                            J !== null && Ie !== null && mu(I, Ie, J, Z, !0));
                    }
                }
                e: {
                    if (
                        ((R = z ? $r(z) : window),
                        ($ = R.nodeName && R.nodeName.toLowerCase()),
                        $ === "select" || ($ === "input" && R.type === "file"))
                    )
                        var te = qh;
                    else if (Ga(R))
                        if (Ya) te = Vh;
                        else {
                            te = Wh;
                            var ne = Hh;
                        }
                    else
                        ($ = R.nodeName) &&
                            $.toLowerCase() === "input" &&
                            (R.type === "checkbox" || R.type === "radio") &&
                            (te = Uh);
                    if (te && (te = te(e, z))) {
                        Xa(I, te, r, j);
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
                        (Ga(ne) || ne.contentEditable === "true") &&
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
                        ((ul = !1), iu(I, r, j));
                        break;
                    case "selectionchange":
                        if (Qh) break;
                    case "keydown":
                    case "keyup":
                        iu(I, r, j);
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
                        ? $a(e, r) && (se = "onCompositionEnd")
                        : e === "keydown" && r.keyCode === 229 && (se = "onCompositionStart");
                (se &&
                    (Ua &&
                        r.locale !== "ko" &&
                        (Hr || se !== "onCompositionStart"
                            ? se === "onCompositionEnd" && Hr && (oe = Oa())
                            : ((rr = j),
                              (Ji = "value" in rr ? rr.value : rr.textContent),
                              (Hr = !0))),
                    (ne = zo(z, se)),
                    0 < ne.length &&
                        ((se = new Ha(se, e, null, r, j)),
                        I.push({ event: se, listeners: ne }),
                        oe ? (se.data = oe) : ((oe = Qa(r)), oe !== null && (se.data = oe)))),
                    (oe = Dh ? Mh(e, r) : Lh(e, r)) &&
                        ((z = zo(z, "onBeforeInput")),
                        0 < z.length &&
                            ((j = new Ha("onBeforeInput", "beforeinput", null, r, j)),
                            I.push({ event: j, listeners: z }),
                            (j.data = oe))));
            }
            pu(I, t);
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
    function mu(e, t, r, l, s) {
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
    var Jh = /\r\n?/g,
        Zh = /\u0000|\uFFFD/g;
    function gu(e) {
        return (typeof e == "string" ? e : "" + e)
            .replace(
                Jh,
                `
`
            )
            .replace(Zh, "");
    }
    function No(e, t, r) {
        if (((t = gu(t)), gu(e) !== t && r)) throw Error(i(425));
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
        ep = typeof clearTimeout == "function" ? clearTimeout : void 0,
        yu = typeof Promise == "function" ? Promise : void 0,
        tp =
            typeof queueMicrotask == "function"
                ? queueMicrotask
                : typeof yu < "u"
                  ? function (e) {
                        return yu.resolve(null).then(e).catch(rp);
                    }
                  : yl;
    function rp(e) {
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
    function wu(e) {
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
        np = "__reactListeners$" + Kr,
        op = "__reactHandles$" + Kr;
    function Sr(e) {
        var t = e[Dt];
        if (t) return t;
        for (var r = e.parentNode; r; ) {
            if ((t = r[qt] || r[Dt])) {
                if (((r = t.alternate), t.child !== null || (r !== null && r.child !== null)))
                    for (e = wu(e); e !== null; ) {
                        if ((r = e[Dt])) return r;
                        e = wu(e);
                    }
                return t;
            }
            ((e = r), (r = e.parentNode));
        }
        return null;
    }
    function Mn(e) {
        return (
            (e = e[Dt] || e[qt]),
            !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
        );
    }
    function $r(e) {
        if (e.tag === 5 || e.tag === 6) return e.stateNode;
        throw Error(i(33));
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
    function bu(e, t, r) {
        if (Je.current !== lr) throw Error(i(168));
        (be(Je, t), be(lt, r));
    }
    function _u(e, t, r) {
        var l = e.stateNode;
        if (((t = t.childContextTypes), typeof l.getChildContext != "function")) return r;
        l = l.getChildContext();
        for (var s in l) if (!(s in t)) throw Error(i(108, we(e) || "Unknown", s));
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
    function ku(e, t, r) {
        var l = e.stateNode;
        if (!l) throw Error(i(169));
        (r
            ? ((e = _u(e, t, Br)),
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
    function xu(e) {
        Ht === null ? (Ht = [e]) : Ht.push(e);
    }
    function ip(e) {
        ((Io = !0), xu(e));
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
                throw (Ht !== null && (Ht = Ht.slice(e + 1)), Ba(Ui, sr), s);
            } finally {
                ((ge = t), (kl = !1));
            }
        }
        return null;
    }
    var Xr = [],
        Yr = 0,
        Do = null,
        Mo = 0,
        wt = [],
        bt = 0,
        Tr = null,
        Wt = 1,
        Ut = "";
    function Er(e, t) {
        ((Xr[Yr++] = Mo), (Xr[Yr++] = Do), (Do = e), (Mo = t));
    }
    function Su(e, t, r) {
        ((wt[bt++] = Wt), (wt[bt++] = Ut), (wt[bt++] = Tr), (Tr = e));
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
        e.return !== null && (Er(e, 1), Su(e, 1, 0));
    }
    function Sl(e) {
        for (; e === Do; ) ((Do = Xr[--Yr]), (Xr[Yr] = null), (Mo = Xr[--Yr]), (Xr[Yr] = null));
        for (; e === Tr; )
            ((Tr = wt[--bt]),
                (wt[bt] = null),
                (Ut = wt[--bt]),
                (wt[bt] = null),
                (Wt = wt[--bt]),
                (wt[bt] = null));
    }
    var pt = null,
        vt = null,
        Be = !1,
        Et = null;
    function Bu(e, t) {
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
                        ? ((r = Tr !== null ? { id: Wt, overflow: Ut } : null),
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
    function Tl(e) {
        if (Be) {
            var t = vt;
            if (t) {
                var r = t;
                if (!Tu(e, t)) {
                    if (Bl(e)) throw Error(i(418));
                    t = or(r.nextSibling);
                    var l = pt;
                    t && Tu(e, t)
                        ? Bu(l, r)
                        : ((e.flags = (e.flags & -4097) | 2), (Be = !1), (pt = e));
                }
            } else {
                if (Bl(e)) throw Error(i(418));
                ((e.flags = (e.flags & -4097) | 2), (Be = !1), (pt = e));
            }
        }
    }
    function Eu(e) {
        for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
        pt = e;
    }
    function Lo(e) {
        if (e !== pt) return !1;
        if (!Be) return (Eu(e), (Be = !0), !1);
        var t;
        if (
            ((t = e.tag !== 3) &&
                !(t = e.tag !== 5) &&
                ((t = e.type), (t = t !== "head" && t !== "body" && !gl(e.type, e.memoizedProps))),
            t && (t = vt))
        ) {
            if (Bl(e)) throw (Cu(), Error(i(418)));
            for (; t; ) (Bu(e, t), (t = or(t.nextSibling)));
        }
        if ((Eu(e), e.tag === 13)) {
            if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
                throw Error(i(317));
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
    function Cu() {
        for (var e = vt; e; ) e = or(e.nextSibling);
    }
    function Jr() {
        ((vt = pt = null), (Be = !1));
    }
    function El(e) {
        Et === null ? (Et = [e]) : Et.push(e);
    }
    var lp = Q.ReactCurrentBatchConfig;
    function Ln(e, t, r) {
        if (((e = r.ref), e !== null && typeof e != "function" && typeof e != "object")) {
            if (r._owner) {
                if (((r = r._owner), r)) {
                    if (r.tag !== 1) throw Error(i(309));
                    var l = r.stateNode;
                }
                if (!l) throw Error(i(147, e));
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
            if (typeof e != "string") throw Error(i(284));
            if (!r._owner) throw Error(i(290, e));
        }
        return e;
    }
    function Oo(e, t) {
        throw (
            (e = Object.prototype.toString.call(t)),
            Error(
                i(
                    31,
                    e === "[object Object]"
                        ? "object with keys {" + Object.keys(t).join(", ") + "}"
                        : e
                )
            )
        );
    }
    function zu(e) {
        var t = e._init;
        return t(e._payload);
    }
    function Nu(e) {
        function t(B, _) {
            if (e) {
                var E = B.deletions;
                E === null ? ((B.deletions = [_]), (B.flags |= 16)) : E.push(_);
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
        function u(B, _, E) {
            return (
                (B.index = E),
                e
                    ? ((E = B.alternate),
                      E !== null
                          ? ((E = E.index), E < _ ? ((B.flags |= 2), _) : E)
                          : ((B.flags |= 2), _))
                    : ((B.flags |= 1048576), _)
            );
        }
        function d(B) {
            return (e && B.alternate === null && (B.flags |= 2), B);
        }
        function g(B, _, E, M) {
            return _ === null || _.tag !== 6
                ? ((_ = ys(E, B.mode, M)), (_.return = B), _)
                : ((_ = s(_, E)), (_.return = B), _);
        }
        function w(B, _, E, M) {
            var te = E.type;
            return te === ee
                ? j(B, _, E.props.children, M, E.key)
                : _ !== null &&
                    (_.elementType === te ||
                        (typeof te == "object" &&
                            te !== null &&
                            te.$$typeof === A &&
                            zu(te) === _.type))
                  ? ((M = s(_, E.props)), (M.ref = Ln(B, _, E)), (M.return = B), M)
                  : ((M = ui(E.type, E.key, E.props, null, B.mode, M)),
                    (M.ref = Ln(B, _, E)),
                    (M.return = B),
                    M);
        }
        function z(B, _, E, M) {
            return _ === null ||
                _.tag !== 4 ||
                _.stateNode.containerInfo !== E.containerInfo ||
                _.stateNode.implementation !== E.implementation
                ? ((_ = ws(E, B.mode, M)), (_.return = B), _)
                : ((_ = s(_, E.children || [])), (_.return = B), _);
        }
        function j(B, _, E, M, te) {
            return _ === null || _.tag !== 7
                ? ((_ = Ir(E, B.mode, M, te)), (_.return = B), _)
                : ((_ = s(_, E)), (_.return = B), _);
        }
        function I(B, _, E) {
            if ((typeof _ == "string" && _ !== "") || typeof _ == "number")
                return ((_ = ys("" + _, B.mode, E)), (_.return = B), _);
            if (typeof _ == "object" && _ !== null) {
                switch (_.$$typeof) {
                    case re:
                        return (
                            (E = ui(_.type, _.key, _.props, null, B.mode, E)),
                            (E.ref = Ln(B, null, _)),
                            (E.return = B),
                            E
                        );
                    case G:
                        return ((_ = ws(_, B.mode, E)), (_.return = B), _);
                    case A:
                        var M = _._init;
                        return I(B, M(_._payload), E);
                }
                if (hn(_) || V(_)) return ((_ = Ir(_, B.mode, E, null)), (_.return = B), _);
                Oo(B, _);
            }
            return null;
        }
        function R(B, _, E, M) {
            var te = _ !== null ? _.key : null;
            if ((typeof E == "string" && E !== "") || typeof E == "number")
                return te !== null ? null : g(B, _, "" + E, M);
            if (typeof E == "object" && E !== null) {
                switch (E.$$typeof) {
                    case re:
                        return E.key === te ? w(B, _, E, M) : null;
                    case G:
                        return E.key === te ? z(B, _, E, M) : null;
                    case A:
                        return ((te = E._init), R(B, _, te(E._payload), M));
                }
                if (hn(E) || V(E)) return te !== null ? null : j(B, _, E, M, null);
                Oo(B, E);
            }
            return null;
        }
        function $(B, _, E, M, te) {
            if ((typeof M == "string" && M !== "") || typeof M == "number")
                return ((B = B.get(E) || null), g(_, B, "" + M, te));
            if (typeof M == "object" && M !== null) {
                switch (M.$$typeof) {
                    case re:
                        return ((B = B.get(M.key === null ? E : M.key) || null), w(_, B, M, te));
                    case G:
                        return ((B = B.get(M.key === null ? E : M.key) || null), z(_, B, M, te));
                    case A:
                        var ne = M._init;
                        return $(B, _, E, ne(M._payload), te);
                }
                if (hn(M) || V(M)) return ((B = B.get(E) || null), j(_, B, M, te, null));
                Oo(_, M);
            }
            return null;
        }
        function J(B, _, E, M) {
            for (
                var te = null, ne = null, oe = _, se = (_ = 0), $e = null;
                oe !== null && se < E.length;
                se++
            ) {
                oe.index > se ? (($e = oe), (oe = null)) : ($e = oe.sibling);
                var pe = R(B, oe, E[se], M);
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
            if (se === E.length) return (r(B, oe), Be && Er(B, se), te);
            if (oe === null) {
                for (; se < E.length; se++)
                    ((oe = I(B, E[se], M)),
                        oe !== null &&
                            ((_ = u(oe, _, se)),
                            ne === null ? (te = oe) : (ne.sibling = oe),
                            (ne = oe)));
                return (Be && Er(B, se), te);
            }
            for (oe = l(B, oe); se < E.length; se++)
                (($e = $(oe, B, se, E[se], M)),
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
                Be && Er(B, se),
                te
            );
        }
        function Z(B, _, E, M) {
            var te = V(E);
            if (typeof te != "function") throw Error(i(150));
            if (((E = te.call(E)), E == null)) throw Error(i(151));
            for (
                var ne = (te = null), oe = _, se = (_ = 0), $e = null, pe = E.next();
                oe !== null && !pe.done;
                se++, pe = E.next()
            ) {
                oe.index > se ? (($e = oe), (oe = null)) : ($e = oe.sibling);
                var mr = R(B, oe, pe.value, M);
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
            if (pe.done) return (r(B, oe), Be && Er(B, se), te);
            if (oe === null) {
                for (; !pe.done; se++, pe = E.next())
                    ((pe = I(B, pe.value, M)),
                        pe !== null &&
                            ((_ = u(pe, _, se)),
                            ne === null ? (te = pe) : (ne.sibling = pe),
                            (ne = pe)));
                return (Be && Er(B, se), te);
            }
            for (oe = l(B, oe); !pe.done; se++, pe = E.next())
                ((pe = $(oe, B, se, pe.value, M)),
                    pe !== null &&
                        (e && pe.alternate !== null && oe.delete(pe.key === null ? se : pe.key),
                        (_ = u(pe, _, se)),
                        ne === null ? (te = pe) : (ne.sibling = pe),
                        (ne = pe)));
            return (
                e &&
                    oe.forEach(function (Op) {
                        return t(B, Op);
                    }),
                Be && Er(B, se),
                te
            );
        }
        function Ie(B, _, E, M) {
            if (
                (typeof E == "object" &&
                    E !== null &&
                    E.type === ee &&
                    E.key === null &&
                    (E = E.props.children),
                typeof E == "object" && E !== null)
            ) {
                switch (E.$$typeof) {
                    case re:
                        e: {
                            for (var te = E.key, ne = _; ne !== null; ) {
                                if (ne.key === te) {
                                    if (((te = E.type), te === ee)) {
                                        if (ne.tag === 7) {
                                            (r(B, ne.sibling),
                                                (_ = s(ne, E.props.children)),
                                                (_.return = B),
                                                (B = _));
                                            break e;
                                        }
                                    } else if (
                                        ne.elementType === te ||
                                        (typeof te == "object" &&
                                            te !== null &&
                                            te.$$typeof === A &&
                                            zu(te) === ne.type)
                                    ) {
                                        (r(B, ne.sibling),
                                            (_ = s(ne, E.props)),
                                            (_.ref = Ln(B, ne, E)),
                                            (_.return = B),
                                            (B = _));
                                        break e;
                                    }
                                    r(B, ne);
                                    break;
                                } else t(B, ne);
                                ne = ne.sibling;
                            }
                            E.type === ee
                                ? ((_ = Ir(E.props.children, B.mode, M, E.key)),
                                  (_.return = B),
                                  (B = _))
                                : ((M = ui(E.type, E.key, E.props, null, B.mode, M)),
                                  (M.ref = Ln(B, _, E)),
                                  (M.return = B),
                                  (B = M));
                        }
                        return d(B);
                    case G:
                        e: {
                            for (ne = E.key; _ !== null; ) {
                                if (_.key === ne)
                                    if (
                                        _.tag === 4 &&
                                        _.stateNode.containerInfo === E.containerInfo &&
                                        _.stateNode.implementation === E.implementation
                                    ) {
                                        (r(B, _.sibling),
                                            (_ = s(_, E.children || [])),
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
                            ((_ = ws(E, B.mode, M)), (_.return = B), (B = _));
                        }
                        return d(B);
                    case A:
                        return ((ne = E._init), Ie(B, _, ne(E._payload), M));
                }
                if (hn(E)) return J(B, _, E, M);
                if (V(E)) return Z(B, _, E, M);
                Oo(B, E);
            }
            return (typeof E == "string" && E !== "") || typeof E == "number"
                ? ((E = "" + E),
                  _ !== null && _.tag === 6
                      ? (r(B, _.sibling), (_ = s(_, E)), (_.return = B), (B = _))
                      : (r(B, _), (_ = ys(E, B.mode, M)), (_.return = B), (B = _)),
                  d(B))
                : r(B, _);
        }
        return Ie;
    }
    var Zr = Nu(!0),
        Pu = Nu(!1),
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
                if (qo === null) throw Error(i(308));
                ((en = e), (qo.dependencies = { lanes: 0, firstContext: e }));
            } else en = en.next = e;
        return t;
    }
    var Cr = null;
    function Fl(e) {
        Cr === null ? (Cr = [e]) : Cr.push(e);
    }
    function Fu(e, t, r, l) {
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
    function Ru(e, t) {
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
    function ju(e, t) {
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
    function Iu(e, t, r) {
        if (((e = t.effects), (t.effects = null), e !== null))
            for (t = 0; t < e.length; t++) {
                var l = e[t],
                    s = l.callback;
                if (s !== null) {
                    if (((l.callback = null), (l = r), typeof s != "function"))
                        throw Error(i(191, s));
                    s.call(l);
                }
            }
    }
    var On = {},
        Mt = ir(On),
        An = ir(On),
        qn = ir(On);
    function zr(e) {
        if (e === On) throw Error(i(174));
        return e;
    }
    function jl(e, t) {
        switch ((be(qn, t), be(An, e), be(Mt, On), (e = t.nodeType), e)) {
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
        (xe(Mt), be(Mt, t));
    }
    function rn() {
        (xe(Mt), xe(An), xe(qn));
    }
    function Du(e) {
        zr(qn.current);
        var t = zr(Mt.current),
            r = Ii(t, e.type);
        t !== r && (be(An, e), be(Mt, r));
    }
    function Il(e) {
        An.current === e && (xe(Mt), xe(An));
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
    function Ml() {
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
        sp = 0;
    function Ze() {
        throw Error(i(321));
    }
    function Ol(e, t) {
        if (t === null) return !1;
        for (var r = 0; r < t.length && r < e.length; r++) if (!Tt(e[r], t[r])) return !1;
        return !0;
    }
    function Al(e, t, r, l, s, u) {
        if (
            ((Nr = u),
            (ze = t),
            (t.memoizedState = null),
            (t.updateQueue = null),
            (t.lanes = 0),
            (Vo.current = e === null || e.memoizedState === null ? fp : dp),
            (e = r(l, s)),
            Hn)
        ) {
            u = 0;
            do {
                if (((Hn = !1), (Wn = 0), 25 <= u)) throw Error(i(301));
                ((u += 1),
                    (Ve = He = null),
                    (t.updateQueue = null),
                    (Vo.current = hp),
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
            throw Error(i(300));
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
            if (e === null) throw Error(i(310));
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
        if (r === null) throw Error(i(311));
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
                Tt(l, t.memoizedState) || (at = !0),
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
        if (r === null) throw Error(i(311));
        r.lastRenderedReducer = e;
        var l = r.dispatch,
            s = r.pending,
            u = t.memoizedState;
        if (s !== null) {
            r.pending = null;
            var d = (s = s.next);
            do ((u = e(u, d.action)), (d = d.next));
            while (d !== s);
            (Tt(u, t.memoizedState) || (at = !0),
                (t.memoizedState = u),
                t.baseQueue === null && (t.baseState = u),
                (r.lastRenderedState = u));
        }
        return [u, l];
    }
    function Mu() {}
    function Lu(e, t) {
        var r = ze,
            l = kt(),
            s = t(),
            u = !Tt(l.memoizedState, s);
        if (
            (u && ((l.memoizedState = s), (at = !0)),
            (l = l.queue),
            Ul(qu.bind(null, r, l, e), [e]),
            l.getSnapshot !== t || u || (Ve !== null && Ve.memoizedState.tag & 1))
        ) {
            if (((r.flags |= 2048), Vn(9, Au.bind(null, r, l, s, t), void 0, null), Ke === null))
                throw Error(i(349));
            (Nr & 30) !== 0 || Ou(r, t, s);
        }
        return s;
    }
    function Ou(e, t, r) {
        ((e.flags |= 16384),
            (e = { getSnapshot: t, value: r }),
            (t = ze.updateQueue),
            t === null
                ? ((t = { lastEffect: null, stores: null }), (ze.updateQueue = t), (t.stores = [e]))
                : ((r = t.stores), r === null ? (t.stores = [e]) : r.push(e)));
    }
    function Au(e, t, r, l) {
        ((t.value = r), (t.getSnapshot = l), Hu(t) && Wu(e));
    }
    function qu(e, t, r) {
        return r(function () {
            Hu(t) && Wu(e);
        });
    }
    function Hu(e) {
        var t = e.getSnapshot;
        e = e.value;
        try {
            var r = t();
            return !Tt(e, r);
        } catch {
            return !0;
        }
    }
    function Wu(e) {
        var t = Vt(e, 1);
        t !== null && Pt(t, e, 1, -1);
    }
    function Uu(e) {
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
            (e = e.dispatch = cp.bind(null, ze, e)),
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
    function Vu() {
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
            if (((u = d.destroy), l !== null && Ol(l, d.deps))) {
                s.memoizedState = Vn(t, r, u, l);
                return;
            }
        }
        ((ze.flags |= e), (s.memoizedState = Vn(1 | t, r, u, l)));
    }
    function Ku(e, t) {
        return $o(8390656, 8, e, t);
    }
    function Ul(e, t) {
        return Qo(2048, 8, e, t);
    }
    function $u(e, t) {
        return Qo(4, 2, e, t);
    }
    function Qu(e, t) {
        return Qo(4, 4, e, t);
    }
    function Gu(e, t) {
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
    function Xu(e, t, r) {
        return ((r = r != null ? r.concat([e]) : null), Qo(4, 4, Gu.bind(null, t, e), r));
    }
    function Vl() {}
    function Yu(e, t) {
        var r = kt();
        t = t === void 0 ? null : t;
        var l = r.memoizedState;
        return l !== null && t !== null && Ol(t, l[1]) ? l[0] : ((r.memoizedState = [e, t]), e);
    }
    function Ju(e, t) {
        var r = kt();
        t = t === void 0 ? null : t;
        var l = r.memoizedState;
        return l !== null && t !== null && Ol(t, l[1])
            ? l[0]
            : ((e = e()), (r.memoizedState = [e, t]), e);
    }
    function Zu(e, t, r) {
        return (Nr & 21) === 0
            ? (e.baseState && ((e.baseState = !1), (at = !0)), (e.memoizedState = r))
            : (Tt(r, t) || ((r = za()), (ze.lanes |= r), (Pr |= r), (e.baseState = !0)), t);
    }
    function ap(e, t) {
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
    function ec() {
        return kt().memoizedState;
    }
    function up(e, t, r) {
        var l = hr(e);
        if (((r = { lane: l, action: r, hasEagerState: !1, eagerState: null, next: null }), tc(e)))
            rc(t, r);
        else if (((r = Fu(e, t, r, l)), r !== null)) {
            var s = ot();
            (Pt(r, e, l, s), nc(r, t, l));
        }
    }
    function cp(e, t, r) {
        var l = hr(e),
            s = { lane: l, action: r, hasEagerState: !1, eagerState: null, next: null };
        if (tc(e)) rc(t, s);
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
                    if (((s.hasEagerState = !0), (s.eagerState = g), Tt(g, d))) {
                        var w = t.interleaved;
                        (w === null ? ((s.next = s), Fl(t)) : ((s.next = w.next), (w.next = s)),
                            (t.interleaved = s));
                        return;
                    }
                } catch {
                } finally {
                }
            ((r = Fu(e, t, s, l)), r !== null && ((s = ot()), Pt(r, e, l, s), nc(r, t, l)));
        }
    }
    function tc(e) {
        var t = e.alternate;
        return e === ze || (t !== null && t === ze);
    }
    function rc(e, t) {
        Hn = Ko = !0;
        var r = e.pending;
        (r === null ? (t.next = t) : ((t.next = r.next), (r.next = t)), (e.pending = t));
    }
    function nc(e, t, r) {
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
        fp = {
            readContext: _t,
            useCallback: function (e, t) {
                return ((Lt().memoizedState = [e, t === void 0 ? null : t]), e);
            },
            useContext: _t,
            useEffect: Ku,
            useImperativeHandle: function (e, t, r) {
                return (
                    (r = r != null ? r.concat([e]) : null),
                    $o(4194308, 4, Gu.bind(null, t, e), r)
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
                    (e = e.dispatch = up.bind(null, ze, e)),
                    [l.memoizedState, e]
                );
            },
            useRef: function (e) {
                var t = Lt();
                return ((e = { current: e }), (t.memoizedState = e));
            },
            useState: Uu,
            useDebugValue: Vl,
            useDeferredValue: function (e) {
                return (Lt().memoizedState = e);
            },
            useTransition: function () {
                var e = Uu(!1),
                    t = e[0];
                return ((e = ap.bind(null, e[1])), (Lt().memoizedState = e), [t, e]);
            },
            useMutableSource: function () {},
            useSyncExternalStore: function (e, t, r) {
                var l = ze,
                    s = Lt();
                if (Be) {
                    if (r === void 0) throw Error(i(407));
                    r = r();
                } else {
                    if (((r = t()), Ke === null)) throw Error(i(349));
                    (Nr & 30) !== 0 || Ou(l, t, r);
                }
                s.memoizedState = r;
                var u = { value: r, getSnapshot: t };
                return (
                    (s.queue = u),
                    Ku(qu.bind(null, l, u, e), [e]),
                    (l.flags |= 2048),
                    Vn(9, Au.bind(null, l, u, r, t), void 0, null),
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
                } else ((r = sp++), (t = ":" + t + "r" + r.toString(32) + ":"));
                return (e.memoizedState = t);
            },
            unstable_isNewReconciler: !1,
        },
        dp = {
            readContext: _t,
            useCallback: Yu,
            useContext: _t,
            useEffect: Ul,
            useImperativeHandle: Xu,
            useInsertionEffect: $u,
            useLayoutEffect: Qu,
            useMemo: Ju,
            useReducer: Hl,
            useRef: Vu,
            useState: function () {
                return Hl(Un);
            },
            useDebugValue: Vl,
            useDeferredValue: function (e) {
                var t = kt();
                return Zu(t, He.memoizedState, e);
            },
            useTransition: function () {
                var e = Hl(Un)[0],
                    t = kt().memoizedState;
                return [e, t];
            },
            useMutableSource: Mu,
            useSyncExternalStore: Lu,
            useId: ec,
            unstable_isNewReconciler: !1,
        },
        hp = {
            readContext: _t,
            useCallback: Yu,
            useContext: _t,
            useEffect: Ul,
            useImperativeHandle: Xu,
            useInsertionEffect: $u,
            useLayoutEffect: Qu,
            useMemo: Ju,
            useReducer: Wl,
            useRef: Vu,
            useState: function () {
                return Wl(Un);
            },
            useDebugValue: Vl,
            useDeferredValue: function (e) {
                var t = kt();
                return He === null ? (t.memoizedState = e) : Zu(t, He.memoizedState, e);
            },
            useTransition: function () {
                var e = Wl(Un)[0],
                    t = kt().memoizedState;
                return [e, t];
            },
            useMutableSource: Mu,
            useSyncExternalStore: Lu,
            useId: ec,
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
    function oc(e, t, r, l, s, u, d) {
        return (
            (e = e.stateNode),
            typeof e.shouldComponentUpdate == "function"
                ? e.shouldComponentUpdate(l, u, d)
                : t.prototype && t.prototype.isPureReactComponent
                  ? !Pn(r, l) || !Pn(s, u)
                  : !0
        );
    }
    function ic(e, t, r) {
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
    function lc(e, t, r, l) {
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
    var pp = typeof WeakMap == "function" ? WeakMap : Map;
    function sc(e, t, r) {
        ((r = Kt(-1, r)), (r.tag = 3), (r.payload = { element: null }));
        var l = t.value;
        return (
            (r.callback = function () {
                (ni || ((ni = !0), (cs = l)), Gl(e, t));
            }),
            r
        );
    }
    function ac(e, t, r) {
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
    function uc(e, t, r) {
        var l = e.pingCache;
        if (l === null) {
            l = e.pingCache = new pp();
            var s = new Set();
            l.set(t, s);
        } else ((s = l.get(t)), s === void 0 && ((s = new Set()), l.set(t, s)));
        s.has(r) || (s.add(r), (e = Cp.bind(null, e, t, r)), t.then(e, e));
    }
    function cc(e) {
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
    function fc(e, t, r, l, s) {
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
    var vp = Q.ReactCurrentOwner,
        at = !1;
    function nt(e, t, r, l) {
        t.child = e === null ? Pu(t, null, r, l) : Zr(t, e.child, r, l);
    }
    function dc(e, t, r, l, s) {
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
    function hc(e, t, r, l, s) {
        if (e === null) {
            var u = r.type;
            return typeof u == "function" &&
                !gs(u) &&
                u.defaultProps === void 0 &&
                r.compare === null &&
                r.defaultProps === void 0
                ? ((t.tag = 15), (t.type = u), pc(e, t, u, l, s))
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
    function pc(e, t, r, l, s) {
        if (e !== null) {
            var u = e.memoizedProps;
            if (Pn(u, l) && e.ref === t.ref)
                if (((at = !1), (t.pendingProps = l = u), (e.lanes & s) !== 0))
                    (e.flags & 131072) !== 0 && (at = !0);
                else return ((t.lanes = e.lanes), $t(e, t, s));
        }
        return Xl(e, t, r, l, s);
    }
    function vc(e, t, r) {
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
    function mc(e, t) {
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
    function gc(e, t, r, l, s) {
        if (st(r)) {
            var u = !0;
            jo(t);
        } else u = !1;
        if ((tn(t, s), t.stateNode === null)) (Jo(e, t), ic(t, r, l), $l(t, r, l, s), (l = !0));
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
                ((g !== l || w !== z) && lc(t, d, l, z)),
                (ar = !1));
            var R = t.memoizedState;
            ((d.state = R),
                Wo(t, l, d, s),
                (w = t.memoizedState),
                g !== l || R !== w || lt.current || ar
                    ? (typeof j == "function" && (Kl(t, r, j, l), (w = t.memoizedState)),
                      (g = ar || oc(t, r, g, l, R, w, z))
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
                Ru(e, t),
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
                ((g !== I || R !== w) && lc(t, d, l, w)),
                (ar = !1),
                (R = t.memoizedState),
                (d.state = R),
                Wo(t, l, d, s));
            var J = t.memoizedState;
            g !== I || R !== J || lt.current || ar
                ? (typeof $ == "function" && (Kl(t, r, $, l), (J = t.memoizedState)),
                  (z = ar || oc(t, r, z, l, R, J, w) || !1)
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
        mc(e, t);
        var d = (t.flags & 128) !== 0;
        if (!l && !d) return (s && ku(t, r, !1), $t(e, t, u));
        ((l = t.stateNode), (vp.current = t));
        var g = d && typeof r.getDerivedStateFromError != "function" ? null : l.render();
        return (
            (t.flags |= 1),
            e !== null && d
                ? ((t.child = Zr(t, e.child, null, u)), (t.child = Zr(t, null, g, u)))
                : nt(e, t, g, u),
            (t.memoizedState = l.state),
            s && ku(t, r, !0),
            t.child
        );
    }
    function yc(e) {
        var t = e.stateNode;
        (t.pendingContext
            ? bu(e, t.pendingContext, t.pendingContext !== t.context)
            : t.context && bu(e, t.context, !1),
            jl(e, t.containerInfo));
    }
    function wc(e, t, r, l, s) {
        return (Jr(), El(s), (t.flags |= 256), nt(e, t, r, l), t.child);
    }
    var Jl = { dehydrated: null, treeContext: null, retryLane: 0 };
    function Zl(e) {
        return { baseLanes: e, cachePool: null, transitions: null };
    }
    function bc(e, t, r) {
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
                Tl(t),
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
            return mp(e, t, d, l, g, s, r);
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
            l !== null && El(l),
            Zr(t, e.child, null, r),
            (e = es(t, t.pendingProps.children)),
            (e.flags |= 2),
            (t.memoizedState = null),
            e
        );
    }
    function mp(e, t, r, l, s, u, d) {
        if (r)
            return t.flags & 256
                ? ((t.flags &= -257), (l = Ql(Error(i(422)))), Yo(e, t, d, l))
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
            return ((l = g), (u = Error(i(419))), (l = Ql(u, l, void 0)), Yo(e, t, d, l));
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
            return (ms(), (l = Ql(Error(i(421)))), Yo(e, t, d, l));
        }
        return s.data === "$?"
            ? ((t.flags |= 128),
              (t.child = e.child),
              (t = zp.bind(null, e)),
              (s._reactRetry = t),
              null)
            : ((e = u.treeContext),
              (vt = or(s.nextSibling)),
              (pt = t),
              (Be = !0),
              (Et = null),
              e !== null &&
                  ((wt[bt++] = Wt),
                  (wt[bt++] = Ut),
                  (wt[bt++] = Tr),
                  (Wt = e.id),
                  (Ut = e.overflow),
                  (Tr = t)),
              (t = es(t, l.children)),
              (t.flags |= 4096),
              t);
    }
    function _c(e, t, r) {
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
    function kc(e, t, r) {
        var l = t.pendingProps,
            s = l.revealOrder,
            u = l.tail;
        if ((nt(e, t, l.children, r), (l = Ce.current), (l & 2) !== 0))
            ((l = (l & 1) | 2), (t.flags |= 128));
        else {
            if (e !== null && (e.flags & 128) !== 0)
                e: for (e = t.child; e !== null; ) {
                    if (e.tag === 13) e.memoizedState !== null && _c(e, r, t);
                    else if (e.tag === 19) _c(e, r, t);
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
        if (e !== null && t.child !== e.child) throw Error(i(153));
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
    function gp(e, t, r) {
        switch (t.tag) {
            case 3:
                (yc(t), Jr());
                break;
            case 5:
                Du(t);
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
                          ? bc(e, t, r)
                          : (be(Ce, Ce.current & 1),
                            (e = $t(e, t, r)),
                            e !== null ? e.sibling : null);
                be(Ce, Ce.current & 1);
                break;
            case 19:
                if (((l = (r & t.childLanes) !== 0), (e.flags & 128) !== 0)) {
                    if (l) return kc(e, t, r);
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
                return ((t.lanes = 0), vc(e, t, r));
        }
        return $t(e, t, r);
    }
    var xc, rs, Sc, Bc;
    ((xc = function (e, t) {
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
        (Sc = function (e, t, r, l) {
            var s = e.memoizedProps;
            if (s !== l) {
                ((e = t.stateNode), zr(Mt.current));
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
        (Bc = function (e, t, r, l) {
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
    function yp(e, t, r) {
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
                    Ml(),
                    l.pendingContext && ((l.context = l.pendingContext), (l.pendingContext = null)),
                    (e === null || e.child === null) &&
                        (Lo(t)
                            ? (t.flags |= 4)
                            : e === null ||
                              (e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
                              ((t.flags |= 1024), Et !== null && (hs(Et), (Et = null)))),
                    rs(e, t),
                    et(t),
                    null
                );
            case 5:
                Il(t);
                var s = zr(qn.current);
                if (((r = t.type), e !== null && t.stateNode != null))
                    (Sc(e, t, r, l, s),
                        e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
                else {
                    if (!l) {
                        if (t.stateNode === null) throw Error(i(166));
                        return (et(t), null);
                    }
                    if (((e = zr(Mt.current)), Lo(t))) {
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
                                (ia(l, u), ke("invalid", l));
                                break;
                            case "select":
                                ((l._wrapperState = { wasMultiple: !!u.multiple }),
                                    ke("invalid", l));
                                break;
                            case "textarea":
                                (aa(l, u), ke("invalid", l));
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
                                (lo(l), sa(l, u, !0));
                                break;
                            case "textarea":
                                (lo(l), ca(l));
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
                            e === "http://www.w3.org/1999/xhtml" && (e = fa(r)),
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
                            xc(e, t, !1, !1),
                            (t.stateNode = e));
                        e: {
                            switch (((d = Mi(r, l)), r)) {
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
                                    (ia(e, l), (s = Pi(e, l)), ke("invalid", e));
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
                                    (aa(e, l), (s = ji(e, l)), ke("invalid", e));
                                    break;
                                default:
                                    s = l;
                            }
                            (Di(r, s), (g = s));
                            for (u in g)
                                if (g.hasOwnProperty(u)) {
                                    var w = g[u];
                                    u === "style"
                                        ? pa(e, w)
                                        : u === "dangerouslySetInnerHTML"
                                          ? ((w = w ? w.__html : void 0), w != null && da(e, w))
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
                                    (lo(e), sa(e, l, !1));
                                    break;
                                case "textarea":
                                    (lo(e), ca(e));
                                    break;
                                case "option":
                                    l.value != null && e.setAttribute("value", "" + me(l.value));
                                    break;
                                case "select":
                                    ((e.multiple = !!l.multiple),
                                        (u = l.value),
                                        u != null
                                            ? Mr(e, !!l.multiple, u, !1)
                                            : l.defaultValue != null &&
                                              Mr(e, !!l.multiple, l.defaultValue, !0));
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
                if (e && t.stateNode != null) Bc(e, t, e.memoizedProps, l);
                else {
                    if (typeof l != "string" && t.stateNode === null) throw Error(i(166));
                    if (((r = zr(qn.current)), zr(Mt.current), Lo(t))) {
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
                        (Cu(), Jr(), (t.flags |= 98560), (u = !1));
                    else if (((u = Lo(t)), l !== null && l.dehydrated !== null)) {
                        if (e === null) {
                            if (!u) throw Error(i(318));
                            if (((u = t.memoizedState), (u = u !== null ? u.dehydrated : null), !u))
                                throw Error(i(317));
                            u[Dt] = t;
                        } else
                            (Jr(),
                                (t.flags & 128) === 0 && (t.memoizedState = null),
                                (t.flags |= 4));
                        (et(t), (u = !1));
                    } else (Et !== null && (hs(Et), (Et = null)), (u = !0));
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
        throw Error(i(156, t.tag));
    }
    function wp(e, t) {
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
                    Ml(),
                    (e = t.flags),
                    (e & 65536) !== 0 && (e & 128) === 0
                        ? ((t.flags = (e & -65537) | 128), t)
                        : null
                );
            case 5:
                return (Il(t), null);
            case 13:
                if ((xe(Ce), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
                    if (t.alternate === null) throw Error(i(340));
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
        bp = typeof WeakSet == "function" ? WeakSet : Set,
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
    function _p(e, t) {
        if (((vl = wo), (e = ou()), sl(e))) {
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
                                    var E = t.stateNode.containerInfo;
                                    E.nodeType === 1
                                        ? (E.textContent = "")
                                        : E.nodeType === 9 &&
                                          E.documentElement &&
                                          E.removeChild(E.documentElement);
                                    break;
                                case 5:
                                case 6:
                                case 4:
                                case 17:
                                    break;
                                default:
                                    throw Error(i(163));
                            }
                    } catch (M) {
                        Ne(t, t.return, M);
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
    function Ec(e) {
        var t = e.alternate;
        (t !== null && ((e.alternate = null), Ec(t)),
            (e.child = null),
            (e.deletions = null),
            (e.sibling = null),
            e.tag === 5 &&
                ((t = e.stateNode),
                t !== null &&
                    (delete t[Dt], delete t[Dn], delete t[bl], delete t[np], delete t[op])),
            (e.stateNode = null),
            (e.return = null),
            (e.dependencies = null),
            (e.memoizedProps = null),
            (e.memoizedState = null),
            (e.pendingProps = null),
            (e.stateNode = null),
            (e.updateQueue = null));
    }
    function Cc(e) {
        return e.tag === 5 || e.tag === 3 || e.tag === 4;
    }
    function zc(e) {
        e: for (;;) {
            for (; e.sibling === null; ) {
                if (e.return === null || Cc(e.return)) return null;
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
        for (r = r.child; r !== null; ) (Nc(e, t, r), (r = r.sibling));
    }
    function Nc(e, t, r) {
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
    function Pc(e) {
        var t = e.updateQueue;
        if (t !== null) {
            e.updateQueue = null;
            var r = e.stateNode;
            (r === null && (r = e.stateNode = new bp()),
                t.forEach(function (l) {
                    var s = Np.bind(null, e, l);
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
                    if (Ge === null) throw Error(i(160));
                    (Nc(u, d, s), (Ge = null), (zt = !1));
                    var w = s.alternate;
                    (w !== null && (w.return = null), (s.return = null));
                } catch (z) {
                    Ne(s, t, z);
                }
            }
        if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) (Fc(t, e), (t = t.sibling));
    }
    function Fc(e, t) {
        var r = e.alternate,
            l = e.flags;
        switch (e.tag) {
            case 0:
            case 11:
            case 14:
            case 15:
                if ((Nt(t, e), Ot(e), l & 4)) {
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
                (Nt(t, e), Ot(e), l & 512 && r !== null && on(r, r.return));
                break;
            case 5:
                if ((Nt(t, e), Ot(e), l & 512 && r !== null && on(r, r.return), e.flags & 32)) {
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
                            (g === "input" && u.type === "radio" && u.name != null && la(s, u),
                                Mi(g, d));
                            var z = Mi(g, u);
                            for (d = 0; d < w.length; d += 2) {
                                var j = w[d],
                                    I = w[d + 1];
                                j === "style"
                                    ? pa(s, I)
                                    : j === "dangerouslySetInnerHTML"
                                      ? da(s, I)
                                      : j === "children"
                                        ? pn(s, I)
                                        : D(s, j, I, z);
                            }
                            switch (g) {
                                case "input":
                                    Fi(s, u);
                                    break;
                                case "textarea":
                                    ua(s, u);
                                    break;
                                case "select":
                                    var R = s._wrapperState.wasMultiple;
                                    s._wrapperState.wasMultiple = !!u.multiple;
                                    var $ = u.value;
                                    $ != null
                                        ? Mr(s, !!u.multiple, $, !1)
                                        : R !== !!u.multiple &&
                                          (u.defaultValue != null
                                              ? Mr(s, !!u.multiple, u.defaultValue, !0)
                                              : Mr(s, !!u.multiple, u.multiple ? [] : "", !1));
                            }
                            s[Dn] = u;
                        } catch (Z) {
                            Ne(e, e.return, Z);
                        }
                }
                break;
            case 6:
                if ((Nt(t, e), Ot(e), l & 4)) {
                    if (e.stateNode === null) throw Error(i(162));
                    ((s = e.stateNode), (u = e.memoizedProps));
                    try {
                        s.nodeValue = u;
                    } catch (Z) {
                        Ne(e, e.return, Z);
                    }
                }
                break;
            case 3:
                if ((Nt(t, e), Ot(e), l & 4 && r !== null && r.memoizedState.isDehydrated))
                    try {
                        Bn(t.containerInfo);
                    } catch (Z) {
                        Ne(e, e.return, Z);
                    }
                break;
            case 4:
                (Nt(t, e), Ot(e));
                break;
            case 13:
                (Nt(t, e),
                    Ot(e),
                    (s = e.child),
                    s.flags & 8192 &&
                        ((u = s.memoizedState !== null),
                        (s.stateNode.isHidden = u),
                        !u ||
                            (s.alternate !== null && s.alternate.memoizedState !== null) ||
                            (us = je())),
                    l & 4 && Pc(e));
                break;
            case 22:
                if (
                    ((j = r !== null && r.memoizedState !== null),
                    e.mode & 1 ? ((tt = (z = tt) || j), Nt(t, e), (tt = z)) : Nt(t, e),
                    Ot(e),
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
                                            Ic(I);
                                            continue;
                                        }
                                }
                                $ !== null ? (($.return = R), (X = $)) : Ic(I);
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
                                              (g.style.display = ha("display", d))));
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
                (Nt(t, e), Ot(e), l & 4 && Pc(e));
                break;
            case 21:
                break;
            default:
                (Nt(t, e), Ot(e));
        }
    }
    function Ot(e) {
        var t = e.flags;
        if (t & 2) {
            try {
                e: {
                    for (var r = e.return; r !== null; ) {
                        if (Cc(r)) {
                            var l = r;
                            break e;
                        }
                        r = r.return;
                    }
                    throw Error(i(160));
                }
                switch (l.tag) {
                    case 5:
                        var s = l.stateNode;
                        l.flags & 32 && (pn(s, ""), (l.flags &= -33));
                        var u = zc(e);
                        ls(e, u, s);
                        break;
                    case 3:
                    case 4:
                        var d = l.stateNode.containerInfo,
                            g = zc(e);
                        is(e, g, d);
                        break;
                    default:
                        throw Error(i(161));
                }
            } catch (w) {
                Ne(e, e.return, w);
            }
            e.flags &= -3;
        }
        t & 4096 && (e.flags &= -4097);
    }
    function kp(e, t, r) {
        ((X = e), Rc(e));
    }
    function Rc(e, t, r) {
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
                                    ? Dc(s)
                                    : w !== null
                                      ? ((w.return = d), (X = w))
                                      : Dc(s));
                    for (; u !== null; ) ((X = u), Rc(u), (u = u.sibling));
                    ((X = s), (Zo = g), (tt = z));
                }
                jc(e);
            } else (s.subtreeFlags & 8772) !== 0 && u !== null ? ((u.return = s), (X = u)) : jc(e);
        }
    }
    function jc(e) {
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
                                u !== null && Iu(t, u, l);
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
                                    Iu(t, d, r);
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
                                throw Error(i(163));
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
    function Ic(e) {
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
    function Dc(e) {
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
    var xp = Math.ceil,
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
              : lp.transition !== null
                ? (si === 0 && (si = za()), si)
                : ((e = ge),
                  e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : La(e.type))),
                  e);
    }
    function Pt(e, t, r, l) {
        if (50 < Xn) throw ((Xn = 0), (fs = null), Error(i(185)));
        (bn(e, r, l),
            ((de & 2) === 0 || e !== Ke) &&
                (e === Ke && ((de & 2) === 0 && (ri |= r), We === 4 && pr(e, Xe)),
                ct(e, l),
                r === 1 && de === 0 && (t.mode & 1) === 0 && ((sn = je() + 500), Io && sr())));
    }
    function ct(e, t) {
        var r = e.callbackNode;
        lh(e, t);
        var l = mo(e, e === Ke ? Xe : 0);
        if (l === 0) (r !== null && Ta(r), (e.callbackNode = null), (e.callbackPriority = 0));
        else if (((t = l & -l), e.callbackPriority !== t)) {
            if ((r != null && Ta(r), t === 1))
                (e.tag === 0 ? ip(Lc.bind(null, e)) : xu(Lc.bind(null, e)),
                    tp(function () {
                        (de & 6) === 0 && sr();
                    }),
                    (r = null));
            else {
                switch (Na(l)) {
                    case 1:
                        r = Ui;
                        break;
                    case 4:
                        r = Ea;
                        break;
                    case 16:
                        r = fo;
                        break;
                    case 536870912:
                        r = Ca;
                        break;
                    default:
                        r = fo;
                }
                r = Kc(r, Mc.bind(null, e));
            }
            ((e.callbackPriority = t), (e.callbackNode = r));
        }
    }
    function Mc(e, t) {
        if (((li = -1), (si = 0), (de & 6) !== 0)) throw Error(i(327));
        var r = e.callbackNode;
        if (an() && e.callbackNode !== r) return null;
        var l = mo(e, e === Ke ? Xe : 0);
        if (l === 0) return null;
        if ((l & 30) !== 0 || (l & e.expiredLanes) !== 0 || t) t = ai(e, l);
        else {
            t = l;
            var s = de;
            de |= 2;
            var u = Ac();
            (Ke !== e || Xe !== t) && ((Qt = null), (sn = je() + 500), Rr(e, t));
            do
                try {
                    Tp();
                    break;
                } catch (g) {
                    Oc(e, g);
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
                        !Sp(s) &&
                        ((t = ai(e, l)),
                        t === 2 && ((u = Vi(e)), u !== 0 && ((l = u), (t = ds(e, u)))),
                        t === 1))
                )
                    throw ((r = Qn), Rr(e, 0), pr(e, l), ct(e, je()), r);
                switch (((e.finishedWork = s), (e.finishedLanes = l), t)) {
                    case 0:
                    case 1:
                        throw Error(i(345));
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
                                              : 1960 * xp(l / 1960)) - l),
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
                        throw Error(i(329));
                }
            }
        }
        return (ct(e, je()), e.callbackNode === r ? Mc.bind(null, e) : null);
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
    function Sp(e) {
        for (var t = e; ; ) {
            if (t.flags & 16384) {
                var r = t.updateQueue;
                if (r !== null && ((r = r.stores), r !== null))
                    for (var l = 0; l < r.length; l++) {
                        var s = r[l],
                            u = s.getSnapshot;
                        s = s.value;
                        try {
                            if (!Tt(u(), s)) return !1;
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
    function Lc(e) {
        if ((de & 6) !== 0) throw Error(i(327));
        an();
        var t = mo(e, 0);
        if ((t & 1) === 0) return (ct(e, je()), null);
        var r = ai(e, t);
        if (e.tag !== 0 && r === 2) {
            var l = Vi(e);
            l !== 0 && ((t = l), (r = ds(e, l)));
        }
        if (r === 1) throw ((r = Qn), Rr(e, 0), pr(e, t), ct(e, je()), r);
        if (r === 6) throw Error(i(345));
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
        if ((r !== -1 && ((e.timeoutHandle = -1), ep(r)), Le !== null))
            for (r = Le.return; r !== null; ) {
                var l = r;
                switch ((Sl(l), l.tag)) {
                    case 1:
                        ((l = l.type.childContextTypes), l != null && Ro());
                        break;
                    case 3:
                        (rn(), xe(lt), xe(Je), Ml());
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
    function Oc(e, t) {
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
                        var $ = cc(d);
                        if ($ !== null) {
                            (($.flags &= -257),
                                fc($, d, g, u, t),
                                $.mode & 1 && uc(u, z, t),
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
                                (uc(u, z, t), ms());
                                break e;
                            }
                            w = Error(i(426));
                        }
                    } else if (Be && g.mode & 1) {
                        var Ie = cc(d);
                        if (Ie !== null) {
                            ((Ie.flags & 65536) === 0 && (Ie.flags |= 256),
                                fc(Ie, d, g, u, t),
                                El(nn(w, g)));
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
                                var B = sc(u, w, t);
                                ju(u, B);
                                break e;
                            case 1:
                                g = w;
                                var _ = u.type,
                                    E = u.stateNode;
                                if (
                                    (u.flags & 128) === 0 &&
                                    (typeof _.getDerivedStateFromError == "function" ||
                                        (E !== null &&
                                            typeof E.componentDidCatch == "function" &&
                                            (fr === null || !fr.has(E))))
                                ) {
                                    ((u.flags |= 65536), (t &= -t), (u.lanes |= t));
                                    var M = ac(u, g, t);
                                    ju(u, M);
                                    break e;
                                }
                        }
                        u = u.return;
                    } while (u !== null);
                }
                Hc(r);
            } catch (te) {
                ((t = te), Le === r && r !== null && (Le = r = r.return));
                continue;
            }
            break;
        } while (!0);
    }
    function Ac() {
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
        var l = Ac();
        (Ke !== e || Xe !== t) && ((Qt = null), Rr(e, t));
        do
            try {
                Bp();
                break;
            } catch (s) {
                Oc(e, s);
            }
        while (!0);
        if ((zl(), (de = r), (ti.current = l), Le !== null)) throw Error(i(261));
        return ((Ke = null), (Xe = 0), We);
    }
    function Bp() {
        for (; Le !== null; ) qc(Le);
    }
    function Tp() {
        for (; Le !== null && !Yd(); ) qc(Le);
    }
    function qc(e) {
        var t = Vc(e.alternate, e, mt);
        ((e.memoizedProps = e.pendingProps), t === null ? Hc(e) : (Le = t), (ss.current = null));
    }
    function Hc(e) {
        var t = e;
        do {
            var r = t.alternate;
            if (((e = t.return), (t.flags & 32768) === 0)) {
                if (((r = yp(r, t, mt)), r !== null)) {
                    Le = r;
                    return;
                }
            } else {
                if (((r = wp(r, t)), r !== null)) {
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
            ((xt.transition = null), (ge = 1), Ep(e, t, r, l));
        } finally {
            ((xt.transition = s), (ge = l));
        }
        return null;
    }
    function Ep(e, t, r, l) {
        do an();
        while (dr !== null);
        if ((de & 6) !== 0) throw Error(i(327));
        r = e.finishedWork;
        var s = e.finishedLanes;
        if (r === null) return null;
        if (((e.finishedWork = null), (e.finishedLanes = 0), r === e.current)) throw Error(i(177));
        ((e.callbackNode = null), (e.callbackPriority = 0));
        var u = r.lanes | r.childLanes;
        if (
            (sh(e, u),
            e === Ke && ((Le = Ke = null), (Xe = 0)),
            ((r.subtreeFlags & 2064) === 0 && (r.flags & 2064) === 0) ||
                oi ||
                ((oi = !0),
                Kc(fo, function () {
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
                _p(e, r),
                Fc(r, e),
                $h(ml),
                (wo = !!vl),
                (ml = vl = null),
                (e.current = r),
                kp(r),
                Jd(),
                (de = g),
                (ge = d),
                (xt.transition = u));
        } else e.current = r;
        if (
            (oi && ((oi = !1), (dr = e), (ii = s)),
            (u = e.pendingLanes),
            u === 0 && (fr = null),
            th(r.stateNode),
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
            var e = Na(ii),
                t = xt.transition,
                r = ge;
            try {
                if (((xt.transition = null), (ge = 16 > e ? 16 : e), dr === null)) var l = !1;
                else {
                    if (((e = dr), (dr = null), (ii = 0), (de & 6) !== 0)) throw Error(i(331));
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
                                                if ((Ec(j), j === z)) {
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
                        var E = d.child;
                        if ((d.subtreeFlags & 2064) !== 0 && E !== null) ((E.return = d), (X = E));
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
                                var M = g.sibling;
                                if (M !== null) {
                                    ((M.return = g.return), (X = M));
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
    function Wc(e, t, r) {
        ((t = nn(r, t)),
            (t = sc(e, t, 1)),
            (e = ur(e, t, 1)),
            (t = ot()),
            e !== null && (bn(e, 1, t), ct(e, t)));
    }
    function Ne(e, t, r) {
        if (e.tag === 3) Wc(e, e, r);
        else
            for (; t !== null; ) {
                if (t.tag === 3) {
                    Wc(t, e, r);
                    break;
                } else if (t.tag === 1) {
                    var l = t.stateNode;
                    if (
                        typeof t.type.getDerivedStateFromError == "function" ||
                        (typeof l.componentDidCatch == "function" && (fr === null || !fr.has(l)))
                    ) {
                        ((e = nn(r, e)),
                            (e = ac(t, e, 1)),
                            (t = ur(t, e, 1)),
                            (e = ot()),
                            t !== null && (bn(t, 1, e), ct(t, e)));
                        break;
                    }
                }
                t = t.return;
            }
    }
    function Cp(e, t, r) {
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
    function Uc(e, t) {
        t === 0 &&
            ((e.mode & 1) === 0
                ? (t = 1)
                : ((t = vo), (vo <<= 1), (vo & 130023424) === 0 && (vo = 4194304)));
        var r = ot();
        ((e = Vt(e, t)), e !== null && (bn(e, t, r), ct(e, r)));
    }
    function zp(e) {
        var t = e.memoizedState,
            r = 0;
        (t !== null && (r = t.retryLane), Uc(e, r));
    }
    function Np(e, t) {
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
                throw Error(i(314));
        }
        (l !== null && l.delete(t), Uc(e, r));
    }
    var Vc;
    Vc = function (e, t, r) {
        if (e !== null)
            if (e.memoizedProps !== t.pendingProps || lt.current) at = !0;
            else {
                if ((e.lanes & r) === 0 && (t.flags & 128) === 0) return ((at = !1), gp(e, t, r));
                at = (e.flags & 131072) !== 0;
            }
        else ((at = !1), Be && (t.flags & 1048576) !== 0 && Su(t, Mo, t.index));
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
                        (s = t.tag = Fp(l)),
                        (e = Ct(l, e)),
                        s)
                    ) {
                        case 0:
                            t = Xl(null, t, l, e, r);
                            break e;
                        case 1:
                            t = gc(null, t, l, e, r);
                            break e;
                        case 11:
                            t = dc(null, t, l, e, r);
                            break e;
                        case 14:
                            t = hc(null, t, l, Ct(l.type, e), r);
                            break e;
                    }
                    throw Error(i(306, l, ""));
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
                    gc(e, t, l, s, r)
                );
            case 3:
                e: {
                    if ((yc(t), e === null)) throw Error(i(387));
                    ((l = t.pendingProps),
                        (u = t.memoizedState),
                        (s = u.element),
                        Ru(e, t),
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
                            ((s = nn(Error(i(423)), t)), (t = wc(e, t, l, r, s)));
                            break e;
                        } else if (l !== s) {
                            ((s = nn(Error(i(424)), t)), (t = wc(e, t, l, r, s)));
                            break e;
                        } else
                            for (
                                vt = or(t.stateNode.containerInfo.firstChild),
                                    pt = t,
                                    Be = !0,
                                    Et = null,
                                    r = Pu(t, null, l, r),
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
                    Du(t),
                    e === null && Tl(t),
                    (l = t.type),
                    (s = t.pendingProps),
                    (u = e !== null ? e.memoizedProps : null),
                    (d = s.children),
                    gl(l, s) ? (d = null) : u !== null && gl(l, u) && (t.flags |= 32),
                    mc(e, t),
                    nt(e, t, d, r),
                    t.child
                );
            case 6:
                return (e === null && Tl(t), null);
            case 13:
                return bc(e, t, r);
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
                    dc(e, t, l, s, r)
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
                        if (Tt(u.value, d)) {
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
                                    if (((d = u.return), d === null)) throw Error(i(341));
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
                    hc(e, t, l, s, r)
                );
            case 15:
                return pc(e, t, t.type, t.pendingProps, r);
            case 17:
                return (
                    (l = t.type),
                    (s = t.pendingProps),
                    (s = t.elementType === l ? s : Ct(l, s)),
                    Jo(e, t),
                    (t.tag = 1),
                    st(l) ? ((e = !0), jo(t)) : (e = !1),
                    tn(t, r),
                    ic(t, l, s),
                    $l(t, l, s, r),
                    Yl(null, t, l, !0, e, r)
                );
            case 19:
                return kc(e, t, r);
            case 22:
                return vc(e, t, r);
        }
        throw Error(i(156, t.tag));
    };
    function Kc(e, t) {
        return Ba(e, t);
    }
    function Pp(e, t, r, l) {
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
        return new Pp(e, t, r, l);
    }
    function gs(e) {
        return ((e = e.prototype), !(!e || !e.isReactComponent));
    }
    function Fp(e) {
        if (typeof e == "function") return gs(e) ? 1 : 0;
        if (e != null) {
            if (((e = e.$$typeof), e === Ee)) return 11;
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
                case Me:
                    return ((e = St(13, r, t, s)), (e.elementType = Me), (e.lanes = u), e);
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
                            case Ee:
                                d = 11;
                                break e;
                            case qe:
                                d = 14;
                                break e;
                            case A:
                                ((d = 16), (l = null));
                                break e;
                        }
                    throw Error(i(130, e == null ? e : typeof e, ""));
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
    function Rp(e, t, r, l, s) {
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
            (e = new Rp(e, t, r, g, w)),
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
    function jp(e, t, r) {
        var l = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
        return {
            $$typeof: G,
            key: l == null ? null : "" + l,
            children: e,
            containerInfo: t,
            implementation: r,
        };
    }
    function $c(e) {
        if (!e) return lr;
        e = e._reactInternals;
        e: {
            if (xr(e) !== e || e.tag !== 1) throw Error(i(170));
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
            throw Error(i(171));
        }
        if (e.tag === 1) {
            var r = e.type;
            if (st(r)) return _u(e, r, t);
        }
        return t;
    }
    function Qc(e, t, r, l, s, u, d, g, w) {
        return (
            (e = bs(r, l, !0, e, s, u, d, g, w)),
            (e.context = $c(null)),
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
            (r = $c(r)),
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
    function Gc(e, t) {
        if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
            var r = e.retryLane;
            e.retryLane = r !== 0 && r < t ? r : t;
        }
    }
    function _s(e, t) {
        (Gc(e, t), (e = e.alternate) && Gc(e, t));
    }
    function Ip() {
        return null;
    }
    var Xc =
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
            if (t === null) throw Error(i(409));
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
            var t = Ra();
            e = { blockedOn: null, target: e, priority: t };
            for (var r = 0; r < tr.length && t !== 0 && t < tr[r].priority; r++);
            (tr.splice(r, 0, e), r === 0 && Da(e));
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
    function Yc() {}
    function Dp(e, t, r, l, s) {
        if (s) {
            if (typeof l == "function") {
                var u = l;
                l = function () {
                    var z = di(d);
                    u.call(z);
                };
            }
            var d = Qc(t, l, e, 0, null, !1, !1, "", Yc);
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
        var w = bs(e, 0, !1, null, null, !1, !1, "", Yc);
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
        } else d = Dp(r, t, e, s, l);
        return di(d);
    }
    ((Pa = function (e) {
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
        (Fa = function (e) {
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
        (Ra = function () {
            return ge;
        }),
        (ja = function (e, t) {
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
                                if (!s) throw Error(i(90));
                                (oa(l), Fi(l, s));
                            }
                        }
                    }
                    break;
                case "textarea":
                    ua(e, r);
                    break;
                case "select":
                    ((t = r.value), t != null && Mr(e, !!r.multiple, t, !1));
            }
        }),
        (ya = ps),
        (wa = Fr));
    var Mp = { usingClientEntryPoint: !1, Events: [Mn, $r, Fo, ma, ga, ps] },
        Yn = {
            findFiberByHostInstance: Sr,
            bundleType: 0,
            version: "18.3.1",
            rendererPackageName: "react-dom",
        },
        Lp = {
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
                return ((e = xa(e)), e === null ? null : e.stateNode);
            },
            findFiberByHostInstance: Yn.findFiberByHostInstance || Ip,
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
                ((ho = mi.inject(Lp)), (It = mi));
            } catch {}
    }
    return (
        (ft.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Mp),
        (ft.createPortal = function (e, t) {
            var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
            if (!xs(t)) throw Error(i(200));
            return jp(e, t, null, r);
        }),
        (ft.createRoot = function (e, t) {
            if (!xs(e)) throw Error(i(299));
            var r = !1,
                l = "",
                s = Xc;
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
                    ? Error(i(188))
                    : ((e = Object.keys(e).join(",")), Error(i(268, e)));
            return ((e = xa(t)), (e = e === null ? null : e.stateNode), e);
        }),
        (ft.flushSync = function (e) {
            return Fr(e);
        }),
        (ft.hydrate = function (e, t, r) {
            if (!pi(t)) throw Error(i(200));
            return vi(null, e, t, !0, r);
        }),
        (ft.hydrateRoot = function (e, t, r) {
            if (!xs(e)) throw Error(i(405));
            var l = (r != null && r.hydratedSources) || null,
                s = !1,
                u = "",
                d = Xc;
            if (
                (r != null &&
                    (r.unstable_strictMode === !0 && (s = !0),
                    r.identifierPrefix !== void 0 && (u = r.identifierPrefix),
                    r.onRecoverableError !== void 0 && (d = r.onRecoverableError)),
                (t = Qc(t, null, e, 1, r ?? null, s, !1, u, d)),
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
            if (!pi(t)) throw Error(i(200));
            return vi(null, e, t, !1, r);
        }),
        (ft.unmountComponentAtNode = function (e) {
            if (!pi(e)) throw Error(i(40));
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
            if (!pi(r)) throw Error(i(200));
            if (e == null || e._reactInternals === void 0) throw Error(i(38));
            return vi(e, t, r, !1, l);
        }),
        (ft.version = "18.3.1-next-f1338f8080-20240426"),
        ft
    );
}
var lf;
function Qp() {
    if (lf) return Ts.exports;
    lf = 1;
    function o() {
        if (
            !(
                typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
                typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
            )
        )
            try {
                __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(o);
            } catch (n) {
                console.error(n);
            }
    }
    return (o(), (Ts.exports = $p()), Ts.exports);
}
var sf;
function Gp() {
    if (sf) return gi;
    sf = 1;
    var o = Qp();
    return ((gi.createRoot = o.createRoot), (gi.hydrateRoot = o.hydrateRoot), gi);
}
var Xp = Gp();
const zs = typeof window > "u" ? global : window,
    Ns = "@griffel/";
function Yp(o, n) {
    return (zs[Symbol.for(Ns + o)] || (zs[Symbol.for(Ns + o)] = n), zs[Symbol.for(Ns + o)]);
}
const As = Yp("DEFINITION_LOOKUP_TABLE", {}),
    Zn = "data-make-styles-bucket",
    Jp = "data-priority",
    qs = 7,
    Qs = "___",
    Zp = Qs.length + qs,
    ev = 0,
    tv = 1;
function rv(o) {
    for (var n = 0, i, a = 0, c = o.length; c >= 4; ++a, c -= 4)
        ((i =
            (o.charCodeAt(a) & 255) |
            ((o.charCodeAt(++a) & 255) << 8) |
            ((o.charCodeAt(++a) & 255) << 16) |
            ((o.charCodeAt(++a) & 255) << 24)),
            (i = (i & 65535) * 1540483477 + (((i >>> 16) * 59797) << 16)),
            (i ^= i >>> 24),
            (n =
                ((i & 65535) * 1540483477 + (((i >>> 16) * 59797) << 16)) ^
                ((n & 65535) * 1540483477 + (((n >>> 16) * 59797) << 16))));
    switch (c) {
        case 3:
            n ^= (o.charCodeAt(a + 2) & 255) << 16;
        case 2:
            n ^= (o.charCodeAt(a + 1) & 255) << 8;
        case 1:
            ((n ^= o.charCodeAt(a) & 255),
                (n = (n & 65535) * 1540483477 + (((n >>> 16) * 59797) << 16)));
    }
    return (
        (n ^= n >>> 13),
        (n = (n & 65535) * 1540483477 + (((n >>> 16) * 59797) << 16)),
        ((n ^ (n >>> 15)) >>> 0).toString(36)
    );
}
function nv(o) {
    const n = o.length;
    if (n === qs) return o;
    for (let i = n; i < qs; i++) o += "0";
    return o;
}
function Mf(o, n, i = []) {
    return Qs + nv(rv(o + n));
}
function Lf(o, n) {
    let i = "",
        a = "";
    for (const c in o) {
        const f = o[c];
        if (f === 0) {
            a += c + " ";
            continue;
        }
        const h = Array.isArray(f),
            p = n === "rtl" ? (h ? f[1] : f) + " " : (h ? f[0] : f) + " ";
        ((i += p), (a += p));
    }
    return [i.slice(0, -1), a.slice(0, -1)];
}
function af(o, n) {
    const i = {};
    for (const a in o) {
        const [c, f] = Lf(o[a], n);
        if (f === "") {
            i[a] = "";
            continue;
        }
        const h = Mf(f, n),
            p = h + (c === "" ? "" : " " + c);
        ((As[h] = [o[a], n]), (i[a] = p));
    }
    return i;
}
const uf = {};
function Te() {
    let o = null,
        n = "",
        i = "";
    const a = new Array(arguments.length);
    for (let y = 0; y < arguments.length; y++) {
        const k = arguments[y];
        if (typeof k == "string" && k !== "") {
            const S = k.indexOf(Qs);
            if (S === -1) n += k + " ";
            else {
                const C = k.substr(S, Zp);
                (S > 0 && (n += k.slice(0, S)), (i += C), (a[y] = C));
            }
        }
    }
    if (i === "") return n.slice(0, -1);
    const c = uf[i];
    if (c !== void 0) return n + c;
    const f = [];
    for (let y = 0; y < arguments.length; y++) {
        const k = a[y];
        if (k) {
            const S = As[k];
            S && (f.push(S[ev]), (o = S[tv]));
        }
    }
    const h = Object.assign.apply(Object, [{}].concat(f)),
        [p, m] = Lf(h, o),
        v = Mf(m, o, a),
        b = v + " " + p;
    return ((uf[i] = b), (As[v] = [h, o]), n + b);
}
function ov(o) {
    return Array.isArray(o) ? o : [o];
}
function iv(o, n, i, a) {
    const c = [];
    if (((a[Zn] = n), (a[Jp] = String(i)), o)) for (const h in a) o.setAttribute(h, a[h]);
    function f(h) {
        return o != null && o.sheet ? o.sheet.insertRule(h, o.sheet.cssRules.length) : c.push(h);
    }
    return {
        elementAttributes: a,
        insertRule: f,
        element: o,
        bucketName: n,
        cssRules() {
            return o != null && o.sheet ? Array.from(o.sheet.cssRules).map((h) => h.cssText) : c;
        },
    };
}
const lv = ["r", "d", "l", "v", "w", "f", "i", "h", "a", "s", "k", "t", "m", "c"],
    cf = lv.reduce((o, n, i) => ((o[n] = i), o), {});
function sv(o, n, i) {
    return (o === "m" ? o + n : o) + i;
}
function av(o, n, i, a, c = {}) {
    var f, h;
    const p = o === "m",
        m = (f = c.m) !== null && f !== void 0 ? f : "0",
        v = (h = c.p) !== null && h !== void 0 ? h : 0,
        b = sv(o, m, v);
    if (!a.stylesheets[b]) {
        const y = n && n.createElement("style"),
            k = iv(y, o, v, Object.assign({}, a.styleElementAttributes, p && { media: m }));
        ((a.stylesheets[b] = k),
            n != null && n.head && y && n.head.insertBefore(y, cv(n, i, o, a, c)));
    }
    return a.stylesheets[b];
}
function uv(o, n, i) {
    var a, c;
    const f = n + ((a = i.m) !== null && a !== void 0 ? a : ""),
        h = o.getAttribute(Zn) + ((c = o.media) !== null && c !== void 0 ? c : "");
    return f === h;
}
function cv(o, n, i, a, c = {}) {
    var f, h;
    const p = cf[i],
        m = (f = c.m) !== null && f !== void 0 ? f : "",
        v = (h = c.p) !== null && h !== void 0 ? h : 0;
    let b = (T) => p - cf[T.getAttribute(Zn)],
        y = o.head.querySelectorAll(`[${Zn}]`);
    if (i === "m") {
        const T = o.head.querySelectorAll(`[${Zn}="${i}"]`);
        T.length && ((y = T), (b = (N) => a.compareMediaQueries(m, N.media)));
    }
    const k = (T) => (uv(T, i, c) ? v - Number(T.getAttribute("data-priority")) : b(T)),
        S = y.length;
    let C = S - 1;
    for (; C >= 0; ) {
        const T = y.item(C);
        if (k(T) > 0) return T.nextSibling;
        C--;
    }
    return S > 0 ? y.item(0) : n ? n.nextSibling : null;
}
function ff(o, n) {
    try {
        o.insertRule(n);
    } catch {}
}
let fv = 0;
const dv = (o, n) => (o < n ? -1 : o > n ? 1 : 0);
function hv(o = typeof document > "u" ? void 0 : document, n = {}) {
    const {
            classNameHashSalt: i,
            unstable_filterCSSRule: a,
            insertionPoint: c,
            styleElementAttributes: f,
            compareMediaQueries: h = dv,
        } = n,
        p = {
            classNameHashSalt: i,
            insertionCache: {},
            stylesheets: {},
            styleElementAttributes: Object.freeze(f),
            compareMediaQueries: h,
            id: `d${fv++}`,
            insertCSSRules(m) {
                for (const v in m) {
                    const b = m[v];
                    for (let y = 0, k = b.length; y < k; y++) {
                        const [S, C] = ov(b[y]),
                            T = av(v, o, c || null, p, C);
                        p.insertionCache[S] ||
                            ((p.insertionCache[S] = v), a ? a(S) && ff(T, S) : ff(T, S));
                    }
                }
            },
        };
    return p;
}
const Of = () => {
    const o = {};
    return function (i, a) {
        o[i.id] === void 0 && (i.insertCSSRules(a), (o[i.id] = !0));
    };
};
function Af(o, n, i = Of) {
    const a = i();
    let c = null,
        f = null;
    function h(p) {
        const { dir: m, renderer: v } = p,
            b = m === "ltr";
        return (
            b ? c === null && (c = af(o, m)) : f === null && (f = af(o, m)),
            a(v, n),
            b ? c : f
        );
    }
    return h;
}
function pv(o, n, i, a = Of) {
    const c = a();
    function f(h) {
        const { dir: p, renderer: m } = h,
            v = p === "ltr" ? o : n || o;
        return (c(m, Array.isArray(i) ? { r: i } : i), v);
    }
    return f;
}
function vv() {
    return typeof window < "u" && !!(window.document && window.document.createElement);
}
var O = $s();
const qf = Df(O),
    Hs = If({ __proto__: null, default: qf }, [O]),
    df = Hs.useInsertionEffect ? Hs.useInsertionEffect : void 0,
    Hf = () => {
        const o = {};
        return function (i, a) {
            if (df && vv()) {
                df(() => {
                    i.insertCSSRules(a);
                }, [i, a]);
                return;
            }
            o[i.id] === void 0 && (i.insertCSSRules(a), (o[i.id] = !0));
        };
    },
    mv = O.createContext(hv());
function Ti() {
    return O.useContext(mv);
}
const Wf = O.createContext("ltr"),
    gv = ({ children: o, dir: n }) => O.createElement(Wf.Provider, { value: n }, o);
function Uf() {
    return O.useContext(Wf);
}
function ve(o, n) {
    const i = Af(o, n, Hf);
    return function () {
        const c = Uf(),
            f = Ti();
        return i({ dir: c, renderer: f });
    };
}
function no(o, n, i) {
    const a = pv(o, n, i, Hf);
    return function () {
        const f = Uf(),
            h = Ti();
        return a({ dir: f, renderer: h });
    };
}
const yv = { "<": "\\3C ", ">": "\\3E " };
function wv(o) {
    return o.replace(/[<>]/g, (n) => yv[n]);
}
function bv(o, n) {
    if (n) {
        const i = Object.keys(n).reduce((a, c) => `${a}--${c}: ${n[c]}; `, "");
        return `${o} { ${wv(i)} }`;
    }
    return `${o} {}`;
}
const Vf = Symbol.for("fui.slotRenderFunction"),
    Ei = Symbol.for("fui.slotElementType"),
    Kf = Symbol.for("fui.slotClassNameProp");
function rt(o, n) {
    const { defaultProps: i, elementType: a } = n,
        c = _v(o),
        f = {
            ...i,
            ...c,
            [Ei]: a,
            [Kf]: (c == null ? void 0 : c.className) || (i == null ? void 0 : i.className),
        };
    return (
        c &&
            typeof c.children == "function" &&
            ((f[Vf] = c.children), (f.children = i == null ? void 0 : i.children)),
        f
    );
}
function eo(o, n) {
    if (!(o === null || (o === void 0 && !n.renderByDefault))) return rt(o, n);
}
function _v(o) {
    return typeof o == "string" || typeof o == "number" || kv(o) || O.isValidElement(o)
        ? { children: o }
        : o;
}
const kv = (o) => typeof o == "object" && o !== null && Symbol.iterator in o;
function hf(o) {
    return !!(o != null && o.hasOwnProperty(Ei));
}
const _e = (...o) => {
        const n = {};
        for (const i of o) {
            const a = Array.isArray(i) ? i : Object.keys(i);
            for (const c of a) n[c] = 1;
        }
        return n;
    },
    xv = _e([
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
    Sv = _e([
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
    Bv = _e(["itemID", "itemProp", "itemRef", "itemScope", "itemType"]),
    Ae = _e(Sv, xv, Bv),
    Tv = _e(Ae, ["form"]),
    $f = _e(Ae, ["height", "loop", "muted", "preload", "src", "width"]),
    Ev = _e($f, ["poster"]),
    Cv = _e(Ae, ["start"]),
    zv = _e(Ae, ["value"]),
    Nv = _e(Ae, [
        "download",
        "href",
        "hrefLang",
        "media",
        "referrerPolicy",
        "rel",
        "target",
        "type",
    ]),
    Pv = _e(Ae, ["dateTime"]),
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
    Fv = _e(Ci, [
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
    Rv = _e(Ci, [
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
    jv = _e(Ci, ["form", "multiple", "required"]),
    Iv = _e(Ae, ["selected", "value"]),
    Dv = _e(Ae, ["cellPadding", "cellSpacing"]),
    Mv = Ae,
    Lv = _e(Ae, ["colSpan", "rowSpan", "scope"]),
    Ov = _e(Ae, ["colSpan", "headers", "rowSpan", "scope"]),
    Av = _e(Ae, ["span"]),
    qv = _e(Ae, ["span"]),
    Hv = _e(Ae, ["disabled", "form"]),
    Wv = _e(Ae, [
        "acceptCharset",
        "action",
        "encType",
        "encType",
        "method",
        "noValidate",
        "target",
    ]),
    Uv = _e(Ae, [
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
    Vv = _e(Ae, ["alt", "crossOrigin", "height", "src", "srcSet", "useMap", "width"]),
    Kv = _e(Ae, ["open", "onCancel", "onClose"]);
function $v(o, n, i) {
    const a = Array.isArray(n),
        c = {},
        f = Object.keys(o);
    for (const h of f)
        ((!a && n[h]) ||
            (a && n.indexOf(h) >= 0) ||
            h.indexOf("data-") === 0 ||
            h.indexOf("aria-") === 0) &&
            (!i || (i == null ? void 0 : i.indexOf(h)) === -1) &&
            (c[h] = o[h]);
    return c;
}
const Qv = {
    label: Tv,
    audio: $f,
    video: Ev,
    ol: Cv,
    li: zv,
    a: Nv,
    button: Ci,
    input: Fv,
    textarea: Rv,
    select: jv,
    option: Iv,
    table: Dv,
    tr: Mv,
    th: Lv,
    td: Ov,
    colGroup: Av,
    col: qv,
    fieldset: Hv,
    form: Wv,
    iframe: Uv,
    img: Vv,
    time: Pv,
    dialog: Kv,
};
function Qf(o, n, i) {
    const a = (o && Qv[o]) || Ae;
    return ((a.as = 1), $v(n, a, i));
}
const Gf = ({ primarySlotTagName: o, props: n, excludedPropNames: i }) => ({
        root: { style: n.style, className: n.className },
        primary: Qf(o, n, [...(i || []), "style", "className"]),
    }),
    Xt = (o, n, i) => {
        var a;
        return Qf((a = n.as) !== null && a !== void 0 ? a : o, n, i);
    },
    Xf = O.createContext(void 0),
    Gv = Xf.Provider,
    Xv = O.createContext(void 0),
    Yv = Xv.Provider,
    Jv = O.createContext(void 0),
    Zv = Jv.Provider,
    Yf = O.createContext(void 0),
    e0 = { targetDocument: typeof document == "object" ? document : void 0, dir: "ltr" },
    t0 = Yf.Provider;
function zi() {
    var o;
    return (o = O.useContext(Yf)) !== null && o !== void 0 ? o : e0;
}
const Jf = O.createContext(void 0),
    r0 = Jf.Provider;
function Gs() {
    var o;
    return (o = O.useContext(Jf)) !== null && o !== void 0 ? o : {};
}
const Xs = O.createContext(void 0),
    n0 = () => {},
    o0 = Xs.Provider,
    jt = (o) => {
        var n, i;
        return (i = (n = O.useContext(Xs)) === null || n === void 0 ? void 0 : n[o]) !== null &&
            i !== void 0
            ? i
            : n0;
    };
function i0(o) {
    return typeof o == "function";
}
const Ys = (o) => {
    "use no memo";
    const [n, i] = O.useState(() =>
            o.defaultState === void 0
                ? o.initialState
                : l0(o.defaultState)
                  ? o.defaultState()
                  : o.defaultState
        ),
        a = O.useRef(o.state);
    O.useEffect(() => {
        a.current = o.state;
    }, [o.state]);
    const c = O.useCallback((f) => {
        i0(f) && f(a.current);
    }, []);
    return s0(o.state) ? [o.state, c] : [n, i];
};
function l0(o) {
    return typeof o == "function";
}
const s0 = (o) => {
    "use no memo";
    const [n] = O.useState(() => o !== void 0);
    return n;
};
function Zf() {
    return typeof window < "u" && !!(window.document && window.document.createElement);
}
const a0 = { current: 0 },
    u0 = O.createContext(void 0);
function c0() {
    var o;
    return (o = O.useContext(u0)) !== null && o !== void 0 ? o : a0;
}
const Ni = Zf() ? O.useLayoutEffect : O.useEffect,
    br = (o) => {
        const n = O.useRef(() => {
            throw new Error("Cannot call an event handler while rendering");
        });
        return (
            Ni(() => {
                n.current = o;
            }, [o]),
            O.useCallback(
                (...i) => {
                    const a = n.current;
                    return a(...i);
                },
                [n]
            )
        );
    },
    ed = O.createContext(void 0);
ed.Provider;
function f0() {
    return O.useContext(ed) || "";
}
function d0(o = "fui-", n) {
    "use no memo";
    const i = c0(),
        a = f0(),
        c = Hs.useId;
    if (c) {
        const f = c(),
            h = O.useMemo(() => f.replace(/:/g, ""), [f]);
        return n || `${a}${o}${h}`;
    }
    return O.useMemo(() => `${a}${o}${++i.current}`, [a, o, n, i]);
}
function Js(...o) {
    "use no memo";
    const n = O.useCallback(
        (i) => {
            n.current = i;
            for (const a of o) typeof a == "function" ? a(i) : a && (a.current = i);
        },
        [...o]
    );
    return n;
}
function pf(o, n) {
    var i;
    const a = o;
    var c;
    return !!(
        !(a == null || (i = a.ownerDocument) === null || i === void 0) &&
        i.defaultView &&
        a instanceof
            a.ownerDocument.defaultView[(c = void 0) !== null && c !== void 0 ? c : "HTMLElement"]
    );
}
function h0(o) {
    return o && !!o._virtual;
}
function p0(o) {
    return (h0(o) && o._virtual.parent) || null;
}
function v0(o, n = {}) {
    if (!o) return null;
    if (!n.skipVirtual) {
        const a = p0(o);
        if (a) return a;
    }
    const i = o.parentNode;
    return i && i.nodeType === 11 ? i.host : i;
}
function m0(o, n) {
    return { ...n, [Ei]: o };
}
function td(o, n) {
    return function (a, c, f, h, p) {
        return hf(c) ? n(m0(a, c), null, f, h, p) : hf(a) ? n(a, c, f, h, p) : o(a, c, f, h, p);
    };
}
function rd(o) {
    const { as: n, [Kf]: i, [Ei]: a, [Vf]: c, ...f } = o,
        h = f,
        p = typeof a == "string" ? (n ?? a) : a;
    return (
        typeof p != "string" && n && (h.as = n),
        { elementType: p, props: h, renderFunction: c }
    );
}
const Dr = Up,
    g0 = (o, n, i) => {
        const { elementType: a, renderFunction: c, props: f } = rd(o),
            h = { ...f, ...n };
        return c ? Dr.jsx(O.Fragment, { children: c(a, h) }, i) : Dr.jsx(a, h, i);
    },
    y0 = (o, n, i) => {
        const { elementType: a, renderFunction: c, props: f } = rd(o),
            h = { ...f, ...n };
        return c
            ? Dr.jsx(
                  O.Fragment,
                  {
                      children: c(a, {
                          ...h,
                          children: Dr.jsxs(O.Fragment, { children: h.children }, void 0),
                      }),
                  },
                  i
              )
            : Dr.jsxs(a, h, i);
    },
    ye = td(Dr.jsx, g0),
    to = td(Dr.jsxs, y0),
    nd = O.createContext(void 0),
    w0 = {},
    b0 = nd.Provider,
    _0 = () => {
        const o = O.useContext(nd);
        return o ?? w0;
    },
    k0 = (o, n) =>
        ye(t0, {
            value: n.provider,
            children: ye(Gv, {
                value: n.theme,
                children: ye(Yv, {
                    value: n.themeClassName,
                    children: ye(o0, {
                        value: n.customStyleHooks_unstable,
                        children: ye(Zv, {
                            value: n.tooltip,
                            children: ye(gv, {
                                dir: n.textDirection,
                                children: ye(b0, {
                                    value: n.iconDirection,
                                    children: ye(r0, {
                                        value: n.overrides_unstable,
                                        children: to(o.root, {
                                            children: [
                                                Zf()
                                                    ? null
                                                    : ye("style", {
                                                          dangerouslySetInnerHTML: {
                                                              __html: o.serverStyleProps.cssRule,
                                                          },
                                                          ...o.serverStyleProps.attributes,
                                                      }),
                                                o.root.children,
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
var x0 = typeof WeakRef < "u",
    vf = class {
        constructor(o) {
            x0 && typeof o == "object" ? (this._weakRef = new WeakRef(o)) : (this._instance = o);
        }
        deref() {
            var o, n;
            let i;
            return (
                this._weakRef
                    ? ((i = (o = this._weakRef) == null ? void 0 : o.deref()),
                      i || delete this._weakRef)
                    : ((i = this._instance),
                      (n = i == null ? void 0 : i.isDisposed) != null &&
                          n.call(i) &&
                          delete this._instance),
                i
            );
        }
    },
    Rt = "keyborg:focusin",
    ro = "keyborg:focusout";
function S0(o) {
    const n = o.HTMLElement,
        i = n.prototype.focus;
    let a = !1;
    return (
        (n.prototype.focus = function () {
            a = !0;
        }),
        o.document.createElement("button").focus(),
        (n.prototype.focus = i),
        a
    );
}
var Ps = !1;
function kr(o) {
    const n = o.focus;
    n.__keyborgNativeFocus ? n.__keyborgNativeFocus.call(o) : o.focus();
}
function B0(o) {
    const n = o;
    Ps || (Ps = S0(n));
    const i = n.HTMLElement.prototype.focus;
    if (i.__keyborgNativeFocus) return;
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
                const T = C.deref();
                (!T || !S.has(T)) &&
                    (a.delete(C),
                    T &&
                        (T.removeEventListener("focusin", f, !0),
                        T.removeEventListener("focusout", c, !0)));
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
                    a.add(new vf(C)));
                return;
            }
            const T = { relatedTarget: y, originalEvent: k },
                N = new CustomEvent(Rt, { cancelable: !0, bubbles: !0, composed: !0, detail: T });
            ((N.details = T),
                (Ps || p.lastFocusedProgrammatically) &&
                    ((T.isFocusedProgrammatically =
                        b === ((S = p.lastFocusedProgrammatically) == null ? void 0 : S.deref())),
                    (p.lastFocusedProgrammatically = void 0)),
                b.dispatchEvent(N));
        },
        p = (n.__keyborgData = { focusInHandler: f, focusOutHandler: c, shadowTargets: a });
    (n.document.addEventListener("focusin", n.__keyborgData.focusInHandler, !0),
        n.document.addEventListener("focusout", n.__keyborgData.focusOutHandler, !0));
    function m() {
        const b = n.__keyborgData;
        return (b && (b.lastFocusedProgrammatically = new vf(this)), i.apply(this, arguments));
    }
    let v = n.document.activeElement;
    for (; v && v.shadowRoot; ) (h(v), (v = v.shadowRoot.activeElement));
    m.__keyborgNativeFocus = i;
}
function T0(o) {
    const n = o,
        i = n.HTMLElement.prototype,
        a = i.focus.__keyborgNativeFocus,
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
    a && (i.focus = a);
}
var E0 = 500,
    od = 0,
    C0 = class {
        constructor(o, n) {
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
                (this.id = "c" + ++od),
                (this._win = o));
            const i = o.document;
            if (n) {
                const a = n.triggerKeys,
                    c = n.dismissKeys;
                (a != null && a.length && (this._triggerKeys = new Set(a)),
                    c != null && c.length && (this._dismissKeys = new Set(c)));
            }
            (i.addEventListener(Rt, this._onFocusIn, !0),
                i.addEventListener("mousedown", this._onMouseDown, !0),
                o.addEventListener("keydown", this._onKeyDown, !0),
                i.addEventListener("touchstart", this._onMouseOrTouch, !0),
                i.addEventListener("touchend", this._onMouseOrTouch, !0),
                i.addEventListener("touchcancel", this._onMouseOrTouch, !0),
                B0(o));
        }
        get isNavigatingWithKeyboard() {
            return this._isNavigatingWithKeyboard_DO_NOT_USE;
        }
        set isNavigatingWithKeyboard(o) {
            this._isNavigatingWithKeyboard_DO_NOT_USE !== o &&
                ((this._isNavigatingWithKeyboard_DO_NOT_USE = o), this.update());
        }
        dispose() {
            const o = this._win;
            if (o) {
                (this._isMouseOrTouchUsedTimer &&
                    (o.clearTimeout(this._isMouseOrTouchUsedTimer),
                    (this._isMouseOrTouchUsedTimer = void 0)),
                    this._dismissTimer &&
                        (o.clearTimeout(this._dismissTimer), (this._dismissTimer = void 0)),
                    T0(o));
                const n = o.document;
                (n.removeEventListener(Rt, this._onFocusIn, !0),
                    n.removeEventListener("mousedown", this._onMouseDown, !0),
                    o.removeEventListener("keydown", this._onKeyDown, !0),
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
            var o, n;
            const i =
                (n = (o = this._win) == null ? void 0 : o.__keyborg) == null ? void 0 : n.refs;
            if (i) for (const a of Object.keys(i)) Zs.update(i[a], this.isNavigatingWithKeyboard);
        }
        _shouldTriggerKeyboardNavigation(o) {
            var n;
            if (o.key === "Tab") return !0;
            const i = (n = this._win) == null ? void 0 : n.document.activeElement,
                a = !this._triggerKeys || this._triggerKeys.has(o.keyCode),
                c = i && (i.tagName === "INPUT" || i.tagName === "TEXTAREA" || i.isContentEditable);
            return a && !c;
        }
        _shouldDismissKeyboardNavigation(o) {
            var n;
            return (n = this._dismissKeys) == null ? void 0 : n.has(o.keyCode);
        }
        _scheduleDismiss() {
            const o = this._win;
            if (o) {
                this._dismissTimer &&
                    (o.clearTimeout(this._dismissTimer), (this._dismissTimer = void 0));
                const n = o.document.activeElement;
                this._dismissTimer = o.setTimeout(() => {
                    this._dismissTimer = void 0;
                    const i = o.document.activeElement;
                    n && i && n === i && (this.isNavigatingWithKeyboard = !1);
                }, E0);
            }
        }
    },
    Zs = class id {
        constructor(n, i) {
            ((this._cb = []), (this._id = "k" + ++od), (this._win = n));
            const a = n.__keyborg;
            a
                ? ((this._core = a.core), (a.refs[this._id] = this))
                : ((this._core = new C0(n, i)),
                  (n.__keyborg = { core: this._core, refs: { [this._id]: this } }));
        }
        static create(n, i) {
            return new id(n, i);
        }
        static dispose(n) {
            n.dispose();
        }
        static update(n, i) {
            n._cb.forEach((a) => a(i));
        }
        dispose() {
            var n;
            const i = (n = this._win) == null ? void 0 : n.__keyborg;
            (i != null &&
                i.refs[this._id] &&
                (delete i.refs[this._id],
                Object.keys(i.refs).length === 0 && (i.core.dispose(), delete this._win.__keyborg)),
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
            const i = this._cb.indexOf(n);
            i >= 0 && this._cb.splice(i, 1);
        }
        setVal(n) {
            this._core && (this._core.isNavigatingWithKeyboard = n);
        }
    };
function ea(o, n) {
    return Zs.create(o, n);
}
function ta(o) {
    Zs.dispose(o);
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 *//*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const _r = "data-tabster",
    z0 = "data-tabster-dummy",
    ld = `:is(${["a[href]", "button", "input", "select", "textarea", "*[tabindex]", "*[contenteditable]", "details > summary", "audio[controls]", "video[controls]"].join(", ")}):not(:disabled)`,
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
    N0 = { Outside: 2 };
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ function At(o, n) {
    var i;
    return (i = o.storageEntry(n)) === null || i === void 0 ? void 0 : i.tabster;
}
function sd(o, n, i) {
    var a, c, f;
    const h = i || o._noop ? void 0 : n.getAttribute(_r);
    let p = o.storageEntry(n),
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
    (p || (p = o.storageEntry(n, !0)), p.tabster || (p.tabster = {}));
    const v = p.tabster || {},
        b = ((c = p.attr) === null || c === void 0 ? void 0 : c.object) || {},
        y = (m == null ? void 0 : m.object) || {};
    for (const k of Object.keys(b))
        if (!y[k]) {
            if (k === "root") {
                const S = v[k];
                S && o.root.onRoot(S, !0);
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
                        o.observedElement && o.observedElement.onObservedElementUpdate(n));
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
                    : o.deloser && (v.deloser = o.deloser.createDeloser(n, y.deloser));
                break;
            case "root":
                (v.root ? v.root.setProps(y.root) : (v.root = o.root.createRoot(n, y.root, S)),
                    o.root.onRoot(v.root));
                break;
            case "modalizer":
                {
                    let C;
                    const T = o.modalizer;
                    if (v.modalizer) {
                        const N = y.modalizer,
                            q = N.id;
                        q &&
                        ((f = b == null ? void 0 : b.modalizer) === null || f === void 0
                            ? void 0
                            : f.id) !== q
                            ? (v.modalizer.dispose(), (C = N))
                            : v.modalizer.setProps(N);
                    } else T && (C = y.modalizer);
                    T && C && (v.modalizer = T.createModalizer(n, C, S));
                }
                break;
            case "restorer":
                v.restorer
                    ? v.restorer.setProps(y.restorer)
                    : o.restorer &&
                      y.restorer &&
                      (v.restorer = o.restorer.createRestorer(n, y.restorer));
                break;
            case "focusable":
                v.focusable = y.focusable;
                break;
            case "groupper":
                v.groupper
                    ? v.groupper.setProps(y.groupper)
                    : o.groupper && (v.groupper = o.groupper.createGroupper(n, y.groupper, S));
                break;
            case "mover":
                v.mover
                    ? v.mover.setProps(y.mover)
                    : o.mover && (v.mover = o.mover.createMover(n, y.mover, S));
                break;
            case "observed":
                o.observedElement &&
                    ((v.observed = y.observed), o.observedElement.onObservedElementUpdate(n));
                break;
            case "uncontrolled":
                v.uncontrolled = y.uncontrolled;
                break;
            case "outline":
                o.outline && (v.outline = y.outline);
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
        : (Object.keys(v).length === 0 && (delete p.tabster, delete p.attr), o.storageEntry(n, !1));
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const P0 = "tabster:focusin",
    F0 = "tabster:focusout",
    R0 = "tabster:movefocus",
    j0 = "tabster:mover:state",
    mf = "tabster:mover:movefocus",
    gf = "tabster:mover:memorized-element",
    I0 = "tabster:root:focus",
    D0 = "tabster:root:blur",
    M0 = typeof CustomEvent < "u" ? CustomEvent : function () {};
class cn extends M0 {
    constructor(n, i) {
        (super(n, { bubbles: !0, cancelable: !0, composed: !0, detail: i }), (this.details = i));
    }
}
class L0 extends cn {
    constructor(n) {
        super(P0, n);
    }
}
class O0 extends cn {
    constructor(n) {
        super(F0, n);
    }
}
class un extends cn {
    constructor(n) {
        super(R0, n);
    }
}
class yf extends cn {
    constructor(n) {
        super(j0, n);
    }
}
class A0 extends cn {
    constructor(n) {
        super(I0, n);
    }
}
class q0 extends cn {
    constructor(n) {
        super(D0, n);
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const H0 = (o) => new MutationObserver(o),
    W0 = (o, n, i, a) => o.createTreeWalker(n, i, a),
    U0 = (o) => (o ? o.parentNode : null),
    V0 = (o) => (o ? o.parentElement : null),
    K0 = (o, n) => !!(n && o != null && o.contains(n)),
    $0 = (o) => o.activeElement,
    Q0 = (o, n) => o.querySelector(n),
    G0 = (o, n) => Array.prototype.slice.call(o.querySelectorAll(n), 0),
    X0 = (o, n) => o.getElementById(n),
    Y0 = (o) => (o == null ? void 0 : o.firstChild) || null,
    J0 = (o) => (o == null ? void 0 : o.lastChild) || null,
    Z0 = (o) => (o == null ? void 0 : o.nextSibling) || null,
    em = (o) => (o == null ? void 0 : o.previousSibling) || null,
    tm = (o) => (o == null ? void 0 : o.firstElementChild) || null,
    rm = (o) => (o == null ? void 0 : o.lastElementChild) || null,
    nm = (o) => (o == null ? void 0 : o.nextElementSibling) || null,
    om = (o) => (o == null ? void 0 : o.previousElementSibling) || null,
    im = (o, n) => o.appendChild(n),
    lm = (o, n, i) => o.insertBefore(n, i),
    sm = (o) => {
        var n;
        return ((n = o.ownerDocument) === null || n === void 0 ? void 0 : n.getSelection()) || null;
    },
    am = (o, n) => o.ownerDocument.getElementsByName(n),
    K = {
        createMutationObserver: H0,
        createTreeWalker: W0,
        getParentNode: U0,
        getParentElement: V0,
        nodeContains: K0,
        getActiveElement: $0,
        querySelector: Q0,
        querySelectorAll: G0,
        getElementById: X0,
        getFirstChild: Y0,
        getLastChild: J0,
        getNextSibling: Z0,
        getPreviousSibling: em,
        getFirstElementChild: tm,
        getLastElementChild: rm,
        getNextElementSibling: nm,
        getPreviousElementSibling: om,
        appendChild: im,
        insertBefore: lm,
        getSelection: sm,
        getElementsByName: am,
    };
function um(o) {
    for (const n of Object.keys(o)) K[n] = o[n];
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ let Ws;
const wf =
    typeof DOMRect < "u"
        ? DOMRect
        : class {
              constructor(o, n, i, a) {
                  ((this.left = o || 0),
                      (this.top = n || 0),
                      (this.right = (o || 0) + (i || 0)),
                      (this.bottom = (n || 0) + (a || 0)));
              }
          };
let cm = 0;
try {
    (document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT), (Ws = !1));
} catch {
    Ws = !0;
}
const Rs = 100;
function Yt(o) {
    const n = o();
    let i = n.__tabsterInstanceContext;
    return (
        i ||
            ((i = {
                elementByUId: {},
                basics: { Promise: n.Promise || void 0, WeakRef: n.WeakRef || void 0 },
                containerBoundingRectCache: {},
                lastContainerBoundingRectCacheId: 0,
                fakeWeakRefs: [],
                fakeWeakRefsStarted: !1,
            }),
            (n.__tabsterInstanceContext = i)),
        i
    );
}
function fm(o) {
    const n = o.__tabsterInstanceContext;
    n &&
        ((n.elementByUId = {}),
        delete n.WeakRef,
        (n.containerBoundingRectCache = {}),
        n.containerBoundingRectCacheTimer && o.clearTimeout(n.containerBoundingRectCacheTimer),
        n.fakeWeakRefsTimer && o.clearTimeout(n.fakeWeakRefsTimer),
        (n.fakeWeakRefs = []),
        delete o.__tabsterInstanceContext);
}
function dm(o) {
    const n = o.__tabsterInstanceContext;
    return new ((n == null ? void 0 : n.basics.WeakMap) || WeakMap)();
}
function hm(o) {
    return !!o.querySelector(ld);
}
class ad {
    constructor(n) {
        this._target = n;
    }
    deref() {
        return this._target;
    }
    static cleanup(n, i) {
        return n._target
            ? i || !na(n._target.ownerDocument, n._target)
                ? (delete n._target, !0)
                : !1
            : !0;
    }
}
class Gt {
    constructor(n, i, a) {
        const c = Yt(n);
        let f;
        (c.WeakRef ? (f = new c.WeakRef(i)) : ((f = new ad(i)), c.fakeWeakRefs.push(f)),
            (this._ref = f),
            (this._data = a));
    }
    get() {
        const n = this._ref;
        let i;
        return (n && ((i = n.deref()), i || delete this._ref), i);
    }
    getData() {
        return this._data;
    }
}
function ud(o, n) {
    const i = Yt(o);
    i.fakeWeakRefs = i.fakeWeakRefs.filter((a) => !ad.cleanup(a, n));
}
function cd(o) {
    const n = Yt(o);
    (n.fakeWeakRefsStarted || ((n.fakeWeakRefsStarted = !0), (n.WeakRef = wm(n))),
        n.fakeWeakRefsTimer ||
            (n.fakeWeakRefsTimer = o().setTimeout(() => {
                ((n.fakeWeakRefsTimer = void 0), ud(o), cd(o));
            }, 120 * 1e3)));
}
function pm(o) {
    const n = Yt(o);
    ((n.fakeWeakRefsStarted = !1),
        n.fakeWeakRefsTimer &&
            (o().clearTimeout(n.fakeWeakRefsTimer),
            (n.fakeWeakRefsTimer = void 0),
            (n.fakeWeakRefs = [])));
}
function ra(o, n, i) {
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const a = Ws ? i : { acceptNode: i };
    return K.createTreeWalker(o, n, NodeFilter.SHOW_ELEMENT, a, !1);
}
function fd(o, n) {
    let i = n.__tabsterCacheId;
    const a = Yt(o),
        c = i ? a.containerBoundingRectCache[i] : void 0;
    if (c) return c.rect;
    const f = n.ownerDocument && n.ownerDocument.documentElement;
    if (!f) return new wf();
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
    const b = new wf(h < m ? h : -1, p < v ? p : -1, h < m ? m - h : 0, p < v ? v - p : 0);
    return (
        i || ((i = "r-" + ++a.lastContainerBoundingRectCacheId), (n.__tabsterCacheId = i)),
        (a.containerBoundingRectCache[i] = { rect: b, element: n }),
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
function bf(o, n, i) {
    const a = dd(n);
    if (!a) return !1;
    const c = fd(o, a),
        f = n.getBoundingClientRect(),
        h = f.height * (1 - i),
        p = Math.max(0, c.top - f.top),
        m = Math.max(0, f.bottom - c.bottom),
        v = p + m;
    return v === 0 || v <= h;
}
function vm(o, n, i) {
    const a = dd(n);
    if (a) {
        const c = fd(o, a),
            f = n.getBoundingClientRect();
        i ? (a.scrollTop += f.top - c.top) : (a.scrollTop += f.bottom - c.bottom);
    }
}
function dd(o) {
    const n = o.ownerDocument;
    if (n) {
        for (let i = K.getParentElement(o); i; i = K.getParentElement(i))
            if (i.scrollWidth > i.clientWidth || i.scrollHeight > i.clientHeight) return i;
        return n.documentElement;
    }
    return null;
}
function mm(o) {
    o.__shouldIgnoreFocus = !0;
}
function hd(o) {
    return !!o.__shouldIgnoreFocus;
}
function gm(o) {
    const n = new Uint32Array(4);
    if (o.crypto && o.crypto.getRandomValues) o.crypto.getRandomValues(n);
    else if (o.msCrypto && o.msCrypto.getRandomValues) o.msCrypto.getRandomValues(n);
    else for (let a = 0; a < n.length; a++) n[a] = 4294967295 * Math.random();
    const i = [];
    for (let a = 0; a < n.length; a++) i.push(n[a].toString(36));
    return (
        i.push("|"),
        i.push((++cm).toString(36)),
        i.push("|"),
        i.push(Date.now().toString(36)),
        i.join("")
    );
}
function _i(o, n) {
    const i = Yt(o);
    let a = n.__tabsterElementUID;
    return (
        a || (a = n.__tabsterElementUID = gm(o())),
        !i.elementByUId[a] && na(n.ownerDocument, n) && (i.elementByUId[a] = new Gt(o, n)),
        a
    );
}
function _f(o, n) {
    const i = Yt(o);
    for (const a of Object.keys(i.elementByUId)) {
        const c = i.elementByUId[a],
            f = c && c.get();
        (f && n && !K.nodeContains(n, f)) || delete i.elementByUId[a];
    }
}
function na(o, n) {
    return K.nodeContains(o == null ? void 0 : o.body, n);
}
function pd(o, n) {
    const i = o.matches || o.matchesSelector || o.msMatchesSelector || o.webkitMatchesSelector;
    return i && i.call(o, n);
}
function ym(o) {
    const n = Yt(o);
    if (n.basics.Promise) return n.basics.Promise;
    throw new Error("No Promise defined.");
}
function wm(o) {
    return o.basics.WeakRef;
}
let bm = 0;
class vd {
    constructor(n, i, a) {
        const c = n.getWindow;
        ((this._tabster = n),
            (this._element = new Gt(c, i)),
            (this._props = { ...a }),
            (this.id = "i" + ++bm));
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
    constructor(n, i, a, c, f) {
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
            m.setAttribute(z0, ""),
            m.setAttribute("aria-hidden", "true"));
        const v = m.style;
        ((v.position = "fixed"),
            (v.width = v.height = "1px"),
            (v.opacity = "0.001"),
            (v.zIndex = "-1"),
            v.setProperty("content-visibility", "hidden"),
            mm(m),
            (this.input = m),
            (this.isFirst = a.isFirst),
            (this.isOutside = i),
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
        const i = this.input;
        i &&
            (delete this._fixedTarget,
            delete this.onFocusIn,
            delete this.onFocusOut,
            delete this.input,
            i.removeEventListener("focusin", this._focusIn),
            i.removeEventListener("focusout", this._focusOut),
            delete i.__tabsterDummyContainer,
            (n = K.getParentNode(i)) === null || n === void 0 || n.removeChild(i));
    }
    setTopLeft(n, i) {
        var a;
        const c = (a = this.input) === null || a === void 0 ? void 0 : a.style;
        c && ((c.top = `${n}px`), (c.left = `${i}px`));
    }
    _isBackward(n, i, a) {
        return n && !a
            ? !this.isFirst
            : !!(a && i.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
    }
}
const md = { Root: 1, Mover: 3 };
class Si {
    constructor(n, i, a, c, f, h) {
        ((this._element = i), (this._instance = new km(n, i, this, a, c, f, h)));
    }
    _setHandlers(n, i) {
        ((this._onFocusIn = n), (this._onFocusOut = i));
    }
    moveOut(n) {
        var i;
        (i = this._instance) === null || i === void 0 || i.moveOut(n);
    }
    moveOutWithDefaultAction(n, i) {
        var a;
        (a = this._instance) === null || a === void 0 || a.moveOutWithDefaultAction(n, i);
    }
    getHandler(n) {
        return n ? this._onFocusIn : this._onFocusOut;
    }
    setTabbable(n) {
        var i;
        (i = this._instance) === null || i === void 0 || i.setTabbable(this, n);
    }
    dispose() {
        (this._instance && (this._instance.dispose(this), delete this._instance),
            delete this._onFocusIn,
            delete this._onFocusOut);
    }
    static moveWithPhantomDummy(n, i, a, c, f) {
        const p = new xi(n.getWindow, !0, { isPhantom: !0, isFirst: !0 }).input;
        if (p) {
            let m, v;
            if (i.tagName === "BODY")
                ((m = i), (v = (a && c) || (!a && !c) ? K.getFirstElementChild(i) : null));
            else {
                a && (!c || (c && !n.focusable.isFocusable(i, !1, !0, !0)))
                    ? ((m = i), (v = c ? i.firstElementChild : null))
                    : ((m = K.getParentElement(i)),
                      (v = (a && c) || (!a && !c) ? i : K.getNextElementSibling(i)));
                let b, y;
                do
                    ((b = (a && c) || (!a && !c) ? K.getPreviousElementSibling(v) : v),
                        (y = Bi(b)),
                        y === i
                            ? (v = (a && c) || (!a && !c) ? b : K.getNextElementSibling(b))
                            : (y = null));
                while (y);
            }
            m != null &&
                m.dispatchEvent(new un({ by: "root", owner: m, next: null, relatedEvent: f })) &&
                (K.insertBefore(m, p, v), kr(p));
        }
    }
    static addPhantomDummyWithTarget(n, i, a, c) {
        const h = new xi(
            n.getWindow,
            !0,
            { isPhantom: !0, isFirst: !0 },
            void 0,
            new Gt(n.getWindow, c)
        ).input;
        if (h) {
            let p, m;
            (hm(i) && !a
                ? ((p = i), (m = K.getFirstElementChild(i)))
                : ((p = K.getParentElement(i)), (m = a ? i : K.getNextElementSibling(i))),
                p && K.insertBefore(p, h, m));
        }
    }
}
class _m {
    constructor(n) {
        ((this._updateQueue = new Set()),
            (this._lastUpdateQueueTime = 0),
            (this._changedParents = new WeakSet()),
            (this._dummyElements = []),
            (this._dummyCallbacks = new WeakMap()),
            (this._domChanged = (i) => {
                var a;
                this._changedParents.has(i) ||
                    (this._changedParents.add(i),
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
    add(n, i) {
        !this._dummyCallbacks.has(n) &&
            this._win &&
            (this._dummyElements.push(new Gt(this._win, n)),
            this._dummyCallbacks.set(n, i),
            (this.domChanged = this._domChanged));
    }
    remove(n) {
        ((this._dummyElements = this._dummyElements.filter((i) => {
            const a = i.get();
            return a && a !== n;
        })),
            this._dummyCallbacks.delete(n),
            this._dummyElements.length === 0 && delete this.domChanged);
    }
    dispose() {
        var n;
        const i = (n = this._win) === null || n === void 0 ? void 0 : n.call(this);
        (this._updateTimer &&
            (i == null || i.clearTimeout(this._updateTimer), delete this._updateTimer),
            this._updateDummyInputsTimer &&
                (i == null || i.clearTimeout(this._updateDummyInputsTimer),
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
                              const i = new Map(),
                                  a = [];
                              for (const c of this._updateQueue) a.push(c(i));
                              this._updateQueue.clear();
                              for (const c of a) c();
                              i.clear();
                          } else this._scheduledUpdatePositions();
                      }, Rs));
    }
}
class km {
    constructor(n, i, a, c, f, h, p) {
        ((this._wrappers = []),
            (this._isOutside = !1),
            (this._transformElements = new Set()),
            (this._onFocusIn = (S, C, T) => {
                this._onFocus(!0, S, C, T);
            }),
            (this._onFocusOut = (S, C, T) => {
                this._onFocus(!1, S, C, T);
            }),
            (this.moveOut = (S) => {
                var C;
                const T = this._firstDummy,
                    N = this._lastDummy;
                if (T && N) {
                    this._ensurePosition();
                    const q = T.input,
                        H = N.input,
                        D = (C = this._element) === null || C === void 0 ? void 0 : C.get();
                    if (q && H && D) {
                        let Q;
                        (S ? ((q.tabIndex = 0), (Q = q)) : ((H.tabIndex = 0), (Q = H)), Q && kr(Q));
                    }
                }
            }),
            (this.moveOutWithDefaultAction = (S, C) => {
                var T;
                const N = this._firstDummy,
                    q = this._lastDummy;
                if (N && q) {
                    this._ensurePosition();
                    const H = N.input,
                        D = q.input,
                        Q = (T = this._element) === null || T === void 0 ? void 0 : T.get();
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
                var T, N;
                for (const H of this._wrappers)
                    if (H.manager === S) {
                        H.tabbable = C;
                        break;
                    }
                const q = this._getCurrent();
                if (q) {
                    const H = q.tabbable ? 0 : -1;
                    let D = (T = this._firstDummy) === null || T === void 0 ? void 0 : T.input;
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
                var C, T;
                const N =
                        ((C = this._firstDummy) === null || C === void 0 ? void 0 : C.input) ||
                        ((T = this._lastDummy) === null || T === void 0 ? void 0 : T.input),
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
        const m = i.get();
        if (!m) throw new Error("No element");
        ((this._tabster = n), (this._getWindow = n.getWindow), (this._callForDefaultAction = p));
        const v = m.__tabsterDummy;
        if (((v || this)._wrappers.push({ manager: a, priority: c, tabbable: !0 }), v)) return v;
        m.__tabsterDummy = this;
        const b = f == null ? void 0 : f.dummyInputsPosition,
            y = m.tagName;
        ((this._isOutside = b
            ? b === N0.Outside
            : (h || y === "UL" || y === "OL" || y === "TABLE") &&
              !(y === "LI" || y === "TD" || y === "TH")),
            (this._firstDummy = new xi(this._getWindow, this._isOutside, { isFirst: !0 }, i)),
            (this._lastDummy = new xi(this._getWindow, this._isOutside, { isFirst: !1 }, i)));
        const k = this._firstDummy.input;
        (k && n._dummyObserver.add(k, this._addDummyInputs),
            (this._firstDummy.onFocusIn = this._onFocusIn),
            (this._firstDummy.onFocusOut = this._onFocusOut),
            (this._lastDummy.onFocusIn = this._onFocusIn),
            (this._lastDummy.onFocusOut = this._onFocusOut),
            (this._element = i),
            this._addDummyInputs());
    }
    dispose(n, i) {
        var a, c, f, h;
        if ((this._wrappers = this._wrappers.filter((m) => m.manager !== n && !i)).length === 0) {
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
    _onFocus(n, i, a, c) {
        var f;
        const h = this._getCurrent();
        h &&
            (!i.useDefaultAction || this._callForDefaultAction) &&
            ((f = h.manager.getHandler(n)) === null || f === void 0 || f(i, a, c));
    }
    _getCurrent() {
        return (
            this._wrappers.sort((n, i) =>
                n.tabbable !== i.tabbable ? (n.tabbable ? -1 : 1) : n.priority - i.priority
            ),
            this._wrappers[0]
        );
    }
    _ensurePosition() {
        var n, i, a;
        const c = (n = this._element) === null || n === void 0 ? void 0 : n.get(),
            f = (i = this._firstDummy) === null || i === void 0 ? void 0 : i.input,
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
function gd(o) {
    let n = null;
    for (let i = K.getLastElementChild(o); i; i = K.getLastElementChild(i)) n = i;
    return n || void 0;
}
function xm(o) {
    var n, i;
    const a = o.ownerDocument,
        c = (n = a.defaultView) === null || n === void 0 ? void 0 : n.getComputedStyle(o);
    return (
        (o.offsetParent === null &&
            a.body !== o &&
            (c == null ? void 0 : c.position) !== "fixed") ||
        (c == null ? void 0 : c.visibility) === "hidden" ||
        ((c == null ? void 0 : c.position) === "fixed" &&
            (c.display === "none" ||
                (((i = o.parentElement) === null || i === void 0 ? void 0 : i.offsetParent) ===
                    null &&
                    a.body !== o.parentElement)))
    );
}
function Us(o) {
    return o.tagName === "INPUT" && !!o.name && o.type === "radio";
}
function Sm(o) {
    if (!Us(o)) return;
    const n = o.name;
    let i = Array.from(K.getElementsByName(o, n)),
        a;
    return (
        (i = i.filter((c) => (Us(c) ? (c.checked && (a = c), !0) : !1))),
        { name: n, buttons: new Set(i), checked: a }
    );
}
function Bi(o) {
    var n;
    return (
        ((n = o == null ? void 0 : o.__tabsterDummyContainer) === null || n === void 0
            ? void 0
            : n.get()) || null
    );
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ function yd(o, n) {
    return JSON.stringify(o);
}
function Bm(o, n) {
    for (const i of Object.keys(n)) {
        const a = n[i];
        a ? (o[i] = a) : delete o[i];
    }
}
function Tm(o, n, i) {
    let a;
    {
        const c = o.getAttribute(_r);
        if (c)
            try {
                a = JSON.parse(c);
            } catch {}
    }
    (a || (a = {}),
        Bm(a, n),
        Object.keys(a).length > 0 ? o.setAttribute(_r, yd(a)) : o.removeAttribute(_r));
}
class kf extends Si {
    constructor(n, i, a, c) {
        (super(n, i, md.Root, c, void 0, !0),
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
class Em extends vd {
    constructor(n, i, a, c, f) {
        (super(n, i, c),
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
                          y.dispatchEvent(new A0({ element: y })))
                        : (this._setFocusedTimer = this._tabster.getWindow().setTimeout(() => {
                              var k;
                              (delete this._setFocusedTimer,
                                  (this._isFocused = !1),
                                  (k = this._dummyManager) === null ||
                                      k === void 0 ||
                                      k.setTabbable(!0),
                                  y.dispatchEvent(new q0({ element: y })));
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
        ((this.uid = _i(h, i)),
            (this._sys = f),
            (n.controlTab || n.rootDummyInputs) && this.addDummyInputs());
        const m = h().document;
        (m.addEventListener(Rt, this._onFocusIn),
            m.addEventListener(ro, this._onFocusOut),
            this._add());
    }
    addDummyInputs() {
        this._dummyManager ||
            (this._dummyManager = new kf(
                this._tabster,
                this._element,
                this._setFocused,
                this._sys
            ));
    }
    dispose() {
        var n;
        this._onDispose(this);
        const i = this._tabster.getWindow(),
            a = i.document;
        (a.removeEventListener(Rt, this._onFocusIn),
            a.removeEventListener(ro, this._onFocusOut),
            this._setFocusedTimer &&
                (i.clearTimeout(this._setFocusedTimer), delete this._setFocusedTimer),
            (n = this._dummyManager) === null || n === void 0 || n.dispose(),
            this._remove());
    }
    moveOutWithDefaultAction(n, i) {
        const a = this._dummyManager;
        if (a) a.moveOutWithDefaultAction(n, i);
        else {
            const c = this.getElement();
            c && kf.moveWithPhantomDummy(this._tabster, c, !0, n, i);
        }
    }
    _add() {}
    _remove() {}
}
class yt {
    constructor(n, i) {
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
                            Tm(f, { root: h }),
                            sd(this._tabster, f),
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
            (this._autoRoot = i),
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
            Object.keys(this._roots).forEach((i) => {
                this._roots[i] && (this._roots[i].dispose(), delete this._roots[i]);
            }),
            (this.rootById = {}));
    }
    createRoot(n, i, a) {
        const c = new Em(this._tabster, n, this._onRootDispose, i, a);
        return ((this._roots[c.id] = c), this._forceDummy && c.addDummyInputs(), c);
    }
    addDummyInputs() {
        this._forceDummy = !0;
        const n = this._roots;
        for (const i of Object.keys(n)) n[i].addDummyInputs();
    }
    static getRootByUId(n, i) {
        const a = n().__tabsterInstance;
        return a && a.root.rootById[i];
    }
    static getTabsterContext(n, i, a = {}) {
        var c, f, h, p;
        if (!i.ownerDocument) return;
        const { checkRtl: m, referenceElement: v } = a,
            b = n.getParent;
        n.drainInitQueue();
        let y,
            k,
            S,
            C,
            T = !1,
            N,
            q,
            H,
            D,
            Q = v || i;
        const re = {};
        for (; Q && (!y || m); ) {
            const ee = At(n, Q);
            if (m && H === void 0) {
                const Ee = Q.dir;
                Ee && (H = Ee.toLowerCase() === "rtl");
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
                    (T = !0));
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
                    (!fe || Q !== i) &&
                    Q.contains(i) &&
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
                !((p = i.ownerDocument) === null || p === void 0) &&
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
                      excludedFromMover: T,
                      ignoreKeydown: (ee) => !!re[ee.key],
                  }
                : void 0
        );
    }
    static getRoot(n, i) {
        var a;
        const c = n.getParent;
        for (let f = i; f; f = c(f)) {
            const h = (a = At(n, f)) === null || a === void 0 ? void 0 : a.root;
            if (h) return h;
        }
    }
    onRoot(n, i) {
        i ? delete this.rootById[n.uid] : (this.rootById[n.uid] = n);
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class wd {
    constructor() {
        this._callbacks = [];
    }
    dispose() {
        ((this._callbacks = []), delete this._val);
    }
    subscribe(n) {
        const i = this._callbacks;
        i.indexOf(n) < 0 && i.push(n);
    }
    subscribeFirst(n) {
        const i = this._callbacks,
            a = i.indexOf(n);
        (a >= 0 && i.splice(a, 1), i.unshift(n));
    }
    unsubscribe(n) {
        const i = this._callbacks.indexOf(n);
        i >= 0 && this._callbacks.splice(i, 1);
    }
    setVal(n, i) {
        this._val !== n && ((this._val = n), this._callCallbacks(n, i));
    }
    getVal() {
        return this._val;
    }
    trigger(n, i) {
        this._callCallbacks(n, i);
    }
    _callCallbacks(n, i) {
        this._callbacks.forEach((a) => a(n, i));
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class Cm {
    constructor(n) {
        this._tabster = n;
    }
    dispose() {}
    getProps(n) {
        const i = At(this._tabster, n);
        return (i && i.focusable) || {};
    }
    isFocusable(n, i, a, c) {
        return pd(n, ld) && (i || n.tabIndex !== -1)
            ? (a || this.isVisible(n)) && (c || this.isAccessible(n))
            : !1;
    }
    isVisible(n) {
        if (!n.ownerDocument || n.nodeType !== Node.ELEMENT_NODE || xm(n)) return !1;
        const i = n.ownerDocument.body.getBoundingClientRect();
        return !(i.width === 0 && i.height === 0);
    }
    isAccessible(n) {
        var i;
        for (let a = n; a; a = K.getParentElement(a)) {
            const c = At(this._tabster, a);
            if (
                this._isHidden(a) ||
                (!((i = c == null ? void 0 : c.focusable) === null || i === void 0
                    ? void 0
                    : i.ignoreAriaDisabled) &&
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
        var i;
        const a = n.getAttribute("aria-hidden");
        return !!(
            a &&
            a.toLowerCase() === "true" &&
            !(!((i = this._tabster.modalizer) === null || i === void 0) && i.isAugmented(n))
        );
    }
    findFirst(n, i) {
        return this.findElement({ ...n }, i);
    }
    findLast(n, i) {
        return this.findElement({ isBackward: !0, ...n }, i);
    }
    findNext(n, i) {
        return this.findElement({ ...n }, i);
    }
    findPrev(n, i) {
        return this.findElement({ ...n, isBackward: !0 }, i);
    }
    findDefault(n, i) {
        return (
            this.findElement(
                {
                    ...n,
                    acceptCondition: (a) =>
                        this.isFocusable(a, n.includeProgrammaticallyFocusable) &&
                        !!this.getProps(a).isDefault,
                },
                i
            ) || null
        );
    }
    findAll(n) {
        return this._findElements(!0, n) || [];
    }
    findElement(n, i) {
        const a = this._findElements(!1, n, i);
        return a && a[0];
    }
    _findElements(n, i, a) {
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
        } = i;
        a || (a = {});
        const T = [];
        let { acceptCondition: N } = i;
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
                U && T.push(U),
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
            const re = gd(p);
            if (!re) return null;
            if (this._acceptElement(re, H) === NodeFilter.FILTER_ACCEPT && !Q(!0))
                return (H.skippedFocusable && (a.outOfDOMOrder = !0), T);
            D.currentNode = re;
        }
        do S ? D.previousNode() : D.nextNode();
        while (Q());
        return (H.skippedFocusable && (a.outOfDOMOrder = !0), T.length ? T : null);
    }
    _acceptElement(n, i) {
        var a, c, f;
        if (i.found) return NodeFilter.FILTER_ACCEPT;
        const h = i.foundBackward;
        if (h && (n === h || !K.nodeContains(h, n)))
            return ((i.found = !0), (i.foundElement = h), NodeFilter.FILTER_ACCEPT);
        const p = i.container;
        if (n === p) return NodeFilter.FILTER_SKIP;
        if (!K.nodeContains(p, n) || Bi(n) || K.nodeContains(i.rejectElementsFrom, n))
            return NodeFilter.FILTER_REJECT;
        const m = (i.currentCtx = yt.getTabsterContext(this._tabster, n));
        if (!m) return NodeFilter.FILTER_SKIP;
        if (hd(n))
            return (
                this.isFocusable(n, void 0, !0, !0) && (i.skippedFocusable = !0),
                NodeFilter.FILTER_SKIP
            );
        if (!i.hasCustomCondition && (n.tagName === "IFRAME" || n.tagName === "WEBVIEW"))
            return this.isVisible(n) &&
                ((a = m.modalizer) === null || a === void 0 ? void 0 : a.userId) ===
                    ((c = this._tabster.modalizer) === null || c === void 0 ? void 0 : c.activeId)
                ? ((i.found = !0),
                  (i.rejectElementsFrom = i.foundElement = n),
                  NodeFilter.FILTER_ACCEPT)
                : NodeFilter.FILTER_REJECT;
        if (!i.ignoreAccessibility && !this.isAccessible(n))
            return (
                this.isFocusable(n, !1, !0, !0) && (i.skippedFocusable = !0),
                NodeFilter.FILTER_REJECT
            );
        let v,
            b = i.fromCtx;
        b || (b = i.fromCtx = yt.getTabsterContext(this._tabster, i.from));
        const y = b == null ? void 0 : b.mover;
        let k = m.groupper,
            S = m.mover;
        if (
            ((v =
                (f = this._tabster.modalizer) === null || f === void 0
                    ? void 0
                    : f.acceptElement(n, i)),
            v !== void 0 && (i.skippedFocusable = !0),
            v === void 0 && (k || S || y))
        ) {
            const C = k == null ? void 0 : k.getElement(),
                T = y == null ? void 0 : y.getElement();
            let N = S == null ? void 0 : S.getElement();
            if (
                (N &&
                    K.nodeContains(T, N) &&
                    K.nodeContains(p, T) &&
                    (!C || !S || K.nodeContains(T, C)) &&
                    ((S = y), (N = T)),
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
                k && (v = k.acceptElement(n, i)),
                S && (v = S.acceptElement(n, i)));
        }
        if (
            (v === void 0 &&
                ((v = i.acceptCondition(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
                v === NodeFilter.FILTER_SKIP &&
                    this.isFocusable(n, !1, !0, !0) &&
                    (i.skippedFocusable = !0)),
            v === NodeFilter.FILTER_ACCEPT && !i.found)
        ) {
            if (!i.isFindAll && Us(n) && !n.checked) {
                const C = n.name;
                let T = i.cachedRadioGroups[C];
                if (
                    (T || ((T = Sm(n)), T && (i.cachedRadioGroups[C] = T)),
                    T != null && T.checked && T.checked !== n)
                )
                    return NodeFilter.FILTER_SKIP;
            }
            i.isBackward
                ? ((i.foundBackward = n), (v = NodeFilter.FILTER_SKIP))
                : ((i.found = !0), (i.foundElement = n));
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
 */ function zm(o, n) {
    var i;
    const a = o.getParent;
    let c = n;
    do {
        const f = (i = At(o, c)) === null || i === void 0 ? void 0 : i.uncontrolled;
        if (f && o.uncontrolled.isUncontrolledCompletely(c, !!f.completely)) return c;
        c = a(c);
    } while (c);
}
const xf = { [Fs.Restorer]: 0, [Fs.Deloser]: 1, [Fs.EscapeGroupper]: 2 };
class Oe extends wd {
    constructor(n, i) {
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
                    v = Oe.findNextTabbable(f, p, void 0, c, void 0, m, !0),
                    b = p.root.getElement();
                if (!b) return;
                const y = v == null ? void 0 : v.element,
                    k = zm(f, c);
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
                if (a) a.dispatchEvent(new L0(c));
                else {
                    const p = (f = this._lastVal) === null || f === void 0 ? void 0 : f.get();
                    if (p) {
                        const m = { ...c },
                            v = yt.getTabsterContext(this._tabster, p),
                            b =
                                (h = v == null ? void 0 : v.modalizer) === null || h === void 0
                                    ? void 0
                                    : h.userId;
                        (b && (m.modalizerId = b), p.dispatchEvent(new O0(m)));
                    }
                }
            }),
            (this._tabster = n),
            (this._win = i),
            n.queueInit(this._init));
    }
    dispose() {
        super.dispose();
        const n = this._win(),
            i = n.document;
        (i.removeEventListener(Rt, this._onFocusIn, !0),
            i.removeEventListener(ro, this._onFocusOut, !0),
            n.removeEventListener("keydown", this._onKeyDown, !0),
            this.unsubscribe(this._onChanged));
        const a = this._asyncFocus;
        (a && (n.clearTimeout(a.timeout), delete this._asyncFocus),
            delete Oe._lastResetElement,
            delete this._nextVal,
            delete this._lastVal);
    }
    static forgetMemorized(n, i) {
        var a, c;
        let f = Oe._lastResetElement,
            h = f && f.get();
        (h && K.nodeContains(i, h) && delete Oe._lastResetElement,
            (h =
                (c = (a = n._nextVal) === null || a === void 0 ? void 0 : a.element) === null ||
                c === void 0
                    ? void 0
                    : c.get()),
            h && K.nodeContains(i, h) && delete n._nextVal,
            (f = n._lastVal),
            (h = f && f.get()),
            h && K.nodeContains(i, h) && delete n._lastVal);
    }
    getFocusedElement() {
        return this.getVal();
    }
    getLastFocusedElement() {
        var n;
        let i = (n = this._lastVal) === null || n === void 0 ? void 0 : n.get();
        return ((!i || (i && !na(i.ownerDocument, i))) && (this._lastVal = i = void 0), i);
    }
    focus(n, i, a, c) {
        return this._tabster.focusable.isFocusable(n, i, !1, a)
            ? (n.focus({ preventScroll: c }), !0)
            : !1;
    }
    focusDefault(n) {
        const i = this._tabster.focusable.findDefault({ container: n });
        return i ? (this._tabster.focusedElement.focus(i), !0) : !1;
    }
    getFirstOrLastTabbable(n, i) {
        var a;
        const { container: c, ignoreAccessibility: f } = i;
        let h;
        if (c) {
            const p = yt.getTabsterContext(this._tabster, c);
            p &&
                (h =
                    (a = Oe.findNextTabbable(this._tabster, p, c, void 0, void 0, !n, f)) ===
                        null || a === void 0
                        ? void 0
                        : a.element);
        }
        return (h && !K.nodeContains(c, h) && (h = void 0), h || void 0);
    }
    _focusFirstOrLast(n, i) {
        const a = this.getFirstOrLastTabbable(n, i);
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
            const i = n.getAttribute("tabindex"),
                a = n.getAttribute("aria-hidden");
            ((n.tabIndex = -1),
                n.setAttribute("aria-hidden", "true"),
                (Oe._lastResetElement = new Gt(this._win, n)),
                this.focus(n, !0, !0),
                this._setOrRemoveAttribute(n, "tabindex", i),
                this._setOrRemoveAttribute(n, "aria-hidden", a));
        }
        return !0;
    }
    requestAsyncFocus(n, i, a) {
        const c = this._tabster.getWindow(),
            f = this._asyncFocus;
        if (f) {
            if (xf[n] > xf[f.source]) return;
            c.clearTimeout(f.timeout);
        }
        this._asyncFocus = {
            source: n,
            callback: i,
            timeout: c.setTimeout(() => {
                ((this._asyncFocus = void 0), i());
            }, a),
        };
    }
    cancelAsyncFocus(n) {
        const i = this._asyncFocus;
        (i == null ? void 0 : i.source) === n &&
            (this._tabster.getWindow().clearTimeout(i.timeout), (this._asyncFocus = void 0));
    }
    _setOrRemoveAttribute(n, i, a) {
        a === null ? n.removeAttribute(i) : n.setAttribute(i, a);
    }
    _setFocusedElement(n, i, a) {
        var c, f;
        if (this._tabster._noop) return;
        const h = { relatedTarget: i };
        if (n) {
            const m = (c = Oe._lastResetElement) === null || c === void 0 ? void 0 : c.get();
            if (((Oe._lastResetElement = void 0), m === n || hd(n))) return;
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
    setVal(n, i) {
        (super.setVal(n, i), n && (this._lastVal = new Gt(this._win, n)));
    }
    static findNextTabbable(n, i, a, c, f, h, p) {
        const m = a || i.root.getElement();
        if (!m) return null;
        let v = null;
        const b = Oe._isTabbingTimer,
            y = n.getWindow();
        (b && y.clearTimeout(b),
            (Oe.isTabbing = !0),
            (Oe._isTabbingTimer = y.setTimeout(() => {
                (delete Oe._isTabbingTimer, (Oe.isTabbing = !1));
            }, 0)));
        const k = i.modalizer,
            S = i.groupper,
            C = i.mover,
            T = (N) => {
                if (((v = N.findNextTabbable(c, f, h, p)), c && !(v != null && v.element))) {
                    const q = N !== k && K.getParentElement(N.getElement());
                    if (q) {
                        const H = yt.getTabsterContext(n, c, { referenceElement: q });
                        if (H) {
                            const D = N.getElement(),
                                Q = h ? D : (D && gd(D)) || D;
                            Q &&
                                ((v = Oe.findNextTabbable(n, H, a, Q, q, h, p)),
                                v && (v.outOfDOMOrder = !0));
                        }
                    }
                }
            };
        if (S && C) T(i.groupperBeforeMover ? S : C);
        else if (S) T(S);
        else if (C) T(C);
        else if (k) T(k);
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
Oe.isTabbing = !1;
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class Nm extends wd {
    constructor(n) {
        (super(),
            (this._onChange = (i) => {
                this.setVal(i, void 0);
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
        var i;
        (i = this._keyborg) === null || i === void 0 || i.setVal(n);
    }
    isNavigatingWithKeyboard() {
        var n;
        return !!(!((n = this._keyborg) === null || n === void 0) && n.isNavigatingWithKeyboard());
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const Pm = ["input", "textarea", "*[contenteditable]"].join(", ");
class Fm extends Si {
    constructor(n, i, a, c) {
        (super(i, n, md.Mover, c),
            (this._onFocusDummyInput = (f) => {
                var h, p;
                const m = this._element.get(),
                    v = f.input;
                if (m && v) {
                    const b = yt.getTabsterContext(this._tabster, m);
                    let y;
                    b &&
                        (y =
                            (h = Oe.findNextTabbable(
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
            (this._tabster = i),
            (this._getMemorized = a),
            this._setHandlers(this._onFocusDummyInput));
    }
}
const js = 1,
    Sf = 2,
    Bf = 3;
class Rm extends vd {
    constructor(n, i, a, c, f) {
        var h;
        (super(n, i, c),
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
                        C && b.dispatchEvent(new yf(C));
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
        n.controlTab || (this.dummyManager = new Fm(this._element, n, p, f));
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
        const i = this._win();
        (this._setCurrentTimer &&
            (i.clearTimeout(this._setCurrentTimer), delete this._setCurrentTimer),
            this._updateTimer && (i.clearTimeout(this._updateTimer), delete this._updateTimer),
            (n = this.dummyManager) === null || n === void 0 || n.dispose(),
            delete this.dummyManager);
    }
    setCurrent(n) {
        (n ? (this._current = new Gt(this._win, n)) : (this._current = void 0),
            (this._props.trackState || this._props.visibilityAware) &&
                !this._setCurrentTimer &&
                (this._setCurrentTimer = this._win().setTimeout(() => {
                    var i;
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
                            ((i = this._allElements) === null || i === void 0
                                ? void 0
                                : i.get(f)) === this
                        ) {
                            const h = this._props;
                            if (f && (h.visibilityAware !== void 0 || h.trackState)) {
                                const p = this.getState(f);
                                p && f.dispatchEvent(new yf(p));
                            }
                        }
                    }
                })));
    }
    getCurrent() {
        var n;
        return ((n = this._current) === null || n === void 0 ? void 0 : n.get()) || null;
    }
    findNextTabbable(n, i, a, c) {
        const f = this.getElement(),
            h = f && Bi(n) === f;
        if (!f) return null;
        let p = null,
            m = !1,
            v;
        if (this._props.tabbable || h || (n && !K.nodeContains(f, n))) {
            const b = {
                    currentElement: n,
                    referenceElement: i,
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
    acceptElement(n, i) {
        var a, c;
        if (!Oe.isTabbing)
            return !((a = i.currentCtx) === null || a === void 0) && a.excludedFromMover
                ? NodeFilter.FILTER_REJECT
                : void 0;
        const { memorizeCurrent: f, visibilityAware: h, hasDefault: p = !0 } = this._props,
            m = this.getElement();
        if (m && (f || h || p) && (!K.nodeContains(m, i.from) || Bi(i.from) === m)) {
            let v;
            if (f) {
                const b = (c = this._current) === null || c === void 0 ? void 0 : c.get();
                b && i.acceptCondition(b) && (v = b);
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
                        isBackward: i.isBackward,
                        acceptCondition: (b) => {
                            var y;
                            const k = _i(this._win, b),
                                S = this._visible[k];
                            return (
                                m !== b &&
                                !!(
                                    !((y = this._allElements) === null || y === void 0) && y.get(b)
                                ) &&
                                i.acceptCondition(b) &&
                                (S === gr.Visible ||
                                    (S === gr.PartiallyVisible &&
                                        (h === gr.PartiallyVisible || !this._fullyVisible)))
                            );
                        },
                    })),
                v)
            )
                return (
                    (i.found = !0),
                    (i.foundElement = v),
                    (i.rejectElementsFrom = m),
                    (i.skippedFocusable = !0),
                    NodeFilter.FILTER_ACCEPT
                );
        }
    }
    _observeState() {
        const n = this.getElement();
        if (this._unobserve || !n || typeof MutationObserver > "u") return;
        const i = this._win(),
            a = (this._allElements = new WeakMap()),
            c = this._tabster.focusable;
        let f = (this._updateQueue = []);
        const h = K.createMutationObserver((S) => {
                for (const C of S) {
                    const T = C.target,
                        N = C.removedNodes,
                        q = C.addedNodes;
                    if (C.type === "attributes")
                        C.attributeName === "tabindex" && f.push({ element: T, type: Sf });
                    else {
                        for (let H = 0; H < N.length; H++) f.push({ element: N[H], type: Bf });
                        for (let H = 0; H < q.length; H++) f.push({ element: q[H], type: js });
                    }
                }
                y();
            }),
            p = (S, C) => {
                var T, N;
                const q = a.get(S);
                (q &&
                    C &&
                    ((T = this._intersectionObserver) === null || T === void 0 || T.unobserve(S),
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
                const T = ra(i.document, S, (N) => {
                    const { mover: q, groupper: H } = k(N);
                    if (q && q !== this) return NodeFilter.FILTER_REJECT;
                    const D = H == null ? void 0 : H.getFirst(!0);
                    return H && H.getElement() !== N && D && D !== N
                        ? NodeFilter.FILTER_REJECT
                        : (c.isFocusable(N) && p(N), NodeFilter.FILTER_SKIP);
                });
                if (T) for (T.currentNode = S; T.nextNode(); );
            },
            b = (S) => {
                a.get(S) && p(S, !0);
                for (let T = K.getFirstElementChild(S); T; T = K.getNextElementSibling(T)) b(T);
            },
            y = () => {
                !this._updateTimer &&
                    f.length &&
                    (this._updateTimer = i.setTimeout(() => {
                        delete this._updateTimer;
                        for (const { element: S, type: C } of f)
                            switch (C) {
                                case Sf:
                                    m(S);
                                    break;
                                case js:
                                    v(S);
                                    break;
                                case Bf:
                                    b(S);
                                    break;
                            }
                        f = this._updateQueue = [];
                    }, 0));
            },
            k = (S) => {
                const C = {};
                for (let T = S; T; T = K.getParentElement(T)) {
                    const N = At(this._tabster, T);
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
        const i = _i(this._win, n);
        if (i in this._visible) {
            const a = this._visible[i] || gr.Invisible;
            return { isCurrent: this._current ? this._current.get() === n : void 0, visibility: a };
        }
    }
}
function jm(o, n, i, a, c, f, h, p) {
    const m = i < c ? c - i : h < o ? o - h : 0,
        v = a < f ? f - a : p < n ? n - p : 0;
    return m === 0 ? v : v === 0 ? m : Math.sqrt(m * m + v * v);
}
class Im {
    constructor(n, i) {
        ((this._init = () => {
            const a = this._win();
            (a.addEventListener("keydown", this._onKeyDown, !0),
                a.addEventListener(mf, this._onMoveFocus),
                a.addEventListener(gf, this._onMemorizedElement),
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
            (this._win = i),
            (this._movers = {}),
            n.queueInit(this._init));
    }
    dispose() {
        var n;
        const i = this._win();
        (this._tabster.focusedElement.unsubscribe(this._onFocus),
            (n = this._ignoredInputResolve) === null || n === void 0 || n.call(this, !1),
            this._ignoredInputTimer &&
                (i.clearTimeout(this._ignoredInputTimer), delete this._ignoredInputTimer),
            i.removeEventListener("keydown", this._onKeyDown, !0),
            i.removeEventListener(mf, this._onMoveFocus),
            i.removeEventListener(gf, this._onMemorizedElement),
            Object.keys(this._movers).forEach((a) => {
                this._movers[a] && (this._movers[a].dispose(), delete this._movers[a]);
            }));
    }
    createMover(n, i, a) {
        const c = new Rm(this._tabster, n, this._onMoverDispose, i, a);
        return ((this._movers[c.id] = c), c);
    }
    moveFocus(n, i) {
        return this._moveFocus(n, i);
    }
    _moveFocus(n, i, a) {
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
            T = S || k === Ft.Horizontal,
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
                (i === De.ArrowRight
                    ? (i = De.ArrowLeft)
                    : i === De.ArrowLeft && (i = De.ArrowRight)),
            (i === De.ArrowDown && C) || (i === De.ArrowRight && (T || q)))
        )
            if (
                ((D = b.findNext({ currentElement: n, container: v, useActiveModalizer: !0 })),
                D && q)
            ) {
                const U = Math.ceil(D.getBoundingClientRect().left);
                !N && ee > U && (D = void 0);
            } else !D && H && (D = b.findFirst({ container: v, useActiveModalizer: !0 }));
        else if ((i === De.ArrowUp && C) || (i === De.ArrowLeft && (T || q)))
            if (
                ((D = b.findPrev({ currentElement: n, container: v, useActiveModalizer: !0 })),
                D && q)
            ) {
                const U = Math.floor(D.getBoundingClientRect().right);
                !N && U > G && (D = void 0);
            } else !D && H && (D = b.findLast({ container: v, useActiveModalizer: !0 }));
        else if (i === De.Home)
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
        else if (i === De.End)
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
        else if (i === De.PageUp) {
            if (
                (b.findElement({
                    currentElement: n,
                    container: v,
                    useActiveModalizer: !0,
                    isBackward: !0,
                    acceptCondition: (U) =>
                        b.isFocusable(U)
                            ? bf(this._win, U, m.visibilityTolerance)
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
        } else if (i === De.PageDown) {
            if (
                (b.findElement({
                    currentElement: n,
                    container: v,
                    useActiveModalizer: !0,
                    acceptCondition: (U) =>
                        b.isFocusable(U)
                            ? bf(this._win, U, m.visibilityTolerance)
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
            const U = i === De.ArrowUp,
                ie = G,
                fe = Math.ceil(re.top),
                Ue = ee,
                Ee = Math.floor(re.bottom);
            let Me,
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
                    if ((U && fe < x) || (!U && Ee > V)) return !0;
                    const F = Math.ceil(Math.min(Ue, L)) - Math.floor(Math.max(ie, P)),
                        ae = Math.ceil(Math.min(Ue - ie, L - P));
                    if (F > 0 && ae >= F) {
                        const le = F / ae;
                        le > qe && ((Me = A), (qe = le));
                    } else if (qe === 0) {
                        const le = jm(ie, fe, Ue, Ee, P, V, L, x);
                        (Qe === void 0 || le < Qe) && ((Qe = le), (Me = A));
                    } else if (qe > 0) return !1;
                    return !0;
                },
            }),
                (D = Me));
        }
        return D &&
            (!a ||
                (a && v.dispatchEvent(new un({ by: "mover", owner: v, next: D, relatedEvent: a }))))
            ? (Q !== void 0 && vm(this._win, D, Q),
              a && (a.preventDefault(), a.stopImmediatePropagation()),
              kr(D),
              D)
            : null;
    }
    async _isIgnoredInput(n, i) {
        if (
            n.getAttribute("aria-expanded") === "true" &&
            (n.hasAttribute("aria-activedescendant") || n.getAttribute("role") === "combobox")
        )
            return !0;
        if (pd(n, Pm)) {
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
                                y = i === Ye.ArrowLeft || i === Ye.ArrowUp;
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
                    (h = new (ym(this._win))((p) => {
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
                            var S, C, T;
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
                            (T = this._ignoredInputResolve) === null ||
                                T === void 0 ||
                                T.call(this, !0);
                        }, 0);
                    }));
            if (
                (h && !(await h)) ||
                a !== c ||
                (a > 0 && (i === Ye.ArrowLeft || i === Ye.ArrowUp || i === Ye.Home)) ||
                (a < f && (i === Ye.ArrowRight || i === Ye.ArrowDown || i === Ye.End))
            )
                return !0;
        }
        return !1;
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ function Dm(o, n, i, a) {
    if (typeof MutationObserver > "u") return () => {};
    const c = n.getWindow;
    let f;
    const h = (b) => {
        var y, k, S, C, T;
        const N = new Set();
        for (const q of b) {
            const H = q.target,
                D = q.removedNodes,
                Q = q.addedNodes;
            if (q.type === "attributes") q.attributeName === _r && (N.has(H) || i(n, H));
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
        (N.clear(), (T = n.modalizer) === null || T === void 0 || T.hiddenUpdate());
    };
    function p(b, y) {
        (f || (f = Yt(c).elementByUId), m(b, y));
        const k = ra(o, b, (S) => m(S, y));
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
            (At(n, b) || b.hasAttribute(_r)) && i(n, b, y),
            NodeFilter.FILTER_SKIP
        );
    }
    const v = K.createMutationObserver(h);
    return (
        a && p(c().document.body),
        v.observe(o, { childList: !0, subtree: !0, attributes: !0, attributeFilter: [_r] }),
        () => {
            v.disconnect();
        }
    );
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class Mm {
    constructor(n) {
        this._isUncontrolledCompletely = n;
    }
    isUncontrolledCompletely(n, i) {
        var a;
        const c =
            (a = this._isUncontrolledCompletely) === null || a === void 0
                ? void 0
                : a.call(this, n, i);
        return c === void 0 ? i : c;
    }
}
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ class Lm {
    constructor(n) {
        ((this.keyboardNavigation = n.keyboardNavigation),
            (this.focusedElement = n.focusedElement),
            (this.focusable = n.focusable),
            (this.root = n.root),
            (this.uncontrolled = n.uncontrolled),
            (this.core = n));
    }
}
class Om {
    constructor(n, i) {
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
            (this._storage = dm(n)),
            (this._win = n));
        const f = this.getWindow;
        (i != null && i.DOMAPI && um({ ...i.DOMAPI }),
            (this.keyboardNavigation = new Nm(f)),
            (this.focusedElement = new Oe(this, f)),
            (this.focusable = new Cm(this)),
            (this.root = new yt(this, i == null ? void 0 : i.autoRoot)),
            (this.uncontrolled = new Mm(
                (i == null ? void 0 : i.checkUncontrolledCompletely) ||
                    (i == null ? void 0 : i.checkUncontrolledTrappingFocus)
            )),
            (this.controlTab =
                (a = i == null ? void 0 : i.controlTab) !== null && a !== void 0 ? a : !0),
            (this.rootDummyInputs = !!(i != null && i.rootDummyInputs)),
            (this._dummyObserver = new _m(f)),
            (this.getParent =
                (c = i == null ? void 0 : i.getParent) !== null && c !== void 0
                    ? c
                    : K.getParentNode),
            (this.internal = {
                stopObserver: () => {
                    this._unobserve && (this._unobserve(), delete this._unobserve);
                },
                resumeObserver: (h) => {
                    if (!this._unobserve) {
                        const p = f().document;
                        this._unobserve = Dm(p, this, sd, h);
                    }
                },
            }),
            cd(f),
            this.queueInit(() => {
                this.internal.resumeObserver(!0);
            }));
    }
    _mergeProps(n) {
        var i;
        n && (this.getParent = (i = n.getParent) !== null && i !== void 0 ? i : this.getParent);
    }
    createTabster(n, i) {
        const a = new Lm(this);
        return (n || this._wrappers.add(a), this._mergeProps(i), a);
    }
    disposeTabster(n, i) {
        (i ? this._wrappers.clear() : this._wrappers.delete(n),
            this._wrappers.size === 0 && this.dispose());
    }
    dispose() {
        var n, i, a, c, f, h, p, m;
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
            (i = this.crossOrigin) === null || i === void 0 || i.dispose(),
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
            pm(this.getWindow),
            _f(this.getWindow),
            (this._storage = new WeakMap()),
            this._wrappers.clear(),
            v && (fm(v), delete v.__tabsterInstance, delete this._win));
    }
    storageEntry(n, i) {
        const a = this._storage;
        let c = a.get(n);
        return (
            c
                ? i === !1 && Object.keys(c).length === 0 && a.delete(n)
                : i === !0 && ((c = {}), a.set(n, c)),
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
                        (_f(this.getWindow, n), Oe.forgetMemorized(this.focusedElement, n));
                }, 0)),
                ud(this.getWindow, !0)));
    }
    queueInit(n) {
        var i;
        this._win &&
            (this._initQueue.push(n),
            this._initTimer ||
                (this._initTimer =
                    (i = this._win) === null || i === void 0
                        ? void 0
                        : i.setTimeout(() => {
                              (delete this._initTimer, this.drainInitQueue());
                          }, 0)));
    }
    drainInitQueue() {
        if (!this._win) return;
        const n = this._initQueue;
        ((this._initQueue = []), n.forEach((i) => i()));
    }
}
function Am(o, n) {
    let i = Wm(o);
    return i
        ? i.createTabster(!1, n)
        : ((i = new Om(o, n)), (o.__tabsterInstance = i), i.createTabster());
}
function qm(o) {
    const n = o.core;
    return (n.mover || (n.mover = new Im(n, n.getWindow)), n.mover);
}
function Hm(o, n) {
    o.core.disposeTabster(o, n);
}
function Wm(o) {
    return o.__tabsterInstance;
}
const Um = (o) => o;
function Vm(o) {
    const n = (o == null ? void 0 : o.defaultView) || void 0,
        i = n == null ? void 0 : n.__tabsterShadowDOMAPI;
    if (n)
        return Am(n, {
            autoRoot: {},
            controlTab: !1,
            getParent: v0,
            checkUncontrolledCompletely: (a) => {
                var c;
                return (
                    ((c = a.firstElementChild) === null || c === void 0
                        ? void 0
                        : c.hasAttribute("data-is-focus-trap-zone-bumper")) === !0 || void 0
                );
            },
            DOMAPI: i,
        });
}
function bd(o = Um) {
    const { targetDocument: n } = zi(),
        i = O.useRef(null);
    return (
        Ni(() => {
            const a = Vm(n);
            if (a)
                return (
                    (i.current = o(a)),
                    () => {
                        (Hm(a), (i.current = null));
                    }
                );
        }, [n, o]),
        i
    );
}
const Km = (o) => {
        bd();
        const n = yd(o);
        return O.useMemo(() => ({ [_r]: n }), [n]);
    },
    $m = (o = {}) => {
        const {
            circular: n,
            axis: i,
            memorizeCurrent: a = !0,
            tabbable: c,
            ignoreDefaultKeydown: f,
            unstable_hasDefault: h,
        } = o;
        return (
            bd(qm),
            Km({
                mover: {
                    cyclic: !!n,
                    direction: Qm(i ?? "vertical"),
                    memorizeCurrent: a,
                    tabbable: c,
                    hasDefault: h,
                },
                ...(f && { focusable: { ignoreKeydown: f } }),
            })
        );
    };
function Qm(o) {
    switch (o) {
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
    _d = "data-fui-focus-within";
function Gm(o, n) {
    if (kd(o)) return () => {};
    const i = { current: void 0 },
        a = ea(n);
    function c(m) {
        a.isNavigatingWithKeyboard() && pf(m) && ((i.current = m), m.setAttribute(Tf, ""));
    }
    function f() {
        i.current && (i.current.removeAttribute(Tf), (i.current = void 0));
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
            (!m.relatedTarget || (pf(m.relatedTarget) && !o.contains(m.relatedTarget))) && f();
        };
    return (
        o.addEventListener(Rt, h),
        o.addEventListener("focusout", p),
        (o.focusVisible = !0),
        o.contains(n.document.activeElement) && c(n.document.activeElement),
        () => {
            (f(),
                o.removeEventListener(Rt, h),
                o.removeEventListener("focusout", p),
                (o.focusVisible = void 0),
                ta(a));
        }
    );
}
function kd(o) {
    return o ? (o.focusVisible ? !0 : kd(o == null ? void 0 : o.parentElement)) : !1;
}
function xd(o = {}) {
    const n = zi(),
        i = O.useRef(null);
    var a;
    const c = (a = o.targetDocument) !== null && a !== void 0 ? a : n.targetDocument;
    return (
        O.useEffect(() => {
            if (c != null && c.defaultView && i.current) return Gm(i.current, c.defaultView);
        }, [i, c]),
        i
    );
}
function Xm(o, n) {
    const i = ea(n);
    i.subscribe((f) => {
        f || Ef(o);
    });
    const a = (f) => {
            i.isNavigatingWithKeyboard() && Cf(f.target) && Ym(o);
        },
        c = (f) => {
            (!f.relatedTarget || (Cf(f.relatedTarget) && !o.contains(f.relatedTarget))) && Ef(o);
        };
    return (
        o.addEventListener(Rt, a),
        o.addEventListener("focusout", c),
        () => {
            (o.removeEventListener(Rt, a), o.removeEventListener("focusout", c), ta(i));
        }
    );
}
function Ym(o) {
    o.setAttribute(_d, "");
}
function Ef(o) {
    o.removeAttribute(_d);
}
function Cf(o) {
    return o ? !!(o && typeof o == "object" && "classList" in o && "contains" in o) : !1;
}
function Sd() {
    const { targetDocument: o } = zi(),
        n = O.useRef(null);
    return (
        O.useEffect(() => {
            if (o != null && o.defaultView && n.current) return Xm(n.current, o.defaultView);
        }, [n, o]),
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
    Jm = "#000000",
    Zm = {
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
    Bd = {
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
    eg = {
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
    tg = {
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
    rg = {
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
    ng = {
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
    og = {
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
    ig = {
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
    lg = {
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
    sg = {
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
    ag = {
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
    ug = {
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
    cg = {
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
    fg = {
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
    dg = {
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
    Td = {
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
    hg = {
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
    pg = {
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
    vg = {
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
    mg = {
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
    gg = {
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
    yg = {
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
    wg = {
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
    bg = {
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
    _g = {
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
    kg = {
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
    xg = {
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
    Sg = {
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
    Bg = {
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
    Tg = {
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
    Eg = {
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
    Cg = {
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
    zg = {
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
    Ng = {
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
    Pg = {
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
    Fg = {
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
        red: eg,
        green: Td,
        darkOrange: tg,
        yellow: lg,
        berry: Sg,
        lightGreen: dg,
        marigold: ig,
    },
    Is = {
        darkRed: Zm,
        cranberry: Bd,
        pumpkin: rg,
        peach: og,
        gold: sg,
        brass: ag,
        brown: ug,
        forest: cg,
        seafoam: fg,
        darkGreen: hg,
        lightTeal: pg,
        teal: vg,
        steel: mg,
        blue: gg,
        royalBlue: yg,
        cornflower: wg,
        navy: bg,
        lavender: _g,
        purple: kg,
        grape: xg,
        lilac: Bg,
        pink: Tg,
        magenta: Eg,
        plum: Cg,
        beige: zg,
        mink: Ng,
        platinum: Pg,
        anchor: Fg,
    },
    it = { cranberry: Bd, green: Td, orange: ng },
    Rg = ["red", "green", "darkOrange", "yellow", "berry", "lightGreen", "marigold"],
    jg = [
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
    oo = Rg.reduce((o, n) => {
        const i = n.slice(0, 1).toUpperCase() + n.slice(1),
            a = {
                [`colorPalette${i}Background1`]: gt[n].tint60,
                [`colorPalette${i}Background2`]: gt[n].tint40,
                [`colorPalette${i}Background3`]: gt[n].primary,
                [`colorPalette${i}Foreground1`]: gt[n].shade10,
                [`colorPalette${i}Foreground2`]: gt[n].shade30,
                [`colorPalette${i}Foreground3`]: gt[n].primary,
                [`colorPalette${i}BorderActive`]: gt[n].primary,
                [`colorPalette${i}Border1`]: gt[n].tint40,
                [`colorPalette${i}Border2`]: gt[n].primary,
            };
        return Object.assign(o, a);
    }, {});
oo.colorPaletteYellowForeground1 = gt.yellow.shade30;
oo.colorPaletteRedForegroundInverted = gt.red.tint20;
oo.colorPaletteGreenForegroundInverted = gt.green.tint20;
oo.colorPaletteYellowForegroundInverted = gt.yellow.tint40;
const Ig = jg.reduce((o, n) => {
        const i = n.slice(0, 1).toUpperCase() + n.slice(1),
            a = {
                [`colorPalette${i}Background2`]: Is[n].tint40,
                [`colorPalette${i}Foreground2`]: Is[n].shade30,
                [`colorPalette${i}BorderActive`]: Is[n].primary,
            };
        return Object.assign(o, a);
    }, {}),
    Dg = { ...oo, ...Ig },
    dn = Object.entries(fn).reduce((o, [n, i]) => {
        const a = n.slice(0, 1).toUpperCase() + n.slice(1),
            c = {
                [`colorStatus${a}Background1`]: it[i].tint60,
                [`colorStatus${a}Background2`]: it[i].tint40,
                [`colorStatus${a}Background3`]: it[i].primary,
                [`colorStatus${a}Foreground1`]: it[i].shade10,
                [`colorStatus${a}Foreground2`]: it[i].shade30,
                [`colorStatus${a}Foreground3`]: it[i].primary,
                [`colorStatus${a}ForegroundInverted`]: it[i].tint30,
                [`colorStatus${a}BorderActive`]: it[i].primary,
                [`colorStatus${a}Border1`]: it[i].tint40,
                [`colorStatus${a}Border2`]: it[i].primary,
            };
        return Object.assign(o, c);
    }, {});
dn.colorStatusDangerBackground3Hover = it[fn.danger].shade10;
dn.colorStatusDangerBackground3Pressed = it[fn.danger].shade20;
dn.colorStatusWarningForeground1 = it[fn.warning].shade20;
dn.colorStatusWarningForeground3 = it[fn.warning].shade20;
dn.colorStatusWarningBorder2 = it[fn.warning].shade20;
const Mg = (o) => ({
        colorNeutralForeground1: W[14],
        colorNeutralForeground1Hover: W[14],
        colorNeutralForeground1Pressed: W[14],
        colorNeutralForeground1Selected: W[14],
        colorNeutralForeground2: W[26],
        colorNeutralForeground2Hover: W[14],
        colorNeutralForeground2Pressed: W[14],
        colorNeutralForeground2Selected: W[14],
        colorNeutralForeground2BrandHover: o[80],
        colorNeutralForeground2BrandPressed: o[70],
        colorNeutralForeground2BrandSelected: o[80],
        colorNeutralForeground3: W[38],
        colorNeutralForeground3Hover: W[26],
        colorNeutralForeground3Pressed: W[26],
        colorNeutralForeground3Selected: W[26],
        colorNeutralForeground3BrandHover: o[80],
        colorNeutralForeground3BrandPressed: o[70],
        colorNeutralForeground3BrandSelected: o[80],
        colorNeutralForeground4: W[44],
        colorNeutralForeground5: W[38],
        colorNeutralForeground5Hover: W[14],
        colorNeutralForeground5Pressed: W[14],
        colorNeutralForeground5Selected: W[14],
        colorNeutralForegroundDisabled: W[74],
        colorNeutralForegroundInvertedDisabled: yr[40],
        colorBrandForegroundLink: o[70],
        colorBrandForegroundLinkHover: o[60],
        colorBrandForegroundLinkPressed: o[40],
        colorBrandForegroundLinkSelected: o[70],
        colorNeutralForeground2Link: W[26],
        colorNeutralForeground2LinkHover: W[14],
        colorNeutralForeground2LinkPressed: W[14],
        colorNeutralForeground2LinkSelected: W[14],
        colorCompoundBrandForeground1: o[80],
        colorCompoundBrandForeground1Hover: o[70],
        colorCompoundBrandForeground1Pressed: o[60],
        colorBrandForeground1: o[80],
        colorBrandForeground2: o[70],
        colorBrandForeground2Hover: o[60],
        colorBrandForeground2Pressed: o[30],
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
        colorBrandForegroundInverted: o[100],
        colorBrandForegroundInvertedHover: o[110],
        colorBrandForegroundInvertedPressed: o[100],
        colorBrandForegroundOnLight: o[80],
        colorBrandForegroundOnLightHover: o[70],
        colorBrandForegroundOnLightPressed: o[50],
        colorBrandForegroundOnLightSelected: o[60],
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
        colorBrandBackground: o[80],
        colorBrandBackgroundHover: o[70],
        colorBrandBackgroundPressed: o[40],
        colorBrandBackgroundSelected: o[60],
        colorCompoundBrandBackground: o[80],
        colorCompoundBrandBackgroundHover: o[70],
        colorCompoundBrandBackgroundPressed: o[60],
        colorBrandBackgroundStatic: o[80],
        colorBrandBackground2: o[160],
        colorBrandBackground2Hover: o[150],
        colorBrandBackground2Pressed: o[130],
        colorBrandBackground3Static: o[60],
        colorBrandBackground4Static: o[40],
        colorBrandBackgroundInverted: Pe,
        colorBrandBackgroundInvertedHover: o[160],
        colorBrandBackgroundInvertedPressed: o[140],
        colorBrandBackgroundInvertedSelected: o[150],
        colorNeutralCardBackground: W[98],
        colorNeutralCardBackgroundHover: Pe,
        colorNeutralCardBackgroundPressed: W[96],
        colorNeutralCardBackgroundSelected: W[92],
        colorNeutralCardBackgroundDisabled: W[94],
        colorNeutralStrokeAccessible: W[38],
        colorNeutralStrokeAccessibleHover: W[34],
        colorNeutralStrokeAccessiblePressed: W[30],
        colorNeutralStrokeAccessibleSelected: o[80],
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
        colorBrandStroke1: o[80],
        colorBrandStroke2: o[140],
        colorBrandStroke2Hover: o[120],
        colorBrandStroke2Pressed: o[80],
        colorBrandStroke2Contrast: o[140],
        colorCompoundBrandStroke: o[80],
        colorCompoundBrandStrokeHover: o[70],
        colorCompoundBrandStrokePressed: o[60],
        colorNeutralStrokeDisabled: W[88],
        colorNeutralStrokeDisabled2: W[92],
        colorNeutralStrokeInvertedDisabled: yr[40],
        colorTransparentStroke: "transparent",
        colorTransparentStrokeInteractive: "transparent",
        colorTransparentStrokeDisabled: "transparent",
        colorNeutralStrokeAlpha: wr[5],
        colorNeutralStrokeAlpha2: yr[20],
        colorStrokeFocus1: Pe,
        colorStrokeFocus2: Jm,
        colorNeutralShadowAmbient: "rgba(0,0,0,0.12)",
        colorNeutralShadowKey: "rgba(0,0,0,0.14)",
        colorNeutralShadowAmbientLighter: "rgba(0,0,0,0.06)",
        colorNeutralShadowKeyLighter: "rgba(0,0,0,0.07)",
        colorNeutralShadowAmbientDarker: "rgba(0,0,0,0.20)",
        colorNeutralShadowKeyDarker: "rgba(0,0,0,0.24)",
        colorBrandShadowAmbient: "rgba(0,0,0,0.30)",
        colorBrandShadowKey: "rgba(0,0,0,0.25)",
    }),
    Lg = {
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
    Og = {
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
    Ag = {
        durationUltraFast: "50ms",
        durationFaster: "100ms",
        durationFast: "150ms",
        durationNormal: "200ms",
        durationGentle: "250ms",
        durationSlow: "300ms",
        durationSlower: "400ms",
        durationUltraSlow: "500ms",
    },
    qg = {
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
    Hg = {
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
    Wg = {
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightSemibold: 600,
        fontWeightBold: 700,
    },
    Ug = {
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
    Vg = {
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
    Kg = {
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
    $g = {
        strokeWidthThin: "1px",
        strokeWidthThick: "2px",
        strokeWidthThicker: "3px",
        strokeWidthThickest: "4px",
    };
function zf(o, n, i = "") {
    return {
        [`shadow2${i}`]: `0 0 2px ${o}, 0 1px 2px ${n}`,
        [`shadow4${i}`]: `0 0 2px ${o}, 0 2px 4px ${n}`,
        [`shadow8${i}`]: `0 0 2px ${o}, 0 4px 8px ${n}`,
        [`shadow16${i}`]: `0 0 2px ${o}, 0 8px 16px ${n}`,
        [`shadow28${i}`]: `0 0 8px ${o}, 0 14px 28px ${n}`,
        [`shadow64${i}`]: `0 0 8px ${o}, 0 32px 64px ${n}`,
    };
}
const Qg = (o) => {
        const n = Mg(o);
        return {
            ...Lg,
            ...qg,
            ...Hg,
            ...Ug,
            ...Wg,
            ...$g,
            ...Vg,
            ...Kg,
            ...Ag,
            ...Og,
            ...n,
            ...Dg,
            ...dn,
            ...zf(n.colorNeutralShadowAmbient, n.colorNeutralShadowKey),
            ...zf(n.colorBrandShadowAmbient, n.colorBrandShadowKey, "Brand"),
        };
    },
    Gg = {
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
    Xg = Qg(Gg),
    Ed = { root: "fui-FluentProvider" },
    Yg = Af(
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
    Jg = (o) => {
        "use no memo";
        const n = Ti(),
            i = Yg({ dir: o.dir, renderer: n });
        return ((o.root.className = Te(Ed.root, o.themeClassName, i.root, o.root.className)), o);
    },
    Zg = O.useInsertionEffect ? O.useInsertionEffect : Ni,
    e1 = (o, n) => {
        if (!(o != null && o.head)) return;
        const i = o.createElement("style");
        return (
            Object.keys(n).forEach((a) => {
                i.setAttribute(a, n[a]);
            }),
            o.head.appendChild(i),
            i
        );
    },
    t1 = (o, n) => {
        const i = o.sheet;
        i && (i.cssRules.length > 0 && i.deleteRule(0), i.insertRule(n, 0));
    },
    r1 = (o) => {
        "use no memo";
        const { targetDocument: n, theme: i, rendererAttributes: a } = o,
            c = O.useRef(void 0),
            f = d0(Ed.root),
            h = a,
            p = O.useMemo(() => bv(`.${f}`, i), [i, f]);
        return (
            n1(n, f),
            Zg(() => {
                const m = n == null ? void 0 : n.getElementById(f);
                return (
                    m
                        ? (c.current = m)
                        : ((c.current = e1(n, { ...h, id: f })), c.current && t1(c.current, p)),
                    () => {
                        var v;
                        (v = c.current) === null || v === void 0 || v.remove();
                    }
                );
            }, [f, n, p, h]),
            { styleTagId: f, rule: p }
        );
    };
function n1(o, n) {
    O.useState(() => {
        if (!o) return;
        const i = o.getElementById(n);
        i && o.head.append(i);
    });
}
const o1 = {},
    i1 = {},
    l1 = (o, n) => {
        "use no memo";
        const i = zi(),
            a = s1(),
            c = Gs(),
            f = O.useContext(Xs) || o1,
            {
                applyStylesToPortals: h = !0,
                customStyleHooks_unstable: p,
                dir: m = i.dir,
                targetDocument: v = i.targetDocument,
                theme: b,
                overrides_unstable: y = {},
            } = o,
            k = Ds(a, b),
            S = Ds(c, y),
            C = Ds(f, p),
            T = Ti();
        var N;
        const { styleTagId: q, rule: H } = r1({
            theme: k,
            targetDocument: v,
            rendererAttributes: (N = T.styleElementAttributes) !== null && N !== void 0 ? N : i1,
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
            root: rt(Xt("div", { ...o, dir: m, ref: Js(n, xd({ targetDocument: v })) }), {
                elementType: "div",
            }),
            serverStyleProps: { cssRule: H, attributes: { ...T.styleElementAttributes, id: q } },
        };
    };
function Ds(o, n) {
    return o && n ? { ...o, ...n } : o || n;
}
function s1() {
    return O.useContext(Xf);
}
function a1(o) {
    const {
            applyStylesToPortals: n,
            customStyleHooks_unstable: i,
            dir: a,
            root: c,
            targetDocument: f,
            theme: h,
            themeClassName: p,
            overrides_unstable: m,
        } = o,
        v = O.useMemo(() => ({ dir: a, targetDocument: f }), [a, f]),
        [b] = O.useState(() => ({})),
        y = O.useMemo(() => ({ textDirection: a }), [a]);
    return {
        customStyleHooks_unstable: i,
        overrides_unstable: m,
        provider: v,
        textDirection: a,
        iconDirection: y,
        tooltip: b,
        theme: h,
        themeClassName: n ? c.className : p,
    };
}
const Cd = O.forwardRef((o, n) => {
    const i = l1(o, n);
    Jg(i);
    const a = a1(i);
    return k0(i, a);
});
Cd.displayName = "FluentProvider";
var Ms = { exports: {} },
    Ls = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Nf;
function u1() {
    return (
        Nf ||
            ((Nf = 1),
            (function (o) {
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
                function i(A) {
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
                    ((o.unstable_now = void 0),
                    typeof performance == "object" && typeof performance.now == "function")
                ) {
                    var f = performance;
                    o.unstable_now = function () {
                        return f.now();
                    };
                } else {
                    var h = Date,
                        p = h.now();
                    o.unstable_now = function () {
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
                    T = !1,
                    N = !1,
                    q = typeof setTimeout == "function" ? setTimeout : null,
                    H = typeof clearTimeout == "function" ? clearTimeout : null,
                    D = typeof setImmediate < "u" ? setImmediate : null;
                function Q(A) {
                    for (var Y = i(v); Y !== null; ) {
                        if (Y.callback === null) a(v);
                        else if (Y.startTime <= A)
                            (a(v), (Y.sortIndex = Y.expirationTime), n(m, Y));
                        else break;
                        Y = i(v);
                    }
                }
                function re(A) {
                    if (((T = !1), Q(A), !C))
                        if (i(m) !== null) ((C = !0), G || ((G = !0), Ee()));
                        else {
                            var Y = i(v);
                            Y !== null && qe(re, Y.startTime - A);
                        }
                }
                var G = !1,
                    ee = -1,
                    U = 5,
                    ie = -1;
                function fe() {
                    return N ? !0 : !(o.unstable_now() - ie < U);
                }
                function Ue() {
                    if (((N = !1), G)) {
                        var A = o.unstable_now();
                        ie = A;
                        var Y = !0;
                        try {
                            e: {
                                ((C = !1), T && ((T = !1), H(ee), (ee = -1)), (S = !0));
                                var P = k;
                                try {
                                    t: {
                                        for (
                                            Q(A), y = i(m);
                                            y !== null && !(y.expirationTime > A && fe());
                                        ) {
                                            var V = y.callback;
                                            if (typeof V == "function") {
                                                ((y.callback = null), (k = y.priorityLevel));
                                                var L = V(y.expirationTime <= A);
                                                if (
                                                    ((A = o.unstable_now()), typeof L == "function")
                                                ) {
                                                    ((y.callback = L), Q(A), (Y = !0));
                                                    break t;
                                                }
                                                (y === i(m) && a(m), Q(A));
                                            } else a(m);
                                            y = i(m);
                                        }
                                        if (y !== null) Y = !0;
                                        else {
                                            var x = i(v);
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
                            Y ? Ee() : (G = !1);
                        }
                    }
                }
                var Ee;
                if (typeof D == "function")
                    Ee = function () {
                        D(Ue);
                    };
                else if (typeof MessageChannel < "u") {
                    var Me = new MessageChannel(),
                        Qe = Me.port2;
                    ((Me.port1.onmessage = Ue),
                        (Ee = function () {
                            Qe.postMessage(null);
                        }));
                } else
                    Ee = function () {
                        q(Ue, 0);
                    };
                function qe(A, Y) {
                    ee = q(function () {
                        A(o.unstable_now());
                    }, Y);
                }
                ((o.unstable_IdlePriority = 5),
                    (o.unstable_ImmediatePriority = 1),
                    (o.unstable_LowPriority = 4),
                    (o.unstable_NormalPriority = 3),
                    (o.unstable_Profiling = null),
                    (o.unstable_UserBlockingPriority = 2),
                    (o.unstable_cancelCallback = function (A) {
                        A.callback = null;
                    }),
                    (o.unstable_forceFrameRate = function (A) {
                        0 > A || 125 < A
                            ? console.error(
                                  "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
                              )
                            : (U = 0 < A ? Math.floor(1e3 / A) : 5);
                    }),
                    (o.unstable_getCurrentPriorityLevel = function () {
                        return k;
                    }),
                    (o.unstable_next = function (A) {
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
                    (o.unstable_requestPaint = function () {
                        N = !0;
                    }),
                    (o.unstable_runWithPriority = function (A, Y) {
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
                    (o.unstable_scheduleCallback = function (A, Y, P) {
                        var V = o.unstable_now();
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
                                  i(m) === null &&
                                      A === i(v) &&
                                      (T ? (H(ee), (ee = -1)) : (T = !0), qe(re, P - V)))
                                : ((A.sortIndex = L),
                                  n(m, A),
                                  C || S || ((C = !0), G || ((G = !0), Ee()))),
                            A
                        );
                    }),
                    (o.unstable_shouldYield = fe),
                    (o.unstable_wrapCallback = function (A) {
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
var Pf;
function c1() {
    return (Pf || ((Pf = 1), (Ms.exports = u1())), Ms.exports);
}
var Ff = c1();
const f1 = (o) => (i) => {
        const a = O.useRef(i.value),
            c = O.useRef(0),
            f = O.useRef(null);
        return (
            f.current || (f.current = { value: a, version: c, listeners: [] }),
            Ni(() => {
                ((a.current = i.value),
                    (c.current += 1),
                    Ff.unstable_runWithPriority(Ff.unstable_NormalPriority, () => {
                        f.current.listeners.forEach((h) => {
                            h([c.current, i.value]);
                        });
                    }));
            }, [i.value]),
            O.createElement(o, { value: f.current }, i.children)
        );
    },
    d1 = (o) => {
        const n = O.createContext({
            value: { current: o },
            version: { current: -1 },
            listeners: [],
        });
        return ((n.Provider = f1(n.Provider)), delete n.Consumer, n);
    },
    Os = "Enter",
    yi = " ";
function zd(o, n) {
    const {
            disabled: i,
            disabledFocusable: a = !1,
            ["aria-disabled"]: c,
            onClick: f,
            onKeyDown: h,
            onKeyUp: p,
            ...m
        } = n ?? {},
        v = typeof c == "string" ? c === "true" : c,
        b = i || a || v,
        y = br((C) => {
            b ? (C.preventDefault(), C.stopPropagation()) : f == null || f(C);
        }),
        k = br((C) => {
            if ((h == null || h(C), C.isDefaultPrevented())) return;
            const T = C.key;
            if (b && (T === Os || T === yi)) {
                (C.preventDefault(), C.stopPropagation());
                return;
            }
            if (T === yi) {
                C.preventDefault();
                return;
            } else T === Os && (C.preventDefault(), C.currentTarget.click());
        }),
        S = br((C) => {
            if ((p == null || p(C), C.isDefaultPrevented())) return;
            const T = C.key;
            if (b && (T === Os || T === yi)) {
                (C.preventDefault(), C.stopPropagation());
                return;
            }
            T === yi && (C.preventDefault(), C.currentTarget.click());
        });
    if (o === "button" || o === void 0)
        return {
            ...m,
            disabled: i && !a,
            "aria-disabled": a ? !0 : v,
            onClick: a ? void 0 : y,
            onKeyUp: a ? void 0 : p,
            onKeyDown: a ? void 0 : h,
        };
    {
        const C = !!m.href;
        let T = C ? void 0 : "button";
        !T && b && (T = "link");
        const N = {
            role: T,
            tabIndex: a || (!C && !i) ? 0 : void 0,
            ...m,
            onClick: y,
            onKeyUp: S,
            onKeyDown: k,
            "aria-disabled": b,
        };
        return (o === "a" && b && (N.href = void 0), N);
    }
}
const h1 = ve(
        { root: { mc9l5x: "f1w7gpdv", Bg96gwp: "fez10in" }, rtl: { Bz10aip: "f13rod7r" } },
        {
            d: [
                ".f1w7gpdv{display:inline;}",
                ".fez10in{line-height:0;}",
                ".f13rod7r{transform:scaleX(-1);}",
            ],
        }
    ),
    p1 = (o, n) => {
        const { filled: i, title: a, primaryFill: c = "currentColor", ...f } = o,
            h = { ...f, fill: c },
            p = h1(),
            m = _0();
        return (
            (h.className = Te(
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
    v1 = ve(
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
    m1 = "fui-Icon",
    Nd = (o, n, i, a) => {
        const f = O.forwardRef((h, p) => {
            const m = v1(),
                v = p1(h, { flipInRtl: a == null ? void 0 : a.flipInRtl }),
                b = {
                    ...v,
                    className: Te(m1, v.className, m.root),
                    ref: p,
                    width: n,
                    height: n,
                    viewBox: "0 0 20 20",
                    xmlns: "http://www.w3.org/2000/svg",
                };
            return typeof i == "string"
                ? O.createElement("svg", { ...b, dangerouslySetInnerHTML: { __html: i } })
                : O.createElement(
                      "svg",
                      b,
                      ...i.map((y) => O.createElement("path", { d: y, fill: b.fill }))
                  );
        });
        return ((f.displayName = o), f);
    },
    g1 = Nd("ArrowDownRegular", "1em", [
        "M16.87 10.84a.5.5 0 1 0-.74-.68l-5.63 6.17V2.5a.5.5 0 0 0-1 0v13.83l-5.63-6.17a.5.5 0 0 0-.74.68l6.31 6.91a.75.75 0 0 0 1.11 0l6.32-6.91Z",
    ]),
    y1 = Nd(
        "ArrowUpRegular",
        "1em",
        [
            "M3.13 9.16a.5.5 0 1 0 .74.68L9.5 3.67V17.5a.5.5 0 1 0 1 0V3.67l5.63 6.17a.5.5 0 0 0 .74-.68l-6.32-6.92a.75.75 0 0 0-1.1 0L3.13 9.16Z",
        ],
        { flipInRtl: !0 }
    ),
    w1 = (o) => {
        const { iconOnly: n, iconPosition: i } = o;
        return to(o.root, {
            children: [
                i !== "after" && o.icon && ye(o.icon, {}),
                !n && o.root.children,
                i === "after" && o.icon && ye(o.icon, {}),
            ],
        });
    },
    Pd = O.createContext(void 0),
    b1 = {};
Pd.Provider;
const _1 = () => {
        var o;
        return (o = O.useContext(Pd)) !== null && o !== void 0 ? o : b1;
    },
    k1 = (o, n) => {
        const { size: i } = _1(),
            {
                appearance: a = "secondary",
                shape: c = "rounded",
                size: f = i ?? "medium",
                ...h
            } = o,
            p = x1(h, n);
        return { appearance: a, shape: c, size: f, ...p };
    },
    x1 = (o, n) => {
        const { icon: i, iconPosition: a = "before", ...c } = o,
            f = eo(i, { elementType: "span" });
        var h, p;
        return {
            disabled: (h = o.disabled) !== null && h !== void 0 ? h : !1,
            disabledFocusable: (p = o.disabledFocusable) !== null && p !== void 0 ? p : !1,
            iconPosition: a,
            iconOnly: !!(f != null && f.children && !o.children),
            components: { root: "button", icon: "span" },
            root: rt(zd(c.as, c), {
                elementType: "button",
                defaultProps: { ref: n, type: o.as !== "a" ? "button" : void 0 },
            }),
            icon: f,
        };
    },
    Rf = { root: "fui-Button", icon: "fui-Button__icon" },
    S1 = no("r1f29ykk", null, {
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
    B1 = no("rywnvv2", null, [
        ".rywnvv2{align-items:center;display:inline-flex;justify-content:center;font-size:20px;height:20px;width:20px;--fui-Button__icon--spacing:var(--spacingHorizontalSNudge);}",
    ]),
    T1 = ve(
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
    E1 = ve(
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
    C1 = ve(
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
    z1 = ve(
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
    N1 = ve(
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
    P1 = (o) => {
        "use no memo";
        const n = S1(),
            i = B1(),
            a = T1(),
            c = E1(),
            f = C1(),
            h = z1(),
            p = N1(),
            {
                appearance: m,
                disabled: v,
                disabledFocusable: b,
                icon: y,
                iconOnly: k,
                iconPosition: S,
                shape: C,
                size: T,
            } = o;
        return (
            (o.root.className = Te(
                Rf.root,
                n,
                m && a[m],
                a[T],
                y && T === "small" && a.smallWithIcon,
                y && T === "large" && a.largeWithIcon,
                a[C],
                (v || b) && c.base,
                (v || b) && c.highContrast,
                m && (v || b) && c[m],
                m === "primary" && f.primary,
                f[T],
                f[C],
                k && h[T],
                o.root.className
            )),
            o.icon &&
                (o.icon.className = Te(
                    Rf.icon,
                    i,
                    !!o.root.children && p[S],
                    p[T],
                    o.icon.className
                )),
            o
        );
    },
    Fd = O.createContext(void 0);
Fd.Provider;
const F1 = () => O.useContext(Fd);
function Rd(o, n) {
    return R1(F1(), o, n);
}
function R1(o, n, i) {
    if (!o) return n;
    n = { ...n };
    const {
        generatedControlId: a,
        hintId: c,
        labelFor: f,
        labelId: h,
        required: p,
        validationMessageId: m,
        validationState: v,
    } = o;
    if (a) {
        var b, y;
        ((y = (b = n).id) !== null && y !== void 0) || (b.id = a);
    }
    if (h && (!(i != null && i.supportsLabelFor) || f !== n.id)) {
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
        var T, N, q;
        ((q = (T = n)[(N = "aria-invalid")]) !== null && q !== void 0) || (T[N] = !0);
    }
    if (p)
        if (i != null && i.supportsRequired) {
            var H, D;
            ((D = (H = n).required) !== null && D !== void 0) || (H.required = !0);
        } else {
            var Q, re, G;
            ((G = (Q = n)[(re = "aria-required")]) !== null && G !== void 0) || (Q[re] = !0);
        }
    if (i != null && i.supportsSize) {
        var ee, U;
        ((U = (ee = n).size) !== null && U !== void 0) || (ee.size = o.size);
    }
    return n;
}
const j1 = (o, n) => {
        o = Rd(o, { supportsLabelFor: !0, supportsRequired: !0, supportsSize: !0 });
        const i = Gs();
        var a;
        const {
                size: c = "medium",
                appearance: f = (a = i.inputDefaultAppearance) !== null && a !== void 0
                    ? a
                    : "outline",
                onChange: h,
            } = o,
            [p, m] = Ys({ state: o.value, defaultState: o.defaultValue, initialState: "" }),
            v = Gf({
                props: o,
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
                input: rt(o.input, {
                    defaultProps: { type: "text", ref: n, ...v.primary },
                    elementType: "input",
                }),
                contentAfter: eo(o.contentAfter, { elementType: "span" }),
                contentBefore: eo(o.contentBefore, { elementType: "span" }),
                root: rt(o.root, { defaultProps: v.root, elementType: "span" }),
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
    I1 = (o) =>
        to(o.root, {
            children: [
                o.contentBefore && ye(o.contentBefore, {}),
                ye(o.input, {}),
                o.contentAfter && ye(o.contentAfter, {}),
            ],
        }),
    wi = {
        root: "fui-Input",
        input: "fui-Input__input",
        contentBefore: "fui-Input__contentBefore",
        contentAfter: "fui-Input__contentAfter",
    },
    D1 = no("r1oeeo9n", "r9sxh5", {
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
    M1 = ve(
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
    L1 = no("r12stul0", null, [
        ".r12stul0{align-self:stretch;box-sizing:border-box;flex-grow:1;min-width:0;border-style:none;padding:0 var(--spacingHorizontalM);color:var(--colorNeutralForeground1);background-color:transparent;outline-style:none;font-family:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;}",
        ".r12stul0::-webkit-input-placeholder{color:var(--colorNeutralForeground4);opacity:1;}",
        ".r12stul0::-moz-placeholder{color:var(--colorNeutralForeground4);opacity:1;}",
        ".r12stul0::placeholder{color:var(--colorNeutralForeground4);opacity:1;}",
    ]),
    O1 = ve(
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
    A1 = no("r1572tok", null, [
        ".r1572tok{box-sizing:border-box;color:var(--colorNeutralForeground3);display:flex;}",
        ".r1572tok>svg{font-size:20px;}",
    ]),
    q1 = ve(
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
    H1 = (o) => {
        "use no memo";
        const { size: n, appearance: i } = o,
            a = o.input.disabled,
            c = `${o.input["aria-invalid"]}` == "true",
            f = i.startsWith("filled"),
            h = M1(),
            p = O1(),
            m = q1();
        ((o.root.className = Te(
            wi.root,
            D1(),
            h[n],
            o.contentBefore && h[`${n}WithContentBefore`],
            o.contentAfter && h[`${n}WithContentAfter`],
            h[i],
            !a && i === "outline" && h.outlineInteractive,
            !a && i === "underline" && h.underlineInteractive,
            !a && f && h.filledInteractive,
            f && h.filled,
            !a && c && h.invalid,
            a && h.disabled,
            o.root.className
        )),
            (o.input.className = Te(
                wi.input,
                L1(),
                p[n],
                o.contentBefore && p[`${n}WithContentBefore`],
                o.contentAfter && p[`${n}WithContentAfter`],
                a && p.disabled,
                o.input.className
            )));
        const v = [A1(), a && m.disabled, m[n]];
        return (
            o.contentBefore &&
                (o.contentBefore.className = Te(wi.contentBefore, ...v, o.contentBefore.className)),
            o.contentAfter &&
                (o.contentAfter.className = Te(wi.contentAfter, ...v, o.contentAfter.className)),
            o
        );
    },
    jd = O.forwardRef((o, n) => {
        const i = j1(o, n);
        return (H1(i), jt("useInputStyles_unstable")(i), I1(i));
    });
jd.displayName = "Input";
const W1 = (o, n) => {
        const {
            wrap: i,
            truncate: a,
            block: c,
            italic: f,
            underline: h,
            strikethrough: p,
            size: m,
            font: v,
            weight: b,
            align: y,
        } = o;
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
            wrap: i ?? !0,
            components: { root: "span" },
            root: rt(Xt("span", { ref: n, ...o }), { elementType: "span" }),
        };
    },
    U1 = (o) => ye(o.root, {}),
    V1 = { root: "fui-Text" },
    K1 = ve(
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
    $1 = (o) => {
        "use no memo";
        const n = K1();
        return (
            (o.root.className = Te(
                V1.root,
                n.root,
                o.wrap === !1 && n.nowrap,
                o.truncate && n.truncate,
                o.block && n.block,
                o.italic && n.italic,
                o.underline && n.underline,
                o.strikethrough && n.strikethrough,
                o.underline && o.strikethrough && n.strikethroughUnderline,
                o.size === 100 && n.base100,
                o.size === 200 && n.base200,
                o.size === 400 && n.base400,
                o.size === 500 && n.base500,
                o.size === 600 && n.base600,
                o.size === 700 && n.hero700,
                o.size === 800 && n.hero800,
                o.size === 900 && n.hero900,
                o.size === 1e3 && n.hero1000,
                o.font === "monospace" && n.monospace,
                o.font === "numeric" && n.numeric,
                o.weight === "medium" && n.weightMedium,
                o.weight === "semibold" && n.weightSemibold,
                o.weight === "bold" && n.weightBold,
                o.align === "center" && n.alignCenter,
                o.align === "end" && n.alignEnd,
                o.align === "justify" && n.alignJustify,
                o.root.className
            )),
            o
        );
    },
    Vs = O.forwardRef((o, n) => {
        const i = W1(o, n);
        return ($1(i), jt("useTextStyles_unstable")(i), U1(i));
    });
Vs.displayName = "Text";
const Q1 = (o) => ye(o.root, { children: ye(o.textarea, {}) }),
    G1 = (o, n) => {
        o = Rd(o, { supportsLabelFor: !0, supportsRequired: !0, supportsSize: !0 });
        const i = Gs();
        var a;
        const {
                size: c = "medium",
                appearance: f = (a = i.inputDefaultAppearance) !== null && a !== void 0
                    ? a
                    : "outline",
                resize: h = "none",
                onChange: p,
            } = o,
            [m, v] = Ys({ state: o.value, defaultState: o.defaultValue, initialState: void 0 }),
            b = Gf({
                props: o,
                primarySlotTagName: "textarea",
                excludedPropNames: ["onChange", "value", "defaultValue"],
            }),
            y = {
                size: c,
                appearance: f,
                resize: h,
                components: { root: "span", textarea: "textarea" },
                textarea: rt(o.textarea, {
                    defaultProps: { ref: n, ...b.primary },
                    elementType: "textarea",
                }),
                root: rt(o.root, { defaultProps: b.root, elementType: "span" }),
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
    jf = { root: "fui-Textarea", textarea: "fui-Textarea__textarea" },
    X1 = ve(
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
    Y1 = ve(
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
    J1 = ve(
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
    Z1 = (o) => {
        "use no memo";
        const { size: n, appearance: i, resize: a } = o,
            c = o.textarea.disabled,
            f = `${o.textarea["aria-invalid"]}` == "true",
            h = i.startsWith("filled"),
            p = X1();
        o.root.className = Te(
            jf.root,
            p.base,
            c && p.disabled,
            !c && h && p.filled,
            !c && p[i],
            !c && p.interactive,
            !c && i === "outline" && p.outlineInteractive,
            !c && f && p.invalid,
            o.root.className
        );
        const m = Y1(),
            v = J1();
        return (
            (o.textarea.className = Te(
                jf.textarea,
                m.base,
                m[n],
                v[a],
                c && m.disabled,
                o.textarea.className
            )),
            o
        );
    },
    Id = O.forwardRef((o, n) => {
        const i = G1(o, n);
        return (Z1(i), jt("useTextareaStyles_unstable")(i), Q1(i));
    });
Id.displayName = "Textarea";
const ey = d1(void 0),
    ty = (o, n) => {
        const { size: i = "medium" } = o,
            a = ry(o, n),
            c = oy();
        return { size: i, ...a, root: { ...a.root, ...c } };
    },
    ry = (o, n) => {
        const { vertical: i = !1 } = o,
            a = {
                vertical: i,
                components: { root: "div" },
                root: rt(
                    Xt("div", {
                        role: "toolbar",
                        ref: n,
                        ...(i && { "aria-orientation": "vertical" }),
                        ...o,
                    }),
                    { elementType: "div" }
                ),
            },
            [c, f] = ny({
                checkedValues: o.checkedValues,
                defaultCheckedValues: o.defaultCheckedValues,
                onCheckedValueChange: o.onCheckedValueChange,
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
    ny = (o) => {
        const [n, i] = Ys({
                state: o.checkedValues,
                defaultState: o.defaultCheckedValues,
                initialState: {},
            }),
            { onCheckedValueChange: a } = o,
            c = br((f, { name: h, checkedItems: p }) => {
                (a && a(f, { name: h, checkedItems: p }),
                    i((m) => (m ? { ...m, [h]: p } : { [h]: p })));
            });
        return [n, c];
    },
    oy = () => $m({ circular: !0, axis: "both" }),
    iy = (o, n) =>
        ye(ey.Provider, { value: n.toolbar, children: ye(o.root, { children: o.root.children }) }),
    ly = { root: "fui-Toolbar" },
    sy = ve(
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
    ay = (o) => {
        "use no memo";
        const n = sy(),
            { vertical: i, size: a } = o;
        return (
            (o.root.className = Te(
                ly.root,
                n.root,
                i && n.vertical,
                a === "small" && !i && n.small,
                a === "medium" && !i && n.medium,
                a === "large" && !i && n.large,
                o.root.className
            )),
            o
        );
    };
function uy(o) {
    const { size: n, handleToggleButton: i, vertical: a, checkedValues: c, handleRadio: f } = o;
    return {
        toolbar: { size: n, vertical: a, handleToggleButton: i, handleRadio: f, checkedValues: c },
    };
}
const Dd = O.forwardRef((o, n) => {
    const i = ty(o, n),
        a = uy(i);
    return (ay(i), jt("useToolbarStyles_unstable")(i), iy(i, a));
});
Dd.displayName = "Toolbar";
const cy = ve(
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
    fy = (o) => {
        "use no memo";
        const n = cy();
        ((o.root.className = Te(o.vertical && n.vertical, o.root.className)),
            o.icon && (o.icon.className = Te(o.vertical && n.verticalIcon, o.icon.className)),
            P1(o));
    },
    dy = (o, n) => ({ appearance: "subtle", size: "medium", shape: "rounded", ...hy(o, n) }),
    hy = (o, n) => {
        const { vertical: i = !1, ...a } = o,
            c = k1({ appearance: "subtle", ...a, size: "medium" }, n);
        return { vertical: i, ...c };
    },
    ki = O.forwardRef((o, n) => {
        const i = dy(o, n);
        return (fy(i), jt("useToolbarButtonStyles_unstable")(i), w1(i));
    });
ki.displayName = "ToolbarButton";
const Md = O.createContext(void 0),
    py = { size: "medium", noNativeElements: !1, sortable: !1 },
    vy = Md.Provider,
    io = () => {
        var o;
        return (o = O.useContext(Md)) !== null && o !== void 0 ? o : py;
    },
    my = (o, n) => {
        const { noNativeElements: i, size: a } = io();
        var c;
        const f = ((c = o.as) !== null && c !== void 0 ? c : i) ? "div" : "td";
        return {
            components: { root: f },
            root: rt(Xt(f, { ref: n, role: f === "div" ? "cell" : void 0, ...o }), {
                elementType: f,
            }),
            noNativeElements: i,
            size: a,
        };
    },
    gy = (o) => ye(o.root, {}),
    yy = "fui-TableCell",
    wy = { root: yy },
    by = ve(
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
    _y = ve(
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
    ky = ve(
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
    xy = (o) => {
        "use no memo";
        const n = ky(),
            i = { table: by(), flex: _y() };
        return (
            (o.root.className = Te(
                wy.root,
                n.root,
                o.noNativeElements ? i.flex.root : i.table.root,
                o.noNativeElements ? i.flex[o.size] : i.table[o.size],
                o.root.className
            )),
            o
        );
    },
    Ld = O.forwardRef((o, n) => {
        const i = my(o, n);
        return (xy(i), jt("useTableCellStyles_unstable")(i), gy(i));
    });
Ld.displayName = "TableCell";
const Od = O.createContext(void 0),
    Sy = "",
    By = Od.Provider,
    Ty = () => O.useContext(Od) === Sy,
    Ey = (o, n) => {
        const { noNativeElements: i, size: a } = io();
        var c;
        const f = ((c = o.as) !== null && c !== void 0 ? c : i) ? "div" : "tr",
            h = xd(),
            p = Sd(),
            m = Ty();
        var v;
        return {
            components: { root: f },
            root: rt(Xt(f, { ref: Js(n, h, p), role: f === "div" ? "row" : void 0, ...o }), {
                elementType: f,
            }),
            size: a,
            noNativeElements: i,
            appearance: (v = o.appearance) !== null && v !== void 0 ? v : "none",
            isHeaderRow: m,
        };
    },
    Cy = (o) => ye(o.root, {}),
    zy = "fui-TableRow",
    Ny = { root: zy },
    Py = ve({ root: { mc9l5x: "f1u0rzck" } }, { d: [".f1u0rzck{display:table-row;}"] }),
    Fy = ve(
        { root: { mc9l5x: "f22iagw", Bt984gj: "f122n59" } },
        { d: [".f22iagw{display:flex;}", ".f122n59{align-items:center;}"] }
    ),
    Ry = ve(
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
    jy = (o) => {
        "use no memo";
        const n = Ry(),
            i = { table: Py(), flex: Fy() };
        return (
            (o.root.className = Te(
                Ny.root,
                n.root,
                !o.isHeaderRow && n.rootInteractive,
                n[o.size],
                o.noNativeElements ? i.flex.root : i.table.root,
                n[o.appearance],
                o.root.className
            )),
            o
        );
    },
    Ks = O.forwardRef((o, n) => {
        const i = Ey(o, n);
        return (jy(i), jt("useTableRowStyles_unstable")(i), Cy(i));
    });
Ks.displayName = "TableRow";
const Iy = (o, n) => {
        const { noNativeElements: i } = io();
        var a;
        const c = ((a = o.as) !== null && a !== void 0 ? a : i) ? "div" : "tbody";
        return {
            components: { root: c },
            root: rt(Xt(c, { ref: n, role: c === "div" ? "rowgroup" : void 0, ...o }), {
                elementType: c,
            }),
            noNativeElements: i,
        };
    },
    Dy = (o) => ye(o.root, {}),
    My = ve({ root: { mc9l5x: "f1tp1avn" } }, { d: [".f1tp1avn{display:table-row-group;}"] }),
    Ly = ve({ root: { mc9l5x: "ftgm304" } }, { d: [".ftgm304{display:block;}"] }),
    Oy = "fui-TableBody",
    Ay = (o) => {
        "use no memo";
        const n = { table: My(), flex: Ly() };
        return (
            (o.root.className = Te(
                Oy,
                o.noNativeElements ? n.flex.root : n.table.root,
                o.root.className
            )),
            o
        );
    },
    Ad = O.forwardRef((o, n) => {
        const i = Iy(o, n);
        return (Ay(i), jt("useTableBodyStyles_unstable")(i), Dy(i));
    });
Ad.displayName = "TableBody";
const qy = (o, n) => {
        var i;
        const a = ((i = o.as) !== null && i !== void 0 ? i : o.noNativeElements) ? "div" : "table";
        var c, f, h;
        return {
            components: { root: a },
            root: rt(Xt(a, { ref: n, role: a === "div" ? "table" : void 0, ...o }), {
                elementType: a,
            }),
            size: (c = o.size) !== null && c !== void 0 ? c : "medium",
            noNativeElements: (f = o.noNativeElements) !== null && f !== void 0 ? f : !1,
            sortable: (h = o.sortable) !== null && h !== void 0 ? h : !1,
        };
    },
    Hy = (o, n) => ye(vy, { value: n.table, children: ye(o.root, {}) }),
    Wy = "fui-Table",
    Uy = ve(
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
    Vy = ve({ root: { mc9l5x: "ftgm304" } }, { d: [".ftgm304{display:block;}"] }),
    Ky = ve(
        { root: { po53p8: "fgkb47j", De3pzq: "fhovq9v" } },
        {
            d: [
                ".fgkb47j{border-collapse:collapse;}",
                ".fhovq9v{background-color:var(--colorSubtleBackground);}",
            ],
        }
    ),
    $y = (o) => {
        "use no memo";
        const n = Ky(),
            i = { table: Uy(), flex: Vy() };
        return (
            (o.root.className = Te(
                Wy,
                n.root,
                o.noNativeElements ? i.flex.root : i.table.root,
                o.root.className
            )),
            o
        );
    };
function Qy(o) {
    const { size: n, noNativeElements: i, sortable: a } = o;
    return { table: O.useMemo(() => ({ noNativeElements: i, size: n, sortable: a }), [i, n, a]) };
}
const qd = O.forwardRef((o, n) => {
    const i = qy(o, n);
    return ($y(i), jt("useTableStyles_unstable")(i), Hy(i, Qy(i)));
});
qd.displayName = "Table";
const Gy = (o, n) => {
        const { noNativeElements: i } = io();
        var a;
        const c = ((a = o.as) !== null && a !== void 0 ? a : i) ? "div" : "thead";
        return {
            components: { root: c },
            root: rt(Xt(c, { ref: n, role: c === "div" ? "rowgroup" : void 0, ...o }), {
                elementType: c,
            }),
            noNativeElements: i,
        };
    },
    Xy = (o) => ye(By, { value: "", children: ye(o.root, {}) }),
    Yy = "fui-TableHeader",
    Jy = ve({ root: { mc9l5x: "ftgm304" } }, { d: [".ftgm304{display:block;}"] }),
    Zy = ve({ root: { mc9l5x: "f1tp1avn" } }, { d: [".f1tp1avn{display:table-row-group;}"] }),
    ew = (o) => {
        "use no memo";
        const n = { table: Zy(), flex: Jy() };
        return (
            (o.root.className = Te(
                Yy,
                o.noNativeElements ? n.flex.root : n.table.root,
                o.root.className
            )),
            o
        );
    },
    Hd = O.forwardRef((o, n) => {
        const i = Gy(o, n);
        return (ew(i), jt("useTableHeaderStyles_unstable")(i), Xy(i));
    });
Hd.displayName = "TableHeader";
const tw = {
        ascending: O.createElement(y1, { fontSize: 12 }),
        descending: O.createElement(g1, { fontSize: 12 }),
    },
    rw = (o, n) => {
        const { noNativeElements: i, sortable: a } = io(),
            { sortable: c = a } = o;
        var f;
        const h = ((f = o.as) !== null && f !== void 0 ? f : i) ? "div" : "th",
            p = rt(o.button, { elementType: "div", defaultProps: { as: "div" } }),
            m = zd(p.as, p);
        var v;
        return {
            components: { root: h, button: "div", sortIcon: "span", aside: "span" },
            root: rt(
                Xt(h, {
                    ref: Js(n, Sd()),
                    role: h === "div" ? "columnheader" : void 0,
                    "aria-sort": c
                        ? (v = o.sortDirection) !== null && v !== void 0
                            ? v
                            : "none"
                        : void 0,
                    ...o,
                }),
                { elementType: h }
            ),
            aside: eo(o.aside, { elementType: "span" }),
            sortIcon: eo(o.sortIcon, {
                renderByDefault: !!o.sortDirection,
                defaultProps: { children: o.sortDirection ? tw[o.sortDirection] : void 0 },
                elementType: "span",
            }),
            button: c ? m : p,
            sortable: c,
            noNativeElements: i,
        };
    },
    nw = (o) =>
        to(o.root, {
            children: [
                to(o.button, { children: [o.root.children, o.sortIcon && ye(o.sortIcon, {})] }),
                o.aside && ye(o.aside, {}),
            ],
        }),
    bi = {
        root: "fui-TableHeaderCell",
        button: "fui-TableHeaderCell__button",
        sortIcon: "fui-TableHeaderCell__sortIcon",
        aside: "fui-TableHeaderCell__aside",
    },
    ow = ve(
        { root: { mc9l5x: "f15pt5es", ha4doy: "fmrv4ls" } },
        { d: [".f15pt5es{display:table-cell;}", ".fmrv4ls{vertical-align:middle;}"] }
    ),
    iw = ve(
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
    lw = ve(
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
    sw = (o) => {
        "use no memo";
        const n = lw(),
            i = { table: ow(), flex: iw() };
        return (
            (o.root.className = Te(
                bi.root,
                n.root,
                o.sortable && n.rootInteractive,
                o.noNativeElements ? i.flex.root : i.table.root,
                o.root.className
            )),
            (o.button.className = Te(
                bi.button,
                n.resetButton,
                n.button,
                o.sortable && n.sortable,
                o.button.className
            )),
            o.sortIcon &&
                (o.sortIcon.className = Te(bi.sortIcon, n.sortIcon, o.sortIcon.className)),
            o.aside && (o.aside.className = Te(bi.aside, n.resizeHandle, o.aside.className)),
            o
        );
    },
    Wd = O.forwardRef((o, n) => {
        const i = rw(o, n);
        return (sw(i), jt("useTableHeaderCellStyles_unstable")(i), nw(i));
    });
Wd.displayName = "TableHeaderCell";
async function aw(o) {
    const n = new TextEncoder(),
        i = new Blob([n.encode(o)]).stream().pipeThrough(new CompressionStream("deflate-raw")),
        c = await (await new Response(i).blob()).arrayBuffer(),
        f = new Uint8Array(c);
    let h = "";
    for (let p = 0; p < f.length; p++) h += String.fromCharCode(f[p]);
    return btoa(h).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function uw(o) {
    let n = o.replace(/-/g, "+").replace(/_/g, "/");
    for (; n.length % 4; ) n += "=";
    const i = atob(n),
        a = new Uint8Array(i.length);
    for (let h = 0; h < i.length; h++) a[h] = i.charCodeAt(h);
    const c = new Blob([a]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await (await new Response(c).blob()).text();
}
function cw({ results: o }) {
    if (!o || o.length === 0) return null;
    const n = Object.keys(o[0]);
    return Fe.jsxs(qd, {
        children: [
            Fe.jsx(Hd, {
                children: Fe.jsx(Ks, { children: n.map((i) => Fe.jsx(Wd, { children: i }, i)) }),
            }),
            Fe.jsx(Ad, {
                children: o.map((i, a) =>
                    Fe.jsx(
                        Ks,
                        {
                            children: n.map((c) =>
                                Fe.jsx(
                                    Ld,
                                    {
                                        children:
                                            typeof i[c] == "object"
                                                ? JSON.stringify(i[c])
                                                : String(i[c] ?? ""),
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
class fw extends qf.Component {
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
                const n = await aw(this.state.input),
                    i = window.location.origin + window.location.pathname + "?" + n;
                (this.setState({ shareLink: i }), navigator.clipboard.writeText(i).catch(() => {}));
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
            const i = n.substring(1);
            uw(i)
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
        const { input: n, results: i, metadata: a, error: c, shareLink: f } = this.state;
        return Fe.jsxs(Cd, {
            theme: Xg,
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                padding: 16,
                boxSizing: "border-box",
            },
            children: [
                Fe.jsx(Id, {
                    value: n,
                    onChange: (h, p) => this.setState({ input: p.value }),
                    onKeyDown: this.handleKeyDown,
                    placeholder:
                        "Type your FlowQuery statement here and press Shift+Enter to run it.",
                    resize: "vertical",
                    textarea: { style: { fontFamily: "monospace", minHeight: 200 } },
                    style: { width: "100%" },
                }),
                Fe.jsxs(Dd, {
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
                            Fe.jsx(jd, {
                                readOnly: !0,
                                value: f,
                                onClick: (h) => h.target.select(),
                                style: { flexGrow: 1 },
                            }),
                    ],
                }),
                a &&
                    Fe.jsx("div", {
                        style: { display: "flex", gap: 12, padding: "4px 0" },
                        children: Object.entries(a).map(([h, p]) =>
                            Fe.jsxs(
                                Vs,
                                { size: 200, font: "monospace", children: [h, ": ", String(p)] },
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
                    children: Fe.jsx(cw, { results: i }),
                }),
            ],
        });
    }
}
Xp.createRoot(document.getElementById("root")).render(Fe.jsx(fw, {}));
