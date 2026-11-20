// 2026-11-20: /jp 設定。確認できた実際の値だけ入れます。空の項目は画面にリンクとして出ません。
window.JPHIC_JP_CONFIG = {
  // LINE 友だち追加リンク (LINEアプリ → ホーム → 友だち追加 → QRコード → 自分のQRコード →「リンクをコピー」で出る https://line.me/ti/p/... )
  // 空のままだと、ボタンの代わりに下の LINE ID とコピーボタンが表示されます。
  lineUrl: 'https://line.me/ti/p/WQ2jLRC9tU',
  // LINE ID (表示用)
  lineId: '2glad',
  // ファイル受け取り用メール (Googleドライブの共有リンクもここかLINEへ)
  fileEmail: 'jphic_cloud@naver.com',
  // 受付サーバー: /new と同じ Googleスプレッドシート Apps Script ウェブアプリ。{ok:true} が返ったときだけ受付完了と表示。
  intakeEndpoint: 'https://script.google.com/macros/s/AKfycbyhnxwYEDekHRTdjCdOkiMEs6ZxMwNG3JwVL6hXoLT9LSHL1YWmdL2-OlAYOkcdasXTEA/exec',
  // 個人情報の保管期間 (例: '相談終了後1年')。運営方針が決まったら入れます。
  retention: ''
};
