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
- [Google Drive kuvien tallennukseen](#google-drive-kuvien-tallennukseen-vaihtoehto-firebase-storagelle)
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
`description`, `type`, `price`, `pricingMode`
(vain `assembly`: `"sumOfChildren"` tai `"fixed"`), `color`, `imageUrl`,
`attributes` (avain-arvo-lista), `overridesParentAttributes` (mitkä
attribuuttinimet tämä nimike nimenomaisesti ylikirjoittaa), `children`
(vain `assembly`/`category`).

`type` on yksi kolmesta:
- `"single"` - yksittäinen nimike (lehti)
- `"assembly"` - kokoonpano, hinnoiteltu (`sumOfChildren`/`fixed`), voi olla
  valittavissa sisarustensa kesken
- `"category"` - pelkkä väliotsikko (esim. "Lisävarusteet"): vain nimi ja
  kuvaus, ei hintaa/koodia/väriä. Ei ole itse valinta - se on aina aktiivinen
  heti kun sen oma yläkohde on aktiivinen, joten sen lapset ovat aina
  saavutettavissa ilman että käyttäjän tarvitsee valita otsikkoa erikseen.
  Sen omat lapset toimivat muuten täysin normaalisti (omat ryhmät, hinnat, jne).

Lisäksi mallissa on kenttä `required?: boolean`, joka määrittää onko
nimike pakollinen silloin kun se **ei kuulu mihinkään valintaryhmään**
(ks. alla) - tämä toteuttaa spec-vaatimuksen "nimike joka ei kuulu
ryhmään käyttäytyy yksittäisenä valinnaisena/pakollisena lapsena". Ei
koske `category`-tyyppiä, joka ei koskaan ole ryhmän jäsen.

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
| `type` | `single`, `assembly` tai `category` |
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

## Google Drive kuvien tallennukseen (vaihtoehto Firebase Storagelle)

Lokakuun 2024 jälkeen luoduilla uusilla Firebase-projekteilla Cloud Storage
vaatii Blaze-laskutustilauksen (luottokortin) jo pelkkään käyttöönottoon.
Jos et halua liittää korttia, nimikkeiden kuvat voi sen sijaan ladata suoraan
käyttäjän omaan Google Drive -kansioon (`src/google/drive.ts`) - sovellus
pyytää selaimessa kertaalleen OAuth-luvan kirjoittaa vain sen tiedostoja
mitä se itse luo (`drive.file`-scope, ei pääsyä muuhun Driveesi).

**Kertaluontoinen pystytys Google Cloud Consolissa** (voit käyttää samaa
projektia kuin Firebase - Firebase-projekti ON Google Cloud -projekti):

1. Mene [console.cloud.google.com](https://console.cloud.google.com/) ja
   valitse sama projekti jonka loit Firebaselle (esim. `konfiguraattori-9236a`).
2. **APIs & Services -> Library** -> hae "Google Drive API" -> **Enable**.
3. **APIs & Services -> OAuth consent screen**:
   - User type: **External**, Publishing status: **Testing** (ei vaadi
     Googlen erillistä katselmointia näin pienelle henkilökohtaiselle käytölle).
   - Lisää oma Google-tilisi **Test users** -listalle.
4. **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: lisää sekä tuotanto-osoitteesi
     (esim. `https://fin-tapsa.github.io`) että paikallinen kehitysosoite
     (esim. `http://localhost:5183` - portti riippuu millä ajat `npm run dev`).
   - Luo. Kopioi näkyviin tuleva **Client ID**.
5. Luo Google Driveessä kansio kuville, jaa se ("Kuka tahansa jolla on
   linkki"), ja poimi sen **kansion ID** osoitteesta
   (`drive.google.com/drive/folders/`**`TÄMÄ_OSA`**`?usp=sharing`).
6. Täytä `.env`-tiedostoosi ja GitHub Secretseihin:
   ```
   VITE_GOOGLE_DRIVE_CLIENT_ID=<Client ID vaiheesta 4>
   VITE_GOOGLE_DRIVE_FOLDER_ID=<kansion ID vaiheesta 5>
   ```

Kun molemmat on asetettu, nimikkeen muokkauspaneelin "Kuva"-kohta näyttää
"lataa tiedosto Google Driveen" -vaihtoehdon Firebase Storage -vaihtoehdon
sijaan. Ensimmäisellä latauksella avautuu Googlen kirjautumis-/lupaikkuna.

**Huomioita:**
- Testing-tilan OAuth-luvat vanhenevat n. 7 päivän välein (Googlen rajoitus) -
  silloin kirjautumisikkuna avautuu vain uudelleen, ei vaadi mitään muuta.
- Kertyneen käyttöoikeuden access-token elää n. tunnin, minkä jälkeen
  seuraava lataus pyytää kirjautumisen uudelleen automaattisesti.
- Tämä on henkilökohtaiseen käyttöön tarkoitettu kevyt ratkaisu, ei
  tuotantotason integraatio - Googlen dokumentoimaton
  `drive.google.com/thumbnail?id=...`-kuvaosoitemuoto voi periaatteessa
  muuttua tulevaisuudessa.

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

**Ensisijainen tapa - GitHub Actions (automaattinen):**

Repossa on valmis workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
joka buildaa ja julkaisee sovelluksen GitHub Pagesiin automaattisesti aina kun
`main`-haaraan pushataan (tai manuaalisesti "Run workflow" -napista). Se ajaa
`npm ci && npm run build`, välittää `VITE_FIREBASE_*`-arvot GitHub Secretseistä
build-stepin ympäristömuuttujina (koska `.env` ei ole repossa) ja julkaisee
`dist/`-kansion `actions/upload-pages-artifact` + `actions/deploy-pages`
-actioneilla.

Jotta workflow toimii, tee kertaluontoisesti GitHubin puolella:

1. **Settings -> Pages -> Source: GitHub Actions**
2. **Settings -> Secrets and variables -> Actions**: lisää samat
   `VITE_FIREBASE_*`-arvot jotka ovat omassa `.env`-tiedostossasi
   (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`)

Näitä kahta kohtaa ei voi tehdä koodista käsin - ne ovat repon/organisaation
asetuksia GitHubin puolella.

**Nopea vaihtoehto ilman Firebase-yhteyttä - `gh-pages`-paketilla:**

```bash
npm run deploy
```

Tämä buildaa ja työntää `dist/`-kansion `gh-pages`-haaraan paikallisesti (paketti
`gh-pages` on devDependency) - kätevä nopeaan visuaaliseen tarkistukseen, mutta
vaatii tällöin Settings -> Pages -> Source: `gh-pages`-haara, ja koska `.env`
ei tule mukaan buildiin komentoriviltä ajettuna, Firestore/Storage eivät ole
käytössä ellet aseta `VITE_FIREBASE_*`-muuttujia ympäristöösi ennen komentoa.

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
- **Etusivun salasanakysely** (`src/components/PasswordGate.tsx`,
  ympäristömuuttuja `VITE_APP_PASSWORD`): valinnainen, kevyt este
  satunnaisille kävijöille. **Ei ole oikeaa tietoturvaa** - koska
  sovelluksella ei ole backendia, salasana päätyy sellaisenaan julkiseen
  JS-bundleen ja on kenen tahansa luettavissa selaimen kehittäjätyökaluilla.
  Se ei myöskään suojaa itse Firestore/Storage-dataa (ks. yllä) - oikea
  suojaus vaatii Firebase Authin. Jätä `VITE_APP_PASSWORD` tyhjäksi/pois
  poistaaksesi kyselyn kokonaan käytöstä.
- Simulointimoottori on tarkoituksella yksinkertaistettu joissain reunatapauksissa,
  esim. jos `requires`- ja `excludes`-säännöt ovat suoraan ristiriidassa
  saman nimikkeen kohdalla, tästä näytetään varoitus yhteenvetopaneelissa
  mutta moottori ei yritä arvata "oikeaa" ratkaisua.
- Ulkoasu on tarkoituksella keskeneräinen (oletus-Tailwind) - visuaalinen
  hionta tehdään erillisessä jatkovaiheessa.
