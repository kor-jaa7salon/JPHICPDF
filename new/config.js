// 2026-11-19: v0.9.1 구글시트 웹앱 주소 연결. v0.9 오픈채팅 주소 입력, 접수 서버 설명 갱신. v0.6 운영 정보 설정. 확인된 실제 값만 입력합니다. 비어 있는 항목은 화면에 링크·정보로 표시되지 않습니다.
window.JPHIC_CONFIG = {
  // 카카오톡 오픈채팅 상담 주소 (예: https://open.kakao.com/o/xxxxxxx). 비어 있으면 오픈채팅 안내는 글자로만 나오고 버튼은 숨깁니다.
  openChatUrl: 'https://open.kakao.com/o/sLyIquni',
  // 접수 서버 주소: 구글시트 Apps Script 웹앱 배포 후 나오는 https://script.google.com/macros/s/.../exec 주소.
  // 비어 있으면 아무것도 전송하지 않고, 접수 단계에서 요약 복사·오픈채팅을 안내합니다.
  // 서버가 {ok:true}를 응답한 경우에만 접수 완료로 표시합니다.
  intakeEndpoint: 'https://script.google.com/macros/s/AKfycbzCHM3GeJOcsbV-8xbPj2DqKjhS5Bmz9GFDMHdsPMYtP43OVT_cApXmqxzUNfPNU11Ufg/exec',
  // 푸터 사업자 정보. 실제 값 확인 후 입력합니다.
  company: {
    name: '',        // 상호
    ceo: '',         // 대표자
    bizNo: '',       // 사업자등록번호
    salesNo: '',     // 통신판매업 신고번호 (해당 시)
    address: '',     // 주소
    phone: '',       // 전화
    email: '',       // 이메일
    privacyUrl: ''   // 개인정보처리방침 페이지 주소
  },
  // 접수 시 개인정보 보관 기간 문구 (예: '상담 종료 후 1년'). 운영 정책 확정 후 입력합니다.
  retention: ''
};
