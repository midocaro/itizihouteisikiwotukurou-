/* --- JS START --- */



// URLパラメータからデータを取得する処理（GASのdoGet代替）
const urlParams = new URLSearchParams(window.location.search);

// サーバーデータを模したオブジェクトを作成
const SERVER_DATA = {
  appUrl: window.location.href.split('?')[0], // 現在のURL（クエリなし）
  sharePrice: urlParams.get('price') || "",
  shareLa: urlParams.get('la') || "",
  shareLc: urlParams.get('lc') || "",
  shareRa: urlParams.get('ra') || "",
  shareRc: urlParams.get('rc') || ""
};

let applePrice = 0;
let gamePhase = 'setup'; 
let leftSide = { a: 1, c: 0 };  
let rightSide = { a: 0, c: 0 }; 
let currentViewMode = 'icon';

const APP_URL = SERVER_DATA.appUrl;

window.onload = function() {
  // 共有データ（パラメータ）があるか確認
  const sPrice = SERVER_DATA.sharePrice;
  
  // パラメータが存在する場合（＝QRコードから来た場合）
  if(sPrice && sPrice !== "") {
    applePrice = parseInt(sPrice);
    leftSide = { a: parseInt(SERVER_DATA.shareLa), c: parseInt(SERVER_DATA.shareLc) };
    rightSide = { a: parseInt(SERVER_DATA.shareRa), c: parseInt(SERVER_DATA.shareRc) };
    
    // セットアップ画面を消して、解答モードにする
    document.getElementById('setupOverlay').style.display = 'none';
    gamePhase = 'solving'; 
    updateStatus();
    render();
    
    const bar = document.getElementById('statusBar');
    bar.innerHTML = "🔥 挑戦状！解けるかな？ 🔥";
    bar.style.backgroundColor = "#e1bee7"; bar.style.color = "#4a148c";
  }
};

// 数値をボタンで増減させる機能
function adjustPrice(delta) {
  const input = document.getElementById('applePriceInput');
  let val = parseInt(input.value) || 0;
  val += delta;
  if (val < 1) val = 1;
  if (val > 10) val = 10;
  input.value = val;
}

function startGame() {
  const input = document.getElementById('applePriceInput');
  let price = parseInt(input.value);
  if (isNaN(price) || price < 1) price = 1;
  if (price > 10) price = 10;
  applePrice = price;
  
  leftSide = { a: 1, c: 0 };
  rightSide = { a: 0, c: applePrice };
  document.getElementById('setupOverlay').style.display = 'none';
  gamePhase = 'building';
  
  // ゲーム開始時はアイコン表示に戻す
  changeView('icon');
  
  updateStatus();
  render();
}

function setProblem() {
  if (gamePhase !== 'building') return;
  gamePhase = 'solving';
  updateStatus();
  render();
}

function changeView(mode) {
  currentViewMode = mode;
  const btns = document.querySelectorAll('.btn-view');
  btns.forEach(b => b.classList.remove('active'));
  if(mode === 'icon') btns[0].classList.add('active');
  if(mode === 'x') btns[1].classList.add('active');
  if(mode === 'group') btns[2].classList.add('active');

  const btnP = document.getElementById('btnApplePlus');
  const btnM = document.getElementById('btnAppleMinus');
  
  if (mode === 'icon') {
    btnP.innerHTML = '+🍎';
    btnM.innerHTML = '-🍎';
  } else {
    const xStyle = "font-family: 'Times New Roman', serif; font-style: italic;";
    btnP.innerHTML = `+<span style="${xStyle}">x</span>`;
    btnM.innerHTML = `-<span style="${xStyle}">x</span>`;
  }
  
  render();
}

function resetToUrl() {
  if (APP_URL) { 
    window.location.href = APP_URL; 
  } else { 
    // URLがない場合は現在のURLからパラメータを除去してリロード
    window.location.href = location.href.split('?')[0]; 
  }
}

// QRコード生成ロジック
function showQrCode() {
  const qrArea = document.getElementById('qrCodeArea');
  qrArea.innerHTML = ""; 
  
  let baseUrl = APP_URL;
  
  if (!baseUrl || baseUrl === "null") {
    // ローカル環境等の場合、現在のURLを使用
    baseUrl = window.location.href.split('?')[0];
  }

  const params = "?price=" + applePrice + 
                 "&la=" + leftSide.a + 
                 "&lc=" + leftSide.c + 
                 "&ra=" + rightSide.a + 
                 "&rc=" + rightSide.c;
                 
  const finalUrl = baseUrl + params;
  console.log("QR URL:", finalUrl);

  new QRCode(qrArea, { text: finalUrl, width: 180, height: 180 });
  document.getElementById('qrOverlay').style.display = 'flex';
}

function closeQr() { document.getElementById('qrOverlay').style.display = 'none'; }

function updateStatus() {
  const bar = document.getElementById('statusBar');
  const setBtn = document.getElementById('setBtn');
  const shareBtn = document.getElementById('shareBtn');
  const viewCtrl = document.getElementById('viewControls');
  
  if (gamePhase === 'building') {
    bar.innerText = "【作成中】式をいじって「出題」！";
    bar.style.backgroundColor = "#fff9c4"; bar.style.color = "#f57f17";
    setBtn.disabled = false; setBtn.innerText = "出題";
    shareBtn.disabled = true;
    
    viewCtrl.style.display = 'flex'; 

  } else if (gamePhase === 'solving' || gamePhase === 'finished') {
    bar.innerText = "【解答中】リンゴ1個＝◯円に戻そう！";
    bar.style.backgroundColor = "#ffcdd2"; bar.style.color = "#b71c1c";
    setBtn.disabled = true; setBtn.innerText = "出題中";
    shareBtn.disabled = false;
    viewCtrl.style.display = 'flex'; 
  }
}

function operate(type, value) {
  if (gamePhase === 'finished') return;
  if (type === 'apple') { leftSide.a += value; rightSide.a += value; }
  else if (type === 'money') { leftSide.c += value; rightSide.c += value; }
  else if (type === 'mult') {
    leftSide.a *= value; leftSide.c *= value;
    rightSide.a *= value; rightSide.c *= value;
  } else if (type === 'div') {
    if (!isDivisible(leftSide, value) || !isDivisible(rightSide, value)) {
       alert("きれいに割れません！"); return;
    }
    leftSide.a /= value; leftSide.c /= value;
    rightSide.a /= value; rightSide.c /= value;
  }
  render();
  if (gamePhase === 'solving') checkWinCondition();
}

function isDivisible(side, div) { return (side.a % div === 0) && (side.c % div === 0); }

function checkWinCondition() {
  const isLeftApple = (leftSide.a === 1 && leftSide.c === 0);
  const isRightMoney = (rightSide.a === 0 && rightSide.c === applePrice);
  const isRightApple = (rightSide.a === 1 && rightSide.c === 0);
  const isLeftMoney = (leftSide.a === 0 && leftSide.c === applePrice);

  if ((isLeftApple && isRightMoney) || (isRightApple && isLeftMoney)) {
    gamePhase = 'finished';
    setTimeout(() => {
      const tens = Math.floor(applePrice / 10);
      const ones = applePrice % 10;
      let resultHtml = `リンゴは<br>`;
      for(let i=0; i<tens; i++) resultHtml += '<span class="coin coin-10"></span>';
      for(let i=0; i<ones; i++) resultHtml += '<span class="coin coin-1"></span>';
      resultHtml += `<br>（${applePrice}円）でした！`;
      document.getElementById('resultPriceDisplay').innerHTML = resultHtml;
      document.getElementById('winOverlay').style.display = 'flex';
    }, 500);
  }
}

function render() {
  renderSide(document.getElementById('leftSideArea'), leftSide);
  renderSide(document.getElementById('rightSideArea'), rightSide);
}

function renderSide(container, state) {
  container.innerHTML = "";
  
  if (currentViewMode === 'group') {
    let content = "";
    if (state.a !== 0) {
      content += `<div class="grouped-box grouped-x">${state.a}x</div>`;
    }
    if (state.a !== 0 && state.c !== 0) {
       content += `<div class="plus-sign">+</div>`;
    }
    if (state.c !== 0) {
      content += `<div class="grouped-box grouped-num">${state.c}</div>`;
    }
    if (content === "") content = '<div style="color:#ccc;">0</div>';
    container.innerHTML = content;
    return;
  }

  const appleCount = state.a;
  if (appleCount !== 0) {
    const isHidden = (gamePhase === 'solving');
    const isMinus = appleCount < 0;
    
    for(let i=0; i < Math.abs(appleCount); i++) {
      const div = document.createElement('div');
      if (currentViewMode === 'x') {
        div.className = 'x-icon' + (isMinus ? ' x-icon-minus' : '');
        div.innerText = 'x';
      } else {
        let baseClass = 'apple-icon';
        if (isHidden) baseClass += ' apple-hidden';
        if (isMinus) baseClass += ' apple-minus';
        div.className = baseClass;
      }
      container.appendChild(div);
    }
  }

  if (state.a !== 0 && state.c !== 0) {
     const sep = document.createElement('div');
     sep.className = 'separator';
     container.appendChild(sep);
  }

  const money = state.c;
  if (money !== 0) {
    const isMinus = money < 0;
    const absMoney = Math.abs(money);
    const tens = Math.floor(absMoney / 10);
    const ones = absMoney % 10;
    
    for(let i=0; i < tens; i++) {
      const coin = document.createElement('div');
      coin.className = 'coin coin-10' + (isMinus ? ' coin-minus' : '');
      container.appendChild(coin);
    }
    for(let i=0; i < ones; i++) {
      const coin = document.createElement('div');
      coin.className = 'coin coin-1' + (isMinus ? ' coin-minus' : '');
      container.appendChild(coin);
    }
  }
  
  if (state.a === 0 && state.c === 0) container.innerHTML = '<div style="color:#ccc;">（なし）</div>';
}



/* --- JS END --- */
