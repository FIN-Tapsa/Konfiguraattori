# Tuoterakennekonfiguraattori

Selainpohjainen työkalu hierarkkisten tuoterakenteiden (BOM/PDM-tyyppinen
nimikepuu) mallintamiseen ja niiden pohjalta toimivan myyntikonfiguraattorin
simulointiin. Kohdekäyttö on raskaan kaluston/ajoneuvojen myyntikonfiguraattorin
mallintaminen ja prototyyppaus.

Kaikki esimerkkidata (mm. "Kuvitteellinen kuorma-auto") on täysin kuvitteellista.

> **Tila:** tämä on ensimmäinen kahdesta rakennusvaiheesta. Datamalli, logiikka
> ja käyttöliittymä toimivat, mutta ulkoasu on tarkoituksella keskeneräinen
> (oletus-Tailwind, ei viimeisteltyä designia). Visuaalinen hionta tehdään
> seuraavassa vaiheessa.

## Sisällys

- [Tekninen alusta](#tekninen-alusta)
- [Datamalli](#datamalli)
- [Käyttötilat](#käyttötilat)
- [Excel-tuonti/-vienti](#excel-tuontivienti)
- [Firebase-projektin pystytys](#firebase-projektin-pystytys)
- [Kehitys](#kehitys)
- [Build ja julkaisu GitHub Pagesiin](#build-ja-julkaisu-github-pagesiin)
- [Kansiorakenne](#kansiorakenne)
- [Tunnetut rajoitukset ja laajennuskohdat](#tunnetut-rajoitukset-ja-laajennuskohdat)

## Tekninen alusta

- **React + TypeScript**, build-työkaluna **Vite**
- **Tailwind CSS v4** (oletustyylit, ei erillistä designsysteemiä vielä)
- **Firebase Firestore** tuoterakenteiden tallennukseen (yksi dokumentti per
  rakenne, kokoelmassa `structures`)
- **Firebase Storage** nimikkeiden kuville/ikoneille
- **xlsx (SheetJS)** Excel-tuontiin/-vientiin
- **@dnd-kit** nimikepuun raahaukseen (reparenting/järjestäminen)
- Ei kirjautumista v1:ssä (henkilökohtainen työkalu) - pääsy rajataan
  Firestore/Storage-security ruleilla. Katso
  [laajennuskohta Firebase Authille](#tunnetut-rajoitukset-ja-laajennuskohdat).
- UI-tekstit suomeksi, koodi/kommentit/muuttujanimet englanniksi

## Datamalli

Ydintyypit löytyvät tiedostosta [`src/types/index.ts`](src/types/index.ts).

### Nimike (`Item`)

Puun jokainen haara on yksi nimike: `id`, `name`, `code` (valinnainen),
`description`, `type` (`"single"` tai `"assembly"`), `price`, `pricingMode`
(vain `assembly`: `"sumOfChildren"` tai `"fixed"`), `color`, `imageUrl`,
`attributes` (avain-arvo-lista), `overridesParentAttributes` (mitkä
attribuuttinimet tämä nimike nimenomaisesti ylikirjoittaa), `children`
(vain `assembly`).

Lisäksi mallissa on kenttä `required?: boolean`, joka määrittää onko
nimike pakollinen silloin kun se **ei kuulu mihinkään valintaryhmään**
(ks. alla) - tämä toteuttaa spec-vaatimuksen "nimike joka ei kuulu
ryhmään käyttäytyy yksittäisenä valinnaisena/pakollisena lapsena".

### Valintaryhmä (`SelectionGroup`)

Yhden nimikkeen lapset voidaan jakaa valintaryhmiin (`parentItemId`,
`memberItemIds`, `min`, `max`). Katso `src/domain/groups.ts` - lapset jotka
eivät kuulu mihinkään eksplisiittiseen ryhmään saavat automaattisesti
"implisiittisen" yhden jäsenen ryhmän (`min`/`max` = `0`/`1` tai `1`/`1`
riippuen `required`-kentästä), joten simulointi- ja validointilogiikka voi
käsitellä kaikkia lapsia yhtenäisesti.

### Sääntö (`ConditionalRule`)

Puun rajat ylittävät riippuvuudet (`requires`/`excludes`), viittaavat
nimikkeisiin `id`:n kautta. Toteutus: `src/domain/simulation.ts`.

### Simulointimoottori

`src/domain/simulation.ts` sisältää koko simulointilogiikan puhtaina
funktioina (`ProductStructure` + `Set<string>` valittuja id:tä sisään,
uusi `Set` ulos):

- `toggleSelection` - valitsee/poistaa yhden nimikkeen, kunnioittaen ryhmän
  min/max-rajoja ja sääntöjä
- sääntöjen resoluutio kiintopisteiteraationa: `requires` pakottaa kohteen
  valituksi (ja sen koko esi-isäketjun, jotta se näkyy oikeassa kohdassa
  puuta) ja lukitsee sen; `excludes` disabloi kohteen ja poistaa sen
  valinnasta jos se oli valittuna
- `computeTotalPrice` / `computeItemPrice` - kokonaishinta, huomioiden
  `pricingMode`
- `computeEffectiveAttributes` - kävelee valittua polkua juuresta lähtien,
  syvimmän tason `overridesParentAttributes`-ylikirjoitus voittaa

## Käyttötilat

### Rakennustila (editor)

- **Nimikepuu (outliner)**: lisää/poista/valitse nimikkeitä, raahaa nimike
  toisen alle (reparenting) tai sisarusten järjestykseen. Pudota nimikkeen
  **päälle** siirtääksesi sen sen lapseksi; pudota nimikkeen **alle** (ohut
  raita) siirtääksesi sen sen jälkeiseksi sisarukseksi.
- **Nimike-välilehti**: perustiedot, hinnoittelu, väri, kuvan lataus
  (Firebase Storage), dynaaminen attribuuttilista
- **Ryhmät-välilehti** (kokoonpanoille): jaa lapset valintaryhmiin,
  aseta min/max, merkitse ryhmittelemättömät lapset pakollisiksi/vapaiksi
- **Säännöt-välilehti**: koko rakenteen `requires`/`excludes`-säännöt,
  hakupohjainen nimikevalitsin (koska sääntö voi viitata mihin tahansa
  puun nimikkeeseen)
- **Validointipaneeli**: näkyvissä koko ajan oikealla, listaa virheet ja
  huomiot (esim. tyhjä ryhmä, poistettuun nimikkeeseen viittaava sääntö)
- Excel-tuonti/-vienti-painikkeet ylätunnisteessa

### Simulointitila (esikatselu)

Käynnistyy juuresta. Jokainen aktiivinen kokoonpano näyttää valintaryhmänsä
kontrolleina (radio pakolliselle tasan-yhden-valinnalle, muuten checkbox).
Säännöt vaikuttavat reaaliaikaisesti: pakotetut valinnat lukittu (🔒),
poissuljetut disabloitu + syy näkyvissä. Yhteenvetopaneeli näyttää valitun
rakenteen, kokonaishinnan ja efektiiviset attribuutit. "Nollaa simulaatio"
palauttaa alkutilaan. Simulointi ei koskaan muokkaa tallennettua rakennetta.

## Excel-tuonti/-vienti

Yksi `.xlsx`-tiedosto, kaksi välilehteä: **Nimikkeet** ja **Säännöt**
(`src/domain/excel.ts`).

**Nimikkeet**-sarakkeet (spec-vaaditut + muutama laajennus datan
säilyttämiseksi vienti/tuonti-kierroksella):

| Sarake | Kuvaus |
|---|---|
| `id` | Uniikki tunniste |
| `parent_id` | Tyhjä juurinimikkeelle |
| `name` | Nimi |
| `code` | Nimikekoodi (laajennus) |
| `description` | Kuvaus |
| `type` | `single` tai `assembly` |
| `price` | Hinta |
| `pricing_mode` | `sumOfChildren` tai `fixed` (vain assembly) |
| `color` | Väri |
| `image_url` | Kuvan URL |
| `attributes` | `avain1=arvo1\|avain2=arvo2` (laajennus) |
| `overrides_parent_attributes` | `avain1,avain2` (laajennus) |
| `required` | `TRUE`/`FALSE`, koskee vain ryhmittelemättömiä lapsia (laajennus) |
| `group_id`, `group_name`, `group_min`, `group_max` | Valintaryhmä |

**Säännöt**-sarakkeet: `rule_id`, `type` (`requires`/`excludes`),
`source_item_id`, `target_item_id`, `note`.

Tuonti validoi rivi riviltä: ei syklejä, kaikki `parent_id`- ja
sääntöviittaukset osoittavat olemassa oleviin id:ihin, jokainen `group_id`
esiintyy vain saman `parent_id`:n alla, tasan yksi juurinimike. Virheet
näytetään listana eikä rikkinäistä/osittaista puuta koskaan tuoda.

## Firebase-projektin pystytys

1. Luo uusi projekti [Firebase-konsolissa](https://console.firebase.google.com/).
2. Ota käyttöön **Firestore Database** (natiivimoodi, valitse sijainti).
3. Ota käyttöön **Storage**.
4. Lisää web-sovellus (Project settings -> General -> "Your apps" -> `</>`)
   ja kopioi saamasi config-arvot.
5. Kopioi `.env.example` -> `.env` projektin juureen ja täytä arvot:

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

   `.env` ei ole gitissä. Jos jätät tiedoston täyttämättä, sovellus toimii
   edelleen (voit kokeilla rakennustilaa ja simulointia paikallisesti), mutta
   tallennus Firestoreen ja kuvien lataus eivät ole käytössä.

6. Julkaise security rules (Firebase CLI: `firebase deploy --only firestore:rules,storage`,
   tai liitä sisältö manuaalisesti konsolista): [`firestore.rules`](firestore.rules) ja
   [`storage.rules`](storage.rules).

   **Huom turvallisuudesta:** koska v1:ssä ei ole kirjautumista, oletussäännöt
   sallivat kaiken lukemisen/kirjoittamisen (`if true`) jotta sovellus toimii
   ilman lisäkonfigurointia. Firebase-projektin config-arvot päätyvät joka
   tapauksessa julkiseen JS-bundleen, joten tämä sopii vain henkilökohtaiseen,
   ei-arkaluontoiseen käyttöön. Katso rules-tiedostojen kommentit ja
   [laajennuskohta Firebase Authille](#tunnetut-rajoitukset-ja-laajennuskohdat)
   ennen kuin jaat sovelluksen linkin tai Firebase-projektin kenellekään muulle.

## Kehitys

```bash
npm install
npm run dev
```

Muut komennot:

```bash
npm run build     # tyyppitarkistus + tuotantobuild -> dist/
npm run preview   # esikatsele tuotantobuild paikallisesti
npm run lint       # oxlint
```

## Build ja julkaisu GitHub Pagesiin

`vite.config.ts` käyttää suhteellista base-polkua (`base: "./"`), joten
build toimii GitHub Pages -projektisivulla
(`https://<käyttäjä>.github.io/<repo>/`) ilman että repon nimeä pitää
kovakoodata.

**Vaihtoehto A - `gh-pages`-paketilla (nopein):**

```bash
npm run deploy
```

Tämä buildaa ja työntää `dist/`-kansion `gh-pages`-haaraan (paketti `gh-pages`
on jo devDependency). Ota GitHub-repon Settings -> Pages -asetuksista
lähteeksi `gh-pages`-haara.

**Vaihtoehto B - GitHub Actions:** lisää workflow joka ajaa `npm ci && npm run build`
ja julkaisee `dist/`-kansion `actions/deploy-pages`-actionilla. Muista lisätä
`VITE_FIREBASE_*`-muuttujat repon Settings -> Secrets and variables -> Actions
-kohtaan ja välittää ne build-stepin ympäristömuuttujina, koska `.env`
ei ole repossa.

## Kansiorakenne

```
src/
  types/           Datamallin TypeScript-tyypit
  domain/           Puhdas logiikka: puu, validointi, ryhmät, simulointi, Excel, esimerkkidata
  firebase/         Firebase-konfiguraatio ja Firestore/Storage-palvelut
  state/            Editorin React-tila (useProductStructure)
  components/
    editor/          Rakennustilan komponentit (outliner, paneelit, tuonti/vienti)
    simulation/       Simulointitilan komponentit
    ItemPicker.tsx    Hakupohjainen nimikevalitsin (jaettu)
    StructureList.tsx Tallennettujen rakenteiden lista
    Workspace.tsx     Yhden avatun rakenteen tila + tilan vaihto editor/simulointi
```

## Tunnetut rajoitukset ja laajennuskohdat

- **Firebase Auth**: koodissa on selkeä laajennuskohta
  `src/firebase/config.ts` (kommentti + valmis paikka `getAuth`-kutsulle).
  Kun Auth lisätään, tiukenna myös `firestore.rules`/`storage.rules`
  (esimerkkisäännöt kommentoituna niissä tiedostoissa).
- Simulointimoottori on tarkoituksella yksinkertaistettu joissain reunatapauksissa,
  esim. jos `requires`- ja `excludes`-säännöt ovat suoraan ristiriidassa
  saman nimikkeen kohdalla, tästä näytetään varoitus yhteenvetopaneelissa
  mutta moottori ei yritä arvata "oikeaa" ratkaisua.
- Ulkoasu on tarkoituksella keskeneräinen (oletus-Tailwind) - visuaalinen
  hionta tehdään erillisessä jatkovaiheessa.
