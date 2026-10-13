---
prosjekt: Setningsverksted
url: https://theodorjs.github.io/setning/
status: live
oppdatert: 2026-10-13
sidetype: [spill]
funksjon: [lære]
målgruppe: [elever]
enhet: [nettbrett, touch]
informasjonstetthet: lav
fargemodus: [mork]
stemning: [leken, spenstig]
teknologi: [vanilla-js, statisk-html]
fokus: [fargesystem, interaksjon, motivasjon]
---

# Setningsverksted

Merking: [observert] er sett i koden. [tolket] er min vurdering. [oppgitt] er svar fra Theodor.

## 1. Kort beskrivelse

Grammatikkspill med 8 aktiviteter: setningsanalyse, finn ordet, sorter ordene, bøy ordene, velg riktig, bygg ordet, memory og lær om ordklassene. [observert]

Laget for elever på 5. til 7. trinn, og passer også for 8. til 10. trinn. Elevene bruker det på iPad som en aktivitet i klasserommet. [oppgitt]

Eleven velger spill, velger nivå (Lett, Middels, Vanskelig) og løser én oppgave om gangen. Poeng og streak holder eleven i gang. [observert]

## 2. Kjerneprinsipper

Rangert etter betydning.

**1. Trykk, ikke dra**
**Regel:** Alle oppgaver løses med trykk på knapper, aldri med dra-og-slipp.
**Hvorfor:** Dra-og-slipp på iPad ga rundt 30 commits med feilretting og flere tilbakerullinger i 2025. Det fungerer fortsatt ikke godt nok i «Sorter ordene». [oppgitt]
**Eksempel:** Setningsanalysen: velg en farget kloss, trykk på ordet (`renderAnalysis`). Bygg ordet: trykk bokstavene i rekkefølge.
**Omfang:** sidetype (alt for nettbrett og touch)

**2. Én farge per grammatisk kategori, overalt**
**Regel:** Hver ordklasse og hvert setningsledd har én fast farge som brukes likt i alle aktiviteter.
**Hvorfor:** Fargen blir en hukommelsesknagg. Systemet er utviklet over flere prosjekter. [oppgitt] Rød subjekt, grønn verbal, blå direkte objekt, lilla indirekte objekt og oransje adverbial fantes allerede i 2025-versjonen. [observert]
**Eksempel:** `WORD_CLASSES` og `FUNCTION_ROLES` i `index.html`, `--class-color` og `--role-color` i `styles.css`.
**Omfang:** universell (for faglig fargekoding)

**3. Én oppgave per skjerm, tilbakemelding med en gang**
**Regel:** Skjermen viser én oppgave, og hvert trykk gir svar innen 0,25 sekunder.
**Hvorfor:** Elever i 10 til 16-årsalderen skal kunne jobbe selvstendig uten å spørre læreren hva de skal gjøre. [tolket]
**Eksempel:** Feilsvar viser riktig svar i tekst: «boka passer bedre som Direkte objekt». [observert]
**Omfang:** sidetype (spill, læring)

**4. Belønn, ikke straff**
**Regel:** Riktig svar gir poeng og streak. Feil gir 0 poeng på oppgaven og nullstiller streaken, men gir aldri minuspoeng.
**Hvorfor:** Elevene motiveres av streak og poeng. Minuspoeng kan være demotiverende for en del elever. [oppgitt]
**Eksempel:** `award()` og `miss()`. Poeng per nivå er 1, 2 og 3. Feilfri setningsanalyse gir dobbel bonus. [observert]
**Omfang:** sidetype (spill)

**5. Håndskrevne setninger, maskinkontrollert**
**Regel:** Alle setninger skrives og merkes for hånd i en setningsbank. Koden kontrollerer bare at merkingen er konsekvent.
**Hvorfor:** Den automatiske generatoren i 2025 laget meningsløse setninger. Se seksjon 12. [observert]
**Eksempel:** `SENTENCE_BANK`, `mergeDuplicateSentences()`.
**Omfang:** sidetype (læringsinnhold)

**6. Leken scene, rolige arbeidsflater**
**Regel:** Det lekne ligger i rammen (stjernehimmel, tykke knapper, tittelfont), mens oppgavene ligger på lyse, rolige paneler.
**Hvorfor:** Uttrykket skal engasjere elevene [oppgitt], men selve oppgaven må være lett å lese. [tolket]
**Eksempel:** `.starfield` og `.play-title` mot `.work-panel`.
**Omfang:** sidetype (spill for barn og unge)

**7. Store trykkflater**
**Regel:** Alle knapper er minst 46px høye, og minst 54px på berøringsskjerm.
**Hvorfor:** Barnefingre på iPad. [tolket]
**Eksempel:** `@media (pointer: coarse)` i `styles.css`.
**Omfang:** universell

## 3. Farger

**Regel:** Kategorifarger viser grammatikk, statusfarger viser riktig og feil, og scenefargene er bare ramme.
**Hvorfor:** Hvis samme farge betyr to ting, lærer eleven feil kobling. [tolket]
**Eksempel:** Tabellene nedenfor. [observert]
**Omfang:** universell

| Rolle | Verdi | Bruk |
|---|---|---|
| Scene | #012b33 til #001d25, turkis glød | Bakgrunn med stjerner i tre lag |
| Topplinje | #18c9b0 | Ramme rundt poeng og navigasjon |
| Gul aksent | #ffd83d | Hjem-knapp, bokstavbrikker, uthevet ord i quiz |
| Oransje aksent | #f7941d | Skiltet «Velg et grammatikkspill» |
| Panel | #cce8f6 til #bbe5e1 | Arbeidsflater |
| Tekst | #172033 (16,3:1 på hvit) | Brødtekst |
| Dempet | #64748b (4,8:1 på hvit, 3,7:1 på panel) | Forklaringer |
| Primærknapp | #111827 med hvit tekst | «Sjekk», «Neste» |
| Riktig | #15803d, flate #dcfce7, tekst #14532d (8,3:1) | Status |
| Feil | #dc2626, flate #fee2e2, tekst #7f1d1d (8,2:1) | Status |
| Info | flate #eff6ff, tekst #1e3a8a (9,5:1) | Hint og nøytral melding |

| Ordklasse | Farge | Setningsledd | Farge |
|---|---|---|---|
| Substantiv | #2563eb blå | Subjekt | #ef4444 rød |
| Verb | #16a34a grønn | Verbal | #16a34a grønn |
| Adjektiv | #d97706 oransje | Direkte objekt | #2563eb blå |
| Pronomen | #7c3aed lilla | Indirekte objekt | #7c3aed lilla |
| Adverb | #0891b2 cyan | Adverbial | #d97706 oransje |
| Preposisjon | #e11d48 rosenrød | Predikativ | #0891b2 cyan |
| Determinativ | #4f46e5 indigo | | |
| Konjunksjon | #64748b grå | | |
| Subjunksjon | #db2777 rosa | | |
| Interjeksjon | #65a30d lime | | |

**Regel:** Kategorifargen brukes i tre styrker: 13 til 17 % tone på hvit for flater, full farge for kant og aktiv tilstand, og full farge med hvit tekst når svaret er avslørt.
**Hvorfor:** Gir ett fast mønster for «hint», «valgt» og «løst». [tolket]
**Eksempel:** `color-mix(in srgb, var(--class-color) 13%, #fff)` i `.token-button`. [observert]
**Omfang:** universell

## 4. Typografi

**Regel:** Systemfonten brukes til alt innhold. Tittelfonten brukes bare til sidetittelen og spillkortene.
**Hvorfor:** Systemfonten er lesbar og laster raskt. Tittelfonten gir spillfølelse. [tolket]
**Eksempel:** `--display-font: "Cooper Black", "Marker Felt", "Comic Sans MS"`. iPad har ikke Cooper Black, så elevene ser Marker Felt. [tolket]
**Omfang:** sidetype

**Regel:** Tunge vekter på alt som kan trykkes (800 til 950). Brødtekst har vekt 400 og linjehøyde 1,35 til 1,55.
**Hvorfor:** Knapper og ordklosser skal se ut som fysiske brikker. [tolket]
**Eksempel:** Sidetittel 5,8rem (4,7rem under 1060px, 3,25rem under 680px). h2 1,5rem. Ordklosser 1,1rem med vekt 850. Ordet som skal bøyes er 2,35rem med vekt 900. Bokstavavstand er alltid 0. [observert]
**Omfang:** prosjektspesifikk

## 5. Layout og rom

**Regel:** Innholdet er maks 1240px bredt. Oppgaveskjermen har et sidepanel på 260px og en fleksibel arbeidsflate.
**Hvorfor:** Sidepanelet holder målet for oppgaven synlig mens eleven jobber. [tolket]
**Eksempel:** `.module-layout`. Sidepanelet er sticky 16px fra toppen og legges over arbeidsflaten under 900px. [observert]
**Omfang:** sidetype

**Regel:** Avstander hentes fra 8, 10, 12, 14, 16 og 18px. Alle hjørner har 8px radius.
**Hvorfor:** Få verdier gir et rolig helhetsinntrykk. [tolket]
**Eksempel:** `--radius: 8px`. Ytre marg 18px (12px under 900px). [observert]
**Omfang:** universell

**Regel:** Klikkbare elementer har en hard skygge rett ned (`0 6px 0 rgba(0,0,0,.18)`), som en fysisk knapp.
**Hvorfor:** Viser tydelig hva som kan trykkes, og passer spilluttrykket. [tolket]
**Eksempel:** `.home-card`, `.letter-tile`, `.analysis-role-button`. [observert]
**Omfang:** sidetype

Brytpunkter [observert]: 1060px (startsiden går fra 4 til 3 kolonner), 900px (sidepanelet legges over arbeidsflaten), 680px (alt i 1 kolonne), 620px stående (topplinjen flyttes 48px ned for å gi plass til en flytende knapp).

## 6. Organisering av informasjon

**Regel:** Flat struktur med tre nivåer: start, nivåvalg, oppgave. Hjem-knappen og nivåknappen står alltid øverst til venstre.
**Hvorfor:** Eleven skal aldri gå seg vill eller trenge tilbakeknappen. [tolket]
**Eksempel:** `renderTopbar()`. [observert]
**Omfang:** sidetype

**Regel:** Hjelp ligger skjult bak en rund «?»-knapp ved siden av det den forklarer.
**Hvorfor:** Den som kan stoffet slipper tekst, og den som står fast finner hjelpen der den trengs. [tolket]
**Eksempel:** «?» under hver setningsleddkloss. Bøyingshjelp med bøyingsrekke i «Bøy ordene». [observert]
**Omfang:** universell

**Regel:** Teori leder rett til øving.
**Hvorfor:** Kort vei fra å lese om noe til å prøve det. [tolket]
**Eksempel:** «Lær om ordklassene» avsluttes med knappen «Bøy substantiv» eller «Finn preposisjon». [observert]
**Omfang:** sidetype (læring)

## 7. Mengde informasjon

**Regel:** Antall valg øker med nivået, ikke med skjermplassen.
**Hvorfor:** På Lett skal eleven bare se det som trengs for å lykkes. [tolket]
**Eksempel:** Setningsanalysen viser bare leddene som finnes på Lett, 2 ekstra lureklosser på Middels og alle 6 på Vanskelig. Memory har 4, 6 eller 8 par. Bygg ordet har ord på opptil 4, 5 til 6 eller minst 7 bokstaver. [observert]
**Omfang:** sidetype

Bevisst utelatt [observert]: innlogging, innstillinger, lærervisning, tidsfrist, lyd og tekst på startsiden utover tittel og kort.

## 8. Interaksjon

**Regel:** Tilbakemeldingsboksen er alltid til stede og bytter bare farge og tekst.
**Hvorfor:** Innholdet hopper ikke når meldingen kommer. [tolket]
**Eksempel:** `.feedback` er minst 54px høy, forsvinner etter 1,8 sekunder, og hint står i 5,2 sekunder. [observert]
**Omfang:** universell

**Regel:** Feil vises med rød farge og risting i 240ms, og nullstilles etter 0,65 til 0,95 sekunder. Riktig svar gir konfetti og ny oppgave automatisk etter 1,3 til 1,8 sekunder.
**Hvorfor:** Raskt tempo uten ekstra trykk. Fyrverkeri på hver 10. oppgave gir et ekstra mål. [tolket]
**Eksempel:** `completeTaskCelebration()`. Konfettien tegnes på canvas. [observert]
**Omfang:** sidetype (spill)

**Regel:** «Ny oppgave» er sperret i 2 sekunder hvis oppgaven ikke er løst.
**Hvorfor:** Hindrer at elever hopper over oppgaver til de får en lett en. [tolket]
**Eksempel:** `nextCooldownUntil`, meldingen «Vent litt». [observert]
**Omfang:** sidetype (spill)

**Regel:** Bruk ekte `<button>`, `touch-action: manipulation` og synlig fokusring (3px #111827, 2px avstand).
**Hvorfor:** Fjerner forsinkelse ved dobbelttrykk på iPad og gir tastaturstøtte uten ekstra kode. [tolket]
**Eksempel:** Alle knappeklasser i `styles.css`. [observert]
**Omfang:** universell

Tilstander [observert]: Siden har ingen lastetilstand, fordi alt innhold ligger i filen. Tom tilstand er en info-melding. Lagring i localStorage er pakket i try/catch, så spillet virker også i privat modus. `prefers-reduced-motion` slår av CSS-animasjoner.

## 9. Symbolbruk

**Regel:** Ingen ikonbibliotek. Tekst på alle handlingsknapper, ikon bare for hjem.
**Hvorfor:** Elevene skal lese hva knappen gjør. Ett ikon de kjenner fra før er nok. [tolket]
**Eksempel:** Hus-ikon som inline SVG, strek 2,7 med runde ender og `aria-label="Til startsiden"`. [observert]
**Omfang:** universell

Faste symboler [observert]: «?» betyr hjelp (rund knapp) og skjult kort (memory). En fargeprøve på 18px betyr ordklasse. Illustrasjonene på spillkortene er bygget av CSS-former (klossene S, V og O, lupe, bok, stjerne), ikke bilder.

## 10. Nødvendige hensyn

**Regel:** Test alt på iPad i Safari før det regnes som ferdig.
**Hvorfor:** iPad er hovedenheten [oppgitt], og pekerhendelser oppfører seg annerledes enn på PC.
**Eksempel:** Commit «Forsøk på fiks etter elevtest i klasserommet». [observert]
**Omfang:** sidetype

**Regel:** Bokmål og skolens grammatikkbegreper (subjekt, verbal, adverbial, predikativ). Korte instruksjoner på én setning.
**Hvorfor:** Elevene har ulikt lesenivå. [tolket]
**Eksempel:** «Velg en farget kloss, og trykk på ordet den passer til.» [observert]
**Omfang:** universell (for norske læringssider)

**Regel:** Ingen pålogging og ingen nettverkskall etter at siden er lastet.
**Hvorfor:** Klasserommet skal kunne starte på sekunder. Fremdriften lagres per iPad, så delte iPader deler poeng. [tolket]
**Eksempel:** `STORAGE_KEY = "setningsverksted-progress-v1"`. [observert]
**Omfang:** sidetype

## 11. Preferanser

Dette er smak, ikke krav:

- Spillportaluttrykket med mørk stjernehimmel, tykke knapper og tittel i Cooper Black. Det er valgt bevisst for engasjement, men er smak. [oppgitt]
- Theodor vil alltid kunne bytte mellom lys og mørk modus. Det er ikke laget her ennå. [oppgitt]
- Konfetti og fyrverkeri som belønning. [observert]
- Uformell tone i spilltekstene: «På tide med litt big brain energi», «Klarer du å fikse dem?». [observert]

## 12. Forkastet og lærdom

**Regel:** Bytt dra-og-slipp med «velg, så trykk på målet».
**Hvorfor:** 2025-versjonen brukte dra-og-slipp i setningsanalysen og en «Omorganiser»-modus. Det ble iPad-feil, logging og tilbakerulling i flere uker. [observert] «Sorter ordene» bruker fortsatt dra-og-slipp med pekerhendelser og fungerer ikke godt nok. [oppgitt]
**Eksempel:** Bygg ordet viser løsningen: trykk på en brikke for å plassere den, trykk i svaret for å ta den tilbake.
**Omfang:** universell (for touch)

**Regel:** Ikke generer læringsinnhold med kombinatorikk.
**Hvorfor:** Utviklingen av setningssystemet [observert]:
1. *2025, generator:* lister med subjekter, verb, objekter og adverbialer ble satt sammen tilfeldig. Kompatibilitetsregler per verb og konfliktpar som «raskt/sakte» ble lagt til i commits som «Grammatiske regler herfra til evigheten». Likevel kom setninger som «Bussen leste tv stille».
2. *2026, setningsbank:* hver setning er skrevet for hånd med ordklasse per ord og setningsledd per ledd. Setningene merkes med hvilke aktiviteter og hvilket nivå de passer til.
3. *Kontroll:* duplikater slås sammen, og koden stopper med feil hvis samme setning er merket med ulik ordklasse to steder.
4. *Gjenbruk:* ordene til «Bygg ordet» hentes fra setningsbanken og sorteres etter lengde. Memory-parene hentes fra bøyingsoppgavene.
5. *Variasjon:* en «pose» stokkes og tømmes før den fylles på nytt, så ingen setning kommer igjen før alle er brukt, og aldri to ganger på rad (`pickFrom()`).
**Eksempel:** `SENTENCE_BANK`, `mergeDuplicateSentences()`, `buildWordPool()`.
**Omfang:** sidetype (læring)

Annet forkastet [observert]: Futura på lys grå bakgrunn. Bryter for mørk modus med engelsk tekst. Konfetti laget av bokstavene i setningen, med 25 DOM-elementer per bokstav. Den er erstattet av partikler på canvas.

Ikke testet [oppgitt]: lyd, tidsbegrensning, emoji-konfetti.

Fallgruver [tolket]:
- Hvit tekst på verb, adjektiv, adverbial og interjeksjon gir bare 3,1 til 3,3:1. Det holder bare for stor, fet tekst.
- Hvit tekst på den oransje kickeren og den turkise topplinjen gir 2,1 til 2,3:1.
- Grønn betyr både verb og «riktig» (#16a34a mot #15803d).
- Et besvart ord i setningsanalysen viser leddet bare med farge, uten tekst. Det er vanskelig for fargeblinde.
- Konfettien på canvas tar ikke hensyn til `prefers-reduced-motion`.
- Siden har ingen adresse per skjerm, så tilbakeknappen i nettleseren går ut av spillet.

## 13. Overførbarhet

| Prinsipp | Omfang |
|---|---|
| Trykk, ikke dra, på touch | Universell |
| Fast farge per faglig kategori | Universell |
| Tre styrker av samme kategorifarge | Universell |
| Trykkflater på minst 46px, 54px på touch | Universell |
| Tilbakemeldingsboks som ikke flytter innholdet | Universell |
| Tekst på knapper, ikon bare for hjem | Universell |
| Hjelp bak «?» ved siden av det den forklarer | Universell |
| Én oppgave per skjerm, svar med en gang | Gjelder sidetype spill |
| Belønning uten minuspoeng | Gjelder sidetype spill |
| Sperre på «Ny oppgave» | Gjelder sidetype spill |
| Antall valg øker med nivået | Gjelder sidetype spill |
| Håndskrevet innhold med maskinkontroll | Gjelder sidetype spill og oppslagsverk |
| Leken ramme, rolig arbeidsflate | Gjelder sidetype spill |
| Stjernehimmel, Cooper Black, turkis og gul | Kun dette prosjektet |
| De konkrete fargene for ordklasser og setningsledd | Kun dette prosjektet (gjenbruk ved grammatikk) |

## 14. Sjekkliste for nytt prosjekt

1. Lag lys og mørk modus fra start, med bryter.
2. Bruk trykk, ikke dra. Test på iPad i Safari før lansering.
3. Gi hver faglig kategori én farge, og bruk den likt overalt.
4. Sjekk kontrast: 4,5:1 for vanlig tekst, også hvit tekst på kategorifarger.
5. Ikke la farge alene bære betydning. Legg til tekst eller symbol.
6. Hold statusfarger (riktig og feil) adskilt fra kategorifarger.
7. Gjør trykkflater minst 46px høye, og 54px med `pointer: coarse`.
8. Reserver plass til tilbakemelding, så innholdet ikke hopper.
9. Skriv læringsinnhold for hånd, og la koden sjekke at det er konsekvent.
10. Belønn riktig svar, men gi aldri minuspoeng.
11. Respekter `prefers-reduced-motion`, også i JavaScript-animasjoner.
12. Gi hver skjerm en egen adresse hvis tilbakeknappen skal virke.
