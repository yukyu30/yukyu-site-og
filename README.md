# yukyu-site-og

yukyu.net の OGP 用 PNG を返す、単機能の HTTP サービスです。クエリの `title` から 1200×630 の PNG を生成します。Vercel 上の `yukyu-site-og` と同じ URL 契約（`/api/og?title=` と、現行ブログが使っている `/og?title=`）で動けます。

描画は [satori](https://github.com/vercel/satori) と [@resvg/resvg-js](https://github.com/yisibl/resvg-js) です。ヘッドレス Chrome は使いません。

見た目は、いま `https://yukyu-site-og.vercel.app/api/og` が返しているカードに合わせています。薄いグレーの 64px グリッド、中央のタイトル、右下の `YUKYU.NET / @YUKYU30` です。この Git リポジトリに残っていた Puppeteer テンプレート（白背景、BIZ UDPGothic、2048×1170、`https://yukyu.net`）とは別物で、本番の Vercel デプロイとも一致していませんでした。

yukyu-net の現行ブログが自分で描いている青いカード（`src/app/(blog)/og/route.tsx`）とも違います。メタタグの URL をこのサービスに切り替えると、シェア画像は青いカードからこのグレーのカードに戻ります。

## エンドポイント

| メソッド | パス | 応答 |
| --- | --- | --- |
| `GET` / `HEAD` | `/og?title=` | `image/png`（1200×630） |
| `GET` / `HEAD` | `/api/og?title=` | 上と同じ PNG |
| `GET` / `HEAD` | `/health` | `ok`。Railway のヘルスチェック用。キャッシュしない |

`title` が無い、または空白だけのときは `My default title` です。101 文字目以降は切り捨てます。これは現在の `https://yukyu-site-og.vercel.app/api/og` と同じです。

画像の `Cache-Control`:

```
public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400
```

`/health` と 404 / 405 / 500 は `Cache-Control: no-store` です。

## ローカル

Node.js 22 以上。

```bash
npm install
npm test
npm start
```

`npm start` は `0.0.0.0:$PORT` で待ちます。未設定なら `3000` です。

```bash
curl -sI "http://127.0.0.1:3000/og?title=Hello%20World" | grep -i -E 'HTTP/|content-type|cache-control'
curl -s "http://127.0.0.1:3000/og?title=三連休の記録" -o /tmp/og.png
file /tmp/og.png
```

サンプル PNG を書き出すとき:

```bash
npm run sample
```

`tmp/samples/` に `hello.png`、`japanese.png`、`long.png`、`default.png` を出します。

## Railway に載せる

yukyu-net はすでに Railway 上で、Dockerfile も `railway.json` も置かず、Railpack と npm（`.node-version` と `package.json` の `start`）で動いています。このサービスも同じ形です。ビルダーは Railpack、起動は `npm start`（`node server.mjs`）。`railway.json` はその起動コマンドと `/health` のヘルスチェックだけを足しています。

ブログのプロセスにルートを足すのではなく、**同じ Railway プロジェクトの別サービス**にしてください。理由は次のとおりです。

- OGP は X や Slack がインターネットから取りに来るので、公開 HTTPS ドメインが要ります。`.railway.internal` は同じプロジェクト・同じ環境のサービスからしか届かず、CDN も通りません。
- CDN のオンオフ、TTL、パージはサービス単位です。ブログの Next.js キャッシュと画像生成を分けると、テンプレートを変えたときのパージがブログの HTML に影響しません。
- 画像生成の CPU がブログの応答から分かれます。

このリポジトリにプロジェクト全体の `.railway/railway.ts` は置いていません。それを `railway config apply` すると、yukyu-net 側のサービス定義までこのリポジトリから上書きしかねないためです。`railway.json` は、この Git リポジトリをルートにするサービス 1 つにだけ効きます。

### 既存プロジェクトへ追加する

ダッシュボードなら、yukyu-net のプロジェクトで **New → GitHub Repo → `yukyu30/yukyu-site-og`**。サービス名は `og` を推奨します。ブランチはマージ後の `main`。

CLI なら、yukyu-net のプロジェクトにリンクしたうえで:

```bash
railway add --service og --json
railway up --service og --environment production --detach -m "og image service"
```

`railway up --detach` はビルドの投入までです。完了は `railway deployment list --service og --environment production --json` で `SUCCESS` を確認してください。

この手順はドキュメント用です。この変更ではデプロイしていません。

### 公開ドメイン

公開ドメインは自動では付きません。CDN を有効にする前に、ドメインが必要です。

```bash
railway domain --service og
```

`*.up.railway.app` が 1 つ発行されます。カスタムドメイン（例: `og.yukyu.net`）は次です。表示された **CNAME と TXT の両方**を DNS に置きます。TXT が無いと、CNAME が引けるようになっても 404 になります。

```bash
railway domain og.yukyu.net --service og
```

発行されたホスト名を、下の「yukyu-net 側の 1 行」に入れます。

### プライベートドメインは OGP に使わない

同じ環境のサービスからは `http://og.railway.internal:<PORT>` で届きます。`PORT` は og サービスが listen しているポートです。参照変数にするなら、ブログ側に次を置けます。

```
OG_ORIGIN=http://${{og.RAILWAY_PRIVATE_DOMAIN}}:${{og.PORT}}
```

`og.PORT` は Railway が実行時の `PORT` を自動では埋めません。og サービスに `PORT` を変数として明示するか、起動ログのポートを書いてください。いずれにせよ **`<meta property="og:image">` には使えません。** クローラはプライベートネットワークに入れないので、公開ドメインの `https://…/og?title=` をメタタグに書きます。

## CDN キャッシュ

出典: [Railway CDN](https://docs.railway.com/networking/cdn)（2026-10 時点）、[Cache-Control ガイド](https://docs.railway.com/guides/cache-headers-cdn)、[railway cdn](https://docs.railway.com/cli/cdn)。

CDN は全プランで追加料金なし、**デフォルトはオフ**、**サービスごと**です。オンにすると、そのサービスの公開ドメイン（`*.up.railway.app` とカスタムドメイン）全部が対象で、DNS の切り替えは要りません。公開ドメインが付く前には有効化できません。

```bash
railway cdn enable --service og
```

ダッシュボードでは、og サービスの **Settings → Edge → Enable CDN Caching** です。

キャッシュキーはメソッド、ホスト、パス、クエリ文字列全体です。`title` が違えば別エントリです。クエリの順序は無視されます（`?a=1&b=2` と `?b=2&a=1` は同一）。Cookie はキーに入りません。

`Content-Type: image/png` は静的アセット（`image/*`）として扱われます。静的アセットはヘッダが無くてもキャッシュされますが、寿命は次の順です。

1. オリジンの `s-maxage`、無ければ `max-age`
2. それも無ければ Default TTL（初期値 2 時間。30 分 / 1 時間 / 2 時間 / 4 時間 / 12 時間 / 1 日から選べる）

このサービスは `s-maxage=31536000`（1 年）を返すので、エッジの寿命は 1 年です。ブラウザも `max-age=31536000` です。`stale-while-revalidate=86400` は、**Honor SWR Directives がオンのとき**（初期値はオン）だけ効きます。期限後 1 日は、エッジが古い PNG をすぐ返し、裏で 1 回だけ再生成します。

HTML Caching は初期値の Auto のままで構いません。PNG は HTML ではないので、この設定では寿命が決まりません。

次の応答はキャッシュされません。`Cache-Control: private` または `no-store`、`Set-Cookie`、`Vary: *` または `Vary: Cookie`、`Authorization` 付きリクエスト、GET/HEAD 以外。`/health` は `no-store` にしています。

確認:

```bash
curl -sI "https://<公開ドメイン>/og?title=Hello%20World" | grep -i -E 'x-cache|age|cache-control'
curl -sI "https://<公開ドメイン>/og?title=Hello%20World" | grep -i x-cache
```

1 回目は `x-cache: MISS`、2 回目は `HIT` です。`age` が増えていれば同じコピーです。`DYNAMIC` はキャッシュされていないという意味です。どのエッジか見るには `https://<公開ドメイン>/.railway/cdn-trace` です。

### オーナーが切り替えるもの

| 設定 | 推奨 | 理由 |
| --- | --- | --- |
| Enable CDN Caching | オン | 初期値はオフ。オフのままだと毎回オリジンまで届く |
| Honor SWR Directives | オン（初期値） | `stale-while-revalidate` を読む。`railway cdn update --service og --no-swr` は実行しない |
| HTML Caching | Auto（初期値） | PNG には影響しない |
| Default TTL | 初期値のままでよい | `s-maxage` があるのでフォールバックは使われない |
| Purge Cache on Deploy | **all** | 初期値は HTML だけ。`image/*` は静的アセットなので、初期値のままだとデプロイ後も古い PNG が残る |

```bash
railway cdn update --service og --purge-on-deploy all
```

テンプレートを変えた直後に残っているキャッシュを捨てるとき:

```bash
railway cdn purge all --service og
```

URL 単位のパージはありません。`title` が変わると URL が変わるので、記事タイトルの変更ではパージ不要です。絵そのものを変えたときだけ `purge all` が要ります。

## yukyu-net 側

このリポジトリでは yukyu-net を変更していません。公開ドメインが決まったあとに、yukyu-net の次の 1 行だけ変えます。

`src/app/(blog)/posts/[slug]/page.tsx`

```tsx
const ogUrl = `https://<公開ドメイン>/og?title=${encodeURIComponent(String(title))}`
```

`SITE_ORIGIN`（`https://yukyu.net`）は記事 URL とシェアリンクにも使っているので、そのままにします。

## フォント

`fonts/Inter-Regular.ttf`（ラテン）と `fonts/NotoSansJP-Regular.woff`（日本語）。どちらも SIL Open Font License 1.1 です。本文は `fonts/OFL.txt` です。
