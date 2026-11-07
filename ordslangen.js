/*
 * Ordslangen – kjernelogikk.
 *
 * Inneholder alt som ikke har med visning å gjøre:
 *  - stavelsesdeling
 *  - faste minimumsregler for rettskriving (brukes alltid, og alene når ordboka ikke svarer)
 *  - oppslag i Bokmålsordboka (ord.uib.no)
 *  - kontroll av ord i begge varianter (sammensatte ord og stavelser)
 *  - søk etter ord som slangen selv kan bruke, og som hint
 *
 * Fila kan lastes både i nettleseren (window.Ordslangen) og i Node (module.exports) for testing.
 */
(function (root) {
    "use strict";

    const API_BASE = "https://ord.uib.no";
    const REQUEST_TIMEOUT_MS = 7000;

    const VOWELS = "aeiouyæøåéèêóòôàü";
    const LETTERS_RE = /^[a-zæøåéèêóòôàü]+$/;
    const DIPHTHONGS = ["ei", "øy", "au", "ai", "oi", "ui", "øi", "ey", "oy"];
    // Konsonantgrupper som uttales som én lyd og derfor følger med til neste stavelse.
    const ONSET_UNITS = ["skj", "sj", "kj", "tj", "gj"];
    // Konsonantgrupper som kan begynne en norsk stavelse (brukes i den tilgivende regelen).
    const VALID_ONSETS = new Set([
        "bj", "bl", "br", "dj", "dr", "dv", "fj", "fl", "fr", "gj", "gl", "gn", "gr",
        "kj", "kl", "kn", "kr", "kv", "mj", "nj", "pj", "pl", "pr", "sj", "sk", "skj",
        "skr", "sl", "sm", "sn", "sp", "spl", "spr", "st", "str", "sv", "tj", "tr", "tv", "vr"
    ]);
    // Ordklasser som kan være siste ledd i et sammensatt ord vi setter sammen selv.
    const CONTENT_POS = new Set(["NOUN", "VERB", "ADJ"]);

    class OfflineError extends Error {
        constructor(message) {
            super(message || "Ordboka svarte ikke");
            this.name = "OfflineError";
        }
    }

    function unique(items) {
        return [...new Set(items.filter(Boolean))];
    }

    function isVowel(ch) {
        return VOWELS.includes(ch);
    }

    function hasVowel(text) {
        return [...String(text)].some(isVowel);
    }

    function shuffle(items) {
        const copy = [...items];
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
        }
        return copy;
    }

    /* ------------------------------------------------------------------ */
    /* Stavelser                                                           */
    /* ------------------------------------------------------------------ */

    function findNuclei(word) {
        const nuclei = [];
        let index = 0;
        while (index < word.length) {
            if (!isVowel(word[index])) {
                index += 1;
                continue;
            }
            const pair = word.slice(index, index + 2);
            const length = DIPHTHONGS.includes(pair) ? 2 : 1;
            nuclei.push({ start: index, end: index + length });
            index += length;
        }
        return nuclei;
    }

    // Hvor grensen mellom to stavelser går, etter vanlige regler for stavelsesdeling:
    //  - én konsonant mellom vokalene går til neste stavelse (ha-ge)
    //  - flere konsonanter: den siste går til neste stavelse (tep-pe, per-fekt, fek-te)
    //  - sj, kj, tj, gj og skj er én lyd og følger med til neste stavelse (du-sjen)
    function mainBoundary(word, left, right) {
        const cluster = word.slice(left.end, right.start);
        if (cluster.length <= 1) return left.end;
        const unit = ONSET_UNITS.find((item) => cluster.endsWith(item));
        if (unit) return right.start - unit.length;
        return right.start - 1;
    }

    // Andre mulige grenser (brukes bare i den tilgivende regelen): sø-ster i tillegg til søs-ter.
    function alternativeBoundaries(word, left, right) {
        const cluster = word.slice(left.end, right.start);
        const main = mainBoundary(word, left, right);
        const options = [];
        for (let size = 2; size <= Math.min(3, cluster.length); size += 1) {
            const onset = cluster.slice(-size);
            const boundary = right.start - size;
            if (boundary !== main && VALID_ONSETS.has(onset)) options.push(boundary);
        }
        return options;
    }

    function syllabify(rawWord) {
        const word = String(rawWord).toLowerCase();
        const nuclei = findNuclei(word);
        if (nuclei.length < 2) return [word];
        const cuts = [];
        for (let index = 0; index < nuclei.length - 1; index += 1) {
            cuts.push(mainBoundary(word, nuclei[index], nuclei[index + 1]));
        }
        const syllables = [];
        let start = 0;
        cuts.forEach((cut) => {
            syllables.push(word.slice(start, cut));
            start = cut;
        });
        syllables.push(word.slice(start));
        return syllables;
    }

    // Siste stavelse, pluss eventuelle andre rimelige delinger (for tilgivende regel).
    function lastSyllableOptions(rawWord, strict) {
        const word = String(rawWord).toLowerCase();
        const syllables = syllabify(word);
        const main = syllables[syllables.length - 1];
        if (strict) return [main];
        const nuclei = findNuclei(word);
        if (nuclei.length < 2) return [main];
        const left = nuclei[nuclei.length - 2];
        const right = nuclei[nuclei.length - 1];
        const alternatives = alternativeBoundaries(word, left, right).map((boundary) => word.slice(boundary));
        return unique([main, ...alternatives]);
    }

    /* ------------------------------------------------------------------ */
    /* Faste minimumsregler                                                */
    /* ------------------------------------------------------------------ */

    // Harde regler: brytes en av dem, avvises ordet alltid.
    function basicCheck(raw) {
        const text = String(raw || "").trim();
        if (!text) return { ok: false, error: "Skriv et ord først." };
        if (/\s/.test(text)) return { ok: false, error: "Skriv bare ett ord, uten mellomrom." };
        if (/[0-9]/.test(text)) return { ok: false, error: "Ordet kan ikke inneholde tall." };
        if (text[0] !== text[0].toLowerCase()) {
            return {
                ok: false,
                error: "Egennavn er ikke lov.",
                detail: "Er det ikke et navn? Skriv ordet med liten forbokstav."
            };
        }
        const word = text.toLowerCase();
        if (!LETTERS_RE.test(word)) return { ok: false, error: "Bruk bare bokstaver – ingen bindestrek eller andre tegn." };
        if (word.length < 2) return { ok: false, error: "Ordet er for kort." };
        if (/(.)\1\1/.test(word)) {
            return {
                ok: false,
                error: "Det kan ikke stå tre like bokstaver etter hverandre.",
                detail: "I sammensatte ord blir tre like konsonanter til to, som i bussjåfør (buss + sjåfør)."
            };
        }
        if (/^([^aeiouyæøåéèêóòôàü])\1/.test(word)) {
            return { ok: false, error: "Norske ord begynner ikke med dobbel konsonant." };
        }
        if (!hasVowel(word)) return { ok: false, error: "Ordet mangler vokal." };
        return { ok: true, word };
    }

    // Myke regler: tommelfingerregler med unntak. De gir bare et varsel.
    function softWarnings(word) {
        const warnings = [];
        if (/mm$/.test(word)) warnings.push("Norske ord slutter sjelden på -mm (rom, lam, fem).");
        if (/[cqwxz]/.test(word)) warnings.push("Bokstavene c, q, w, x og z er sjeldne i norske ord.");
        return warnings;
    }

    // Gjetter grunnformen av et bøyd substantiv når ordboka ikke svarer.
    function guessBaseForms(form) {
        const word = String(form);
        const guesses = [];
        if (word.endsWith("ene")) guesses.push(word.slice(0, -3), word.slice(0, -2));
        if (word.endsWith("er")) guesses.push(word.slice(0, -1), word.slice(0, -2));
        if (word.endsWith("en")) guesses.push(word.slice(0, -2), word.slice(0, -1));
        if (word.endsWith("et")) guesses.push(word.slice(0, -2), word.slice(0, -1));
        if (word.endsWith("a")) guesses.push(word.slice(0, -1));
        return unique(guesses.filter((item) => item.length >= 2 && hasVowel(item) && item !== word));
    }

    /* ------------------------------------------------------------------ */
    /* Ordboka                                                             */
    /* ------------------------------------------------------------------ */

    const lookupCache = new Map();
    const articleCache = new Map();
    const suggestCache = new Map();
    let fetchImpl = typeof fetch === "function" ? fetch.bind(root) : null;

    function setFetch(fn) {
        fetchImpl = fn;
    }

    async function fetchJson(url) {
        if (!fetchImpl) throw new OfflineError("Ingen nettilgang");
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
        try {
            const response = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
            if (!response.ok) throw new OfflineError(`Ordboka svarte med feil (${response.status})`);
            return await response.json();
        } catch (error) {
            if (error instanceof OfflineError) throw error;
            throw new OfflineError(error && error.message);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    function cached(map, key, factory) {
        if (map.has(key)) return map.get(key);
        const promise = factory();
        map.set(key, promise);
        promise.catch(() => map.delete(key));
        return promise;
    }

    function fetchArticle(id) {
        return cached(articleCache, id, () => fetchJson(`${API_BASE}/bm/article/${id}.json`));
    }

    const ITEM_WORDS = {
        el: "eller", overf: "overført", jf: "jf.", e_l: "e.l.", osv: "osv.", dvs: "dvs.",
        bl_a: "blant annet", f_eks: "for eksempel", ogs: "også", spes: "særlig", mots: "motsatt"
    };

    function itemText(item) {
        if (!item) return "";
        if (item.type_ === "article_ref") return ((item.lemmas || [])[0] || {}).lemma || "";
        if (item.text) return item.text;
        if (item.id && ITEM_WORDS[item.id]) return ITEM_WORDS[item.id];
        return item.id ? String(item.id).replace(/_/g, ".") : "";
    }

    function fillContent(content, items) {
        let index = 0;
        return String(content || "")
            .replace(/\$/g, () => itemText((items || [])[index++]))
            .replace(/\s+/g, " ")
            .trim();
    }

    // Første forklaring i en ordbokartikkel, som kort tekst.
    function readDefinition(article) {
        const stack = [...(((article || {}).body || {}).definitions || [])];
        while (stack.length) {
            const element = stack.shift();
            if (!element) continue;
            if (element.type_ === "explanation") {
                const text = fillContent(element.content, element.items);
                if (text.replace(/[\s,.:;]/g, "").length > 2) return text;
            }
            if (Array.isArray(element.elements)) stack.unshift(...element.elements);
        }
        return "";
    }

    function readLemma(raw, article) {
        const paradigms = raw.paradigm_info || [];
        const forms = new Set([raw.lemma]);
        paradigms.forEach((paradigm) => {
            (paradigm.inflection || []).forEach((item) => {
                if (item.word_form) forms.add(String(item.word_form).toLowerCase());
            });
        });
        const pos = unique(paradigms.map((paradigm) => (paradigm.tags || [])[0]));
        return {
            lemma: raw.lemma,
            initial: raw.initial_lexeme || null,
            final: raw.final_lexeme || null,
            junction: raw.junction || "",
            pos,
            forms: [...forms],
            definition: readDefinition(article)
        };
    }

    function isUsableLemma(lemma) {
        const text = lemma.lemma || "";
        return text
            && text[0] === text[0].toLowerCase()
            && !/[\s-]/.test(text);
    }

    // Slår opp et ord (også bøyde former) og returnerer oppslagsordene det hører til.
    function lookup(rawWord) {
        const word = String(rawWord).toLowerCase();
        return cached(lookupCache, word, async () => {
            const data = await fetchJson(`${API_BASE}/api/articles?w=${encodeURIComponent(word)}&dict=bm&scope=ei`);
            const ids = ((data.articles && data.articles.bm) || []).slice(0, 8);
            const articles = await Promise.all(ids.map(fetchArticle));
            const lemmas = articles
                .flatMap((article) => (article.lemmas || []).map((lemma) => readLemma(lemma, article)))
                .filter(isUsableLemma);
            const matching = lemmas.filter((lemma) => lemma.forms.includes(word) || lemma.lemma === word);
            const usable = matching.length ? matching : lemmas;
            return { word, found: usable.length > 0, lemmas: usable };
        });
    }

    // Ord i ordboka som begynner på gitte bokstaver (bare oppslagsord, ikke bøyde former).
    function suggest(prefix) {
        const query = String(prefix).toLowerCase();
        return cached(suggestCache, query, async () => {
            const data = await fetchJson(`${API_BASE}/api/suggest?q=${encodeURIComponent(query)}&dict=bm&n=200&include=e`);
            const exact = (data.a && data.a.exact) || [];
            return unique(exact
                .map((item) => (Array.isArray(item) ? item[0] : item))
                .filter((item) => typeof item === "string")
                .filter((item) => item.startsWith(query) && LETTERS_RE.test(item)));
        });
    }

    const POS_RANK = { NOUN: 0, ADJ: 1, VERB: 2 };

    function posRank(lemma) {
        return Math.min(...lemma.pos.map((pos) => (pos in POS_RANK ? POS_RANK[pos] : 5)), 5);
    }

    // Foretrekk oppslagsord som er skrevet akkurat slik, og substantiv framfor andre ordklasser.
    function rankLemmas(lemmas, word) {
        return [...lemmas].sort((a, b) => (
            (a.lemma === word ? 0 : 1) - (b.lemma === word ? 0 : 1) || posRank(a) - posRank(b)
        ));
    }

    function isCompoundLemma(lemma) {
        return Boolean(lemma.initial && lemma.final);
    }

    /* ------------------------------------------------------------------ */
    /* Variant 1: sammensatte ord                                          */
    /* ------------------------------------------------------------------ */

    // Hvilke ord neste ord kan begynne med, gitt siste ledd slik det står og grunnformen.
    function compoundNext(tail, baseForm) {
        const forms = unique([tail, baseForm]);
        return { forms, label: forms.map((form) => `${form}-`).join(" / ") };
    }

    function matchPrefix(word, forms) {
        return [...forms]
            .sort((a, b) => b.length - a.length)
            .find((form) => word.startsWith(form)) || null;
    }

    // Finn siste ledd i et ord fra ordboka. Er sisteleddet selv sammensatt, går vi ett hakk videre.
    async function finalLexeme(lemma) {
        let final = lemma.final;
        try {
            const inner = await lookup(final);
            const compound = inner.lemmas.find((item) => item.lemma === final && isCompoundLemma(item));
            if (compound) final = compound.final;
        } catch (error) {
            // Uten svar beholder vi sisteleddet fra ordboka.
        }
        return final;
    }

    // Er ordet et oppslagsord (grunnform) i ordboka, og ikke bare en bøyd form?
    async function isBaseForm(form) {
        const entry = await lookup(form);
        return entry.lemmas.some((lemma) => lemma.lemma === form);
    }

    // Sjekker at førsteleddet i ordet virkelig er ordet vi trenger, ikke bare de samme bokstavene
    // (sump|gass begynner med bokstavene «sum», men førsteleddet er «sump»).
    async function leddAligned(lemma, forms) {
        const initial = lemma.initial;
        for (const form of forms) {
            if (initial === form) return true;
            // Bøyd form eller bindebokstav: «beina» passer med førsteleddet «bein».
            if (form.startsWith(initial) && form.length - initial.length <= 2) return true;
            // Førsteleddet er selv sammensatt: fot|ball|bane etter «fot».
            if (initial.startsWith(form)) {
                try {
                    const inner = await lookup(initial);
                    if (inner.lemmas.some((item) => isCompoundLemma(item) && item.initial === form)) return true;
                } catch (error) {
                    return true;
                }
            }
        }
        return false;
    }

    const INFLECTION_ENDINGS = new Set(["a", "e", "en", "et", "er", "ene", "ne", "na"]);

    async function lookupContentWord(word) {
        const entry = await lookup(word);
        const lemma = entry.lemmas.find((item) => item.pos.some((pos) => CONTENT_POS.has(pos)));
        return lemma ? { word, lemma } : null;
    }

    function junctionVariants(rest) {
        const variants = [rest];
        if (rest.length > 3 && "se".includes(rest[0]) && !isVowel(rest[1])) variants.push(rest.slice(1));
        return unique(variants);
    }

    // Prøver å dele resten av ordet (etter førsteleddet) i ekte ord. Returnerer null om det ikke går.
    async function splitRest(prefix, rest) {
        // 1) Resten er ett ord (eventuelt med bindebokstav eller tre like konsonanter som er blitt to).
        const variants = junctionVariants(rest);
        const last = prefix[prefix.length - 1];
        if (prefix.length >= 2 && prefix[prefix.length - 2] === last && rest[0] !== last) {
            variants.push(last + rest);
        }
        const direct = await Promise.all(variants.map(lookupContentWord));
        const hit = direct.find(Boolean);
        if (hit) {
            const lemma = hit.lemma;
            if (isCompoundLemma(lemma)) {
                // Resten er selv et sammensatt ord (skole + bussjåfør): siste ledd er det som gjelder.
                const cut = lemma.lemma.length - lemma.final.length;
                const offset = rest.length - hit.word.length;
                const innerTail = cut > 0 && hit.word.slice(0, cut) === lemma.lemma.slice(0, cut)
                    ? hit.word.slice(cut)
                    : lemma.final;
                const shownHead = rest.slice(0, rest.length - innerTail.length);
                if (offset >= 0 && shownHead.length >= 1) {
                    return {
                        parts: [prefix, shownHead, innerTail],
                        tail: innerTail,
                        lemma: { lemma: lemma.final }
                    };
                }
            }
            return {
                parts: [prefix, rest],
                tail: hit.word,
                lemma
            };
        }

        // 2) Resten er selv satt sammen av to ord: mat + pakke + boks.
        if (rest.length < 4 || rest.length > 22) return null;
        const splits = [];
        for (let cut = 2; cut <= rest.length - 2; cut += 1) {
            splits.push({ head: rest.slice(0, cut), tail: rest.slice(cut) });
        }
        const tails = await Promise.all(splits.map((split) => lookupContentWord(split.tail)));
        const candidates = splits
            .map((split, index) => ({ ...split, hit: tails[index] }))
            .filter((split) => split.hit)
            .sort((a, b) => b.tail.length - a.tail.length);
        for (const candidate of candidates) {
            const heads = unique([
                candidate.head,
                ...junctionVariants(candidate.head),
                "se".includes(candidate.head[candidate.head.length - 1]) ? candidate.head.slice(0, -1) : null
            ]).filter((head) => head.length >= 3 && !INFLECTION_ENDINGS.has(head));
            // En bøyningsendelse rett etter førsteleddet (valp|en|kull) er ikke et eget ledd.
            if (INFLECTION_ENDINGS.has(candidate.head) || INFLECTION_ENDINGS.has(candidate.head.slice(0, 2))) continue;
            for (const head of heads) {
                const found = await lookupContentWord(head);
                if (found) {
                    return {
                        parts: [prefix, candidate.head, candidate.tail],
                        tail: candidate.tail,
                        lemma: candidate.hit.lemma
                    };
                }
            }
        }
        return null;
    }

    function baseOf(lemma, surfaceTail) {
        return lemma && lemma.lemma ? lemma.lemma : surfaceTail;
    }

    function offlineCompound(word, prefix, rest) {
        const stripped = junctionVariants(rest);
        const tail = stripped[stripped.length - 1];
        const forms = unique([rest, ...stripped, ...stripped.flatMap(guessBaseForms)]);
        const shownForms = unique([tail, guessBaseForms(tail)[0]]);
        return {
            ok: true,
            unchecked: true,
            word,
            lemma: word,
            parts: [prefix, rest],
            next: { forms, label: shownForms.map((form) => `${form}-`).join(" / ") },
            warnings: softWarnings(word)
        };
    }

    // Kontrollerer et ord i varianten med sammensatte ord.
    // needForms: hva ordet må begynne med (f.eks. ["pærer", "pære"]).
    async function checkCompoundWord(rawWord, needForms, used) {
        const basic = basicCheck(rawWord);
        if (!basic.ok) return basic;
        const word = basic.word;
        const needLabel = needForms.map((form) => `«${form}»`).join(" eller ");

        const prefix = matchPrefix(word, needForms);
        if (!prefix) {
            return { ok: false, error: `Ordet må begynne med ${needLabel}.` };
        }
        if (used.has(word)) {
            return { ok: false, error: `«${word}» er allerede brukt i slangen.`, detail: "Deler av ord kan brukes om igjen, men ikke hele ord." };
        }
        const rest = word.slice(prefix.length);
        if (rest.length < 2 || !hasVowel(rest)) {
            return { ok: false, error: `Ordet må være sammensatt: «${prefix}» + et ord til.` };
        }

        let entry;
        try {
            entry = await lookup(word);
        } catch (error) {
            if (error instanceof OfflineError) return offlineCompound(word, prefix, rest);
            throw error;
        }

        const lemmas = rankLemmas(entry.lemmas, word);
        // Står ordet i ordboka som et usammensatt ord (f.eks. avledningen «målbar»), gjelder det.
        const exactCompound = lemmas.find((lemma) => lemma.lemma === word && isCompoundLemma(lemma));
        const exactSimple = lemmas.find((lemma) => lemma.lemma === word && !isCompoundLemma(lemma));
        const compound = exactCompound || (exactSimple ? null : lemmas.find(isCompoundLemma));

        if (entry.found && compound) {
            const startForms = needForms.filter((form) => word.startsWith(form));
            if (!(await leddAligned(compound, startForms))) {
                return {
                    ok: false,
                    error: `«${word}» begynner ikke med ordet ${needLabel}.`,
                    detail: `Første ledd i «${compound.lemma}» er «${compound.initial}». Ordet må begynne med hele ordet ${needLabel}, ikke bare de samme bokstavene.`
                };
            }
            const lemmaWord = compound.lemma;
            if (used.has(lemmaWord)) {
                return { ok: false, error: `«${lemmaWord}» er allerede brukt i slangen.`, detail: "Samme ord i en annen form teller som samme ord." };
            }
            const finalBase = await finalLexeme(compound);
            const cut = lemmaWord.length - compound.final.length;
            let tail = compound.final;
            if (cut > 0 && word.slice(0, cut) === lemmaWord.slice(0, cut) && word.length > cut) {
                tail = word.slice(cut);
            }
            const head = word.slice(0, word.length - tail.length);
            if (finalBase !== compound.final) tail = finalBase;
            return {
                ok: true,
                word,
                lemma: lemmaWord,
                parts: [head, word.slice(head.length)],
                next: compoundNext(tail, finalBase),
                inDictionary: true,
                definition: compound.definition
            };
        }

        if (entry.found) {
            const simple = lemmas[0];
            return {
                ok: false,
                error: `«${word}» står i ordboka, men det er ikke et sammensatt ord.`,
                detail: simple && simple.lemma !== word ? `Ordboka har det som «${simple.lemma}».` : "Prøv et ord med «" + prefix + "» som første ledd."
            };
        }

        // Står ikke ordet i ordboka, må det være satt sammen av ekte ord – og da med grunnformen
        // av førsteleddet. «beina» + «brudd» blir ikke et ord (det heter beinbrudd).
        const starts = needForms.filter((form) => word.startsWith(form)).sort((a, b) => b.length - a.length);
        let split = null;
        let inflectedStart = null;
        try {
            for (const form of starts) {
                if (!(await isBaseForm(form))) {
                    inflectedStart = inflectedStart || form;
                    continue;
                }
                split = await splitRest(form, word.slice(form.length));
                if (split) break;
            }
        } catch (error) {
            if (error instanceof OfflineError) return offlineCompound(word, prefix, rest);
            throw error;
        }
        if (!split) {
            const base = needForms.find((form) => form !== inflectedStart);
            return {
                ok: false,
                error: `Fant ikke «${word}» i ordboka.`,
                detail: inflectedStart && base
                    ? `«${inflectedStart}» er en bøyd form. Bruk den bare hvis ordet finnes i ordboka – ellers grunnformen «${base}».`
                    : "Det ser heller ikke ut til å være satt sammen av ord som står i ordboka. Sjekk skrivemåten."
            };
        }
        const finalBase = baseOf(split.lemma, split.tail);
        return {
            ok: true,
            word,
            lemma: word,
            parts: split.parts,
            next: compoundNext(split.tail, finalBase),
            inDictionary: false,
            note: `«${word}» står ikke i ordboka, men det er satt sammen av ekte ord.`
        };
    }

    /* ------------------------------------------------------------------ */
    /* Variant 2: stavelser                                                */
    /* ------------------------------------------------------------------ */

    function syllableNext(word, strict) {
        const options = lastSyllableOptions(word, strict);
        return { forms: options, label: options.map((form) => `${form}-`).join(" / ") };
    }

    function syllableMatches(word, needForms, strict) {
        if (strict) return syllabify(word)[0] === needForms[0];
        return needForms.some((form) => word.startsWith(form));
    }

    async function checkSyllableWord(rawWord, needForms, used, strict) {
        const basic = basicCheck(rawWord);
        if (!basic.ok) return basic;
        const word = basic.word;
        const syllables = syllabify(word);

        if (!syllableMatches(word, needForms, strict)) {
            if (strict) {
                return {
                    ok: false,
                    error: `Første stavelse må være «${needForms[0]}».`,
                    detail: `«${word}» deles ${syllables.join("-")}. Med streng regel må første stavelse være helt lik.`
                };
            }
            return { ok: false, error: `Ordet må begynne med ${needForms.map((form) => `«${form}»`).join(" eller ")}.` };
        }
        if (used.has(word)) {
            return { ok: false, error: `«${word}» er allerede brukt i slangen.` };
        }
        if (syllables.length < 2) {
            return { ok: false, error: `«${word}» har bare én stavelse.`, detail: "Ordet må ha minst to stavelser." };
        }

        let entry;
        try {
            entry = await lookup(word);
        } catch (error) {
            if (error instanceof OfflineError) {
                return {
                    ok: true,
                    unchecked: true,
                    word,
                    lemma: word,
                    parts: syllables,
                    next: syllableNext(word, strict),
                    warnings: softWarnings(word)
                };
            }
            throw error;
        }

        if (!entry.found) {
            return { ok: false, error: `Fant ikke «${word}» i ordboka.`, detail: "Sjekk skrivemåten. Egennavn er ikke lov." };
        }
        const simple = rankLemmas(entry.lemmas, word).find((lemma) => !isCompoundLemma(lemma));
        if (!simple) {
            const compound = entry.lemmas[0];
            return {
                ok: false,
                error: `«${word}» er et sammensatt ord (${compound.initial} + ${compound.final}).`,
                detail: "I denne varianten skal ordene ikke være sammensatt."
            };
        }
        if (used.has(simple.lemma)) {
            return { ok: false, error: `«${simple.lemma}» er allerede brukt i slangen.`, detail: "Samme ord i en annen form teller som samme ord." };
        }
        return {
            ok: true,
            word,
            lemma: simple.lemma,
            parts: syllables,
            next: syllableNext(word, strict),
            inDictionary: true,
            definition: simple.definition
        };
    }

    /* ------------------------------------------------------------------ */
    /* Slangens egne ord og hint                                           */
    /* ------------------------------------------------------------------ */

    // Ord slangen aldri skal foreslå (banning, grove ord o.l.). Elever kan fortsatt skrive det de vil.
    const BLOCKED_PARTS = ["pikk", "fitte", "faen", "jævl", "knull", "porno", "penis", "neger", "dritt", "helvet", "satan", "fanden"];
    const BLOCKED_STARTS = ["hore", "kuk", "pule", "sex", "drit", "ræv", "tiss", "bæsj", "promp", "rasshøl", "nazi", "pervers"];

    function isBlocked(word) {
        return BLOCKED_PARTS.some((part) => word.includes(part))
            || BLOCKED_STARTS.some((start) => word.startsWith(start));
    }

    // Hvor vanlig et ord er (lavere tall = vanligere), fra lista over vanlige ord.
    let commonRank = null;

    function setCommonWords(list) {
        const words = Array.isArray(list) ? list : String(list || "").split(" ");
        commonRank = new Map();
        words.forEach((word, index) => {
            if (word && !commonRank.has(word)) commonRank.set(word, index);
        });
    }

    function rankOf(word) {
        if (!commonRank && root.ORDSLANGEN_VANLIGE_ORD) setCommonWords(root.ORDSLANGEN_VANLIGE_ORD);
        if (!commonRank) return Infinity;
        return commonRank.has(word) ? commonRank.get(word) : Infinity;
    }

    // Sammensatte ord er sjelden med i lista. Da teller det at siste del er et vanlig ord (bus|stur → tur).
    function commonScore(word, variant, needForms) {
        const own = rankOf(word);
        if (variant === "syllable" || own !== Infinity) return own;
        const prefix = matchPrefix(word, needForms);
        if (!prefix) return Infinity;
        const rest = word.slice(prefix.length);
        const restScores = junctionVariants(rest).map(rankOf);
        return Math.min(...restScores) + 3000;
    }

    // Finner et ord som passer. options.easy: foretrekk korte, vanlige ord.
    async function findWord({ variant, needForms, used, strict = false, easy = false, maxChecks = 12, requireFertile = true }) {
        const prefixes = variant === "syllable"
            ? (strict ? [needForms[0]] : needForms)
            : [...needForms].sort((a, b) => a.length - b.length);
        const lists = await Promise.all(prefixes.map((prefix) => suggest(prefix)));
        let candidates = unique(lists.flat()).filter((candidate) => !used.has(candidate) && !isBlocked(candidate));

        if (variant === "syllable") {
            candidates = candidates.filter((candidate) => (
                syllabify(candidate).length >= 2 && syllableMatches(candidate, needForms, strict)
            ));
        } else {
            candidates = candidates.filter((candidate) => {
                const prefix = matchPrefix(candidate, needForms);
                return prefix && candidate.length >= prefix.length + 2 && hasVowel(candidate.slice(prefix.length));
            });
        }

        // Vanlige ord først. På lett nivå velger slangen blant de aller vanligste.
        const scored = candidates.map((candidate) => ({
            candidate,
            score: commonScore(candidate, variant, needForms)
        }));
        const common = scored.filter((item) => item.score !== Infinity).sort((a, b) => a.score - b.score);
        const rare = scored.filter((item) => item.score === Infinity).sort((a, b) => a.candidate.length - b.candidate.length);
        const pool = easy ? 6 : 16;
        candidates = [
            ...shuffle(common.slice(0, pool)),
            ...common.slice(pool),
            ...rare
        ].map((item) => item.candidate);

        let fallback = null;
        for (const candidate of candidates.slice(0, maxChecks)) {
            const result = variant === "syllable"
                ? await checkSyllableWord(candidate, needForms, used, strict)
                : await checkCompoundWord(candidate, needForms, used);
            if (!result.ok || result.unchecked || !result.inDictionary) continue;
            if (!requireFertile) return result;
            // Velg helst et ord det går an å fortsette fra.
            if (await isFertile(variant, result.next.forms, strict)) return result;
            if (!fallback) fallback = result;
        }
        return fallback;
    }

    async function isFertile(variant, forms, strict) {
        try {
            const lists = await Promise.all((strict ? [forms[0]] : forms).map((form) => suggest(form)));
            const options = unique(lists.flat()).filter((candidate) => {
                if (variant === "syllable") return syllabify(candidate).length >= 2 && syllableMatches(candidate, forms, strict);
                const prefix = matchPrefix(candidate, forms);
                return prefix && candidate.length >= prefix.length + 2;
            });
            return options.length >= 4;
        } catch (error) {
            return true;
        }
    }

    const api = {
        OfflineError,
        syllabify,
        lastSyllableOptions,
        basicCheck,
        softWarnings,
        guessBaseForms,
        lookup,
        suggest,
        checkCompoundWord,
        checkSyllableWord,
        compoundNext,
        syllableNext,
        findWord,
        setFetch,
        setCommonWords,
        isBlocked
    };

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    } else {
        root.Ordslangen = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
