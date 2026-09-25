"""
Authoritative-source registry for the Trade & Regulatory Intelligence module.

WHY THIS FILE EXISTS, AND WHY IT HOLDS NO ACTUAL LAW
----------------------------------------------------
The obvious way to build a "world business law" feature is to write a big
dataset of statutes, tariff rates and customs rules into the repo. That is
exactly what this project refuses to do, for two reasons:

  1. Accuracy. Any legal text written from a model's memory is unverifiable
     and frequently wrong in the details that matter — article numbers, duty
     percentages, free-zone thresholds, HS codes. Wrong trade law is not a
     cosmetic bug; someone acts on it and gets fined.
  2. Freshness. Tariffs, CEPA terms and free-zone rules change on their own
     schedule. A hardcoded dataset is stale the day it is committed, and
     nothing in the UI would tell the reader that.

So this file stores *where to look*, never *what the law says*. Every entry
below is an institution's real, verified domain (checked to resolve at build
time). Answers are retrieved live through SearXNG against these domains and
returned with citations, so the reader can click through to the primary
source and see its publication date for themselves.

Adding a jurisdiction means adding its official domains here — never adding
legal prose.
"""

from typing import TypedDict


class Source(TypedDict):
    name: str
    domain: str
    scope: str


# Jurisdiction key -> the official bodies whose sites are searched for it.
# `domain` values are passed to SearXNG as `site:` filters, so they must be
# bare hostnames, not URLs.
JURISDICTIONS: dict[str, dict] = {
    "uae": {
        "label": "United Arab Emirates",
        "label_ar": "الإمارات العربية المتحدة",
        "sources": [
            {"name": "UAE Government Portal", "domain": "u.ae",
             "scope": "Federal services, business setup, licensing"},
            {"name": "Ministry of Economy", "domain": "moec.gov.ae",
             "scope": "Commercial law, foreign investment, trade agreements"},
            {"name": "UAE Legislation Portal", "domain": "uaelegislation.gov.ae",
             "scope": "Federal decrees and consolidated legislation"},
            {"name": "Federal Tax Authority", "domain": "tax.gov.ae",
             "scope": "VAT, excise tax, corporate tax"},
            {"name": "Dubai Customs", "domain": "dubaicustoms.gov.ae",
             "scope": "Import/export procedure, tariffs, free zones"},
        ],
    },
    "gcc": {
        "label": "GCC (Gulf Cooperation Council)",
        "label_ar": "مجلس التعاون الخليجي",
        "sources": [
            {"name": "GCC Secretariat General", "domain": "gcc-sg.org",
             "scope": "Customs union, common market, unified economic agreement"},
            {"name": "GCC Standardization Organization", "domain": "gso.org.sa",
             "scope": "Product standards, conformity, technical regulations"},
        ],
    },
    "eu": {
        "label": "European Union (incl. France, Germany)",
        "label_ar": "الاتحاد الأوروبي (فرنسا وألمانيا)",
        "sources": [
            {"name": "EU Access2Markets", "domain": "trade.ec.europa.eu",
             "scope": "Tariffs, rules of origin, product requirements by country"},
        ],
    },
    "usa": {
        "label": "United States",
        "label_ar": "الولايات المتحدة",
        "sources": [
            {"name": "International Trade Administration", "domain": "trade.gov",
             "scope": "Country commercial guides, market access, regulations"},
        ],
    },
    "china": {
        "label": "China",
        "label_ar": "الصين",
        "sources": [
            {"name": "State Council of China", "domain": "english.www.gov.cn",
             "scope": "National policy, trade and investment regulation"},
        ],
    },
    "global": {
        "label": "Global / multilateral",
        "label_ar": "عالمي / متعدد الأطراف",
        "sources": [
            {"name": "World Trade Organization", "domain": "wto.org",
             "scope": "Tariff schedules, trade agreements, dispute rulings"},
        ],
    },
}

# Sector keys steer the search phrasing. They deliberately add regulatory
# vocabulary a lay question would omit ("type approval", "REACH"), which is
# what makes the retrieved sources land on the right pages.
SECTORS: dict[str, dict] = {
    "general": {
        "label": "General trade", "label_ar": "التجارة العامة",
        "terms": "import export customs tariff licensing",
    },
    "automotive": {
        "label": "Automotive", "label_ar": "السيارات",
        "terms": "vehicle import type approval homologation customs duty",
    },
    "textiles": {
        "label": "Clothing & textiles", "label_ar": "الملابس والمنسوجات",
        "terms": "textile apparel import labelling rules of origin duty",
    },
    "cosmetics": {
        "label": "Cosmetics & makeup", "label_ar": "مستحضرات التجميل",
        "terms": "cosmetics registration ingredient safety labelling import",
    },
    "electronics": {
        "label": "Electronics", "label_ar": "الإلكترونيات",
        "terms": "electronics conformity certification import standards",
    },
    "food": {
        "label": "Food & beverage", "label_ar": "الأغذية والمشروبات",
        "terms": "food import health certificate halal labelling",
    },
}


# ---------------------------------------------------------------------------
# Curated directory of official entry points.
#
# Live search is the primary path, but the free metasearch behind it gets
# CAPTCHA-throttled by its upstream engines under any real load, and when it
# does the module has nothing to show. This directory is the floor: a set of
# hand-picked official landing pages that always renders, with zero network
# calls, so a throttled search degrades to "here are the right authorities to
# read" instead of an empty screen.
#
# Every URL below returned HTTP 200 when this list was assembled. They are
# deliberately shallow — section landing pages, not deep-linked documents —
# because landing pages survive site reorganisations that would 404 a deep
# link within months. Still worth re-checking periodically; a stale link here
# is the one failure mode this file can have.
# ---------------------------------------------------------------------------
DIRECTORY: list[dict] = [
    {"jurisdiction": "uae", "sector": "general", "name": "Doing business in the UAE",
     "url": "https://u.ae/en/information-and-services/business",
     "body": "UAE Government Portal", "note": "Licensing, company setup, federal business services"},
    {"jurisdiction": "uae", "sector": "general", "name": "Commercial affairs",
     "url": "https://www.moec.gov.ae/en/commercial-affairs",
     "body": "Ministry of Economy", "note": "Companies law, commercial registration, agencies"},
    {"jurisdiction": "uae", "sector": "general", "name": "Foreign trade",
     "url": "https://www.moec.gov.ae/en/foreign-trade",
     "body": "Ministry of Economy", "note": "Trade agreements (incl. CEPA), export/import policy"},
    {"jurisdiction": "uae", "sector": "general", "name": "Intellectual property",
     "url": "https://www.moec.gov.ae/en/intellectual-property",
     "body": "Ministry of Economy", "note": "Trademarks, patents, copyright — relevant to branded goods"},
    {"jurisdiction": "uae", "sector": "general", "name": "Dubai Customs",
     "url": "https://www.dubaicustoms.gov.ae/en/Pages/default.aspx",
     "body": "Dubai Customs", "note": "Import/export procedure, tariffs, free-zone movement"},
    {"jurisdiction": "uae", "sector": "general", "name": "Corporate tax",
     "url": "https://tax.gov.ae/en/taxes/corporate.tax.aspx",
     "body": "Federal Tax Authority", "note": "Corporate tax scope, rates, registration"},
    {"jurisdiction": "uae", "sector": "general", "name": "VAT",
     "url": "https://tax.gov.ae/en/taxes/vat.aspx",
     "body": "Federal Tax Authority", "note": "VAT registration, filing, imports"},

    {"jurisdiction": "gcc", "sector": "general", "name": "GCC Secretariat General",
     "url": "https://www.gcc-sg.org/en-us/Pages/default.aspx",
     "body": "GCC", "note": "Customs union, common market, unified economic agreement"},
    {"jurisdiction": "gcc", "sector": "general", "name": "GSO standards catalogue",
     "url": "https://www.gso.org.sa/store/standards",
     "body": "GCC Standardization Organization", "note":
     "Searchable GCC technical standards — cosmetics, automotive, textiles, food"},
    {"jurisdiction": "gcc", "sector": "general", "name": "GSO store",
     "url": "https://www.gso.org.sa/store/",
     "body": "GCC Standardization Organization", "note": "Conformity and technical regulation documents"},

    {"jurisdiction": "global", "sector": "general", "name": "WTO tariff information",
     "url": "https://www.wto.org/english/tratop_e/tariffs_e/tariffs_e.htm",
     "body": "World Trade Organization", "note": "Bound and applied tariff schedules by member"},
    {"jurisdiction": "eu", "sector": "general", "name": "Access2Markets",
     "url": "https://trade.ec.europa.eu/access-to-markets/en/home",
     "body": "European Commission", "note":
     "Per-product duties, rules of origin and requirements for EU trade — covers France and Germany"},
    {"jurisdiction": "usa", "sector": "general", "name": "Country Commercial Guides",
     "url": "https://www.trade.gov/country-commercial-guides",
     "body": "International Trade Administration", "note": "Market access and regulation by country"},
    {"jurisdiction": "china", "sector": "general", "name": "Policy releases",
     "url": "https://english.www.gov.cn/policies/",
     "body": "State Council of China", "note": "National trade and investment policy announcements"},
]


def directory_for(jurisdictions: list[str] | None = None, sector: str = "general") -> list[dict]:
    """Curated official links for the selected jurisdictions, newest filter first."""
    if not jurisdictions:
        return DIRECTORY
    keys = set(jurisdictions)
    return [d for d in DIRECTORY if d["jurisdiction"] in keys]


def official_domains(jurisdictions: list[str] | None = None) -> set[str]:
    """Flat allowlist of official hostnames, for classifying search hits."""
    keys = jurisdictions if jurisdictions else list(JURISDICTIONS)
    return {
        src["domain"]
        for k in keys
        if (j := JURISDICTIONS.get(k))
        for src in j["sources"]
    }


# Government-domain suffixes. A fixed allowlist of named bodies was too
# brittle on its own: a search for UAE vehicle duty surfaced zatca.gov.sa
# (Saudi Arabia's tax and customs authority) — unmistakably an official
# source, but scored "unofficial" purely because it wasn't in the curated
# list. Recognising the namespace catches sibling authorities across the GCC
# and partner jurisdictions without having to enumerate every ministry.
_GOV_SUFFIXES = (
    ".gov.ae", ".gov.sa", ".gov.qa", ".gov.kw", ".gov.bh", ".gov.om",  # GCC
    ".gov",                                                            # US federal/state
    ".europa.eu",                                                      # EU institutions
    ".gov.cn",                                                         # China
    ".gouv.fr",                                                        # France
    ".gov.uk",
    ".govt.nz", ".gov.au", ".gc.ca",
)

# Multilateral/standards bodies that are authoritative but sit on ordinary
# TLDs, so no suffix rule would catch them.
_OFFICIAL_EXTRA = {"wto.org", "gso.org.sa", "gcc-sg.org", "u.ae", "unctad.org", "iso.org"}


def is_official_host(host: str) -> bool:
    """True if the hostname belongs to a government or treaty body."""
    host = host.lower()
    if host.startswith("www."):
        host = host[4:]
    if host in _OFFICIAL_EXTRA or any(host.endswith("." + d) for d in _OFFICIAL_EXTRA):
        return True
    if host.endswith(".ae") and "gov" in host:
        return True
    return any(host == s.lstrip(".") or host.endswith(s) for s in _GOV_SUFFIXES)


def source_name_for(host: str) -> tuple[str, str] | None:
    """Map a result hostname back to (source name, jurisdiction label), or None."""
    for j in JURISDICTIONS.values():
        for src in j["sources"]:
            if host == src["domain"] or host.endswith("." + src["domain"]):
                return src["name"], j["label"]
    return None


def build_queries(question: str, jurisdictions: list[str], sector: str) -> list[dict]:
    """
    Turn one question into a small number of natural-language searches.

    An earlier version scoped each search with `site:<domain>`, one query per
    official source. That was abandoned after testing against the live
    SearXNG instance: the engines that survive our request volume (the rest
    get CAPTCHA'd) largely ignore the `site:` operator, so every scoped query
    returned zero rows. Worse, fanning out one query per domain meant ~8
    parallel searches per question, which is what got the upstream engines to
    start refusing us in the first place.

    So: ask naturally, at most two queries per jurisdiction, and enforce
    authority *afterwards* by matching result hostnames against
    official_domains(). Fewer, better-formed queries retrieve more and get
    throttled less.
    """
    sector_terms = SECTORS.get(sector, SECTORS["general"])["terms"]
    # Keep queries short — long queries measurably return fewer results.
    short_terms = " ".join(sector_terms.split()[:3])
    q = question.strip()
    queries: list[dict] = []

    for jkey in jurisdictions:
        j = JURISDICTIONS.get(jkey)
        if not j:
            continue
        label = j["label"].split(" (")[0]  # "European Union (incl. …)" -> "European Union"
        queries.append({
            "jurisdiction": jkey,
            "jurisdiction_label": j["label"],
            "query": f"{label} {q} {short_terms}",
        })
        # A second, authority-biased phrasing: official portals rank higher for
        # regulation/standard vocabulary than for how a person phrases a question.
        queries.append({
            "jurisdiction": jkey,
            "jurisdiction_label": j["label"],
            "query": f"{label} {q} official regulation authority",
        })
    return queries


def all_jurisdictions() -> list[dict]:
    """Registry as a JSON-friendly list, for the frontend's filter UI."""
    return [
        {"key": k, "label": v["label"], "label_ar": v["label_ar"], "sources": v["sources"]}
        for k, v in JURISDICTIONS.items()
    ]


def all_sectors() -> list[dict]:
    return [
        {"key": k, "label": v["label"], "label_ar": v["label_ar"]}
        for k, v in SECTORS.items()
    ]
