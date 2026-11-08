<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>INCY HWID Generator</title>
<style>
  body { font-family: sans-serif; background: #111; color: #fff; padding: 20px; line-height: 1.5; }
  button { width: 100%; padding: 15px; background: #00e0ff; border: none; font-weight: bold; font-size: 16px; color: #000; border-radius: 5px; cursor: pointer; margin-bottom: 15px; }
  .result { margin-top: 10px; padding: 15px; background: #1a2a3a; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; border-left: 4px solid #00ffa3; }
</style>
</head>
<body>
<h2>Твой HWID</h2>
<button onclick="calculate()">Рассчитать заново</button>
<div id="output"></div>

<script>
var md5=function(){var k=[],i=0;return function(str){k=[];for(i=0;i<str.length;i++){k[i>>2]|=str.charCodeAt(i)<<(i%4)*8;}k[i>>2]|=0x80<<(i%4)*8;k[(((i+8)>>6)<<4)+14]=i*8;var h=[1732584193,-271733879,-1732584194,271733878];for(i=0;i<k.length;i+=16){var w=h.slice(0);for(var j=0;j<64;j++){var f,g;if(j<16){f=(w[1]&w[2])|(~w[1]&w[3]);g=j;}else if(j<32){f=(w[3]&w[1])|(~w[3]&w[2]);g=(5*j+1)%16;}else if(j<48){f=w[1]^w[2]^w[3];g=(3*j+5)%16;}else{f=w[2]^(w[1]|~w[3]);g=(7*j)%16;}var tmp=w[3];w[3]=w[2];w[2]=w[1];w[1]=w[1]+((w[0]+f+k[i+g]+Math.abs(Math.sin(j+1)*4294967296))<<((j%4===0)?7:(j%4===1)?12:(j%4===2)?17:22))|0;w[0]=tmp;}for(j=0;j<4;j++)h[j]=(h[j]+w[j])|0;}var hex='';for(i=0;i<4;i++){for(j=0;j<4;j++){hex+=('0'+((h[i]>>(j*8))&255).toString(16)).slice(-2);}}return hex;};}();

function getUUID(str) {
    var hash = md5(str);
    return (hash.substring(0,8) + "-" + hash.substring(8,12) + "-3" + hash.substring(13,16) + "-" + ((parseInt(hash.substring(16,18), 16) & 0x3f | 0x80).toString(16)) + hash.substring(18,20) + "-" + hash.substring(20,32)).toUpperCase();
}

function calculate() {
    // Твои данные с iQOO I2505
    const androidId = "F99A355105E903A8";
    const manufacturer = "vivo";
    const model = "I2505";
    const device = "I2505";
    const brand = "iQOO";
    const product = "I2505_RU";
    const board = "k6878v1_64";
    const hardware = "mt6878"; // В системе Android обычно в нижнем регистре
    const fingerprint = "iQOO/I2505_RU/I2505:16/BP2A.250605.031.A3_V000L1/compiler261021195959:user/release-keys";

    const str1 = "incy_hwid_" + manufacturer + model + device + brand + product + board + hardware + androidId;
    const str2 = "incy_hwid_" + androidId + fingerprint;
    const str3 = "incy_hwid_" + fingerprint + androidId;
    const str4 = "incy_hwid_" + androidId + manufacturer + model;

    const out = document.getElementById('output');
    out.innerHTML = `
        <div class="result">Вариант 1 (Полный):<br><b>${getUUID(str1)}</b></div>
        <div class="result">Вариант 2 (ID+Build):<br><b>${getUUID(str2)}</b></div>
        <div class="result">Вариант 3 (Build+ID):<br><b>${getUUID(str3)}</b></div>
        <div class="result">Вариант 4 (Короткий):<br><b>${getUUID(str4)}</b></div>
    `;
}
calculate();
</script>
</body>
</html>