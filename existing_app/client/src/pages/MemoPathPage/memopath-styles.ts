export const MEMOPATH_CSS = `
.memopath-stage{--cream:#fbf3e7;--paper:#fff;--ink:#2c2119;--muted:#a79f96;--line:#b5aa9d;--green:#86a94e;--green-dark:#617f2f;--blue:#568dbb;--gold:#f2d392;--soft:#f4ead9;--red:#c45545;--shadow:0 3px 5px #0003;--radius:18px}
.memopath-stage *,.memopath-stage *::before,.memopath-stage *::after{box-sizing:border-box}
.memopath-stage{margin:0;min-height:100%;font-family:-apple-system,BlinkMacSystemFont,"PingFang HK","PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;color:var(--ink)}
.memopath-stage{background:#000;display:grid;place-items:center;min-height:100svh;padding:12px}
.memopath-stage button,.memopath-stage input{font:inherit;color:inherit}.memopath-stage button{cursor:pointer;border:0;background:none}.memopath-stage input{outline:none}
.memopath-stage #app{width:min(390px,100vw);height:min(844px,calc(100svh - 24px));min-height:640px;background:var(--cream);border-radius:34px;overflow:hidden;position:relative;box-shadow:0 0 0 1px #fff3}
.memopath-stage .screen{height:100%;overflow-y:auto;padding:26px 24px 30px;scrollbar-width:none}.memopath-stage .screen::-webkit-scrollbar{display:none}
.memopath-stage .auth{display:flex;flex-direction:column;align-items:center;padding-top:62px}.memopath-stage .auth .logo{width:92px;height:86px;object-fit:cover;border-radius:16px;mix-blend-mode:multiply}.memopath-stage .brand-title{font-size:20px;font-weight:700;margin:8px 0 2px}.memopath-stage .tagline{font-size:12px;color:#837a70;margin:0 0 32px}
.memopath-stage .segmented{width:100%;background:#fff;border-radius:8px;padding:7px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.memopath-stage .seg{padding:9px 5px;font-size:18px;border-radius:10px}.memopath-stage .seg.active{background:var(--gold);box-shadow:var(--shadow)}
.memopath-stage .panel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:18px;width:100%}.memopath-stage .field{display:block;margin-bottom:16px}.memopath-stage .field:last-child{margin-bottom:0}.memopath-stage .field label{display:block;font-size:12px;color:#aaa29a;margin:0 0 8px}.memopath-stage .input{width:100%;height:43px;border:1px solid var(--line);border-radius:12px;padding:0 14px;background:#fff;font-size:13px}.memopath-stage .forgot{display:block;text-align:right;color:#6e9ec5;font-size:11px;margin-top:-5px}
.memopath-stage .primary{width:100%;height:52px;border-radius:12px;background:var(--green);color:white;font-size:23px;font-weight:700;box-shadow:var(--shadow);margin-top:36px}.memopath-stage .blue{background:var(--blue)}.memopath-stage .gold{background:#d2b268}.memopath-stage .secondary-link{font-size:14px;margin-top:35px}.memopath-stage .secondary-link span,.memopath-stage .link{color:#5e8db2}
.memopath-stage .mini-header{display:flex;align-items:center;gap:7px;font-weight:700;font-size:12px}.memopath-stage .mini-header img{width:36px;height:36px;object-fit:cover;border-radius:8px;mix-blend-mode:multiply}.memopath-stage .date{color:#9f978f;font-size:12px;margin-top:12px}.memopath-stage .page-title{font-size:28px;font-weight:400;margin:90px 0 2px;text-align:center}.memopath-stage .subtitle{text-align:center;color:#b1aaa2;font-size:12px;margin-bottom:25px}.memopath-stage .otp-row{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:8px 0 16px}.memopath-stage .otp{height:40px;border:1px solid var(--line);border-radius:10px;display:grid;place-items:center;font-size:25px}.memopath-stage .muted{color:#aaa29a}.memopath-stage .tiny{font-size:10px}.memopath-stage .form-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px}.memopath-stage .form-card .input{margin-bottom:12px}.memopath-stage .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.memopath-stage .top-brand{display:flex;justify-content:space-between;align-items:start}.memopath-stage .top-brand .left{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700}.memopath-stage .top-brand img{width:38px;height:38px;border-radius:8px;mix-blend-mode:multiply}.memopath-stage .sos{background:var(--red);color:#fff;border-radius:14px;padding:8px 13px;text-align:center;box-shadow:var(--shadow);font-weight:800;line-height:1.05}.memopath-stage .sos small{display:block;font-size:10px;font-weight:400;margin-top:5px}.memopath-stage .greeting{font-size:25px;margin:16px 0 2px}.memopath-stage .home-date{font-size:16px;color:#9e968c}.memopath-stage .weather-card{background:#fff;border:1px solid var(--line);border-radius:14px;display:flex;align-items:center;padding:8px 10px;margin:14px 0 18px;box-shadow:var(--shadow)}.memopath-stage .weather-icon{font-size:34px;margin-right:8px}.memopath-stage .weather-card strong{display:block;font-size:18px}.memopath-stage .weather-card small{color:#a19a91}.memopath-stage .detail-btn{margin-left:auto;background:#f7ecd9;border-radius:8px;padding:9px 12px;box-shadow:var(--shadow)}
.memopath-stage .map{position:relative;height:245px;background-color:#edf2e5;background-image:linear-gradient(#fff 5px,transparent 5px),linear-gradient(90deg,#fff 5px,transparent 5px);background-size:100% 72px,106px 100%;overflow:hidden;border-radius:6px}.memopath-stage .map:before{content:"";position:absolute;left:102px;top:82px;width:120px;height:120px;border:2px dashed #84945f;border-radius:50%}.memopath-stage .road{position:absolute;background:#d6dbc9}.memopath-stage .route-line{position:absolute;background:#617da7;height:4px;transform-origin:left center}.memopath-stage .route-line.one{width:122px;left:80px;top:74px}.memopath-stage .route-line.two{width:134px;left:80px;top:76px;transform:rotate(46deg)}.memopath-stage .home-pin{position:absolute;left:164px;top:137px;font-size:27px}.memopath-stage .now-pin{position:absolute;right:34px;bottom:20px;border:4px solid #5d79a1;background:#fff;width:17px;height:17px;border-radius:50%}.memopath-stage .map-search{position:absolute;left:14px;right:14px;bottom:14px;background:#fff;border-radius:28px;padding:15px 18px;box-shadow:0 4px 11px #0003;color:#968f87}.memopath-stage .quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:15px 0}.memopath-stage .quick{height:119px;border-radius:14px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:8px 5px;font-size:20px;font-weight:700}.memopath-stage .quick .glyph{font-size:48px;margin-top:12px;line-height:1}.memopath-stage .voice{border:1px solid #292218;border-radius:16px;background:#88a954;padding:12px;display:grid;grid-template-columns:72px 1fr 39px;align-items:center;color:#fff;font-size:16px;box-shadow:var(--shadow)}.memopath-stage .mic{height:66px;border:4px solid #22352b;border-radius:50%;display:grid;place-items:center;font-size:30px}.memopath-stage .press{background:#4d6f22;border-radius:8px;height:39px;color:#fff;box-shadow:var(--shadow)}
.memopath-stage .back{font-size:18px;text-align:left;margin:2px 0 22px}.memopath-stage .back:before{content:"← ";font-weight:700}.memopath-stage .weather-page h1,.memopath-stage .simple-page h1{font-weight:400;font-size:38px;margin:10px 0 50px}.memopath-stage .forecast{background:#fff;border-radius:22px;padding:18px}.memopath-stage .forecast-head{display:flex;justify-content:space-between;color:#a49d95;font-size:12px}.memopath-stage .forecast-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px}.memopath-stage .forecast-card{border:1px solid #ded8cf;border-radius:12px;text-align:center;padding:12px 4px;box-shadow:var(--shadow);font-size:12px}.memopath-stage .forecast-card .temp{font-size:22px;color:#26211d}.memopath-stage .hint{background:#f5edd5;border-radius:20px;padding:17px;margin-top:20px;color:#5f554c;font-size:13px}.memopath-stage .center-action{display:block;margin:140px auto 0;background:#6299c6;color:#fff;border-radius:10px;padding:12px 35px;font-size:20px;box-shadow:var(--shadow)}
.memopath-stage .map-page h1{font-size:42px;margin:18px 0 28px}.memopath-stage .map.large{height:380px;border-radius:20px;margin:0 18px}.memopath-stage .route-home{height:66px;border-radius:28px;background:#fff;margin:20px 18px;box-shadow:var(--shadow);font-size:23px;font-weight:700;width:calc(100% - 36px)}.memopath-stage .big-back{display:block;border:1px solid #292218;border-radius:20px;font-weight:800;font-size:28px;padding:12px 43px;margin:130px auto 0}.memopath-stage .qr-title{font-size:40px;margin:20px 0 4px}.memopath-stage .qr-sub{font-size:18px}.memopath-stage .qr{width:300px;height:300px;background:#fff;margin:34px auto 0;display:grid;grid-template-columns:repeat(21,1fr);grid-template-rows:repeat(21,1fr);padding:7px}.memopath-stage .qr i{background:#fff}.memopath-stage .qr i.on{background:#1d1c19}.memopath-stage .done{display:block;background:#6299c6;color:#fff;border-radius:10px;padding:12px 34px;font-size:20px;margin:65px auto 0}
.memopath-stage .trip h1{font-size:42px;margin:20px 0 45px}.memopath-stage .trip-card{background:#fff;border-radius:18px;padding:14px;margin-bottom:14px}.memopath-stage .trip-route{height:82px;border-radius:14px;background:#e9eef6;margin-top:10px;padding:14px;color:#5470d2;display:flex;justify-content:space-between}.memopath-stage .cab{width:100%;height:54px;border-radius:14px;background:linear-gradient(90deg,#5576e9,#4258ce);color:#fff;font-weight:700;font-size:17px}.memopath-stage .overlay{position:absolute;inset:0;background:#b6b0a99c;display:grid;place-items:center;padding:36px}.memopath-stage .dialog{background:#fff;border-radius:24px;width:100%;padding:46px 44px 22px;text-align:center}.memopath-stage .dialog .taxi{font-size:52px}.memopath-stage .dialog h2{font-size:23px;margin:22px 0 50px}.memopath-stage .dialog p{text-align:left;font-size:16px;line-height:1.4}.memopath-stage .dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:55px}.memopath-stage .dialog-actions button{border-radius:12px;padding:12px;font-size:22px;background:#fff4e3;box-shadow:var(--shadow)}.memopath-stage .dialog-actions .confirm{background:#df9f41;color:#fff}
.memopath-stage .contacts h1{font-size:42px;margin:28px 0 0}.memopath-stage .contacts .lead{font-size:20px;margin:0 0 60px}.memopath-stage .contact{display:grid;grid-template-columns:64px 1fr 112px;gap:10px;align-items:center;border-bottom:1px solid #afa69d;padding:8px 5px}.memopath-stage .avatar{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:40px;background:#ebf1e1}.memopath-stage .contact strong{font-size:22px;color:#1764c0}.memopath-stage .call{background:#5b96c5;color:#fff;border-radius:14px;padding:9px 8px;font-size:24px}.memopath-stage .know{display:block;margin:120px auto 0;background:#6299c6;color:#fff;border-radius:10px;padding:12px 38px;font-size:20px}
.memopath-stage .family h1{font-size:22px;font-weight:400;margin:10px 0}.memopath-stage .settings-btn{background:#f1d79a;border-radius:16px;padding:8px 15px;font-size:16px;box-shadow:var(--shadow)}.memopath-stage .person-line{display:flex;align-items:flex-start;gap:10px}.memopath-stage .person-name{font-size:20px}.memopath-stage .health-pill{border:1px solid #c8beb0;border-radius:20px;padding:6px 12px;font-size:13px;display:inline-block;white-space:normal;line-height:1.5;max-width:100%;text-align:left}.memopath-stage .safe{color:#7fa13f}.memopath-stage .family-map{height:340px}.memopath-stage .legend{display:flex;gap:18px;flex-wrap:wrap;font-size:11px;margin:8px 0 18px}.memopath-stage .legend span:before{content:"●";margin-right:4px}.memopath-stage .alerts{border:1px solid #90867e;min-height:66px;height:auto;background:#fff;padding:10px;font-size:12px;line-height:1.45}.memopath-stage .family-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.memopath-stage .pill-btn{background:#f4dea5;border:1px solid #d4bc78;border-radius:10px;padding:8px 10px;box-shadow:var(--shadow);font-size:12px}
.memopath-stage .section-title{font-size:26px;font-weight:400;margin:4px 0}.memopath-stage .section-sub{color:#aaa29a;font-size:12px;margin-bottom:16px}.memopath-stage .box{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px;margin:14px 0}.memopath-stage .choice{display:grid;grid-template-columns:repeat(3,1fr);background:#e9ddd0;border-radius:20px;padding:5px;gap:5px}.memopath-stage .choice button{padding:9px;border-radius:6px}.memopath-stage .choice .active{background:#fff}.memopath-stage .toggle-row{display:flex;align-items:center;justify-content:space-between}.memopath-stage .toggle{width:44px;height:25px;background:#72a32b;border-radius:18px;padding:3px;display:inline-block}.memopath-stage .toggle:after{content:"";display:block;width:19px;height:19px;border-radius:50%;background:#fff;margin-left:19px}.memopath-stage .toggle.off{background:#c7c7c4}.memopath-stage .toggle.off:after{margin-left:0}.memopath-stage .chip-row{display:flex;gap:10px;flex-wrap:wrap}.memopath-stage .chip{background:#f6e4bd;border:1px solid #d2bb87;border-radius:18px;padding:9px 13px}.memopath-stage .elder-card{display:grid;grid-template-columns:58px 1fr auto;align-items:center;background:#fff;border:1px solid var(--line);border-radius:15px;padding:8px;margin:12px 0}.memopath-stage .elder-card button{background:#fff;border:1px solid #d0c5b8;border-radius:10px;padding:8px;box-shadow:var(--shadow)}.memopath-stage .add{width:100%;background:#d2b268;color:#fff;border-radius:10px;padding:12px;font-size:18px;box-shadow:var(--shadow)}
.memopath-stage .form-title{font-size:24px}.memopath-stage .avatar-head{display:grid;grid-template-columns:58px 1fr auto;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:7px}.memopath-stage .form-lines{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;margin:30px 0}.memopath-stage .save{width:100%;background:var(--green);color:#fff;border-radius:10px;padding:13px;font-size:20px;box-shadow:var(--shadow)}
.memopath-stage .safety .map{height:100px}.memopath-stage .location-row{display:grid;grid-template-columns:34px 1fr;align-items:center;gap:8px;margin:8px 0}.memopath-stage .slider{height:10px;border-radius:8px;background:linear-gradient(90deg,#6ba328 0 50%,#c7c7c4 50%);position:relative;margin:18px 6px}.memopath-stage .slider:after{content:"";position:absolute;width:23px;height:23px;border-radius:50%;background:#6ba328;left:48%;top:50%;transform:translate(-50%,-50%)}.memopath-stage .metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.memopath-stage .metric{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px}.memopath-stage .metric .num{font-size:27px;color:#cf5848}.memopath-stage .metric:nth-child(even) .num{color:#70a12c}.memopath-stage .chart{height:104px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;margin-top:22px}.memopath-stage .spark{height:46px;margin-top:12px}
.memopath-stage .table{width:100%;border-collapse:collapse;font-size:12px}.memopath-stage .table th,.memopath-stage .table td{padding:8px;border-bottom:1px solid #e7e0d8;text-align:left}.memopath-stage .status{border-radius:6px;padding:4px 8px;background:#e4efcf}.memopath-stage .status.bad{background:#f2c8bd}.memopath-stage .schedule-card{background:#fff;border-radius:18px;padding:14px;margin:10px 0;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.memopath-stage .new-trip{border:1px dashed #8fbca7;background:#eff9f4;text-align:center;padding:15px;border-radius:16px;color:#6c9a83}.memopath-stage .detail-list{background:#fff;border-radius:18px;padding:16px;margin-top:26px}.memopath-stage .detail-row{display:grid;grid-template-columns:60px 1fr;padding:13px 0;align-items:center}.memopath-stage .detail-row div:last-child{background:#f4f4f4;border-radius:12px;padding:15px;text-align:right}
.memopath-stage .demo-hint{margin-top:14px;font-size:11px;color:#8f867b;text-align:center;cursor:pointer;text-decoration:underline dotted}
.memopath-stage .mp-toast{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);background:#2c2119e6;color:#fff;border-radius:12px;padding:10px 18px;font-size:13px;z-index:50;max-width:320px;text-align:center;animation:mp-toast-in .25s ease}
@keyframes mp-toast-in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
@media(max-width:430px){.memopath-stage{padding:0;background:var(--cream)}.memopath-stage #app{width:100vw;height:100svh;border-radius:0}.memopath-stage .screen{padding-top:max(22px,env(safe-area-inset-top))}}
.memopath-stage .auth .logo{display:block;width:92px;height:86px}
.memopath-stage .auth .logo img{width:100%;height:100%;object-fit:cover;border-radius:16px;mix-blend-mode:multiply}
.memopath-stage .map-wrap{position:relative}
.memopath-stage .map.amp{background:#e8ecdf;background-image:none}
.memopath-stage .map.amp:before{display:none}
.memopath-stage .map .map-search{z-index:10}
.memopath-stage .map-loading{position:absolute;inset:0;display:grid;place-items:center;color:#8f867b;font-size:15px;background:#edf2e5}
.memopath-stage .amp-search{position:absolute;left:14px;right:14px;top:12px;z-index:10;height:46px;border-radius:23px;border:0;padding:0 18px;background:#fff;box-shadow:0 4px 11px #0003;font-size:17px;color:var(--ink)}
.memopath-stage .amp-suggest{position:absolute;left:14px;right:14px;top:64px;z-index:11;background:#fff;border-radius:14px;box-shadow:0 6px 18px #0004;max-height:210px;overflow-y:auto;display:flex;flex-direction:column}
.memopath-stage .amp-suggest[hidden]{display:none}
.memopath-stage .amp-suggest button{text-align:left;padding:10px 14px;font-size:16px;border-bottom:1px solid #f0e9dd}
.memopath-stage .amp-suggest button:last-child{border-bottom:0}
.memopath-stage .amp-suggest small{display:block;color:#a79f96;font-size:11px;margin-top:2px}
.memopath-stage .amp-route-info{margin:14px 18px 0;background:#fff;border-radius:14px;padding:12px 16px;font-size:18px;font-weight:700;box-shadow:var(--shadow)}
.memopath-stage .amp-route-info[hidden]{display:none}
.memopath-stage .map-pin-dot{width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid #5d79a1;box-shadow:0 2px 6px #0004}
.memopath-stage .map-pin-home{font-size:28px;line-height:1;filter:drop-shadow(0 2px 2px #0004)}
.memopath-stage .map-pin-dest{font-size:26px;line-height:1;filter:drop-shadow(0 2px 2px #0004)}
.memopath-stage .dest-field{position:relative}
.memopath-stage .dest-field .amp-suggest{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:20}
.memopath-stage .safety .map.amp{height:180px}
.memopath-stage .screen.no-scroll{overflow:hidden}
.memopath-stage .map[data-map="family"]{height:280px}
.memopath-stage .map-top-bar{display:flex;align-items:center;gap:12px;margin:4px 0 14px}
.memopath-stage .map-top-bar h1{flex:1;min-width:0;font-size:26px;margin:0;text-align:center;overflow-wrap:anywhere}
.memopath-stage .map-top-bar .sos{flex:none;padding:8px 10px}
.memopath-stage .big-back-top{width:56px;height:56px;flex:none;border-radius:50%;background:#fff;border:2px solid #292218;font-size:28px;font-weight:800;box-shadow:var(--shadow);display:grid;place-items:center}
.memopath-stage .add-trip-float{position:absolute;top:10px;right:10px;z-index:12;background:var(--gold);border:1px solid #d4bc78;border-radius:999px;padding:10px 14px;font-size:12px;font-weight:700;box-shadow:var(--shadow)}
.memopath-stage .person-info{min-width:0;flex:1}
.memopath-stage .spark-svg{width:100%;height:100%;display:block}
.memopath-stage .spark-empty{display:grid;place-items:center;height:46px;color:#a79f96;font-size:12px}
.memopath-stage .schedule-left{flex:1;min-width:0}
.memopath-stage .schedule-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:none}
.memopath-stage .status.manual{background:#f2e3bd;color:#8a6a1f}
.memopath-stage .nav-pill{background:#e8f0dc;border:1px solid #a9c277;border-radius:999px;padding:7px 13px;font-size:12px;font-weight:700;color:#4a6b1f;white-space:nowrap}
.memopath-stage .trip-points{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.memopath-stage .point-link{text-align:left;background:#f7f3ea;border:1px solid #ddd3c2;border-radius:10px;padding:7px 10px;font-size:12px;color:#5f554c;max-width:100%;overflow-wrap:anywhere}
.memopath-stage .schedule-empty{background:#fff;border:1px dashed #c9bfa9;border-radius:16px;padding:22px;text-align:center;color:#9a8f7f;margin:10px 0}
.memopath-stage .trip-route{cursor:pointer}
.memopath-stage .map-retry{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:#fff;border-radius:999px;padding:10px 18px;font-size:14px;font-weight:700;box-shadow:var(--shadow);z-index:12}
.memopath-stage .gender-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.memopath-stage .gender-opt{height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;font-size:15px}
.memopath-stage .gender-opt.active{background:var(--gold);border-color:#d2b268;font-weight:700;box-shadow:var(--shadow)}
.memopath-stage .input::placeholder{color:#b9b1a6}
.memopath-stage select.input{background:#fff}
/* Voice control */
.memopath-stage .voice-fab{position:absolute;right:14px;bottom:20px;z-index:40;width:60px;height:60px;border-radius:50%;background:var(--gold);box-shadow:0 6px 14px #0005;font-size:26px;display:grid;place-items:center}
.memopath-stage .voice-fab:active{transform:scale(.92)}
.memopath-stage .voice-fab.listening{background:var(--red);animation:mp-pulse 1.1s infinite}
@keyframes mp-pulse{0%{box-shadow:0 0 0 0 #c4554588}70%{box-shadow:0 0 0 16px #c4554500}100%{box-shadow:0 0 0 0 #c4554500}}
.memopath-stage .voice-overlay{position:absolute;left:0;right:0;bottom:0;z-index:45;background:#2c2119f2;color:#fff;border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center}
.memopath-stage .voice-overlay .voice-pulse{width:56px;height:56px;border-radius:50%;background:#c45545;display:grid;place-items:center;font-size:26px;animation:mp-pulse 1.2s infinite}
/* Elder home search box */
.memopath-stage .home-search{position:relative;display:flex;align-items:center;background:#fff;border-radius:28px;padding:11px 14px;margin:12px 0;box-shadow:0 4px 11px #0003}
.memopath-stage .home-search-icon{font-size:20px;margin-right:8px}
.memopath-stage .home-search-input{flex:1;min-width:0;border:0;background:none;font-size:20px;font-weight:600}
.memopath-stage .home-search-mic{font-size:23px;width:46px;height:46px;border-radius:50%;background:var(--gold);display:grid;place-items:center;box-shadow:var(--shadow);flex:none}
.memopath-stage .home-search-mic:active{transform:scale(.92)}
.memopath-stage .home-suggest{left:0;right:0;top:calc(100% + 8px);z-index:30}
.memopath-stage .home-suggest button{font-size:19px;padding:14px}
.memopath-stage .home-suggest small{font-size:13px}
/* Frequent place shortcuts (elder) */
.memopath-stage .place-chips{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 6px}
.memopath-stage .place-chip{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:26px;padding:12px 18px;font-size:19px;font-weight:700;box-shadow:var(--shadow)}
.memopath-stage .place-chip:active{transform:scale(.95)}
.memopath-stage .place-chip-icon{font-size:22px}
/* Frequent place management (family safety page) */
.memopath-stage .place-row{grid-template-columns:34px 1fr auto;padding:8px 0;border-bottom:1px solid #eee6d8}
.memopath-stage .place-info strong{font-size:16px}
.memopath-stage .place-info small{display:block;margin-top:2px}
.memopath-stage .place-del{width:34px;height:34px;border-radius:50%;background:#f6e3e0;color:var(--red);font-size:15px;font-weight:700;flex:none}
.memopath-stage .place-form{background:#fbf6ec;border:1px dashed var(--line);border-radius:14px;padding:12px;margin:10px 0;position:relative}
.memopath-stage .place-suggest{position:relative;left:0;right:0;top:auto;z-index:25;margin-top:8px}
.memopath-stage .place-draft{background:#fff;border-radius:10px;padding:10px 12px;margin:10px 0;font-size:15px}
.memopath-stage .icon-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.memopath-stage .icon-opt{width:42px;height:42px;border-radius:10px;border:1px solid var(--line);background:#fff;font-size:21px;display:grid;place-items:center}
.memopath-stage .icon-opt.active{background:var(--gold);border-color:#d2b268;box-shadow:var(--shadow)}
.memopath-stage .place-form-actions{display:flex;gap:10px;margin-top:10px}
.memopath-stage .top-actions{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end}
/* Cab arrived screen (elder) */
.memopath-stage .cab-page{padding-top:16px}
.memopath-stage .cab-map{position:relative}
.memopath-stage .cab-map .map.large{margin:0}
.memopath-stage .cab-back{position:absolute;top:12px;left:12px;z-index:12;width:52px;height:52px;border-radius:50%;background:#fff;font-size:26px;font-weight:800;box-shadow:var(--shadow)}
.memopath-stage .cab-eta{position:absolute;left:50%;transform:translateX(-50%);top:14px;z-index:12;background:#fff;border-radius:16px;padding:10px 16px;font-size:19px;font-weight:700;box-shadow:var(--shadow);white-space:nowrap}
.memopath-stage .cab-car-pin{position:absolute;left:36%;top:44%;z-index:11;font-size:36px;transform:rotate(-35deg);filter:drop-shadow(0 3px 3px #0005)}
.memopath-stage .cab-side-btns{position:absolute;right:12px;top:86px;z-index:12;display:flex;flex-direction:column;gap:10px}
.memopath-stage .cab-side-btn{width:58px;height:58px;border-radius:50%;background:#fff;box-shadow:var(--shadow);font-size:18px;line-height:1.15;display:grid;place-items:center}
.memopath-stage .cab-side-btn small{font-size:10px;color:#5f554c}
.memopath-stage .cab-locate{position:absolute;right:12px;bottom:14px;z-index:12;width:52px;height:52px;border-radius:50%;background:#fff;font-size:24px;box-shadow:var(--shadow);display:grid;place-items:center}
.memopath-stage .cab-info-bar{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin:12px 0}
.memopath-stage .cab-info-tag{background:var(--green);color:#fff;border-radius:8px;padding:5px 8px;font-size:14px;font-weight:700;flex:none}
.memopath-stage .cab-info-main{flex:1;min-width:0;font-size:16px;font-weight:700;overflow-wrap:anywhere}
.memopath-stage .cab-info-fare{font-size:18px;font-weight:800;color:#c98a2d;flex:none}
.memopath-stage .cab-driver{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;margin:12px 0}
.memopath-stage .cab-driver-row{display:flex;align-items:center;gap:12px}
.memopath-stage .cab-driver-avatar{width:58px;height:58px;border-radius:50%;background:#ebf1e1;display:grid;place-items:center;font-size:36px;flex:none}
.memopath-stage .cab-driver-info{flex:1;min-width:0;font-size:20px}
.memopath-stage .cab-driver-info small{font-size:13px}
.memopath-stage .cab-driver-score{background:#f6e4bd;border-radius:10px;padding:6px 10px;font-size:17px;font-weight:800;color:#a5761f;flex:none}
.memopath-stage .cab-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px}
.memopath-stage .cab-action{border-radius:14px;padding:14px 4px;font-size:16px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:var(--shadow)}
.memopath-stage .cab-action.green{background:var(--green);color:#fff}
.memopath-stage .cab-action.plain{background:#f4ead9;border:1px solid var(--line)}
.memopath-stage .cab-action.red{background:var(--red);color:#fff}
.memopath-stage .cab-feedback{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;margin:12px 0;text-align:center}
.memopath-stage .cab-feedback>b{font-size:16px}
.memopath-stage .cab-fb-q{font-size:22px;font-weight:800;margin:10px 0 0}
.memopath-stage .cab-fb-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.memopath-stage .cab-fb{border-radius:18px;padding:20px 10px;font-size:24px;font-weight:800;background:#f4ead9;border:3px solid transparent}
.memopath-stage .cab-fb.active{border-color:#c45545;background:#fdeeea}
.memopath-stage .cab-bottom{display:flex;gap:10px;margin:14px 0 30px}
.memopath-stage .cab-safety{flex:none;background:#f4ead9;border:1px solid var(--line);border-radius:16px;padding:12px 16px;font-size:15px;font-weight:700;line-height:1.3;box-shadow:var(--shadow)}
.memopath-stage .cab-notify{flex:1;background:var(--green);color:#fff;border-radius:16px;padding:14px;font-size:21px;font-weight:800;box-shadow:var(--shadow)}
.memopath-stage .mp-toast-btn{background:var(--gold);border-radius:8px;padding:6px 10px;margin-left:10px;font-size:13px;font-weight:700}
`;
