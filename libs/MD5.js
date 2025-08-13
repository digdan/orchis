var MD5 = function (d) {
    var r = M(V(Y(X(d), 8 * d.length)));
    return r.toLowerCase();
};

function M(d) {
    var _, m = "0123456789ABCDEF", f = "", r = 0;
    for (; r < d.length; r++) {
        _ = d.charCodeAt(r);
        f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _);
    }
    return f;
}

function X(d) {
    var _ = Array(d.length >> 2), m = 0;
    for (; m < _.length; m++) _[m] = 0;
    for (m = 0; m < 8 * d.length; m += 8) {
        _[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32;
    }
    return _;
}

function V(d) {
    var _ = "", m = 0;
    for (; m < 32 * d.length; m += 8) {
        _ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255);
    }
    return _;
}

function Y(d, _) {
    d[_ >> 5] |= 128 << _ % 32;
    d[14 + (_ + 64 >>> 9 << 4)] = _;

    var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878;

    for (var n = 0; n < d.length; n += 16) {
        var h = m, t = f, g = r, e = i;

        // Round 1
        m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936);
        i = md5_ff(i, m, f, r, d[n + 1], 12, -389564586);
        r = md5_ff(r, i, m, f, d[n + 2], 17, 606105819);
        f = md5_ff(f, r, i, m, d[n + 3], 22, -1044525330);
        m = md5_ff(m, f, r, i, d[n + 4], 7, -176418897);
        i = md5_ff(i, m, f, r, d[n + 5], 12, 1200080426);
        r = md5_ff(r, i, m, f, d[n + 6], 17, -1473231341);
        f = md5_ff(f, r, i, m, d[n + 7], 22, -45705983);
        m = md5_ff(m, f, r, i, d[n + 8], 7, 1770035416);
        i = md5_ff(i, m, f, r, d[n + 9], 12, -1958414417);
        r = md5_ff(r, i, m, f, d[n + 10], 17, -42063);
        f = md5_ff(f, r, i, m, d[n + 11], 22, -1990404162);
        m = md5_ff(m, f, r, i, d[n + 12], 7, 1804603682);
        i = md5_ff(i, m, f, r, d[n + 13], 12, -40341101);
        r = md5_ff(r, i, m, f, d[n + 14], 17, -1502002290);
        f = md5_ff(f, r, i, m, d[n + 15], 22, 1236535329);

        // Round 2
        m = md5_gg(m, f, r, i, d[n + 1], 5, -165796510);
        i = md5_gg(i, m, f, r, d[n + 6], 9, -1069501632);
        r = md5_gg(r, i, m, f, d[n + 11], 14, 643717713);
        f = md5_gg(f, r, i, m, d[n + 0], 20, -373897302);
        m = md5_gg(m, f, r, i, d[n + 5], 5, -701558691);
        i = md5_gg(i, m, f, r, d[n + 10], 9, 38016083);
        r = md5_gg(r, i, m, f, d[n + 15], 14, -660478335);
        f = md5_gg(f, r, i, m, d[n + 4], 20, -405537848);
        m = md5_gg(m, f, r, i, d[n + 9], 5, 568446438);
        i = md5_gg(i, m, f, r, d[n + 14], 9, -1019803690);
        r = md5_gg(r, i, m, f, d[n + 3], 14, -187363961);
        f = md5_gg(f, r, i, m, d[n + 8], 20, 1163531501);
        m = md5_gg(m, f, r, i, d[n + 13], 5, -1444681467);
        i = md5_gg(i, m, f, r, d[n + 2], 9, -51403784);
        r = md5_gg(r, i, m, f, d[n + 7], 14, 1735328473);
        f = md5_gg(f, r, i, m, d[n + 12], 20, -1926607734);

        // Round 3
        m = md5_hh(m, f, r, i, d[n + 5], 4, -378558);
        i = md5_hh(i, m, f, r, d[n + 8], 11, -2022574463);
        r = md5_hh(r, i, m, f, d[n + 11], 16, 1839030562);
        f = md5_hh(f, r, i, m, d[n + 14], 23, -35309556);
        m = md5_hh(m, f, r, i, d[n + 1], 4, -1530992060);
        i = md5_hh(i, m, f, r, d[n + 4], 11, 1272893353);
        r = md5_hh(r, i, m, f, d[n + 7], 16, -155497632);
        f = md5_hh(f, r, i, m, d[n + 10], 23, -1094730640);
        m = md5_hh(m, f, r, i, d[n + 13], 4, 681279174);
        i = md5_hh(i, m, f, r, d[n + 0], 11, -358537222);
        r = md5_hh(r, i, m, f, d[n + 3], 16, -722521979);
        f = md5_hh(f, r, i, m, d[n + 6], 23, 76029189);
        m = md5_hh(m, f, r, i, d[n + 9], 4, -640364487);
        i = md5_hh(i, m, f, r, d[n + 12], 11, -421815835);
        r = md5_hh(r, i, m, f, d[n + 15], 16, 530742520);
        f = md5_hh(f, r, i, m, d[n + 2], 23, -995338651);

        // Round 4
        m = md5_ii(m, f, r, i, d[n + 0], 6, -198630844);
        i = md5_ii(i, m, f, r, d[n + 7], 10, 1126891415);
        r = md5_ii(r, i, m, f, d[n + 14], 15, -1416354905);
        f = md5_ii(f, r, i, m, d[n + 5], 21, -57434055);
        m = md5_ii(m, f, r, i, d[n + 12], 6, 1700485571);
        i = md5_ii(i, m, f, r, d[n + 3], 10, -1894986606);
        r = md5_ii(r, i, m, f, d[n + 10], 15, -1051523);
        f = md5_ii(f, r, i, m, d[n + 1], 21, -2054922799);
        m = md5_ii(m, f, r, i, d[n + 8], 6, 1873313359);
        i = md5_ii(i, m, f, r, d[n + 15], 10, -30611744);
        r = md5_ii(r, i, m, f, d[n + 6], 15, -1560198380);
        f = md5_ii(f, r, i, m, d[n + 13], 21, 1309151649);
        m = md5_ii(m, f, r, i, d[n + 4], 6, -145523070);
        i = md5_ii(i, m, f, r, d[n + 11], 10, -1120210379);
        r = md5_ii(r, i, m, f, d[n + 2], 15, 718787259);
        f = md5_ii(f, r, i, m, d[n + 9], 21, -343485551);

        m = safe_add(m, h);
        f = safe_add(f, t);
        r = safe_add(r, g);
        i = safe_add(i, e);
    }

    return Array(m, f, r, i);
}

function md5_cmn(d, _, m, f, r, i) {
    return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, i)), r), m);
}

function md5_ff(d, _, m, f, r, i, n) {
    return md5_cmn(_ & m | ~_ & f, d, _, r, i, n);
}

function md5_gg(d, _, m, f, r, i, n) {
    return md5_cmn(_ & f | m & ~f, d, _, r, i, n);
}

function md5_hh(d, _, m, f, r, i, n) {
    return md5_cmn(_ ^ m ^ f, d, _, r, i, n);
}

function md5_ii(d, _, m, f, r, i, n) {
    return md5_cmn(m ^ (_ | ~f), d, _, r, i, n);
}

function safe_add(d, _) {
    var m = (65535 & d) + (65535 & _);
    return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m;
}

function bit_rol(d, _) {
    return d << _ | d >>> 32 - _;
}

module.exports = MD5;