// SVG flags (flag-icons 4x3) — bundled per-country so they render on every
// OS, including Windows where regional-indicator emoji have no glyphs.
import FLAG_AU from "./au.svg";
import FLAG_CA from "./ca.svg";
import FLAG_CN from "./cn.svg";
import FLAG_FR from "./fr.svg";
import FLAG_GB from "./gb.svg";
import FLAG_GR from "./gr.svg";
import FLAG_HK from "./hk.svg";
import FLAG_HU from "./hu.svg";
import FLAG_IT from "./it.svg";
import FLAG_JP from "./jp.svg";
import FLAG_KR from "./kr.svg";
import FLAG_NL from "./nl.svg";
import FLAG_NZ from "./nz.svg";
import FLAG_SE from "./se.svg";
import FLAG_US from "./us.svg";
import FLAG_VN from "./vn.svg";

const FLAG_SVGS = {
    au: FLAG_AU,
    ca: FLAG_CA,
    cn: FLAG_CN,
    fr: FLAG_FR,
    gb: FLAG_GB,
    gr: FLAG_GR,
    hk: FLAG_HK,
    hu: FLAG_HU,
    it: FLAG_IT,
    jp: FLAG_JP,
    kr: FLAG_KR,
    nl: FLAG_NL,
    nz: FLAG_NZ,
    se: FLAG_SE,
    us: FLAG_US,
    vn: FLAG_VN,
};

export const getFlagSvg = (countryCode) =>
    countryCode ? (FLAG_SVGS[countryCode.toLowerCase()] ?? null) : null;

