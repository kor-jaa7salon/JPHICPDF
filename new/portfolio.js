// 2026-11-16: v0.6 제작 범위 카테고리와 포트폴리오 사례 목록.
// 사례 사진 추가: assets/portfolio/<key>/ 폴더에 이미지를 넣고 해당 카테고리 items에 한 줄씩 적습니다.
//   예) { src: 'assets/portfolio/poster/01.jpg', alt: '2026 나눔의 날 메인 키비주얼', caption: '행사 메인 키비주얼' }
// 실제 작업물만 등록합니다. 배송 중 촬영본은 설치 사진으로 소개하지 않습니다(개발기록 기준).
// items가 비어 있으면 카드 안에 '사례 준비 중'이 표시됩니다.
window.JPHIC_PORTFOLIO = [
  { key: 'poster',  title: '포스터·키비주얼',        desc: '행사와 캠페인의 얼굴이 되는 메인 비주얼', icon: 'M4 3h16v18H4zM8 8h8M8 12h5', items: [] },
  { key: 'title',   title: '타이틀 타이포그래픽',    desc: '행사명·슬로건을 그래픽 글자로',           icon: 'M5 6V4h14v2M12 4v16M9 20h6', items: [] },
  { key: 'print',   title: '대형실사·배너·현수막',    desc: '크게 출력해도 선명한 실사 출력물',        icon: 'M3 5h18v10H3zM7 15v5M17 15v5', items: [] },
  { key: 'wall',    title: '전시월·가벽·포토존',      desc: '공간에 맞춘 벽면과 포토존 그래픽',        icon: 'M4 20V6l8-3v17M12 20V9l8 2v9', items: [] },
  { key: 'standee', title: '입체 등신대·스카시·칼선', desc: '모양대로 잘라 세우는 입체 제작물',        icon: 'M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7 21v-6l-2-4h14l-2 4v6', items: [] },
  { key: 'led',     title: '전광판 LED용 이미지·영상', desc: '화면 비율에 맞춘 이미지와 모션',          icon: 'M3 4h18v12H3zM10 8l4 2-4 2zM8 20h8', items: [] },
  { key: 'goods',   title: '기업판촉물·굿즈',         desc: '로고와 메시지를 담은 판촉물',            icon: 'M5 8h14l-1 13H6zM9 8a3 3 0 0 1 6 0', items: [] }
];
