import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <div className="helpPage">
      <h1>Random Linkの使い方</h1>

      <p className="helpLead">
        Random Linkは、登録したURLをランダムに表示して、
        保存したページともう一度出会えるリンクコレクションアプリです。
      </p>

      <section className="helpSection">
        <h2>URLを登録する</h2>
        <p>
          メニューの「新規URL登録」からURLを登録できます。
          タイトルやサムネイル画像、ジャンルを設定して保存します。
        </p>

        <Link className="helpLink" href="/register">
          新規URL登録を開く
        </Link>
      </section>

<section className="helpSection">
  <h2>共有ボタンから登録する</h2>
  <p>
    Androidのブラウザや対応アプリの共有メニューから
    Random Linkを選ぶと、そのURLを登録画面へ送れます。
  </p>

  <img
    className="helpGuideImage"
    src="/help/random-link-guide.png"
    alt="Random Linkをホーム画面に追加し、共有ボタンからURLを登録する手順"
  />

  <p className="helpNote">
    ※共有メニューから利用するには、Random Linkを
    ホーム画面へインストールして使用してください。
  </p>
</section>

      <section className="helpSection">
        <h2>登録したリンクを見る</h2>
        <p>
          トップページでは登録したリンクがランダムに表示されます。
          「ALL」ではすべてのジャンルから、
          各ジャンルのタブではそのジャンルだけから表示されます。
        </p>
        <p>
          画面右下の切替ボタンから、
          1・4・9分割の表示を切り替えられます。
        </p>

        <Link className="helpLink" href="/">
          トップページを開く
        </Link>
      </section>

      <section className="helpSection">
        <h2>URLを整理・編集する</h2>
        <p>
          「URLメンテナンス」では、タイトル・サムネイル・
          ジャンルなどを編集できます。
        </p>
        <p>
          検索、並び替え、状態による絞り込みのほか、
          複数のカードを選択してジャンル移動や削除を
          まとめて行うこともできます。
        </p>

        <Link className="helpLink" href="/admin">
          URLメンテナンスを開く
        </Link>
      </section>

      <section className="helpSection">
        <h2>ジャンルを管理する</h2>
        <p>
          ジャンルの追加・削除・並び替えができます。
          「New」は初期ジャンルのため削除・移動できません。
        </p>

        <Link className="helpLink" href="/genres">
          ジャンル管理を開く
        </Link>
      </section>

      <section className="helpSection">
        <h2>バックアップ・ジャンル共有</h2>
        <p>
          登録データ全体をJSONファイルとして保存・復元できます。
          また、選択したジャンルだけを書き出して、
          別のRandom Linkへ取り込むこともできます。
        </p>

        <Link className="helpLink" href="/backup">
          バックアップを開く
        </Link>
      </section>

      <section className="helpSection">
        <h2>データについて</h2>
        <p>
          Random Linkの登録データは、
          使用しているブラウザ内に保存されます。
          別のブラウザでは同じデータは自動的に共有されません。
        </p>
        <p>
          大切なデータはバックアップ機能で
          定期的に保存することをおすすめします。
        </p>
      </section>

      <section className="helpSection">
        <h2>URL・画像の取得について</h2>
        <p>
          サイトの仕様によっては、タイトルやサムネイル画像を
          自動取得できない場合があります。
          その場合でもURLを登録したり、
          端末内の画像をサムネイルとして設定したりできます。
        </p>
      </section>
    </div>
  );
}